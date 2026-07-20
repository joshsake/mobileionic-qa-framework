import http from 'k6/http';
import exec from 'k6/execution';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

/**
 * k6 Spike Test for Fitness Tracker API
 *
 * Simulates a sudden burst of traffic to test system resilience:
 *   - Start with minimal load (5 users)
 *   - Spike instantly to 100 concurrent users
 *   - Hold the spike for 1 minute
 *   - Drop back to minimal load
 *   - Second spike to verify recovery
 *   - Ramp down to zero
 *
 * Run: k6 run spike-test.js
 * With env: k6 run -e BASE_URL=http://localhost:5000 spike-test.js
 */

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000/api';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * Exercise types the API accepts. Anything outside this list is rejected with a
 * 400, which would show up as a spike-induced failure when it is really a
 * malformed request from the test itself.
 */
const EXERCISE_TYPES = ['Running', 'Cycling', 'Swimming', 'Yoga', 'Weight Training'];

// Custom metrics
const errorRate = new Rate('errors');
const spikeResponseTime = new Trend('spike_response_time', true);
const recoveryResponseTime = new Trend('recovery_response_time', true);
const failedRequests = new Counter('failed_requests');

export const options = {
  stages: [
    { duration: '30s', target: 5 },     // Baseline: minimal load
    { duration: '10s', target: 100 },    // Spike: sudden burst to 100 users
    { duration: '1m', target: 100 },     // Hold spike for observation
    { duration: '10s', target: 5 },      // Drop back to baseline
    { duration: '1m', target: 5 },       // Recovery period: observe stabilization
    { duration: '10s', target: 100 },    // Second spike to test recovery
    { duration: '1m', target: 100 },     // Hold second spike
    { duration: '30s', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],     // Allow higher latency during spikes
    errors: ['rate<0.15'],                  // Allow up to 15% errors during spike
    http_req_failed: ['rate<0.20'],         // Allow up to 20% failures during spike
    spike_response_time: ['p(95)<3000'],    // Spike-specific response time threshold
  },
  noConnectionReuse: false,
  userAgent: 'k6-spike-test/1.0',
};

/**
 * Determine if we are currently in a spike phase.
 *
 * The spike stages run at 100 VUs against a baseline of 5, so the number of VUs
 * k6 currently has active separates the phases cleanly. Two earlier attempts got
 * this wrong: a wall-clock elapsed time could not be compared against the stage
 * schedule because k6 gives each VU its own clock, and keying off __VU labelled
 * VUs 1-20 as baseline traffic even while they were executing inside a spike.
 */
function isSpikePeriod() {
  return exec.instance.vusActive > 20;
}

/**
 * Record a response against whichever phase is currently running.
 */
function recordPhaseTiming(res) {
  if (isSpikePeriod()) {
    spikeResponseTime.add(res.timings.duration);
  } else {
    recoveryResponseTime.add(res.timings.duration);
  }
}

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
    email: `spiketest_user_${__VU}@example.com`,
    password: 'SpikeTest1234!',
    displayName: `Spike Test VU ${__VU}`,
  };
}

/**
 * Authenticate, creating this VU's account the first time it is needed.
 *
 * The API only seeds three shared users, so a per-VU account has to be
 * self-provisioned: the first login is expected to 401 and is answered with a
 * register call. That handshake is setup rather than a fault, so it is kept out
 * of the checks, errorRate and http_req_failed. It matters most here — a spike
 * brings 95 brand new VUs online at once, and counting each one's first login
 * as a failure would blame the spike for the test's own provisioning.
 */
function authenticate() {
  const creds = credentials();
  const loginBody = JSON.stringify({ email: creds.email, password: creds.password });

  const params = {
    headers: JSON_HEADERS,
    tags: { name: 'POST /auth/login' },
    timeout: '15s',
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
      timeout: '15s',
      // 409 only means the account already exists — a re-run against a
      // long-lived server, or another VU that got there first. Log in instead.
      responseCallback: http.expectedStatuses(201, 409),
    });

    if (res.status === 409) {
      res = http.post(`${BASE_URL}/auth/login`, loginBody, {
        headers: JSON_HEADERS,
        tags: { name: 'POST /auth/login' },
        timeout: '15s',
      });
    }
  }

  provisioned = true;

  recordPhaseTiming(res);

  const passed = check(res, {
    'auth returns 200 or 201': (r) => r.status === 200 || r.status === 201,
    'auth has token': (r) => {
      try {
        return JSON.parse(r.body).token !== undefined;
      } catch (_err) {
        return false;
      }
    },
  });

  if (!passed) {
    errorRate.add(true);
    failedRequests.add(1);
    return null;
  }

  errorRate.add(false);

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
    timeout: '15s',
  };

  const res = http.get(`${BASE_URL}/workouts`, params);

  recordPhaseTiming(res);

  const passed = check(res, {
    'get workouts returns 200': (r) => r.status === 200,
    'get workouts body is array': (r) => {
      try {
        return Array.isArray(JSON.parse(r.body));
      } catch (_err) {
        return false;
      }
    },
  });

  if (!passed) {
    errorRate.add(true);
    failedRequests.add(1);
  } else {
    errorRate.add(false);
  }
}

function postWorkout(token) {
  const randomExercise = EXERCISE_TYPES[Math.floor(Math.random() * EXERCISE_TYPES.length)];

  const payload = JSON.stringify({
    // userId is deliberately omitted: the server stamps it from the bearer
    // token. Sending the VU number here overwrote it with an id belonging to a
    // completely different (seeded) user.
    exerciseType: randomExercise,
    durationMinutes: Math.floor(Math.random() * 60) + 10, // 10 to 69 minutes, inside the API's 1-1440 range
    notes: `Spike test VU ${__VU}`,
    date: new Date().toISOString(),
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    tags: { name: 'POST /workouts' },
    timeout: '15s',
  };

  const res = http.post(`${BASE_URL}/workouts`, payload, params);

  recordPhaseTiming(res);

  const passed = check(res, {
    'post workout returns 2xx': (r) => r.status >= 200 && r.status < 300,
  });

  if (!passed) {
    errorRate.add(true);
    failedRequests.add(1);
  } else {
    errorRate.add(false);
  }
}

function rapidFireReads(token, count) {
  for (let i = 0; i < count; i++) {
    getWorkouts(token);
  }
}

export default function () {
  let token = null;

  group('Spike - Authentication', () => {
    token = authenticate();
  });

  if (!token) {
    sleep(0.5);
    return;
  }

  group('Spike - User Activity', () => {
    // During spike, simulate aggressive user behavior
    if (isSpikePeriod()) {
      // Multiple rapid requests to simulate real spike behavior. Reads dominate;
      // writing on every iteration inflated the workout collection that every
      // GET /workouts returns in full, so the read latency being measured
      // drifted towards measuring the test's own data growth.
      rapidFireReads(token, 2);
      if (Math.random() < 0.3) {
        postWorkout(token);
      }
    } else {
      // Normal pace during baseline/recovery
      getWorkouts(token);
      sleep(0.5);
      if (Math.random() < 0.3) {
        postWorkout(token);
      }
    }
  });

  sleep(Math.random() * 1 + 0.3); // Short think time to maintain pressure
}

export function handleSummary(data) {
  const spikeP95 = data.metrics.spike_response_time
    ? data.metrics.spike_response_time.values['p(95)']
    : 'N/A';
  const recoveryP95 = data.metrics.recovery_response_time
    ? data.metrics.recovery_response_time.values['p(95)']
    : 'N/A';

  const summary = {
    testType: 'Spike Test',
    totalRequests: data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0,
    overallErrorRate: data.metrics.errors ? data.metrics.errors.values.rate : 0,
    failedRequestCount: data.metrics.failed_requests ? data.metrics.failed_requests.values.count : 0,
    spikeResponseTimeP95: spikeP95,
    recoveryResponseTimeP95: recoveryP95,
    overallP95: data.metrics.http_req_duration
      ? data.metrics.http_req_duration.values['p(95)']
      : 'N/A',
    overallP99: data.metrics.http_req_duration
      ? data.metrics.http_req_duration.values['p(99)']
      : 'N/A',
  };

  return {
    'stdout': JSON.stringify(summary, null, 2),
    'reports/spike-test-summary.json': JSON.stringify(data, null, 2),
  };
}
