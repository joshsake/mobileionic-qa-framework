import http from 'k6/http';
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
 * Determine if we are currently in a spike phase based on elapsed time.
 */
function isSpikePeriod() {
  // Spike periods: 30-100s (first spike), 210-280s (second spike)
  // This is approximate based on the stage durations
  const elapsed = new Date().getTime() / 1000;
  return __VU > 20; // Simple heuristic: more than 20 VUs means we're in a spike
}

function login() {
  const payload = JSON.stringify({
    email: `spiketest_user_${__VU}@example.com`,
    password: 'SpikeTest1234!',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'POST /auth/login' },
    timeout: '15s',
  };

  const res = http.post(`${BASE_URL}/auth/login`, payload, params);

  if (isSpikePeriod()) {
    spikeResponseTime.add(res.timings.duration);
  } else {
    recoveryResponseTime.add(res.timings.duration);
  }

  const passed = check(res, {
    'login returns 200': (r) => r.status === 200,
    'login has token': (r) => {
      try {
        return JSON.parse(r.body).token !== undefined;
      } catch {
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
    timeout: '15s',
  };

  const res = http.get(`${BASE_URL}/workouts`, params);

  if (isSpikePeriod()) {
    spikeResponseTime.add(res.timings.duration);
  } else {
    recoveryResponseTime.add(res.timings.duration);
  }

  const passed = check(res, {
    'get workouts returns 200': (r) => r.status === 200,
    'get workouts body is array': (r) => {
      try {
        return Array.isArray(JSON.parse(r.body));
      } catch {
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
  const exerciseTypes = ['Running', 'Cycling', 'Swimming', 'Weightlifting', 'Yoga'];
  const randomExercise = exerciseTypes[Math.floor(Math.random() * exerciseTypes.length)];

  const payload = JSON.stringify({
    userId: __VU,
    exerciseType: randomExercise,
    durationMinutes: Math.floor(Math.random() * 60) + 10,
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

  if (isSpikePeriod()) {
    spikeResponseTime.add(res.timings.duration);
  } else {
    recoveryResponseTime.add(res.timings.duration);
  }

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
    token = login();
  });

  if (!token) {
    sleep(0.5);
    return;
  }

  group('Spike - User Activity', () => {
    // During spike, simulate aggressive user behavior
    if (isSpikePeriod()) {
      // Multiple rapid requests to simulate real spike behavior
      rapidFireReads(token, 2);
      postWorkout(token);
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
