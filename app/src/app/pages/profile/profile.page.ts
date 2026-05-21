import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonItem, IonLabel, IonInput, IonButton, IonBackButton,
  IonButtons, IonText,
} from '@ionic/angular/standalone';
import { ApiService, UserProfile } from '../../services/api.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonItem, IonLabel, IonInput, IonButton, IonBackButton,
    IonButtons, IonText,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button data-testid="profile-back-btn" defaultHref="/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title data-testid="profile-title">Profile</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-item>
        <ion-input
          data-testid="profile-name-input"
          label="Name"
          labelPlacement="floating"
          [(ngModel)]="profile.name"
        ></ion-input>
      </ion-item>
      <ion-item>
        <ion-input
          data-testid="profile-email-input"
          label="Email"
          labelPlacement="floating"
          [(ngModel)]="profile.email"
          type="email"
          readonly
        ></ion-input>
      </ion-item>
      <ion-item>
        <ion-input
          data-testid="profile-age-input"
          label="Age"
          labelPlacement="floating"
          [(ngModel)]="profile.age"
          type="number"
        ></ion-input>
      </ion-item>
      <ion-item>
        <ion-input
          data-testid="profile-weight-input"
          label="Weight (kg)"
          labelPlacement="floating"
          [(ngModel)]="profile.weight"
          type="number"
        ></ion-input>
      </ion-item>
      <ion-item>
        <ion-input
          data-testid="profile-height-input"
          label="Height (cm)"
          labelPlacement="floating"
          [(ngModel)]="profile.height"
          type="number"
        ></ion-input>
      </ion-item>
      <ion-text color="danger" *ngIf="errorMessage">
        <p data-testid="profile-error">{{ errorMessage }}</p>
      </ion-text>
      <ion-text color="success" *ngIf="successMessage">
        <p data-testid="profile-success">{{ successMessage }}</p>
      </ion-text>
      <ion-button
        data-testid="profile-save-btn"
        expand="block"
        (click)="saveProfile()"
        class="ion-margin-top"
      >
        Save Profile
      </ion-button>
    </ion-content>
  `,
})
export class ProfilePage implements OnInit {
  profile: UserProfile = { name: '', email: '' };
  errorMessage = '';
  successMessage = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getProfile().subscribe({
      next: (data) => (this.profile = data),
      error: () => {
        this.profile = { name: '', email: '' };
      },
    });
  }

  saveProfile() {
    this.errorMessage = '';
    this.successMessage = '';
    this.api.updateProfile(this.profile).subscribe({
      next: (data) => {
        this.profile = data;
        this.successMessage = 'Profile updated successfully!';
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.message || 'Failed to update profile.';
      },
    });
  }
}
