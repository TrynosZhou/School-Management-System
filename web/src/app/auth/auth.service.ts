import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
  fullName?: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  access_token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private baseUrl = '/api/auth';

  register(data: { email: string; password: string; role?: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, data)
      .pipe(
        timeout(15000),
        catchError((err) => {
          const msg = err?.error?.message || err?.message || 'Registration failed (server unreachable)';
          return throwError(() => new Error(msg));
        })
      );
  }

  registerParent(data: { email: string; password: string; fullName?: string | null; contactNumber?: string | null }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register-parent`, data)
      .pipe(
        timeout(15000),
        catchError((err) => {
          const msg = err?.error?.message || err?.message || 'Registration failed (server unreachable)';
          return throwError(() => new Error(msg));
        })
      );
  }

  login(data: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, data)
      .pipe(
        timeout(15000),
        catchError((err) => {
          const msg = err?.error?.message || err?.message || 'Login failed (server unreachable)';
          return throwError(() => new Error(msg));
        })
      );
  }
}
