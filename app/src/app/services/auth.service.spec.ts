import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { AuthService } from './auth.service';

/**
 * AuthService is the only thing standing between a stored token and every
 * authenticated request the app makes, and it reads localStorage at
 * construction time — so each spec starts from a cleared store and injects a
 * fresh instance rather than sharing one.
 */
describe('AuthService', () => {
  const TOKEN_KEY = 'auth_token';

  /** Inject a new instance, so field initialisers re-read localStorage. */
  function freshService(): AuthService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    return TestBed.inject(AuthService);
  }

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initial state', () => {
    it('starts logged out when no token is stored', () => {
      const service = freshService();

      expect(service.isLoggedIn).toBe(false);
      expect(service.token).toBeNull();
      expect(service.hasToken()).toBe(false);
    });

    it('starts logged in when a token is already stored', () => {
      // Simulates the app being reopened after a previous session — the token
      // outlives the process, so the service must reflect it on construction
      // rather than only after a setToken call.
      localStorage.setItem(TOKEN_KEY, 'persisted-token');

      const service = freshService();

      expect(service.isLoggedIn).toBe(true);
      expect(service.token).toBe('persisted-token');
    });
  });

  describe('setToken', () => {
    it('persists the token and flips the logged-in state', () => {
      const service = freshService();

      service.setToken('new-token');

      expect(localStorage.getItem(TOKEN_KEY)).toBe('new-token');
      expect(service.token).toBe('new-token');
      expect(service.isLoggedIn).toBe(true);
    });

    it('emits the new state to isLoggedIn$ subscribers', async () => {
      const service = freshService();
      const emissions: boolean[] = [];
      const subscription = service.isLoggedIn$.subscribe((v) => emissions.push(v));

      service.setToken('new-token');
      subscription.unsubscribe();

      // BehaviorSubject replays current state on subscribe, so the first value
      // is the initial false and the second is the result of setToken.
      expect(emissions).toEqual([false, true]);
    });

    it('overwrites an existing token rather than appending a second one', () => {
      const service = freshService();

      service.setToken('first-token');
      service.setToken('second-token');

      expect(service.token).toBe('second-token');
    });
  });

  describe('logout', () => {
    it('removes the token and flips the logged-in state', () => {
      const service = freshService();
      service.setToken('a-token');

      service.logout();

      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(service.token).toBeNull();
      expect(service.isLoggedIn).toBe(false);
    });

    it('emits false to isLoggedIn$ subscribers', async () => {
      const service = freshService();
      service.setToken('a-token');

      service.logout();

      await expectAsync(
        firstValueFrom(service.isLoggedIn$.pipe(take(1)))
      ).toBeResolvedTo(false);
    });

    it('is safe to call when already logged out', () => {
      const service = freshService();

      expect(() => service.logout()).not.toThrow();
      expect(service.isLoggedIn).toBe(false);
    });
  });
});
