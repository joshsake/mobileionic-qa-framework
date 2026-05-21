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

function login() {
  const payload = JSON.stringify({
    email: `stresstest_user_${__VU}@example.com`,
    password: 'StressTest1234!',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'POST /auth/login' },
    timeout: '10s',
  };

  const res = http.post(`${BASE_URL}/auth/login`, payload, params);

  requestDuration.add(res.timings.duration);

  const passed = check(res, {
    'login status 200': (r) => r.status === 200,
    'login response time < 2s': (r) => r.timings.duration < 2000,
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
  } catch {
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
  const exerciseTypes = ['Running', 'Cycling', 'Swimming', 'Weightlifting', 'Yoga', 'HIIT', 'Pilates'];
  const randomExercise = exerciseTypes[Math.floor(Math.random() * exerciseTypes.length)];
  const randomDuration = Math.floor(Math.random() * 120) + 10;

  const payload = JSON.stringify({
    userId: __VU,
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
    token = login();
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
