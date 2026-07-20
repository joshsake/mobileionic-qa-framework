import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonBackButton, IonButtons,
  IonInput, IonNote, IonBadge, IonButton,
} from '@ionic/angular/standalone';
import { ApiService, Workout } from '../../services/api.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonBackButton, IonButtons,
    IonInput, IonNote, IonBadge, IonButton,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button data-testid="history-back-btn" defaultHref="/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title data-testid="history-title">Workout History</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-item>
        <ion-input
          data-testid="history-date-from-input"
          type="date"
          label="From"
          labelPlacement="floating"
          [(ngModel)]="dateFrom"
          (ionChange)="filterWorkouts()"
        ></ion-input>
      </ion-item>
      <ion-item>
        <ion-input
          data-testid="history-date-to-input"
          type="date"
          label="To"
          labelPlacement="floating"
          [(ngModel)]="dateTo"
          (ionChange)="filterWorkouts()"
        ></ion-input>
      </ion-item>
      <ion-button
        data-testid="history-clear-filter-btn"
        fill="outline"
        size="small"
        (click)="clearFilters()"
        class="ion-margin-top"
      >
        Clear Filters
      </ion-button>

      <ion-list data-testid="history-list" class="ion-margin-top">
        <ion-item
          *ngFor="let workout of filteredWorkouts; let i = index"
          [attr.data-testid]="'history-item-' + i"
        >
          <ion-label>
            <h2 [attr.data-testid]="'history-exercise-' + i">{{ workout.exerciseType }}</h2>
            <p [attr.data-testid]="'history-date-' + i">{{ workout.date | date:'mediumDate' }}</p>
            <p *ngIf="workout.notes" [attr.data-testid]="'history-notes-' + i">{{ workout.notes }}</p>
          </ion-label>
          <ion-badge slot="end" [attr.data-testid]="'history-duration-' + i">
            {{ workout.durationMinutes }} min
          </ion-badge>
        </ion-item>
        <ion-item *ngIf="filteredWorkouts.length === 0" data-testid="history-empty-state">
          <ion-label>No workouts found for the selected date range.</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  `,
})
export class HistoryPage implements OnInit {
  allWorkouts: Workout[] = [];
  filteredWorkouts: Workout[] = [];
  dateFrom = '';
  dateTo = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getWorkouts().subscribe({
      next: (data) => {
        this.allWorkouts = data;
        this.filteredWorkouts = data;
      },
      error: () => {
        this.allWorkouts = [];
        this.filteredWorkouts = [];
      },
    });
  }

  filterWorkouts() {
    this.filteredWorkouts = this.allWorkouts.filter((w) => {
      const wDate = new Date(w.date);
      if (this.dateFrom && wDate < new Date(this.dateFrom)) return false;
      if (this.dateTo && wDate > new Date(this.dateTo)) return false;
      return true;
    });
  }

  clearFilters() {
    this.dateFrom = '';
    this.dateTo = '';
    this.filteredWorkouts = [...this.allWorkouts];
  }
}
