import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AccountsService } from '../accounts/accounts.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="navbar">
        <div class="brand">Student Dashboard</div>
        <div class="userbar">
          <a class="options" routerLink="/e-learning">E-Learning</a>
          <a class="options" routerLink="/login">Logout</a>
        </div>
      </div>

      <div class="card">
        <div class="header"><div class="name">Current Invoice Balance</div></div>
        <div class="row">
          <label>Student ID (e.g., JHS0000123)</label>
          <input [(ngModel)]="studentCode" placeholder="Enter Student ID" />
          <button (click)="lookup()" [disabled]="loading()">{{ loading() ? 'Loading…' : 'Fetch Balance' }}</button>
          <span class="err" *ngIf="err()">{{ err() }}</span>
        </div>
        <div class="balance owe" *ngIf="data()">Balance: {{ data()!.balance | number: '1.2-2' }}</div>
      </div>

      <div class="card">
        <div class="header"><div class="name">Report Card</div></div>
        <div class="row rc-row">
          <label>Student ID</label>
          <input [(ngModel)]="studentCode" placeholder="Enter Student ID" />
          <label>Term</label>
          <select [(ngModel)]="rcTerm">
            <option value="">All Terms</option>
            <option>Term 1</option>
            <option>Term 2</option>
            <option>Term 3</option>
          </select>
          <label>Exam Session</label>
          <select [(ngModel)]="rcExam">
            <option value="">Any Exam</option>
            <option>Midterm</option>
            <option>End of Term</option>
            <option>Mock</option>
            <option>Final</option>
          </select>
          <label>Academic Year</label>
          <input [(ngModel)]="rcYear" placeholder="e.g. 2024/2025" />
          <button class="options" (click)="openReportCard()" [disabled]="!studentCode.trim()">Open Report Card</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:1000px;margin:24px auto;display:grid;gap:16px}
    .navbar{background:#3f51b5;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-radius:10px}
    .brand{font-weight:700}
    .userbar{display:flex;gap:8px;align-items:center}
    .options{background:#fff;color:#0b53a5;border:none;border-radius:4px;padding:6px 10px;cursor:pointer;text-decoration:none}
    .card{background:#fff;border:1px solid #eee;border-radius:10px;padding:16px}
    .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
    .name{font-weight:600}
    .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    label{font-size:12px;color:#6b7280}
    input,select{padding:8px;border:1px solid #e5e7eb;border-radius:8px}
    .err{color:#b91c1c}
    .balance{font-weight:700}
    .balance.owe{color:#b91c1c}
  `]
})
export class StudentDashboardComponent {
  private accounts = inject(AccountsService);

  studentCode = '';
  loading = signal(false);
  err = signal<string | null>(null);
  data = signal<any | null>(null);

  rcTerm: string = '';
  rcExam: string = '';
  rcYear: string = '';

  lookup() {
    const code = (this.studentCode || '').trim();
    if (!code) { this.err.set('Enter a Student ID'); return; }
    this.loading.set(true); this.err.set(null); this.data.set(null);
    this.accounts.getBalancePublic(code).subscribe({
      next: (res) => { this.loading.set(false); this.data.set(res); },
      error: (e) => { this.loading.set(false); this.err.set(e?.error?.message || 'Lookup failed'); }
    });
  }

  openReportCard(){
    const raw = (this.studentCode || '').trim();
    if (!raw) return;
    const base = window.location.origin;
    const u = new URL(`${base}/student/report-card/${encodeURIComponent(raw)}/view`);
    if (this.rcTerm) u.searchParams.set('term', this.rcTerm);
    if (this.rcExam) u.searchParams.set('examType', this.rcExam);
    if (this.rcYear) u.searchParams.set('academicYear', this.rcYear);
    window.open(u.toString(), '_blank');
  }
}
