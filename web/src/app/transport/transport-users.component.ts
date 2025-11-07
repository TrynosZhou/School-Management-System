import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface TransportUser {
  id: string;
  studentId?: string | null;
  firstName: string;
  lastName: string;
  contactNumber?: string | null;
  gender?: string | null;
  className?: string | null;
}

@Component({
  selector: 'app-transport-users',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wrap">
      <div class="top">
        <h2>Transport Users</h2>
        <div class="actions">
          <button (click)="exportCsv()">Export CSV</button>
          <button (click)="exportPdf()">Download PDF</button>
        </div>
      </div>

      <div class="filters">
        <input placeholder="Search by name or code" (input)="onSearch($event)" />
      </div>

      <table class="table" *ngIf="filtered().length; else empty">
        <thead>
          <tr>
            <th>Student Code</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Gender</th>
            <th>Class</th>
            <th>Contact Number</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let u of filtered()">
            <td>{{ u.studentId || '-' }}</td>
            <td>{{ u.firstName }}</td>
            <td>{{ u.lastName }}</td>
            <td>{{ u.gender || '-' }}</td>
            <td>{{ u.className || '-' }}</td>
            <td>{{ u.contactNumber || '-' }}</td>
          </tr>
        </tbody>
      </table>
      <ng-template #empty>
        <div class="muted">No transport users found.</div>
      </ng-template>
    </div>
  `,
  styles: [`
    .wrap{max-width:1000px;margin:24px auto}
    .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .actions{display:flex;gap:8px}
    .filters{margin-bottom:12px}
    .filters input{padding:8px;border:1px solid #e5e7eb;border-radius:6px;width:260px}
    .table{width:100%;border-collapse:collapse}
    th,td{padding:8px;border:1px solid #eee;text-align:left}
    .muted{color:#6b7280}
  `]
})
export class TransportUsersComponent implements OnInit {
  private http = inject(HttpClient);
  users = signal<TransportUser[]>([]);
  filtered = signal<TransportUser[]>([]);
  private q = signal('');

  ngOnInit(): void {
    this.http.get<TransportUser[]>(`/api/accounts/transport-users`).subscribe({
      next: (rows) => { this.users.set(rows || []); this.apply(); },
      error: () => { this.users.set([]); this.apply(); }
    });
  }

  onSearch(ev: Event){
    this.q.set((ev.target as HTMLInputElement).value.trim().toLowerCase());
    this.apply();
  }

  private apply(){
    const term = this.q();
    const list = (this.users() || []).filter(u => {
      if (!term) return true;
      const text = `${u.studentId || ''} ${u.firstName} ${u.lastName}`.toLowerCase();
      return text.includes(term);
    });
    this.filtered.set(list);
  }

  exportCsv(){
    const rows = this.filtered();
    const header = ['Student Code','First Name','Last Name','Gender','Class','Contact Number'];
    const body = rows.map(u => [u.studentId || '', u.firstName || '', u.lastName || '', (u as any).gender || '', (u as any).className || '', u.contactNumber || '']);
    const csv = [header, ...body].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'transport_users.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  exportPdf(){
    const rows = this.filtered();
    const win = window.open('', '_blank');
    if (!win) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Transport Users</title>
      <style>body{font-family:Arial, sans-serif;padding:16px} h1{font-size:18px}
      table{border-collapse:collapse;width:100%} th,td{border:1px solid #ddd;padding:6px;text-align:left}
      </style></head><body>
      <h1>Transport Users</h1>
      <table><thead><tr><th>Student Code</th><th>First Name</th><th>Last Name</th><th>Gender</th><th>Class</th><th>Contact Number</th></tr></thead>
      <tbody>
      ${rows.map(u => `<tr><td>${u.studentId || ''}</td><td>${u.firstName || ''}</td><td>${u.lastName || ''}</td><td>${(u as any).gender || ''}</td><td>${(u as any).className || ''}</td><td>${u.contactNumber || ''}</td></tr>`).join('')}
      </tbody></table>
      <script>window.onload = () => { window.print(); }</script>
      </body></html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
  }
}
