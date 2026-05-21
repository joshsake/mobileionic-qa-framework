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
 * Authenticate and return a JWT token.
 */
function login() {
  const payload = JSON.stringify({
    email: `loadtest_user_${__VU}@example.com`,
    password: 'LoadTest1234!',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'POST /auth/login' },
  };

  const res = http.post(`${BASE_URL}/auth/login`, payload, params);

  loginDuration.add(res.timings.duration);
  errorRate.add(res.status !== 200);

  check(res, {
    'login returns 200': (r) => r.status === 200,
    'login response has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.token !== undefined;
      } catch {
        return false;
      }
    },
    'login duration < 1s': (r) => r.timings.duration < 1000,
  });

  if (res.status === 200) {
    try {
      return JSON.parse(res.body).token;
    } catch {
      return null;
    }
  }
  return null;
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
  const exerciseTypes = ['Running', 'Cycling', 'Swimming', 'Weightlifting', 'Yoga'];
  const randomExercise = exerciseTypes[Math.floor(Math.random() * exerciseTypes.length)];
  const randomDuration = Math.floor(Math.random() * 90) + 15; // 15 to 105 minutes

  const payload = JSON.stringify({
    userId: __VU,
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
    token = login();
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

function textSummary(data, opts) {
  // k6 built-in summary is used by default; this is a placeholder for custom formatting
  return JSON.stringify(data.metrics, null, 2);
}
