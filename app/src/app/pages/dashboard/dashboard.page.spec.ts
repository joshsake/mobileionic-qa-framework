import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DashboardPage } from './dashboard.page';
import { ApiService, Workout } from '../../services/api.service';

/**
 * The dashboard is the only place in the app that derives anything from the
 * workout list rather than just rendering it — totals, a rolling seven-day
 * count and a consecutive-day streak. That arithmetic had no coverage at any
 * layer: the E2E suites assert the tiles render, not that the numbers are
 * right, and a streak that is silently off by one looks exactly like a correct
 * one on screen.
 */
describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let component: DashboardPage;
  let apiService: jasmine.SpyObj<ApiService>;

  /** Build a workout on a given YYYY-MM-DD date. */
  function workoutOn(date: string, durationMinutes = 30): Workout {
    return { exerciseType: 'Running', durationMinutes, date };
  }

  /** Configure the module with getWorkouts returning the supplied list. */
  async function setUp(workouts: Workout[] | Error): Promise<void> {
    apiService = jasmine.createSpyObj<ApiService>('ApiService', ['getWorkouts']);
    apiService.getWorkouts.and.returnValue(
      workouts instanceof Error ? throwError(() => workouts) : of(workouts)
    );

    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: apiService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('totals', () => {
    it('sums workout count and duration', async () => {
      await setUp([
        workoutOn('2026-08-10', 30),
        workoutOn('2026-08-09', 45),
        workoutOn('2026-08-08', 25),
      ]);

      expect(component.totalWorkouts).toBe(3);
      expect(component.totalDuration).toBe(100);
    });

    it('reports zeroes for an empty list rather than NaN', async () => {
      await setUp([]);

      expect(component.totalWorkouts).toBe(0);
      expect(component.totalDuration).toBe(0);
      expect(component.streak).toBe(0);
    });

    it('falls back to zeroes when the API errors', async () => {
      // The page swallows the error deliberately so the shell still renders;
      // this pins that behaviour so a future refactor cannot turn a failed
      // request into a blank or NaN tile without a test noticing.
      await setUp(new Error('network down'));

      expect(component.totalWorkouts).toBe(0);
      expect(component.totalDuration).toBe(0);
    });
  });

  describe('streak', () => {
    it('counts consecutive days back from the most recent workout', async () => {
      await setUp([
        workoutOn('2026-08-11'),
        workoutOn('2026-08-10'),
        workoutOn('2026-08-09'),
      ]);

      expect(component.streak).toBe(3);
    });

    it('stops at the first gap', async () => {
      await setUp([
        workoutOn('2026-08-11'),
        workoutOn('2026-08-10'),
        // 2026-08-09 missing — the streak ends here
        workoutOn('2026-08-08'),
        workoutOn('2026-08-07'),
      ]);

      expect(component.streak).toBe(2);
    });

    it('counts two workouts on the same day once', async () => {
      await setUp([
        workoutOn('2026-08-11'),
        workoutOn('2026-08-11'),
        workoutOn('2026-08-10'),
      ]);

      expect(component.streak).toBe(2);
    });

    it('is 1 for a single workout', async () => {
      await setUp([workoutOn('2026-08-11')]);

      expect(component.streak).toBe(1);
    });

    it('handles unordered input', async () => {
      // The API orders newest-first, but the streak must not silently depend on
      // that — it sorts internally, and this proves it.
      await setUp([
        workoutOn('2026-08-09'),
        workoutOn('2026-08-11'),
        workoutOn('2026-08-10'),
      ]);

      expect(component.streak).toBe(3);
    });

    it('handles full ISO timestamps, not just date-only strings', async () => {
      // The mock seeds date-only strings but POST /api/workouts stamps a full
      // ISO timestamp, so both shapes reach this code in practice.
      await setUp([
        workoutOn('2026-08-11T18:30:00.000Z'),
        workoutOn('2026-08-10T06:15:00.000Z'),
      ]);

      expect(component.streak).toBe(2);
    });

    /*
     * Documents a real quirk rather than asserting a number that looks tidy.
     *
     * calculateStreak measures consecutive days back from the *latest* workout,
     * and never checks that run reaches the present day. A user who trained for
     * three days last year and has not trained since is still shown a
     * three-day "Current Streak". Whether that is a defect is a product call,
     * so this records the behaviour as-is; if the intent is a live streak, this
     * spec is where the change becomes visible.
     */
    it('counts a stale run of days as a current streak (known behaviour)', async () => {
      await setUp([
        workoutOn('2020-01-03'),
        workoutOn('2020-01-02'),
        workoutOn('2020-01-01'),
      ]);

      expect(component.streak).toBe(3);
    });
  });

  describe('this week', () => {
    it('counts only workouts within the last seven days', async () => {
      const now = new Date();
      const daysAgo = (n: number) =>
        new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

      await setUp([
        workoutOn(daysAgo(1)),
        workoutOn(daysAgo(3)),
        workoutOn(daysAgo(6)),
        workoutOn(daysAgo(10)), // outside the window
        workoutOn(daysAgo(30)), // outside the window
      ]);

      expect(component.thisWeekCount).toBe(3);
    });
  });
});
