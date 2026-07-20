/**
 * apiUrl carries the `/api` prefix because every backend route lives under it.
 * This was previously just the origin, so ApiService built URLs like
 * http://localhost:3000/auth/login and every request 404'd — which meant login
 * never completed and the whole web E2E suite timed out waiting for /dashboard.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
};
