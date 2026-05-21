import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'workouts',
    loadComponent: () =>
      import('./pages/workouts/workouts.page').then((m) => m.WorkoutsPage),
  },
  {
    path: 'workouts/add',
    loadComponent: () =>
      import('./pages/workouts/add-workout.page').then(
        (m) => m.AddWorkoutPage,
      ),
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./pages/history/history.page').then((m) => m.HistoryPage),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile/profile.page').then((m) => m.ProfilePage),
  },
];
