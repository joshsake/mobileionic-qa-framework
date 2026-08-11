import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ProfilePage } from './profile.page';
import { ApiService, UserProfile } from '../../services/api.service';

/**
 * The profile page has no E2E coverage at all, in any suite. Its save path has
 * the same message-fallback branch as the other forms and the same
 * "don't claim success on failure" requirement.
 */
describe('ProfilePage', () => {
  let fixture: ComponentFixture<ProfilePage>;
  let component: ProfilePage;
  let apiService: jasmine.SpyObj<ApiService>;

  const profile: UserProfile = { id: 1, name: 'Test User', email: 'test@example.com' };

  async function setUp(loaded: UserProfile | Error = profile): Promise<void> {
    apiService = jasmine.createSpyObj<ApiService>('ApiService', ['getProfile', 'updateProfile']);
    apiService.getProfile.and.returnValue(
      loaded instanceof Error ? throwError(() => loaded) : of(loaded)
    );

    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [{ provide: ApiService, useValue: apiService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('loading', () => {
    it('populates the form from the API', async () => {
      await setUp();

      expect(component.profile).toEqual(profile);
    });

    it('falls back to a blank profile when the API errors', async () => {
      // Blank, not undefined — the template binds profile.name/.email with
      // ngModel, and an undefined profile would throw during render.
      await setUp(new Error('network down'));

      expect(component.profile).toEqual({ name: '', email: '' });
    });
  });

  describe('saving', () => {
    beforeEach(async () => {
      await setUp();
    });

    it('sends the current profile', () => {
      apiService.updateProfile.and.returnValue(of(profile));
      component.profile = { ...profile, name: 'Renamed' };

      component.saveProfile();

      expect(apiService.updateProfile).toHaveBeenCalledWith({ ...profile, name: 'Renamed' });
    });

    it('adopts the server response rather than keeping local state', () => {
      // The backend only persists displayName, so what it returns can differ
      // from what was sent; the form must show the stored truth.
      const serverVersion: UserProfile = { ...profile, name: 'Server Normalised' };
      apiService.updateProfile.and.returnValue(of(serverVersion));

      component.saveProfile();

      expect(component.profile).toEqual(serverVersion);
      expect(component.successMessage).toBe('Profile updated successfully!');
    });

    it('shows the message the backend supplies on failure', () => {
      apiService.updateProfile.and.returnValue(
        throwError(() => ({ error: { message: 'User not found.' } }))
      );

      component.saveProfile();

      expect(component.errorMessage).toBe('User not found.');
      expect(component.successMessage).toBe('');
    });

    it('falls back to a generic message when the error carries no body', () => {
      apiService.updateProfile.and.returnValue(throwError(() => new Error('connection refused')));

      component.saveProfile();

      expect(component.errorMessage).toBe('Failed to update profile.');
    });

    it('clears a previous error when a later save succeeds', () => {
      apiService.updateProfile.and.returnValue(throwError(() => new Error('connection refused')));
      component.saveProfile();
      expect(component.errorMessage).not.toBe('');

      apiService.updateProfile.and.returnValue(of(profile));
      component.saveProfile();

      expect(component.errorMessage).toBe('');
      expect(component.successMessage).toBe('Profile updated successfully!');
    });
  });
});
