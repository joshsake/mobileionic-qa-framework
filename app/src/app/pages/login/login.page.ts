import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonItem, IonLabel, IonInput, IonButton, IonCard,
  IonCardHeader, IonCardTitle, IonCardContent, IonText,
} from '@ionic/angular/standalone';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonItem, IonLabel, IonInput, IonButton, IonCard,
    IonCardHeader, IonCardTitle, IonCardContent, IonText,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title data-testid="login-title">Fitness Tracker</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-card data-testid="login-card">
        <ion-card-header>
          <ion-card-title data-testid="login-card-title">Sign In</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-input
              data-testid="login-email-input"
              type="email"
              label="Email"
              labelPlacement="floating"
              [(ngModel)]="email"
              placeholder="Enter your email"
            ></ion-input>
          </ion-item>
          <ion-item>
            <ion-input
              data-testid="login-password-input"
              type="password"
              label="Password"
              labelPlacement="floating"
              [(ngModel)]="password"
              placeholder="Enter your password"
            ></ion-input>
          </ion-item>
          <ion-text color="danger" *ngIf="errorMessage">
            <p data-testid="login-error-message">{{ errorMessage }}</p>
          </ion-text>
          <ion-button
            data-testid="login-submit-btn"
            expand="block"
            (click)="login()"
            [disabled]="!email || !password"
            class="ion-margin-top"
          >
            Login
          </ion-button>
        </ion-card-content>
      </ion-card>
    </ion-content>
  `,
})
export class LoginPage {
  email = '';
  password = '';
  errorMessage = '';

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
  ) {}

  login() {
    this.errorMessage = '';
    this.api.login(this.email, this.password).subscribe({
      next: (res) => {
        this.auth.setToken(res.token);
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Login failed. Please try again.';
      },
    });
  }
}
