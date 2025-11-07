import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ParentsService } from './parents.service';

@Component({
  selector: 'app-parents-admin-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="toolbar">
        <h2>Parents</h2>
        <div class="right">
          <input placeholder="Search by parent or student" (input)="onSearch($event)" />
          <button (click)="refresh()">Refresh</button>
        </div>
      </div>

      <div class="err" *ngIf="err()">{{ err() }}</div>
      <div *ngIf="loading()">Loading…</div>

      <table class="table" *ngIf="!loading() && filtered().length; else empty">
        <thead>
          <tr>
            <th>Parent Name</th>
            <th>Contact Number</th>
            <th>Email</th>
            <th>Student ID</th>
            <th>Student Name</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of filtered()">
            <td>{{ r.parentFullName || '-' }}</td>
            <td>{{ r.parentContactNumber || '-' }}</td>
            <td>{{ r.parentEmail || '-' }}</td>
            <td>{{ r.studentCode || r.studentId || '-' }}</td>
            <td>{{ r.studentFullName || '-' }}</td>
            <td>
              <div class="actions">
                <button class="btn primary small" (click)="linkAnother(r.parentId)"><strong>Link</strong></button>
                <button class="btn primary small" *ngIf="r.studentId" (click)="unlink(r.parentId, r.studentId!)"><strong>Unlink</strong></button>
                <button class="btn primary small" (click)="deleteParent(r.parentId)"><strong>Delete</strong></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <ng-template #empty><div class="muted">No parent links found</div></ng-template>
    </div>
  `,
  styles: [`
    .wrap{max-width:1100px;margin:24px auto}
    .toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .toolbar .right{display:flex;gap:8px}
    .toolbar input{padding:8px;border:1px solid #ddd;border-radius:6px;width:260px}
    .table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #eee;border-radius:8px;overflow:hidden}
    th,td{padding:8px;border-bottom:1px solid #f1f2f6;text-align:left}
    .muted{color:#6b7280}
    .err{color:#b91c1c}
    .actions{display:inline-flex;gap:8px}
    .btn{cursor:pointer;border-radius:6px;border:1px solid transparent}
    .btn.small{padding:6px 10px;font-weight:700}
    .btn.primary{background:#1d4ed8;color:#fff;border-color:#1d4ed8}
    .btn.primary.outline{background:#fff;color:#1d4ed8;border-color:#1d4ed8;font-weight:600}
  `]
})
export class ParentsAdminListComponent implements OnInit, OnDestroy {
  private parents = inject(ParentsService);
  loading = signal(false);
  err = signal<string | null>(null);
  rows = signal<Array<{ parentId: string; parentFullName: string | null; parentEmail: string | null; parentContactNumber: string | null; studentId: string | null; studentCode: string | null; studentFullName: string | null }>>([]);
  search = signal('');
  filtered = signal(this.rows());

  ngOnInit(): void { this.load(); this.startPolling(); this.startSse(); }

  private poller: any = null;
  private startPolling(){
    if (this.poller) return;
    this.poller = setInterval(() => this.load(), 15000);
  }
  private stopPolling(){ if (this.poller) { clearInterval(this.poller); this.poller = null; } }
  private sse: EventSource | null = null;
  private startSse(){
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      const url = new URL('/api/parents/events', window.location.origin);
      url.searchParams.set('token', token);
      const es = new EventSource(url.toString());
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data || '{}');
          if (data && (data.type === 'link' || data.type === 'unlink')) {
            this.load();
          }
        } catch {}
      };
      es.onerror = () => {
        try { es.close(); } catch {}
        this.sse = null;
        setTimeout(() => this.startSse(), 5000);
      };
      this.sse = es;
    } catch {}
  }
  private stopSse(){ try { this.sse?.close(); } catch {} this.sse = null; }
  ngOnDestroy(): void { this.stopPolling(); this.stopSse(); }

  load(){
    this.loading.set(true); this.err.set(null);
    this.parents.adminParentsAll().subscribe({
      next: (res) => { this.loading.set(false); this.rows.set(res || []); this.applyFilters(); },
      error: (e) => { this.loading.set(false); this.err.set(e?.error?.message || 'Failed to load parents'); }
    });
  }

  deleteParent(parentId: string){
    if (!confirm('Delete this parent and all their links? This cannot be undone.')) return;
    this.parents.adminDeleteParent(parentId).subscribe({
      next: () => {
        this.rows.set(this.rows().filter(r => r.parentId !== parentId));
        this.applyFilters();
      },
      error: (e) => { this.err.set(e?.error?.message || 'Delete failed'); }
    });
  }

  refresh(){ this.load(); }

  onSearch(ev: Event){ this.search.set((ev.target as HTMLInputElement).value.trim().toLowerCase()); this.applyFilters(); }

  private applyFilters(){
    const q = this.search();
    const list = (this.rows()||[]).filter(r => {
      if (!q) return true;
      const t = `${r.parentFullName||''} ${r.parentEmail||''} ${r.parentContactNumber||''} ${r.studentCode||''} ${r.studentFullName||''}`.toLowerCase();
      return t.includes(q);
    });
    this.filtered.set(list);
  }

  unlink(parentId: string, studentId: string){
    if (!confirm('Unlink this parent from the student?')) return;
    this.parents.adminUnlink(parentId, studentId).subscribe({
      next: () => {
        this.rows.set(this.rows().filter(r => !(r.parentId === parentId && r.studentId === studentId)));
        this.applyFilters();
      },
      error: (e) => { this.err.set(e?.error?.message || 'Unlink failed'); }
    });
  }

  linkAnother(parentId: string){
    const studentIdOrCode = (window.prompt('Enter Student ID (UUID) or Code to link to this parent:') || '').trim();
    if (!studentIdOrCode) return;
    this.parents.adminLink(parentId, studentIdOrCode).subscribe({
      next: () => this.load(),
      error: (e) => { this.err.set(e?.error?.message || 'Link failed'); }
    });
  }
}
