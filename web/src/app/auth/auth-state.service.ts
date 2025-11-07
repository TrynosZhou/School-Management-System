import { Injectable, signal } from '@angular/core';

export interface JwtPayload { sub: string; email: string; role?: string; fullName?: string | null; iat?: number; exp?: number }

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  role = signal<string | null>(null);
  email = signal<string | null>(null);
  fullName = signal<string | null>(null);

  constructor() {
    this.refresh();
    window.addEventListener('storage', () => this.refresh());
  }

  refresh() {
    const token = localStorage.getItem('access_token');
    if (!token) { this.role.set(null); this.email.set(null); this.fullName.set(null); return; }
    try {
      const [, payloadB64] = token.split('.');
      const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(json) as JwtPayload;
      this.role.set(payload.role ? String(payload.role).toLowerCase() : null);
      this.email.set(payload.email ?? null);
      this.fullName.set(payload.fullName ?? null);
    } catch {
      this.role.set(null); this.email.set(null); this.fullName.set(null);
    }
  }

  isAdmin() { return this.role() === 'admin'; }
}
