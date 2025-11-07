import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthStateService } from './auth/auth-state.service';
import { SettingsStateService } from './settings/settings-state.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterModule],
  template: `
    <div class="top-banner">
      <div class="top-banner__inner">
        <span class="top-banner__title">{{ schoolName() }}</span>
        <span class="top-banner__year" *ngIf="year()">Academic Year: {{ year() }}</span>
      </div>
    </div>
    <div class="global-nav">
      <a class="home-link" [routerLink]="dashboardPath()">Home / Dashboard</a>
      <div class="right">
        <span class="who">{{ displayName() }}</span>
        <button type="button" class="logout-btn" (click)="logout()">Logout</button>
      </div>
    </div>
    <router-outlet />
  `,
  styleUrls: ['./app.scss']
})
export class App {
  private http = inject(HttpClient);
  private auth = inject(AuthStateService);
  private settings = inject(SettingsStateService);
  protected readonly title = signal('web');
  protected schoolName = signal('SchoolPro');
  protected year = signal('');

  constructor(){
    this.settings.ensureLoaded();
    // Backward-compat for name while migrating
    this.http.get<any>('http://localhost:3000/api/settings').subscribe({
      next: (s) => {
        if (s && s.schoolName) this.schoolName.set(s.schoolName);
        if (s && s.academicYear) this.year.set(s.academicYear);
      }
    });
  }

  dashboardPath(){
    const role = (this.auth.role() || '').toLowerCase();
    return role === 'parent' ? '/parent/parent_student' : '/dashboard';
  }

  logout(){
    localStorage.removeItem('access_token');
    this.auth.refresh();
    try { sessionStorage.clear(); } catch {}
    window.location.assign('/login');
  }

  displayName(){
    const role = (this.auth.role() || '').toLowerCase();
    if (role === 'admin') return 'Administrator';
    return this.auth.fullName() || this.auth.email() || (role ? role.charAt(0).toUpperCase() + role.slice(1) : '');
  }
}
