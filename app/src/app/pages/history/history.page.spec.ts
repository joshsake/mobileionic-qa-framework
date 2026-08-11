import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HistoryPage } from './history.page';
import { ApiService, Workout } from '../../services/api.service';

/**
 * HistoryPage.filterWorkouts is date-range logic written against strings from
 * two different sources: the seed fixtures store date-only values, while
 * POST /api/workouts stamps a full ISO timestamp. Comparing those two shapes
 * with `new Date()` is exactly where off-by-one-day bugs live, and no E2E test
 * asserts the boundary.
 */
describe('HistoryPage', () => {
  let fixture: ComponentFixture<HistoryPage>;
  let component: HistoryPage;
  let apiService: jasmine.SpyObj<ApiService>;

  const workouts: Workout[] = [
    { id: 1, exerciseType: 'Running', durationMinutes: 30, date: '2026-08-01' },
    { id: 2, exerciseType: 'Cycling', durationMinutes: 45, date: '2026-08-05' },
    { id: 3, exerciseType: 'Swimming', durationMinutes: 25, date: '2026-08-10' },
    { id: 4, exerciseType: 'Yoga', durationMinutes: 60, date: '2026-08-15' },
  ];

  async function setUp(data: Workout[] | Error = workouts): Promise<void> {
    apiService = jasmine.createSpyObj<ApiService>('ApiService', ['getWorkouts']);
    apiService.getWorkouts.and.returnValue(
      data instanceof Error ? throwError(() => data) : of(data)
    );

    await TestBed.configureTestingModule({
      imports: [HistoryPage],
      providers: [{ provide: ApiService, useValue: apiService }],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('loading', () => {
    it('starts with every workout shown', async () => {
      await setUp();

      expect(component.filteredWorkouts.length).toBe(4);
    });

    it('renders empty when the API errors', async () => {
      await setUp(new Error('network down'));

      expect(component.allWorkouts).toEqual([]);
      expect(component.filteredWorkouts).toEqual([]);
    });
  });

  describe('filtering', () => {
    beforeEach(async () => {
      await setUp();
    });

    it('filters by a start date', () => {
      component.dateFrom = '2026-08-05';
      component.filterWorkouts();

      expect(component.filteredWorkouts.map((w) => w.id)).toEqual([2, 3, 4]);
    });

    it('filters by an end date', () => {
      component.dateTo = '2026-08-05';
      component.filterWorkouts();

      expect(component.filteredWorkouts.map((w) => w.id)).toEqual([1, 2]);
    });

    it('filters by both ends of a range', () => {
      component.dateFrom = '2026-08-05';
      component.dateTo = '2026-08-10';
      component.filterWorkouts();

      expect(component.filteredWorkouts.map((w) => w.id)).toEqual([2, 3]);
    });

    it('includes workouts falling exactly on the boundaries', () => {
      component.dateFrom = '2026-08-05';
      component.dateTo = '2026-08-05';
      component.filterWorkouts();

      expect(component.filteredWorkouts.map((w) => w.id)).toEqual([2]);
    });

    it('shows everything when neither end is set', () => {
      component.dateFrom = '';
      component.dateTo = '';
      component.filterWorkouts();

      expect(component.filteredWorkouts.length).toBe(4);
    });

    it('returns nothing for a range containing no workouts', () => {
      component.dateFrom = '2026-09-01';
      component.dateTo = '2026-09-30';
      component.filterWorkouts();

      expect(component.filteredWorkouts).toEqual([]);
    });

    it('returns nothing when the range is inverted', () => {
      component.dateFrom = '2026-08-15';
      component.dateTo = '2026-08-01';
      component.filterWorkouts();

      expect(component.filteredWorkouts).toEqual([]);
    });
  });

  describe('clearFilters', () => {
    it('restores the full list', async () => {
      await setUp();
      component.dateFrom = '2026-08-05';
      component.dateTo = '2026-08-10';
      component.filterWorkouts();

      component.clearFilters();

      expect(component.dateFrom).toBe('');
      expect(component.dateTo).toBe('');
      expect(component.filteredWorkouts.length).toBe(4);
    });

    it('does not alias the source list', async () => {
      // clearFilters copies rather than assigning allWorkouts by reference; if
      // it aliased, a later filter would mutate the master list and the next
      // clear would restore an already-filtered set.
      await setUp();

      component.clearFilters();
      component.filteredWorkouts.pop();

      expect(component.allWorkouts.length).toBe(4);
    });
  });
});
