import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'auth_token';
  private loggedIn$ = new BehaviorSubject<boolean>(this.hasToken());

  get isLoggedIn$() {
    return this.loggedIn$.asObservable();
  }

  get isLoggedIn(): boolean {
    return this.loggedIn$.value;
  }

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this.loggedIn$.next(true);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.loggedIn$.next(false);
  }
}
