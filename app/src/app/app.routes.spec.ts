import { Route } from '@angular/router';
import { routes } from './app.routes';

/**
 * Every page is lazily loaded via `loadComponent`, so a wrong path or a renamed
 * export is not a compile error — it is a runtime failure that only appears
 * when a user navigates to that specific route. The E2E suites visit login,
 * dashboard, workouts and add-workout, which leaves history and profile
 * unguarded entirely.
 *
 * Resolving every loader here catches the broken import at unit speed, for all
 * routes, without a browser.
 */
describe('app routes', () => {
  /** Routes that lazily load a component (i.e. everything but the redirect). */
  const lazyRoutes: Route[] = routes.filter((r) => !!r.loadComponent);

  it('redirects the empty path to login', () => {
    const root = routes.find((r) => r.path === '');

    expect(root?.redirectTo).toBe('login');
    // Without pathMatch: 'full' the empty path prefix-matches every URL and
    // the app redirects to login from everywhere.
    expect(root?.pathMatch).toBe('full');
  });

  it('declares a route for every page', () => {
    expect(routes.map((r) => r.path)).toEqual([
      '',
      'login',
      'dashboard',
      'workouts',
      'workouts/add',
      'history',
      'profile',
    ]);
  });

  it('registers workouts/add before it could be swallowed by workouts', () => {
    const paths = routes.map((r) => r.path);

    // Angular matches in declaration order. These are distinct paths so the
    // order is not load-bearing today, but this fails loudly if 'workouts'
    // ever becomes a prefix/wildcard route ahead of its child.
    expect(paths.indexOf('workouts')).toBeLessThan(paths.indexOf('workouts/add'));
  });

  lazyRoutes.forEach((route) => {
    it(`resolves a component for "${route.path}"`, async () => {
      const loaded = await (route.loadComponent as () => Promise<unknown>)();

      expect(loaded).toBeDefined();
      expect(typeof loaded).toBe('function');
    });
  });
});
