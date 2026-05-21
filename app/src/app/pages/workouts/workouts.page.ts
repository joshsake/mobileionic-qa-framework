import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonFab, IonFabButton,
  IonIcon, IonBackButton, IonButtons, IonBadge,
  IonNote,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline } from 'ionicons/icons';
import { ApiService, Workout } from '../../services/api.service';

@Component({
  selector: 'app-workouts',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonFab, IonFabButton,
    IonIcon, IonBackButton, IonButtons, IonBadge,
    IonNote,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button data-testid="workouts-back-btn" defaultHref="/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title data-testid="workouts-title">Workouts</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-list data-testid="workout-list">
        <ion-item
          *ngFor="let workout of workouts; let i = index"
          [attr.data-testid]="'workout-list-item-' + i"
          button
        >
          <ion-label>
            <h2 [attr.data-testid]="'workout-name-' + i">{{ workout.exercise }}</h2>
            <p [attr.data-testid]="'workout-date-' + i">{{ workout.date | date:'mediumDate' }}</p>
          </ion-label>
          <ion-note slot="end" [attr.data-testid]="'workout-duration-' + i">
            {{ workout.duration }} min
          </ion-note>
        </ion-item>
        <ion-item *ngIf="workouts.length === 0" data-testid="workout-empty-state">
          <ion-label>No workouts yet. Tap + to add one!</ion-label>
        </ion-item>
      </ion-list>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button data-testid="add-workout-fab" (click)="addWorkout()">
          <ion-icon name="add-outline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
})
export class WorkoutsPage implements OnInit {
  workouts: Workout[] = [];

  constructor(
    private api: ApiService,
    private router: Router,
  ) {
    addIcons({ addOutline });
  }

  ngOnInit() {
    this.loadWorkouts();
  }

  loadWorkouts() {
    this.api.getWorkouts().subscribe({
      next: (data) => (this.workouts = data),
      error: () => (this.workouts = []),
    });
  }

  addWorkout() {
    this.router.navigateByUrl('/workouts/add');
  }
}
