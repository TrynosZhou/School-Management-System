import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ParentsService } from './parents.service';
import { AccountsService } from '../accounts/accounts.service';

@Component({
  selector: 'app-parent-student',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="toolbar">
      <button class="btn outline" type="button" (click)="reloadPage()">Refresh</button>
    </div>

    <div class="wrap card">
      <h3>Link a student</h3>
      <div class="form">
        <label>Student ID or Code</label>
        <input [(ngModel)]="sid" name="sid" placeholder="JHS0000123" />
        <label>Student Last Name</label>
        <input [(ngModel)]="lastName" name="lastName" placeholder="Surname" />
        <label>Date of Birth (YYYY-MM-DD)</label>
        <input [(ngModel)]="dob" name="dob" placeholder="YYYY-MM-DD" />
        <div class="err" *ngIf="dob && !isDobValid()">Enter DOB as YYYY-MM-DD (e.g., 2025-10-28) or YYYY/MM/DD</div>
        <div class="actions">
          <button class="btn" type="button" (click)="link()" [disabled]="linking() || !sid || !lastName || !dob || !isDobValid() || !!selId()">{{ linking() ? 'Linking…' : 'Link' }}</button>
          <button class="btn danger" type="button" (click)="unlinkSelected()" [disabled]="unlinkBusy() || !students().length">{{ unlinkBusy() ? 'Unlinking…' : 'Unlink selected' }}</button>
          <span class="ok" *ngIf="ok()">Linked</span>
          <span class="err" *ngIf="linkErr()">{{ linkErr() }}</span>
        </div>
      </div>
    </div>

    <div class="wrap card" *ngIf="students().length; else noLinks">
      <h2>Linked Students</h2>
      <ul class="list">
        <li *ngFor="let s of students()" (click)="choose(s.id)" [class.sel]="s.id === selId()">
          <div class="name">
            {{ s.firstName }} {{ s.lastName }}
            <span class="muted">(Student ID: {{ idOrCodeOf(s) }})</span>
          </div>
          <div class="actions">
            <span class="bal" *ngIf="balanceOf(s.id) !== null">
              Current Invoice Balance: <span class="neg">{{ (balanceOf(s.id) ?? 0) | number:'1.2-2' }}</span>
            </span>
            <a class="btn push-right" href="javascript:void(0)" (click)="$event.stopPropagation(); printInvoice(s)">Print Invoice</a>
            <a class="btn push-right" href="javascript:void(0)" (click)="$event.stopPropagation(); downloadInvoice(s)">Download Invoice</a>
          </div>
        </li>
      </ul>
    </div>
    <ng-template #noLinks>
      <div class="wrap card">
        <div *ngIf="loading()">Loading…</div>
        <div *ngIf="!loading()">
          <ng-container *ngIf="err(); else noneMsg">
            <div class="err">{{ err() }}</div>
          </ng-container>
          <ng-template #noneMsg>No linked students yet.</ng-template>
        </div>
      </div>
    </ng-template>

    <div class="wrap card" *ngIf="selectedStudent() as sel">
      <div class="header">
        <div class="who">
          <div class="nm">{{ sel.firstName }} {{ sel.lastName }}</div>
          <div class="id">Student ID: {{ idOrCodeOf(sel) }}</div>
        </div>
        <div class="balBox">
          <div class="lbl">Current Invoice Balance</div>
          <div class="val neg">{{ (balanceOf(sel.id) ?? 0) | number:'1.2-2' }}</div>
        </div>
      </div>
      <div class="controls">
        <label>Term</label>
        <select class="sel" [(ngModel)]="term" (change)="onTermChange(sel)">
          <option value="">All terms</option>
          <option>Term 1</option>
          <option>Term 2</option>
          <option>Term 3</option>
        </select>
        <label>Exam Session</label>
        <select class="sel" [(ngModel)]="examType">
          <option value="">All</option>
          <option>Midterm</option>
          <option>End of Term</option>
        </select>
        <span class="termBal" *ngIf="term && termBalance() !== null">
          Term Balance: <span class="neg">{{ termBalance() | number:'1.2-2' }}</span>
        </span>
        <a class="btn" href="javascript:void(0)" (click)="openReport(sel)">Open Report</a>
      </div>
      <div class="err" *ngIf="reportErr()">{{ reportErr() }}</div>
    </div>

    <div class="wrap" *ngIf="err()">
      <span class="err">{{ err() }}</span>
    </div>
  `,
  styles: [`
    :host{display:block; height:100vh; overflow-y:auto}
    .wrap{max-width:900px;margin:24px auto;display:grid;gap:10px;padding:16px}
    .card{border:1px solid #f1f2f6;border-radius:8px;background:#fff}
    .toolbar{position:sticky;top:0;z-index:5;display:flex;justify-content:flex-end;gap:8px;padding:8px 12px;background:#f8fafc;border-bottom:1px solid #e5e7eb}
    .form{display:grid;gap:8px}
    .list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
    .list li{display:flex;justify-content:space-between;align-items:center;border:1px solid #f1f2f6;border-radius:8px;padding:8px;background:#fff;cursor:pointer}
    .list li.sel{outline:2px solid #1d4ed8}
    .name{font-weight:600}
    .muted{color:#6b7280;font-size:12px}
    .header{display:flex;justify-content:space-between;align-items:center}
    .who{display:flex;flex-direction:column;gap:2px}
    .nm{font-size:18px;font-weight:700}
    .id{font-size:12px;color:#6b7280}
    .balBox{display:flex;flex-direction:column;align-items:flex-end}
    .balBox .lbl{font-size:12px;color:#6b7280}
    .balBox .val{font-size:20px;font-weight:800}
    .balBox .val.neg{color:#b91c1c}
    .actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .actions .push-right{margin-left:auto}
    .btn{border:1px solid #1d4ed8;background:#1d4ed8;color:#fff;padding:6px 12px;border-radius:6px;text-decoration:none;font-weight:700;box-shadow:0 1px 2px rgba(0,0,0,.08)}
    .btn.outline{background:#fff;color:#1d4ed8}
    .link{color:#1d4ed8;text-decoration:underline;cursor:pointer}
    .sel{padding:6px 8px;border:1px solid #e5e7eb;border-radius:6px}
    .controls{display:flex;gap:10px;align-items:center;justify-content:center;padding:8px 0;flex-wrap:wrap}
    .termBal{font-weight:700;font-size:14px}
    .bal{font-weight:700}
    .neg{color:#b91c1c}
    .err{color:#b91c1c}
    .ok{color:#166534}
  `]
})
export class ParentStudentComponent implements OnInit {
  private parents = inject(ParentsService);
  private accounts = inject(AccountsService);
  private router = inject(Router);
  private http = inject(HttpClient);

  err = signal<string | null>(null);
  linkErr = signal<string | null>(null);
  students = signal<Array<StudentLink>>([]);
  balances = signal<Record<string, number>>({});
  selectedIdSig = signal<string | null>(null);
  term = '';
  examType = '';
  termBalance = signal<number | null>(null);
  loading = signal(false);
  linking = signal(false);
  unlinkBusy = signal(false);
  ok = signal(false);
  sid: string = '';
  lastName: string = '';
  dob: string = '';
  reportErr = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  reloadPage(){ try { window.location.reload(); } catch { this.load(); } }

  // Link/unlink actions
  isDobValid(): boolean {
    const v = (this.dob || '').trim();
    // Accept YYYY-MM-DD or YYYY/MM/DD
    return /^\d{4}[-/]\d{2}[-/]\d{2}$/.test(v);
  }
  link(){
    const code = (this.sid || '').trim();
    const ln = (this.lastName || '').trim();
    const dob = (this.dob || '').trim();
    if (!code || !ln) return;
    this.linking.set(true); this.linkErr.set(null); this.ok.set(false);
    const dobOut = dob ? dob.replace(/\//g, '-') : undefined;
    this.parents.linkStudent({ studentIdOrCode: code, lastName: ln, dob: (dobOut as any) }).subscribe({
      next: _ => { this.linking.set(false); this.ok.set(true); this.sid = ''; this.lastName = ''; this.dob = ''; this.load(); },
      error: e => { this.linking.set(false); this.linkErr.set(e?.error?.message || 'Failed to link student'); }
    });
  }

  openReport(sel: StudentLink){
    this.reportErr.set(null);
    if (!sel?.id) return;
    const params: any = {};
    if (this.term) params.term = this.term;
    if (this.examType) params.examType = this.examType;
    this.http.get(`/api/reports/report-card/${encodeURIComponent(sel.id)}`, { params, responseType: 'blob' as const, observe: 'response' as const }).subscribe({
      next: _ => {
        this.router.navigate(['/parent/students', sel.id, 'report-card'], { queryParams: { term: (this.term||undefined), examType: (this.examType||undefined) } });
      },
      error: async (e: any) => {
        try {
          const status = Number(e?.status || 0);
          if (status === 403) {
            const errBlob = e?.error as Blob | undefined;
            let body = '';
            if (errBlob && typeof (errBlob as any).text === 'function') { body = await (errBlob as Blob).text(); }
            let parsed: any = null; 
            try { 
              // Check if body is HTML (starts with <!doctype or <html)
              if (body && !body.trim().startsWith('<')) {
                parsed = JSON.parse(body);
              }
            } catch {}
            const msg = (parsed && parsed.message) || 'Access blocked: Please settle outstanding term fees to view the report card.';
            this.reportErr.set(msg);
            return;
          }
        } catch {}
        this.reportErr.set('Failed to open report card.');
      }
    });
  }

  unlinkSelected(){
    let id = this.selId();
    if (!id && this.students().length) id = this.students()[0].id;
    if (!id) return;
    const s = this.students().find(x => x.id === id);
    if (!s) return;
    this.unlinkBusy.set(true);
    const code = (s.studentId || '').toString().trim();
    const req$ = code ? this.parents.unlinkByCode(code) : this.parents.unlink(s.id);
    req$.subscribe({
      next: _ => { this.unlinkBusy.set(false); this.selectedIdSig.set(null); this.load(); },
      error: _ => { this.unlinkBusy.set(false); this.err.set('Failed to unlink'); }
    });
  }

  load(){
    this.err.set(null);
    this.loading.set(true);
    this.parents.myStudents().subscribe({
      next: list => {
        const rows = this.normalizeStudents(list);
        const uniq = Array.from(new Map(rows.map(r => [r.id, r])).values());
        this.students.set(uniq);
        if (!this.selId() && uniq.length) this.selectedIdSig.set(uniq[0].id);
        // Auto-fetch balances for all linked students
        const cur = { ...this.balances() };
        uniq.forEach(s => {
          const idOrCode = this.idOrCodeOf(s);
          this.accounts.getBalanceAuth(idOrCode).subscribe({
            next: (res: any) => { cur[s.id] = Number(res?.balance || 0); this.balances.set({ ...cur }); },
            error: _ => { cur[s.id] = 0; this.balances.set({ ...cur }); }
          });
        });
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        console.error('Failed to load linked students:', e);
        console.error('Error status:', e?.status);
        console.error('Error message:', e?.message);
        console.error('Error details:', e?.error);
        const code = Number(e?.status || 0);
        if (code === 401 || code === 403) {
          try { this.router.navigate(['/parent/login']); } catch {}
          return;
        }
        this.err.set(e?.error?.message || e?.message || 'Failed to load linked students');
      }
    });
  }

  choose(id: string){ this.selectedIdSig.set(id); }
  selId(){ return this.selectedIdSig(); }
  selectedStudent(){ return this.students().find(s => s.id === this.selId()) || null; }
  balanceOf(studentId: string): number | null { const b = this.balances()[studentId]; return typeof b === 'number' ? b : null; }

  onTermChange(sel: StudentLink) {
    this.termBalance.set(null);
    if (!this.term || !sel?.id) return;
    this.accounts.getTermBalance(sel.id, this.term).subscribe({
      next: (res: any) => { this.termBalance.set(Number(res?.balance || 0)); },
      error: _ => { this.termBalance.set(null); }
    });
  }

  checkBalance(s: StudentLink){
    const idOrCode = this.idOrCodeOf(s);
    this.accounts.getBalanceAuth(idOrCode).subscribe({
      next: (res: any) => { const cur = { ...this.balances() }; cur[s.id] = Number(res?.balance || 0); this.balances.set(cur); },
      error: _ => { const cur = { ...this.balances() }; cur[s.id] = 0; this.balances.set(cur); }
    });
  }

  async downloadInvoice(s: StudentLink){
    try {
      const idOrCode = this.idOrCodeOf(s);
      const blob = await this.accounts.downloadStatement(idOrCode).toPromise();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `invoice-${idOrCode}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {}
  }

  async printInvoice(s: StudentLink){
    try {
      const idOrCode = this.idOrCodeOf(s);
      const blob = await this.accounts.downloadStatement(idOrCode).toPromise();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const w = window.open(url);
      if (w) {
        const iv = setInterval(() => { try { w.focus(); w.print(); clearInterval(iv); } catch {} }, 300);
      }
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch {}
  }

  // Helpers
  idOrCodeOf(s: StudentLink): string {
    const sid = (s.studentId || '').toString().trim();
    if (sid) return sid;
    const code = (s.studentCode || '').toString().trim();
    if (code) return code;
    return s.id;
  }

  displayName(s: StudentLink): string {
    const full = `${(s.firstName || '').trim()} ${(s.lastName || '').trim()}`.trim();
    return full || (s as any).studentFullName || s.id;
  }

  private normalizeStudents(input: any): StudentLink[] {
    // Accept top-level array or wrapped objects like { students: [...] } or { data: [...] }
    const raw: any[] = Array.isArray(input) ? input
      : (input && (Array.isArray(input.students) ? input.students
        : (Array.isArray(input.data) ? input.data : [])));

    return (raw || []).map((row: any) => {
      // Some APIs return { student: {...} } or { child: {...} }
      const x = row && (row.student || row.child || row);
      const sid = (x.studentId ?? x.sid ?? '').toString();
      const scode = (x.studentCode ?? x.code ?? '').toString();
      const id = (x.id || sid || scode || '').toString();
      const full = (x.studentFullName || x.fullName || '').toString();
      const fn = (x.firstName || '').toString();
      const ln = (x.lastName || '').toString();
      let firstName = fn, lastName = ln;
      if ((!fn || !ln) && full) {
        const parts = full.split(' ').filter(Boolean);
        firstName = firstName || (parts[0] || '');
        lastName = lastName || (parts.slice(1).join(' ') || '');
      }
      const studentId = sid || null;
      const studentCode = scode || null;
      return { id, studentId, studentCode, firstName, lastName } as StudentLink;
    }).filter((z: StudentLink) => !!z.id);
  }
}

// Keep a single interface to satisfy TS and templates
interface StudentLink {
  id: string;
  studentId?: string | null;
  studentCode?: string | null;
  firstName?: string;
  lastName?: string;
}
