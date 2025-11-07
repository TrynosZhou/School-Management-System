import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AccountsService } from './accounts.service';
import { AuthStateService } from '../auth/auth-state.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-my-fees',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="navbar">
        <div class="brand">Dashboard</div>
        <div class="userbar">
          <span class="who">{{ displayName() || 'User' }}</span>
          <button class="options" type="button" (click)="logout()">Logout</button>
        </div>
      </div>
      <div class="top">
        <h2>My Fees Balance</h2>
      </div>
      <div class="search">
        <label>Student ID (e.g., JHS0000123)</label>
        <input [(ngModel)]="studentCode" placeholder="Enter Student ID" />
        <button (click)="lookup()" [disabled]="loading()"><span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg></span>{{ loading() ? 'Loading…' : 'Check Balance' }}</button>
        <span class="err" *ngIf="err()">{{ err() }}</span>
      </div>

      <div *ngIf="data()" class="card">
        <div class="header">
          <div>
            <div class="name">{{ data()!.student.name }}</div>
            <div class="code">{{ data()!.student.code }}</div>
          </div>
          <div class="actions">
            <button (click)="payFees()"><span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg></span>Pay Fees</button>
            <button (click)="downloadStatement()"><span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3v12"/><path d="M7 12l5 5 5-5"/><path d="M5 21h14"/></svg></span>Download Statement</button>
            <button (click)="print()"><span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="6" y="9" width="12" height="8" rx="2"/><path d="M8 9V5h8v4"/></svg></span>Print</button>
          </div>
        </div>
        <div class="balance" [class.owe]="data()!.balance > 0" [class.clear]="data()!.balance <= 0">
          Balance: {{ data()!.balance | number:'1.2-2' }}
        </div>

        <h3>Invoices</h3>
        <table class="table" *ngIf="data()!.invoices?.length; else noInv">
          <thead>
            <tr><th>Date</th><th>Term</th><th>Year</th><th>Description</th><th>Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let i of data()!.invoices">
              <td>{{ i.createdAt | date:'mediumDate' }}</td>
              <td>{{ i.term }}</td>
              <td>{{ i.academicYear }}</td>
              <td>{{ i.description || '-' }}</td>
              <td>{{ i.amount | number:'1.2-2' }}</td>
              <td>{{ i.status }}</td>
            </tr>
          </tbody>
        </table>
        <ng-template #noInv><div class="muted">No invoices found</div></ng-template>

        <h3>Transactions</h3>
        <table class="table" *ngIf="data()!.transactions?.length; else noTx">
          <thead>
            <tr><th>Date</th><th>Type</th><th>Term</th><th>Year</th><th>Note</th><th>Amount</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let t of data()!.transactions">
              <td>{{ t.createdAt | date:'medium' }}</td>
              <td>{{ t.type }}</td>
              <td>{{ t.term || '-' }}</td>
              <td>{{ t.academicYear || '-' }}</td>
              <td>{{ t.note || '-' }}</td>
              <td>{{ t.amount | number:'1.2-2' }}</td>
            </tr>
          </tbody>
        </table>
        <ng-template #noTx><div class="muted">No transactions</div></ng-template>
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:1000px;margin:24px auto;display:grid;gap:16px}
    .navbar{background:#3f51b5;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-radius:10px}
    .brand{font-weight:700}
    .userbar{display:flex;gap:8px;align-items:center}
    .who{font-weight:600}
    .options{background:#fff;color:#0b53a5;border:none;border-radius:4px;padding:6px 10px;cursor:pointer}
    .top{display:flex;justify-content:space-between;align-items:center}
    .home{font-size:14px}
    .search{display:flex;gap:8px;align-items:center}
    .search button{background:#0b53a5;color:#fff;font-weight:700;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;transition:background 0.2s}
    .search button:hover{background:#073d7a}
    .search button:disabled{background:#9ca3af;cursor:not-allowed}
    label{font-size:12px;color:#6b7280}
    input{padding:8px;border:1px solid #e5e7eb;border-radius:8px}
    .err{color:#b91c1c;margin-left:8px}
    .card{background:#fff;border:1px solid #eee;border-radius:10px;padding:16px}
    .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
    .header .actions{display:flex;gap:8px}
    .header .actions button{background:#0b53a5;color:#fff;font-weight:700;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;transition:background 0.2s}
    .header .actions button:hover{background:#073d7a}
    .i{display:inline-flex;width:16px;height:16px;margin-right:6px}
    .i svg{width:16px;height:16px}
    .name{font-weight:600}
    .code{color:#6b7280;font-size:12px}
    .balance{font-weight:700}
    .balance.owe{color:#b91c1c}
    .balance.clear{color:#166534}
    .table{width:100%;border-collapse:collapse;margin-top:8px}
    th,td{padding:8px;border-bottom:1px solid #f1f2f6;text-align:left}
    .muted{color:#9ca3af}
  `]
})
export class MyFeesComponent {
  private accounts = inject(AccountsService);
  private auth = inject(AuthStateService);
  private router = inject(Router);

  studentCode = '';
  loading = signal(false);
  err = signal<string | null>(null);
  data = signal<any | null>(null);

  displayName(){
    const role = (this.auth.role() || '').toLowerCase();
    if (role === 'admin') return 'Administrator';
    return this.auth.fullName() || this.auth.email() || (role ? role.charAt(0).toUpperCase() + role.slice(1) : null);
  }

  logout(){
    try { localStorage.removeItem('access_token'); } catch {}
    try { this.auth.refresh(); } catch {}
    // Send parents back to parent login if applicable, else to staff login
    const role = (this.auth.role() || '').toLowerCase();
    const dest = role === 'parent' ? '/parent/login' : '/login';
    try {
      this.router.navigateByUrl(dest);
    } catch {
      try { window.location.assign(dest); } catch { window.location.href = dest; }
    }
  }

  lookup() {
    const code = (this.studentCode || '').trim();
    if (!code) { this.err.set('Enter a Student ID'); return; }
    this.loading.set(true); this.err.set(null); this.data.set(null);
    this.accounts.getBalancePublic(code).subscribe({
      next: (res) => { this.loading.set(false); this.data.set(res); },
      error: (e) => { this.loading.set(false); this.err.set(e?.error?.message || 'Lookup failed'); }
    });
  }

  downloadStatement() {
    const d = this.data(); if (!d) return;
    const idOrCode = d.student.code || '';
    this.accounts.downloadStatement(idOrCode).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `statement-${idOrCode}.pdf`; a.click();
      URL.revokeObjectURL(url);
    });
  }

  print() { window.print(); }

  payFees() {
    const d = this.data();
    if (!d || !d.student?.code) {
      alert('Please check a student balance first');
      return;
    }
    // Navigate to record-payment page with student code as query parameter
    this.router.navigate(['/accounts/record-payment'], {
      queryParams: { student: d.student.code }
    });
  }
}
