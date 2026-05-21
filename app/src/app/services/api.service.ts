import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Workout {
  id?: number;
  exercise: string;
  duration: number;
  date: string;
  notes?: string;
}

export interface UserProfile {
  id?: number;
  name: string;
  email: string;
  age?: number;
  weight?: number;
  height?: number;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private auth: AuthService,
  ) {}

  private get headers(): HttpHeaders {
    const token = this.auth.token;
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, {
      email,
      password,
    });
  }

  getWorkouts(): Observable<Workout[]> {
    return this.http.get<Workout[]>(`${this.baseUrl}/workouts`, {
      headers: this.headers,
    });
  }

  addWorkout(workout: Omit<Workout, 'id'>): Observable<Workout> {
    return this.http.post<Workout>(`${this.baseUrl}/workouts`, workout, {
      headers: this.headers,
    });
  }

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/profile`, {
      headers: this.headers,
    });
  }

  updateProfile(profile: Partial<UserProfile>): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.baseUrl}/profile`, profile, {
      headers: this.headers,
    });
  }
}
