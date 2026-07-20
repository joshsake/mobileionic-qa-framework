import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonItem, IonLabel, IonInput, IonButton, IonSelect,
  IonSelectOption, IonTextarea, IonBackButton, IonButtons,
  IonText, IonDatetime,
} from '@ionic/angular/standalone';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-add-workout',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonItem, IonLabel, IonInput, IonButton, IonSelect,
    IonSelectOption, IonTextarea, IonBackButton, IonButtons,
    IonText, IonDatetime,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button data-testid="add-workout-back-btn" defaultHref="/workouts"></ion-back-button>
        </ion-buttons>
        <ion-title data-testid="add-workout-title">Add Workout</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-item>
        <ion-select
          data-testid="add-workout-exercise-select"
          label="Exercise Type"
          labelPlacement="floating"
          [(ngModel)]="exercise"
          placeholder="Select exercise"
        >
          <ion-select-option value="Running">Running</ion-select-option>
          <ion-select-option value="Cycling">Cycling</ion-select-option>
          <ion-select-option value="Swimming">Swimming</ion-select-option>
          <ion-select-option value="Weight Training">Weight Training</ion-select-option>
          <ion-select-option value="Yoga">Yoga</ion-select-option>
          <ion-select-option value="HIIT">HIIT</ion-select-option>
          <ion-select-option value="Walking">Walking</ion-select-option>
          <ion-select-option value="Other">Other</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <ion-input
          data-testid="add-workout-duration-input"
          type="number"
          label="Duration (minutes)"
          labelPlacement="floating"
          [(ngModel)]="duration"
          placeholder="e.g. 30"
          min="1"
        ></ion-input>
      </ion-item>
      <ion-item>
        <ion-input
          data-testid="add-workout-date-input"
          type="date"
          label="Date"
          labelPlacement="floating"
          [(ngModel)]="date"
        ></ion-input>
      </ion-item>
      <ion-item>
        <ion-textarea
          data-testid="add-workout-notes-input"
          label="Notes"
          labelPlacement="floating"
          [(ngModel)]="notes"
          placeholder="Optional notes about your workout"
          rows="3"
        ></ion-textarea>
      </ion-item>
      <ion-text color="danger" *ngIf="errorMessage">
        <p data-testid="add-workout-error">{{ errorMessage }}</p>
      </ion-text>
      <ion-text color="success" *ngIf="successMessage">
        <p data-testid="add-workout-success">{{ successMessage }}</p>
      </ion-text>
      <ion-button
        data-testid="add-workout-submit-btn"
        expand="block"
        (click)="submit()"
        [disabled]="!exercise || !duration || !date"
        class="ion-margin-top"
      >
        Save Workout
      </ion-button>
      <ion-button
        data-testid="add-workout-cancel-btn"
        expand="block"
        fill="outline"
        (click)="cancel()"
        class="ion-margin-top"
      >
        Cancel
      </ion-button>
    </ion-content>
  `,
})
export class AddWorkoutPage {
  exercise = '';
  duration: number | null = null;
  date = new Date().toISOString().split('T')[0];
  notes = '';
  errorMessage = '';
  successMessage = '';

  constructor(
    private api: ApiService,
    private router: Router,
  ) {}

  submit() {
    if (!this.exercise || !this.duration || !this.date) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }
    this.errorMessage = '';
    this.api
      .addWorkout({
        exerciseType: this.exercise,
        durationMinutes: this.duration,
        date: this.date,
        notes: this.notes,
      })
      .subscribe({
        next: () => {
          this.successMessage = 'Workout saved!';
          setTimeout(() => this.router.navigateByUrl('/workouts'), 1000);
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message || 'Failed to save workout. Please try again.';
        },
      });
  }

  cancel() {
    this.router.navigateByUrl('/workouts');
  }
}
