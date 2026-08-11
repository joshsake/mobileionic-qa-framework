import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginPage } from './login.page';
import { ApiService, LoginResponse } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

/**
 * The login page decides three things the E2E suites can only observe
 * indirectly: that a successful response's token is handed to AuthService,
 * that navigation happens only on success, and what the user is told when it
 * fails. The last one has a fallback branch that only fires when the backend
 * returns an error without a message body — a case the running mock never
 * produces, so no E2E test can reach it.
 */
describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let component: LoginPage;
  let apiService: jasmine.SpyObj<ApiService>;
  let authService: AuthService;
  let router: Router;

  const successResponse: LoginResponse = {
    token: 'jwt-token',
    expiresAt: '2026-08-12T00:00:00.000Z',
    userId: 1,
    displayName: 'Test User',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    localStorage.clear();
    apiService = jasmine.createSpyObj<ApiService>('ApiService', ['login']);

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]), { provide: ApiService, useValue: apiService }],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('successful login', () => {
    beforeEach(() => {
      apiService.login.and.returnValue(of(successResponse));
      component.email = 'test@example.com';
      component.password = 'password123';
    });

    it('passes the entered credentials to the API', () => {
      component.login();

      expect(apiService.login).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('stores the returned token', () => {
      component.login();

      expect(authService.token).toBe('jwt-token');
      expect(authService.isLoggedIn).toBe(true);
    });

    it('navigates to the dashboard', () => {
      component.login();

      expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    });

    it('leaves no error message behind', () => {
      component.errorMessage = 'a previous failure';

      component.login();

      expect(component.errorMessage).toBe('');
    });
  });

  describe('failed login', () => {
    it('shows the message the backend supplies', () => {
      apiService.login.and.returnValue(
        throwError(() => ({ error: { message: 'Invalid email or password.' } }))
      );

      component.login();

      expect(component.errorMessage).toBe('Invalid email or password.');
    });

    it('falls back to a generic message when the error carries no body', () => {
      // e.g. a network failure or a 500 with an empty response — the mock
      // always sends { message }, so this branch is unreachable from E2E.
      apiService.login.and.returnValue(throwError(() => new Error('connection refused')));

      component.login();

      expect(component.errorMessage).toBe('Login failed. Please try again.');
    });

    it('does not store a token', () => {
      apiService.login.and.returnValue(
        throwError(() => ({ error: { message: 'Invalid email or password.' } }))
      );

      component.login();

      expect(authService.token).toBeNull();
      expect(authService.isLoggedIn).toBe(false);
    });

    it('does not navigate away', () => {
      apiService.login.and.returnValue(
        throwError(() => ({ error: { message: 'Invalid email or password.' } }))
      );

      component.login();

      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });
  });
});
