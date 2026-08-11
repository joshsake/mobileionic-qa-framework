import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ApiService, Workout, UserProfile } from './api.service';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

/**
 * ApiService is where the app's URLs and auth headers are actually decided.
 * Both have been wrong before in ways no E2E test could localise: the base URL
 * once omitted the /api prefix so every request 404'd, and the response types
 * described a nested `user` object the backend never sends.
 *
 * These specs pin the request the app makes — path, method, body and headers —
 * against the real AuthService, so the token-to-header path is exercised rather
 * than mocked away.
 */
describe('ApiService', () => {
  const BASE = environment.apiUrl;
  let service: ApiService;
  let httpMock: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify(); // fails the spec on any unexpected or outstanding request
    localStorage.clear();
  });

  it('builds URLs under the /api prefix', () => {
    // Guards the regression where apiUrl was just the origin, so every request
    // went to /auth/login instead of /api/auth/login and silently 404'd.
    expect(BASE.endsWith('/api')).toBe(true);
  });

  describe('login', () => {
    it('posts credentials to /auth/login', () => {
      service.login('test@example.com', 'password123').subscribe();

      const req = httpMock.expectOne(`${BASE}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        email: 'test@example.com',
        password: 'password123',
      });
      req.flush({});
    });

    it('returns the flat token response the backend actually sends', () => {
      const response = {
        token: 'jwt-token',
        expiresAt: '2026-08-12T00:00:00.000Z',
        userId: 1,
        displayName: 'Test User',
        email: 'test@example.com',
      };
      let received: unknown;
      service.login('test@example.com', 'password123').subscribe((r) => (received = r));

      httpMock.expectOne(`${BASE}/auth/login`).flush(response);

      expect(received).toEqual(response);
    });

    it('surfaces a 401 to the caller rather than swallowing it', () => {
      let errorStatus: number | undefined;
      service.login('wrong@example.com', 'nope').subscribe({
        error: (err) => (errorStatus = err.status),
      });

      httpMock
        .expectOne(`${BASE}/auth/login`)
        .flush({ message: 'Invalid email or password.' }, { status: 401, statusText: 'Unauthorized' });

      expect(errorStatus).toBe(401);
    });
  });

  describe('authorization header', () => {
    it('attaches a bearer token when one is stored', () => {
      auth.setToken('stored-jwt');

      service.getWorkouts().subscribe();

      const req = httpMock.expectOne(`${BASE}/workouts`);
      expect(req.request.headers.get('Authorization')).toBe('Bearer stored-jwt');
      req.flush([]);
    });

    it('omits the header entirely when no token is stored', () => {
      // Not "sends an empty Authorization header" — an empty bearer would be a
      // malformed credential rather than an absent one.
      service.getWorkouts().subscribe();

      const req = httpMock.expectOne(`${BASE}/workouts`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush([]);
    });

    it('picks up a token set after the service was constructed', () => {
      // The headers getter reads the token per request; if it were captured in
      // the constructor, logging in would not authorise subsequent calls.
      service.getWorkouts().subscribe();
      httpMock.expectOne(`${BASE}/workouts`).flush([]);

      auth.setToken('late-jwt');
      service.getWorkouts().subscribe();

      const second = httpMock.expectOne(`${BASE}/workouts`);
      expect(second.request.headers.get('Authorization')).toBe('Bearer late-jwt');
      second.flush([]);
    });

    it('sends JSON content-type on writes', () => {
      service.addWorkout({ exerciseType: 'Running', durationMinutes: 30, date: '2026-08-11' }).subscribe();

      const req = httpMock.expectOne(`${BASE}/workouts`);
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      req.flush({});
    });
  });

  describe('workouts', () => {
    it('gets the workout list', () => {
      const workouts: Workout[] = [
        { id: 1, userId: 1, exerciseType: 'Running', durationMinutes: 30, date: '2026-08-11' },
      ];
      let received: Workout[] | undefined;
      service.getWorkouts().subscribe((r) => (received = r));

      const req = httpMock.expectOne(`${BASE}/workouts`);
      expect(req.request.method).toBe('GET');
      req.flush(workouts);

      expect(received).toEqual(workouts);
    });

    it('posts a new workout with the field names the API expects', () => {
      // exerciseType/durationMinutes, not exercise/duration — the latter pair
      // was in this interface once and rendered undefined everywhere.
      const workout = {
        exerciseType: 'Cycling',
        durationMinutes: 45,
        date: '2026-08-11',
        notes: 'Evening ride',
      };
      service.addWorkout(workout).subscribe();

      const req = httpMock.expectOne(`${BASE}/workouts`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(workout);
      req.flush({ id: 16, ...workout });
    });
  });

  describe('profile', () => {
    it('gets the profile', () => {
      const profile: UserProfile = { id: 1, name: 'Test User', email: 'test@example.com' };
      let received: UserProfile | undefined;
      service.getProfile().subscribe((r) => (received = r));

      const req = httpMock.expectOne(`${BASE}/profile`);
      expect(req.request.method).toBe('GET');
      req.flush(profile);

      expect(received).toEqual(profile);
    });

    it('puts a partial profile update', () => {
      service.updateProfile({ name: 'Renamed' }).subscribe();

      const req = httpMock.expectOne(`${BASE}/profile`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ name: 'Renamed' });
      req.flush({});
    });
  });
});
