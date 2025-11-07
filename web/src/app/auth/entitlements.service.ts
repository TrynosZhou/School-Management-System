import { Injectable, effect, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthStateService } from './auth-state.service';

@Injectable({ providedIn: 'root' })
export class EntitlementsService {
  private http: HttpClient;
  private auth: AuthStateService;
  modules = signal<Set<string>>(new Set());
  loading = signal(false);

  constructor(http: HttpClient, auth: AuthStateService) {
    this.http = http; this.auth = auth;
    effect(() => {
      // reload when email changes
      const email = this.auth.email();
      if (email) this.load(email);
      else this.modules.set(new Set());
    });
  }

  has(key: string): boolean {
    return this.modules().has(key);
  }

  load(email: string) {
    this.loading.set(true);
    this.http.get<{ email: string; modules: string[] }>('/api/settings/user-modules', { params: { email } })
      .subscribe({
        next: (res) => { this.modules.set(new Set(res?.modules || [])); this.loading.set(false); },
        error: () => { this.modules.set(new Set()); this.loading.set(false); }
      });
  }
}
