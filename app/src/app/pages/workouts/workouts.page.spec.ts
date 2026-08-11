import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { WorkoutsPage } from './workouts.page';
import { ApiService, Workout } from '../../services/api.service';

/**
 * WorkoutsPage.filteredWorkouts is the app's only search implementation. The
 * E2E suites check that typing narrows the list, but not the rules — which
 * fields are searched, whether it is case sensitive, what an all-whitespace
 * term means. Those are cheap to pin here and awkward to pin through a browser.
 */
describe('WorkoutsPage', () => {
  let fixture: ComponentFixture<WorkoutsPage>;
  let component: WorkoutsPage;
  let apiService: jasmine.SpyObj<ApiService>;

  const workouts: Workout[] = [
    { id: 1, exerciseType: 'Running', durationMinutes: 30, date: '2026-08-11', notes: 'Park loop' },
    { id: 2, exerciseType: 'Cycling', durationMinutes: 45, date: '2026-08-10', notes: 'Hill repeats' },
    { id: 3, exerciseType: 'Swimming', durationMinutes: 25, date: '2026-08-09', notes: null },
    { id: 4, exerciseType: 'Weight Training', durationMinutes: 60, date: '2026-08-08' },
  ];

  async function setUp(data: Workout[] | Error = workouts): Promise<void> {
    apiService = jasmine.createSpyObj<ApiService>('ApiService', ['getWorkouts']);
    apiService.getWorkouts.and.returnValue(
      data instanceof Error ? throwError(() => data) : of(data)
    );

    await TestBed.configureTestingModule({
      imports: [WorkoutsPage],
      providers: [provideRouter([]), { provide: ApiService, useValue: apiService }],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkoutsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('loading', () => {
    it('shows every workout the API returns when unfiltered', async () => {
      await setUp();

      expect(component.filteredWorkouts.length).toBe(4);
    });

    it('renders an empty list when the API errors', async () => {
      await setUp(new Error('network down'));

      expect(component.workouts).toEqual([]);
      expect(component.filteredWorkouts).toEqual([]);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await setUp();
    });

    it('matches on exercise type', () => {
      component.onSearch('Running');

      expect(component.filteredWorkouts.map((w) => w.id)).toEqual([1]);
    });

    it('matches on notes as well as exercise type', () => {
      component.onSearch('hill');

      expect(component.filteredWorkouts.map((w) => w.id)).toEqual([2]);
    });

    it('is case insensitive', () => {
      component.onSearch('RUNNING');

      expect(component.filteredWorkouts.map((w) => w.id)).toEqual([1]);
    });

    it('matches partial words', () => {
      component.onSearch('wim');

      expect(component.filteredWorkouts.map((w) => w.id)).toEqual([3]);
    });

    it('treats a whitespace-only term as no filter', () => {
      component.onSearch('   ');

      expect(component.filteredWorkouts.length).toBe(4);
    });

    it('restores the full list when cleared', () => {
      component.onSearch('Running');
      component.onSearch('');

      expect(component.filteredWorkouts.length).toBe(4);
    });

    it('survives a null term from ion-searchbar', () => {
      // ionInput emits `string | null | undefined`; a null reaching the filter
      // untreated would throw on .toLowerCase() and blank the page.
      component.onSearch(null);

      expect(component.filteredWorkouts.length).toBe(4);
    });

    it('does not throw on workouts with null notes', () => {
      // Workout 3 has notes: null, and POST /api/workouts stores null when the
      // field is omitted, so this is the common shape rather than an edge case.
      expect(() => component.onSearch('loop')).not.toThrow();
      expect(component.filteredWorkouts.map((w) => w.id)).toEqual([1]);
    });

    it('returns nothing when no workout matches', () => {
      component.onSearch('kayaking');

      expect(component.filteredWorkouts).toEqual([]);
    });
  });

  describe('navigation', () => {
    it('routes to the add-workout page', async () => {
      await setUp();
      const router = TestBed.inject(Router);
      spyOn(router, 'navigateByUrl').and.resolveTo(true);

      component.addWorkout();

      expect(router.navigateByUrl).toHaveBeenCalledWith('/workouts/add');
    });
  });
});
