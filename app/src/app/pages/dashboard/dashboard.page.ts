import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonGrid, IonRow, IonCol, IonButton, IonIcon,
  IonTabBar, IonTabButton, IonTabs, IonLabel,
  IonButtons,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { barbellOutline, timeOutline, personOutline, homeOutline, logOutOutline } from 'ionicons/icons';
import { ApiService, Workout } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonGrid, IonRow, IonCol, IonButton, IonIcon,
    IonLabel, IonButtons,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title data-testid="dashboard-title">Dashboard</ion-title>
        <ion-buttons slot="end">
          <ion-button data-testid="logout-btn" (click)="logout()">
            <ion-icon name="log-out-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-grid>
        <ion-row>
          <ion-col size="6">
            <ion-card data-testid="dashboard-total-workouts-card" (click)="goTo('/workouts')">
              <ion-card-header>
                <ion-card-title>{{ totalWorkouts }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>Total Workouts</ion-card-content>
            </ion-card>
          </ion-col>
          <ion-col size="6">
            <ion-card data-testid="dashboard-total-duration-card">
              <ion-card-header>
                <ion-card-title>{{ totalDuration }} min</ion-card-title>
              </ion-card-header>
              <ion-card-content>Total Duration</ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
        <ion-row>
          <ion-col size="6">
            <ion-card data-testid="dashboard-this-week-card">
              <ion-card-header>
                <ion-card-title>{{ thisWeekCount }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>This Week</ion-card-content>
            </ion-card>
          </ion-col>
          <ion-col size="6">
            <ion-card data-testid="dashboard-streak-card">
              <ion-card-header>
                <ion-card-title>{{ streak }} days</ion-card-title>
              </ion-card-header>
              <ion-card-content>Current Streak</ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>

      <ion-button data-testid="nav-workouts-btn" expand="block" (click)="goTo('/workouts')" class="ion-margin-top">
        <ion-icon name="barbell-outline" slot="start"></ion-icon>
        Workouts
      </ion-button>
      <ion-button data-testid="nav-history-btn" expand="block" (click)="goTo('/history')" color="secondary">
        <ion-icon name="time-outline" slot="start"></ion-icon>
        History
      </ion-button>
      <ion-button data-testid="nav-profile-btn" expand="block" (click)="goTo('/profile')" color="tertiary">
        <ion-icon name="person-outline" slot="start"></ion-icon>
        Profile
      </ion-button>
    </ion-content>
  `,
})
export class DashboardPage implements OnInit {
  totalWorkouts = 0;
  totalDuration = 0;
  thisWeekCount = 0;
  streak = 0;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
  ) {
    addIcons({ barbellOutline, timeOutline, personOutline, homeOutline, logOutOutline });
  }

  ngOnInit() {
    this.api.getWorkouts().subscribe({
      next: (workouts) => {
        this.totalWorkouts = workouts.length;
        this.totalDuration = workouts.reduce((sum, w) => sum + w.durationMinutes, 0);
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        this.thisWeekCount = workouts.filter(
          (w) => new Date(w.date) >= weekAgo
        ).length;
        this.streak = this.calculateStreak(workouts);
      },
      error: () => {
        // Use fallback data for demo
        this.totalWorkouts = 0;
        this.totalDuration = 0;
      },
    });
  }

  private calculateStreak(workouts: Workout[]): number {
    if (!workouts.length) return 0;
    const dates = [...new Set(workouts.map((w) => w.date.split('T')[0]))].sort().reverse();
    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) streak++;
      else break;
    }
    return streak;
  }

  goTo(path: string) {
    this.router.navigateByUrl(path);
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
