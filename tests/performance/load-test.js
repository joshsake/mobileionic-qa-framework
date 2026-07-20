import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/**
 * k6 Load Test for Fitness Tracker API
 *
 * Simulates normal production load:
 *   - Ramp up from 1 to 50 virtual users over 2 minutes
 *   - Sustain 50 users for 2 minutes
 *   - Ramp down over 1 minute
 *
 * Run: k6 run load-test.js
 * With env: k6 run -e BASE_URL=http://localhost:5000 load-test.js
 */

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000/api';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * Exercise types the API accepts. Anything outside this list is rejected with a
 * 400, which would turn every write into a recorded failure instead of the
 * latency sample this test is trying to collect.
 */
const EXERCISE_TYPES = ['Running', 'Cycling', 'Swimming', 'Yoga', 'Weight Training'];

// Custom metrics
const loginDuration = new Trend('login_duration', true);
const getWorkoutsDuration = new Trend('get_workouts_duration', true);
const postWorkoutDuration = new Trend('post_workout_duration', true);
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Warm up
    { duration: '1m30s', target: 50 },  // Ramp to full load
    { duration: '2m', target: 50 },     // Sustain peak load
    { duration: '1m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],          // 95th percentile under 500ms
    errors: ['rate<0.01'],                      // Error rate under 1%
    login_duration: ['p(95)<600'],              // Login-specific threshold
    get_workouts_duration: ['p(95)<400'],       // GET workouts threshold
    post_workout_duration: ['p(95)<500'],       // POST workout threshold
    http_req_failed: ['rate<0.01'],             // Built-in failure rate
  },
  noConnectionReuse: false,
  userAgent: 'k6-load-test/1.0',
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
    email: `loadtest_user_${__VU}@example.com`,
    password: 'LoadTest1234!',
    displayName: `Load Test VU ${__VU}`,
  };
}

/**
 * Authenticate, creating this VU's account the first time it is needed.
 *
 * The API only seeds three shared users, so a per-VU account has to be
 * self-provisioned: the first login is expected to 401 and is answered with a
 * register call. That handshake is setup rather than a fault, so it is kept out
 * of the checks, errorRate and http_req_failed — otherwise every run starts
 * with one guaranteed error per VU and the 1% thresholds can never pass.
 */
function authenticate() {
  const creds = credentials();
  const loginBody = JSON.stringify({ email: creds.email, password: creds.password });

  const params = {
    headers: JSON_HEADERS,
    tags: { name: 'POST /auth/login' },
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
      // 409 only means the account already exists — a re-run against a
      // long-lived server, or another VU that got there first. Log in instead.
      responseCallback: http.expectedStatuses(201, 409),
    });

    if (res.status === 409) {
      res = http.post(`${BASE_URL}/auth/login`, loginBody, {
        headers: JSON_HEADERS,
        tags: { name: 'POST /auth/login' },
      });
    }
  }

  provisioned = true;

  // The one-off register round trip is provisioning overhead, not the
  // steady-state login latency this trend and its threshold are policing.
  if (!bootstrapping) {
    loginDuration.add(res.timings.duration);
  }

  const authenticated = check(res, {
    'auth returns 200 or 201': (r) => r.status === 200 || r.status === 201,
    'auth response has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.token !== undefined;
      } catch {
        return false;
      }
    },
    'auth duration < 1s': (r) => r.timings.duration < 1000,
  });

  errorRate.add(!authenticated);

  if (!authenticated) {
    return null;
  }

  try {
    return JSON.parse(res.body).token;
  } catch {
    return null;
  }
}

/**
 * Fetch the list of workouts for the authenticated user.
 */
function getWorkouts(token) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    tags: { name: 'GET /workouts' },
  };

  const res = http.get(`${BASE_URL}/workouts`, params);

  getWorkoutsDuration.add(res.timings.duration);
  errorRate.add(res.status !== 200);

  check(res, {
    'get workouts returns 200': (r) => r.status === 200,
    'get workouts returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch {
        return false;
      }
    },
    'get workouts duration < 500ms': (r) => r.timings.duration < 500,
  });
}

/**
 * Create a new workout record.
 */
function postWorkout(token) {
  const randomExercise = EXERCISE_TYPES[Math.floor(Math.random() * EXERCISE_TYPES.length)];
  const randomDuration = Math.floor(Math.random() * 90) + 15; // 15 to 105 minutes, inside the API's 1-1440 range

  const payload = JSON.stringify({
    // userId is deliberately omitted: the server stamps it from the bearer
    // token. Sending the VU number here overwrote it with an id belonging to a
    // completely different (seeded) user.
    exerciseType: randomExercise,
    durationMinutes: randomDuration,
    notes: `Load test workout from VU ${__VU}, iteration ${__ITER}`,
    date: new Date().toISOString(),
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    tags: { name: 'POST /workouts' },
  };

  const res = http.post(`${BASE_URL}/workouts`, payload, params);

  postWorkoutDuration.add(res.timings.duration);
  errorRate.add(res.status !== 201 && res.status !== 200);

  check(res, {
    'post workout returns 201 or 200': (r) => r.status === 201 || r.status === 200,
    'post workout has id in response': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id !== undefined;
      } catch {
        return false;
      }
    },
    'post workout duration < 500ms': (r) => r.timings.duration < 500,
  });
}

export default function () {
  let token = null;

  group('Authentication', () => {
    token = authenticate();
  });

  if (!token) {
    errorRate.add(true);
    sleep(1);
    return;
  }

  group('Read Workouts', () => {
    getWorkouts(token);
  });

  sleep(1);

  group('Create Workout', () => {
    postWorkout(token);
  });

  sleep(1);

  group('Read Updated Workouts', () => {
    getWorkouts(token);
  });

  sleep(Math.random() * 2 + 1); // Random 1-3 second think time
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
    'reports/load-test-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, _opts) {
  // k6 built-in summary is used by default; this is a placeholder for custom formatting
  return JSON.stringify(data.metrics, null, 2);
}
