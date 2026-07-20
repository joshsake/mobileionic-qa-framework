import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

/**
 * k6 Stress Test for Fitness Tracker API
 *
 * Gradually increases load well beyond normal capacity to find the breaking point.
 *   - Ramp from 0 to 50 users (normal load)
 *   - Ramp from 50 to 100 users (high load)
 *   - Ramp from 100 to 200 users (stress load)
 *   - Sustain 200 users to observe behavior under stress
 *   - Ramp down
 *
 * Run: k6 run stress-test.js
 * With env: k6 run -e BASE_URL=http://localhost:5000 stress-test.js
 */

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000/api';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * Exercise types the API accepts. Anything outside this list is rejected with a
 * 400, so an invalid value would be recorded as a server failure under stress
 * when it is really a malformed request from the test itself.
 */
const EXERCISE_TYPES = ['Running', 'Cycling', 'Swimming', 'Yoga', 'Weight Training'];

// Custom metrics
const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration', true);
const failedRequests = new Counter('failed_requests');
const successfulRequests = new Counter('successful_requests');

export const options = {
  stages: [
    { duration: '1m', target: 50 },    // Normal load
    { duration: '2m', target: 50 },     // Hold normal load
    { duration: '1m', target: 100 },    // Ramp to high load
    { duration: '2m', target: 100 },    // Hold high load
    { duration: '1m', target: 200 },    // Ramp to stress load
    { duration: '3m', target: 200 },    // Hold at breaking point
    { duration: '1m', target: 100 },    // Partial recovery
    { duration: '1m', target: 0 },      // Full ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<3000'],     // 99th percentile under 3 seconds
    errors: ['rate<0.10'],                  // Allow up to 10% error rate under stress
    http_req_failed: ['rate<0.15'],         // Allow up to 15% failed requests under stress
  },
  noConnectionReuse: false,
  userAgent: 'k6-stress-test/1.0',
};

/**
 * Whether this VU has already been through the login/register bootstrap.
 *
 * k6 gives every VU its own JS runtime, so module-level state is per-VU and
 * survives across that VU's iterations — exactly the scope needed to remember
 * that the account no longer has to be provisioned.
 */
let provisioned = false;

/**
 * Credentials for this VU's own account.
 *
 * Built on demand instead of as a module constant because __VU is 0 while the
 * init context runs; a constant would hand every VU the same `_0` account.
 */
function credentials() {
  return {
    email: `stresstest_user_${__VU}@example.com`,
    password: 'StressTest1234!',
    displayName: `Stress Test VU ${__VU}`,
  };
}

/**
 * Authenticate, creating this VU's account the first time it is needed.
 *
 * The API only seeds three shared users, so a per-VU account has to be
 * self-provisioned: the first login is expected to 401 and is answered with a
 * register call. That handshake is setup rather than a fault, so it is kept out
 * of the checks, errorRate and http_req_failed — otherwise the run would open
 * with one guaranteed error per VU before any load is actually applied.
 */
function authenticate() {
  const creds = credentials();
  const loginBody = JSON.stringify({ email: creds.email, password: creds.password });

  const params = {
    headers: JSON_HEADERS,
    tags: { name: 'POST /auth/login' },
    timeout: '10s',
  };

  // Only the bootstrap attempt is allowed to treat 401 as an expected status.
  // Every later login uses the default callback, so a genuine 401 once the
  // account exists still counts against http_req_failed.
  const bootstrapping = !provisioned;
  if (bootstrapping) {
    params.responseCallback = http.expectedStatuses(200, 401);
  }

  let res = http.post(`${BASE_URL}/auth/login`, loginBody, params);

  if (bootstrapping && res.status === 401) {
    res = http.post(`${BASE_URL}/auth/register`, JSON.stringify(creds), {
      headers: JSON_HEADERS,
      tags: { name: 'POST /auth/register' },
      timeout: '10s',
      // 409 only means the account already exists — a re-run against a
      // long-lived server, or another VU that got there first. Log in instead.
      responseCallback: http.expectedStatuses(201, 409),
    });

    if (res.status === 409) {
      res = http.post(`${BASE_URL}/auth/login`, loginBody, {
        headers: JSON_HEADERS,
        tags: { name: 'POST /auth/login' },
        timeout: '10s',
      });
    }
  }

  provisioned = true;

  requestDuration.add(res.timings.duration);

  const passed = check(res, {
    'auth status 200 or 201': (r) => r.status === 200 || r.status === 201,
    'auth response time < 2s': (r) => r.timings.duration < 2000,
  });

  if (!passed) {
    errorRate.add(true);
    failedRequests.add(1);
    return null;
  }

  errorRate.add(false);
  successfulRequests.add(1);

  try {
    return JSON.parse(res.body).token;
  } catch (_err) {
    return null;
  }
}

function getWorkouts(token) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    tags: { name: 'GET /workouts' },
    timeout: '10s',
  };

  const res = http.get(`${BASE_URL}/workouts`, params);

  requestDuration.add(res.timings.duration);

  const passed = check(res, {
    'get workouts status 200': (r) => r.status === 200,
    'get workouts response time < 3s': (r) => r.timings.duration < 3000,
  });

  if (!passed) {
    errorRate.add(true);
    failedRequests.add(1);
  } else {
    errorRate.add(false);
    successfulRequests.add(1);
  }
}

function postWorkout(token) {
  const randomExercise = EXERCISE_TYPES[Math.floor(Math.random() * EXERCISE_TYPES.length)];
  const randomDuration = Math.floor(Math.random() * 120) + 10; // 10 to 129 minutes, inside the API's 1-1440 range

  const payload = JSON.stringify({
    // userId is deliberately omitted: the server stamps it from the bearer
    // token. Sending the VU number here overwrote it with an id belonging to a
    // completely different (seeded) user.
    exerciseType: randomExercise,
    durationMinutes: randomDuration,
    notes: `Stress test VU ${__VU}, iter ${__ITER}`,
    date: new Date().toISOString(),
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    tags: { name: 'POST /workouts' },
    timeout: '10s',
  };

  const res = http.post(`${BASE_URL}/workouts`, payload, params);

  requestDuration.add(res.timings.duration);

  const passed = check(res, {
    'post workout status 2xx': (r) => r.status >= 200 && r.status < 300,
    'post workout response time < 3s': (r) => r.timings.duration < 3000,
  });

  if (!passed) {
    errorRate.add(true);
    failedRequests.add(1);
  } else {
    errorRate.add(false);
    successfulRequests.add(1);
  }
}

function getWorkoutById(token, id) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    tags: { name: 'GET /workouts/:id' },
    timeout: '10s',
    // The id is picked at random and may simply not exist. The check below
    // already treats that as a valid outcome, so it must not inflate
    // http_req_failed either.
    responseCallback: http.expectedStatuses(200, 404),
  };

  const res = http.get(`${BASE_URL}/workouts/${id}`, params);

  requestDuration.add(res.timings.duration);

  const passed = check(res, {
    'get workout by id status 2xx or 404': (r) => r.status === 200 || r.status === 404,
  });

  if (!passed) {
    errorRate.add(true);
    failedRequests.add(1);
  } else {
    errorRate.add(false);
    successfulRequests.add(1);
  }
}

export default function () {
  let token = null;

  group('Stress - Login', () => {
    token = authenticate();
  });

  if (!token) {
    sleep(1);
    return;
  }

  group('Stress - Mixed Operations', () => {
    // Simulate realistic user behavior: mostly reads, some writes
    const action = Math.random();

    if (action < 0.5) {
      // 50% chance: read workout list
      getWorkouts(token);
    } else if (action < 0.8) {
      // 30% chance: create a new workout
      postWorkout(token);
    } else {
      // 20% chance: read a specific workout
      const randomId = Math.floor(Math.random() * 100) + 1;
      getWorkoutById(token, randomId);
    }
  });

  sleep(Math.random() * 1.5 + 0.5); // 0.5-2 second think time
}

export function handleSummary(data) {
  return {
    'stdout': JSON.stringify(
      {
        totalRequests: data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0,
        errorRate: data.metrics.errors ? data.metrics.errors.values.rate : 0,
        p95Duration: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : 0,
        p99Duration: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(99)'] : 0,
        maxDuration: data.metrics.http_req_duration ? data.metrics.http_req_duration.values.max : 0,
      },
      null,
      2
    ),
    'reports/stress-test-summary.json': JSON.stringify(data, null, 2),
  };
}
