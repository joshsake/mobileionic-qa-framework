import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AddWorkoutPage } from './add-workout.page';
import { ApiService } from '../../services/api.service';

/**
 * The add-workout form guards submission twice — once with the button's
 * [disabled] binding and again inside submit(). The second guard is
 * unreachable through the UI precisely because the first one works, so it can
 * only be covered here; without that, a refactor that loosened the binding
 * would leave the fallback untested.
 */
describe('AddWorkoutPage', () => {
  let fixture: ComponentFixture<AddWorkoutPage>;
  let component: AddWorkoutPage;
  let apiService: jasmine.SpyObj<ApiService>;
  let router: Router;

  beforeEach(async () => {
    apiService = jasmine.createSpyObj<ApiService>('ApiService', ['addWorkout']);

    await TestBed.configureTestingModule({
      imports: [AddWorkoutPage],
      providers: [provideRouter([]), { provide: ApiService, useValue: apiService }],
    }).compileComponents();

    fixture = TestBed.createComponent(AddWorkoutPage);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.detectChanges();
  });

  /** Put the form in a submittable state. */
  function fillValidForm(): void {
    component.exercise = 'Running';
    component.duration = 45;
    component.date = '2026-08-11';
    component.notes = 'Morning session';
  }

  describe('defaults', () => {
    it("seeds the date with today so the field is valid on arrival", () => {
      const today = new Date().toISOString().split('T')[0];

      expect(component.date).toBe(today);
    });

    it('starts with no exercise or duration', () => {
      expect(component.exercise).toBe('');
      expect(component.duration).toBeNull();
    });
  });

  describe('validation guard', () => {
    it('refuses to submit without an exercise type', () => {
      component.duration = 30;
      component.exercise = '';

      component.submit();

      expect(apiService.addWorkout).not.toHaveBeenCalled();
      expect(component.errorMessage).toBe('Please fill in all required fields.');
    });

    it('refuses to submit without a duration', () => {
      component.exercise = 'Running';
      component.duration = null;

      component.submit();

      expect(apiService.addWorkout).not.toHaveBeenCalled();
      expect(component.errorMessage).toBe('Please fill in all required fields.');
    });

    it('refuses to submit without a date', () => {
      component.exercise = 'Running';
      component.duration = 30;
      component.date = '';

      component.submit();

      expect(apiService.addWorkout).not.toHaveBeenCalled();
    });

    it('treats a zero duration as missing', () => {
      // The guard is a falsiness check, so 0 is rejected. That happens to be
      // the desired outcome — a zero-minute workout is not meaningful — but it
      // is a consequence of the implementation rather than an explicit rule,
      // so it is pinned here.
      component.exercise = 'Running';
      component.duration = 0;

      component.submit();

      expect(apiService.addWorkout).not.toHaveBeenCalled();
    });
  });

  describe('successful submission', () => {
    beforeEach(() => {
      apiService.addWorkout.and.returnValue(of({ id: 16, exerciseType: 'Running', durationMinutes: 45, date: '2026-08-11' }));
      fillValidForm();
    });

    it('sends the form values under the API field names', () => {
      component.submit();

      expect(apiService.addWorkout).toHaveBeenCalledWith({
        exerciseType: 'Running',
        durationMinutes: 45,
        date: '2026-08-11',
        notes: 'Morning session',
      });
    });

    it('confirms the save to the user', () => {
      component.submit();

      expect(component.successMessage).toBe('Workout saved!');
      expect(component.errorMessage).toBe('');
    });

    it('returns to the list after a delay, not immediately', fakeAsync(() => {
      component.submit();

      // The success message is meant to be readable before navigating away.
      expect(router.navigateByUrl).not.toHaveBeenCalled();

      tick(1000);

      expect(router.navigateByUrl).toHaveBeenCalledWith('/workouts');
    }));
  });

  describe('failed submission', () => {
    beforeEach(() => {
      fillValidForm();
    });

    it('shows the message the backend supplies', () => {
      apiService.addWorkout.and.returnValue(
        throwError(() => ({ error: { message: 'exerciseType and durationMinutes are required.' } }))
      );

      component.submit();

      expect(component.errorMessage).toBe('exerciseType and durationMinutes are required.');
    });

    it('falls back to a generic message when the error carries no body', () => {
      apiService.addWorkout.and.returnValue(throwError(() => new Error('connection refused')));

      component.submit();

      expect(component.errorMessage).toBe('Failed to save workout. Please try again.');
    });

    it('does not navigate away', fakeAsync(() => {
      apiService.addWorkout.and.returnValue(throwError(() => new Error('connection refused')));

      component.submit();
      tick(1000);

      expect(router.navigateByUrl).not.toHaveBeenCalled();
    }));

    it('does not claim success', () => {
      apiService.addWorkout.and.returnValue(throwError(() => new Error('connection refused')));

      component.submit();

      expect(component.successMessage).toBe('');
    });
  });

  describe('cancel', () => {
    it('returns to the list without saving', () => {
      fillValidForm();

      component.cancel();

      expect(apiService.addWorkout).not.toHaveBeenCalled();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/workouts');
    });
  });
});
