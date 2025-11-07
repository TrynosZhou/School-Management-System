import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ParentsService } from './parents.service';
import { Router, RouterModule } from '@angular/router';
import { AccountsService } from '../accounts/accounts.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-link-student',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  template: `
    <div class="toolbar"><button class="btn small" type="button" (click)="refresh()">Refresh</button><span class="err" *ngIf="err()">{{ err() }}</span></div>
    <div class="layout">
      <aside class="side-list card">
        <h3>Your linked students</h3>
        <ng-container *ngIf="students().length; else noLinked">
          <ul class="list">
            <li *ngFor="let s of students()" (click)="choose(s.id)" [class.sel]="s.id === selId()">
              <div class="name">
                <div>Student ID: {{ s.studentId || s.id }}</div>
                <div>Full name: {{ s.lastName }} {{ s.firstName }}</div>
                <div class="bal" [class.neg]="(balanceOf(s.id) ?? 0) > 0" [class.pos]="(balanceOf(s.id) ?? 0) <= 0">Balance: {{ (balanceOf(s.id) ?? 0) | number:'1.2-2' }}</div>
              </div>
            </li>
          </ul>
        </ng-container>
        <ng-template #noLinked>
          <div class="muted">No students linked yet.</div>
        </ng-template>
      </aside>
      <section class="main">
    <div class="wrap card" *ngIf="enteredId()">
      <div class="header">
        <div class="who row">
          <div class="id">Student ID: {{ enteredId() }}</div>
          <div class="sep">—</div>
          <div class="nm">Full name: {{ (enteredLastName() || '') }} {{ (enteredFirstName() || displayEnteredName() || '') }}</div>
        </div>
        <div class="balBox">
          <div class="lbl">Current Invoice Balance</div>
          <div class="val neg">{{ (enteredBalance() ?? 0) | number:'1.2-2' }}</div>
        </div>
      </div>
      <div class="actions">
        <a class="btn" href="javascript:void(0)" (click)="viewEnteredInvoice()">View Invoice</a>
        <a class="btn outline" [routerLink]="['/parent/students', internalIdOrEnteredId(), 'report-card']"
           [queryParams]="{ term: (enteredTerm()||undefined), examType: (enteredExam()||undefined) }">Report Card</a>
      </div>
    </div>
    <div class="wrap card" *ngIf="selectedStudent() as sel">
      <div class="header">
        <div class="who row">
          <div class="id">Student ID: {{ sel.studentId || sel.id }}</div>
          <div class="sep">—</div>
          <div class="nm">Full name: {{ sel.lastName }} {{ sel.firstName }}</div>
        </div>
        <div class="balBox">
          <div class="lbl">Current Invoice Balance</div>
          <div class="val neg">{{ (balanceOf(sel.id) ?? 0) | number:'1.2-2' }}</div>
        </div>
      </div>
      <div class="controls">
        <label>Term</label>
        <select class="sel" [ngModel]="selTerm()" (ngModelChange)="setSelectedTerm($event)">
          <option value="">All terms</option>
          <option>Term 1</option>
          <option>Term 2</option>
          <option>Term 3</option>
        </select>
        <label>Exam Session</label>
        <select class="sel" [ngModel]="selExamType()" (ngModelChange)="setSelectedExamType($event)">
          <option value="">All</option>
          <option>Midterm</option>
          <option>End of Term</option>
        </select>
        <a class="btn" [routerLink]="['/parent/students', sel.id, 'report-card']" [queryParams]="{ term: (selTerm()||undefined), examType: (selExamType()||undefined) }">Open Report</a>
      </div>
    </div>
    <div class="wrap card">
      <h2>Link a student</h2>
      <p class="muted">Enter your ward's Student ID (e.g., JHS0000123). If the school requires verification, enter the date of birth.</p>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <label>Student ID or Code</label>
        <div class="row-inline">
          <input class="id-input" formControlName="studentIdOrCode" placeholder="JHS0000123" (input)="onStudentIdInput($event)" />
        </div>
        <div class="err" *ngIf="form.controls.studentIdOrCode.touched && form.controls.studentIdOrCode.invalid">Student ID or Code is required</div>

        <label>Date of Birth (YYYY-MM-DD) <span class="muted">optional if not required</span></label>
        <input formControlName="dob" placeholder="YYYY-MM-DD" />

        <div class="entered-controls" *ngIf="enteredId()">
          <label>Term</label>
          <select class="sel" [ngModel]="enteredTerm()" (ngModelChange)="setEnteredTerm($event)" [ngModelOptions]="{ standalone: true }">
            <option value="">All terms</option>
            <option>Term 1</option>
            <option>Term 2</option>
            <option>Term 3</option>
          </select>
          <label>Exam Session</label>
          <select class="sel" [ngModel]="enteredExam()" (ngModelChange)="setEnteredExam($event)" [ngModelOptions]="{ standalone: true }">
            <option value="">All</option>
            <option>Midterm</option>
            <option>End of Term</option>
          </select>
          
        </div>

        <div class="actions">
          <button type="submit" [disabled]="form.invalid || loading()">{{ loading() ? 'Linking…' : 'Link student' }}</button>
          <button type="button" class="btn danger" (click)="unlinkEntered()" [disabled]="loading() || !enteredId()">Unlink</button>
          <span class="ok" *ngIf="ok()">Linked</span>
          <span class="err" *ngIf="err()">{{ err() }}</span>
        </div>
      </form>
    </div>

    <div class="wrap card" *ngIf="students().length">
      <!-- Moved to left sidebar -->
      <div class="muted">Use the list on the left to select a student.</div>
    </div>
      </section>
    </div>
  `,
  styles: [`
    :host{display:block; height:100vh; overflow-y:auto}
    .layout{display:grid;grid-template-columns:340px 1fr;gap:16px;align-items:start;max-width:1200px;margin:0 auto;padding:0 16px}
    .main{display:block}
    .wrap{max-width:unset;margin:16px 0;display:grid;gap:10px;padding:16px}
    .toolbar{position:sticky;top:0;z-index:5;display:flex;justify-content:flex-end;gap:8px;padding:8px 12px;background:#f8fafc;border-bottom:1px solid #e5e7eb}
    .header{display:flex;justify-content:space-between;align-items:center}
    .who{display:flex;flex-direction:column;gap:2px}
    .who.row{flex-direction:row;gap:8px;align-items:center}
    .who .sep{color:#6b7280}
    .nm{font-size:18px;font-weight:700}
    .id{font-size:12px;color:#6b7280}
    .balBox{display:flex;flex-direction:column;align-items:flex-end}
    .balBox .lbl{font-size:12px;color:#6b7280}
    .balBox .val{font-size:20px;font-weight:800}
    .balBox .val.neg{color:#b91c1c}
    .controls{display:flex;gap:10px;align-items:center;justify-content:center;padding:8px 0}
    form{display:grid;gap:8px}
    input{padding:8px;border:1px solid #e5e7eb;border-radius:6px}
    button{padding:10px 12px;border-radius:8px;border:1px solid #1d4ed8;background:#1d4ed8;color:white}
    .muted{color:#6b7280;font-size:12px}
    .err{color:#b91c1c}
    .ok{color:#166534}
    .actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
    .list li{display:block;border:1px solid #f1f2f6;border-radius:8px;padding:8px;background:#fff;cursor:pointer}
    .list li.sel{outline:2px solid #1d4ed8}
    .name{font-weight:600}
    .bal{font-weight:700}
    .bal.neg{color:#b91c1c}
    .bal.pos{color:#065f46}
    .lbl{font-size:12px;color:#6b7280}
    .sel{padding:6px 8px;border:1px solid #e5e7eb;border-radius:6px}
    .btn{border:1px solid #1d4ed8;background:#1d4ed8;color:#fff;padding:6px 12px;border-radius:6px;text-decoration:none;font-weight:700;box-shadow:0 1px 2px rgba(0,0,0,.08)}
    .btn.danger{background:#1d4ed8;border-color:#1d4ed8}
    .row-inline{display:flex;align-items:center;gap:8px}
    .inline-name{font-weight:600;color:#111827}
    .side-list{position:sticky;top:56px;align-self:start}
    @media(max-width: 900px){
      .layout{grid-template-columns:1fr}
      .side-list{position:static}
    }
    .entered-controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:6px}
  `]
})
export class LinkStudentComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private parents = inject(ParentsService);
  private router = inject(Router);
  private accounts = inject(AccountsService);
  private http = inject(HttpClient);

  loading = signal(false);
  ok = signal(false);
  err = signal<string | null>(null);
  students = signal<Array<{ id: string; studentId?: string | null; studentCode?: string | null; firstName: string; lastName: string }>>([]);
  balances = signal<Record<string, number>>({});
  examTypeById = signal<Record<string, string>>({});
  unlinking = signal<Record<string, boolean>>({});
  selectedIdSig = signal<string | null>(null);
  selectedExamTypeSig = signal<string>('');
  selectedTermSig = signal<string>('');
  enteredIdSig = signal<string>('');
  enteredBalanceSig = signal<number | null>(null);
  enteredNameSig = signal<string>('');
  enteredStudentInternalIdSig = signal<string>('');
  enteredFirstNameSig = signal<string>('');
  enteredLastNameSig = signal<string>('');
  enteredTermSig = signal<string>('');
  enteredExamSig = signal<string>('');
  private inputTimer: any = null;

  form = this.fb.group({
    studentIdOrCode: ['', Validators.required],
    dob: [''],
  });

  ngOnInit(): void { this.refresh(); this.startPolling(); this.startSse(); }

  private poller: any = null;
  private startPolling(){
    if (this.poller) return;
    this.poller = setInterval(() => this.refresh(), 15000);
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
            // Refresh only when relevant to current parent; backend does not expose parentId here
            this.refresh();
          }
        } catch {}
      };
      es.onerror = () => {
        try { es.close(); } catch {}
        this.sse = null;
        // Reconnect later
        setTimeout(() => this.startSse(), 5000);
      };
      this.sse = es;
    } catch {}
  }
  private stopSse(){ try { this.sse?.close(); } catch {} this.sse = null; }
  ngOnDestroy(): void { this.stopPolling(); this.stopSse(); }

  onSubmit(){
    if (this.form.invalid) return;
    this.loading.set(true); this.err.set(null); this.ok.set(false);
    const { studentIdOrCode, dob } = this.form.getRawValue();
    const sid = String(studentIdOrCode || '').trim();
    // Prevent duplicate link attempts (already linked)
    if (sid && this.students().some(s => s.studentId === sid || s.id === sid)){
      this.loading.set(false);
      this.err.set('This student is already linked to your account');
      return;
    }
    this.parents.linkStudent({ studentIdOrCode: studentIdOrCode!, lastName: (this.enteredLastName() || ''), dob: (dob || undefined) as any }).subscribe({
      next: _ => { this.loading.set(false); this.ok.set(true); this.form.reset(); this.refresh(); },
      error: e => { this.loading.set(false); this.err.set(e?.error?.message || 'Failed to link student'); }
    });
  }

  unlinkEntered(){
    const internalId = (this.enteredStudentInternalId() || '').trim();
    const code = (this.enteredId() || '').trim();
    const list = this.students();
    let s = list.find(x => x.id === internalId || (x.studentId && String(x.studentId).trim() === code));
    if (!s && (internalId || code)) {
      s = { id: internalId || code, studentId: code || null, firstName: this.enteredFirstName() || '', lastName: this.enteredLastName() || '' } as any;
    }
    if (s) this.unlink(s as any);
  }

  // Computed helpers for template
  displayEnteredName(){
    const nm = (this.enteredNameSig() || '').trim();
    if (nm) return nm;
    const id = (this.enteredIdSig() || '').trim();
    if (!id) return '';
    const list = this.students();
    const found = list.find(s => (s.studentId && String(s.studentId).trim() === id) || s.id === id);
    if (found) return `${found.firstName} ${found.lastName}`.trim();
    return '';
  }
  internalIdOrEnteredId(){
    const internal = (this.enteredStudentInternalIdSig() || '').trim();
    if (internal) return internal;
    return (this.enteredIdSig() || '').trim();
  }

  refresh(){
    this.parents.myStudents().subscribe({
      next: list => {
        const rows = list || [];
        // Deduplicate by id defensively to avoid the same student appearing twice
        const uniq = Array.from(new Map(rows.map(r => [r.id, r])).values());
        this.students.set(uniq);
        // Initialize selected student if none
        if (!this.selId() && uniq.length) {
          this.selectedIdSig.set(uniq[0].id);
          const se = this.examTypeById()[uniq[0].id] || '';
          this.selectedExamTypeSig.set(se);
        }
        // Seed header from first linked student if none entered yet
        if (!this.enteredIdSig() && uniq.length) {
          const s0 = uniq[0];
          const code0 = String((s0.studentId || (s0 as any).studentCode || s0.id) || '');
          this.enteredIdSig.set(code0);
          this.enteredNameSig.set(`${s0.firstName} ${s0.lastName}`.trim());
          this.enteredStudentInternalIdSig.set(s0.id);
          this.enteredFirstNameSig.set(s0.firstName || '');
          this.enteredLastNameSig.set(s0.lastName || '');
          if (code0) this.fetchEnteredBalance(code0);
        }
        const cur = { ...this.balances() };
        uniq.forEach(s => {
          const idOrCode = (s.studentId && String(s.studentId).trim().length ? String(s.studentId) : s.id);
          this.accounts.getBalanceAuth(idOrCode).subscribe({
            next: (res: any) => { cur[s.id] = Number(res?.balance || 0); this.balances.set({ ...cur }); },
            error: () => { cur[s.id] = 0; this.balances.set({ ...cur }); }
          });
        });
      },
      error: (e) => {
        console.error('Failed to load linked students:', e);
        console.error('Error status:', e?.status);
        console.error('Error message:', e?.message);
        console.error('Error details:', e?.error);
        this.err.set(e?.error?.message || e?.message || 'Failed to load linked students');
        const code = Number(e?.status || 0);
        if (code === 401 || code === 403) {
          // Token invalid or not a parent; send to parent login
          try { this.router.navigate(['/parent/login']); } catch {}
        }
      }
    });
  }

  balanceOf(studentId: string): number | null {
    const b = this.balances()[studentId];
    return typeof b === 'number' ? b : null;
  }

  setExamType(studentId: string, val: any){
    const cur = { ...this.examTypeById() };
    const v = String(val || '');
    if (v) cur[studentId] = v; else delete cur[studentId];
    this.examTypeById.set(cur);
    if (this.selId() === studentId) this.selectedExamTypeSig.set(v);
  }

  isUnlinking(studentId: string){ return !!this.unlinking()[studentId]; }
  choose(id: string){
    this.selectedIdSig.set(id);
    const se = this.examTypeById()[id] || '';
    this.selectedExamTypeSig.set(se);
    // Also seed the top header with this linked student's info and fetch balance
    try {
      const s = this.students().find(x => x.id === id);
      if (s) {
        const code = (s.studentId || s.studentCode || s.id) as string;
        this.enteredIdSig.set(String(code || ''));
        this.enteredNameSig.set(`${s.firstName} ${s.lastName}`.trim());
        this.enteredStudentInternalIdSig.set(s.id);
        this.enteredFirstNameSig.set(s.firstName || '');
        this.enteredLastNameSig.set(s.lastName || '');
        if (code) this.fetchEnteredBalance(String(code));
      }
    } catch {}
  }
  selectedStudent(){
    const id = this.selId();
    return this.students().find(s => s.id === id) || null;
  }
  setSelectedExamType(v: any){ this.selectedExamTypeSig.set(String(v || '')); }
  setSelectedTerm(v: any){ this.selectedTermSig.set(String(v || '')); }
  selExamType(){ return this.selectedExamTypeSig(); }
  selTerm(){ return this.selectedTermSig(); }
  selId(){ return this.selectedIdSig(); }
  unlink(s: { id: string; studentId?: string | null; firstName: string; lastName: string }){
    if (!confirm(`Unlink ${s.firstName} ${s.lastName}?`)) return;
    // Enforce Student ID-based unlinking as required
    const code = (s?.studentId || '').toString().trim();
    if (!code) { this.err.set('Student ID is missing for this record; cannot unlink by code.'); return; }
    const map = { ...this.unlinking() }; map[s.id] = true; this.unlinking.set(map);
    // Optimistic removal: update UI immediately, rollback if server fails
    const prevList = this.students();
    const nextList = prevList.filter(x => x.id !== s.id);
    this.students.set(nextList);
    const prevBalances = { ...this.balances() };
    if (s.id in prevBalances) { delete prevBalances[s.id]; this.balances.set({ ...prevBalances }); }
    const prevExams = { ...this.examTypeById() };
    if (s.id in prevExams) { delete prevExams[s.id]; this.examTypeById.set({ ...prevExams }); }

    this.parents.unlinkByCode(code).subscribe({
      next: _ => {
        const m2 = { ...this.unlinking() }; delete m2[s.id]; this.unlinking.set(m2);
        // Optionally refresh to confirm
        this.refresh();
      },
      error: _ => {
        // Rollback UI on error
        this.students.set(prevList);
        this.balances.set(prevBalances);
        this.examTypeById.set(prevExams);
        const m2 = { ...this.unlinking() }; delete m2[s.id]; this.unlinking.set(m2);
        this.err.set('Failed to unlink');
      }
    });
  }

  // Live entered Student ID balance helpers
  enteredId(){ return this.enteredIdSig(); }
  enteredBalance(){ return this.enteredBalanceSig(); }
  enteredName(){ return this.enteredNameSig(); }
  enteredStudentInternalId(){ return this.enteredStudentInternalIdSig(); }
  enteredTerm(){ return this.enteredTermSig(); }
  enteredExam(){ return this.enteredExamSig(); }
  enteredFirstName(){ return this.enteredFirstNameSig(); }
  enteredLastName(){ return this.enteredLastNameSig(); }
  setEnteredTerm(v: any){ this.enteredTermSig.set(String(v || '')); }
  setEnteredExam(v: any){ this.enteredExamSig.set(String(v || '')); }
  onStudentIdInput(ev: any){
    try {
      const val = String(ev?.target?.value || '').trim();
      this.enteredIdSig.set(val);
      if (!val){ this.enteredBalanceSig.set(null); this.enteredNameSig.set(''); this.enteredStudentInternalIdSig.set(''); this.enteredFirstNameSig.set(''); this.enteredLastNameSig.set(''); return; }
      // Try to derive from already loaded linked students immediately
      try {
        const list = this.students();
        const found = list.find(s => (s.studentId && String(s.studentId).trim() === val)
          || (s.studentCode && String(s.studentCode).trim() === val)
          || s.id === val);
        if (found){
          this.enteredNameSig.set(`${found.firstName} ${found.lastName}`.trim());
          this.enteredStudentInternalIdSig.set(found.id);
          this.enteredFirstNameSig.set(found.firstName || '');
          this.enteredLastNameSig.set(found.lastName || '');
        }
      } catch {}
      if (this.inputTimer) { clearTimeout(this.inputTimer); this.inputTimer = null; }
      this.inputTimer = setTimeout(() => {
        this.fetchEnteredBalance(val);
        // Only fetch name from API if we don't already have first/last name
        const hasNames = !!(this.enteredFirstNameSig() || this.enteredLastNameSig());
        if (!hasNames) this.fetchEnteredStudentName(val);
      }, 500);
    } catch {}
  }
  private fetchEnteredBalance(idOrCode: string){
    // Prefer public endpoint to allow pre-link lookup; fallback to auth if needed
    this.accounts.getBalancePublic(idOrCode).subscribe({
      next: (res: any) => {
        const bal = Number(res?.balance || 0);
        this.enteredBalanceSig.set(isFinite(bal) ? bal : 0);
        // Populate name/id if provided by API
        const nm = (res?.studentName || res?.fullName || res?.name || '').toString();
        if (nm) this.enteredNameSig.set(nm);
        const internalId = (res?.studentId || res?.id || res?.internalId || '').toString();
        const code = (res?.studentCode || res?.code || res?.student_id || '').toString();
        this.enteredStudentInternalIdSig.set(internalId || idOrCode || code);
      },
      error: _ => {
        this.accounts.getBalanceAuth(idOrCode).subscribe({
          next: (res2: any) => {
            const bal = Number(res2?.balance || 0);
            this.enteredBalanceSig.set(isFinite(bal) ? bal : 0);
            const nm = (res2?.studentName || res2?.fullName || res2?.name || '').toString();
            if (nm) this.enteredNameSig.set(nm);
            const internalId = (res2?.studentId || res2?.id || res2?.internalId || '').toString();
            const code = (res2?.studentCode || res2?.code || res2?.student_id || '').toString();
            this.enteredStudentInternalIdSig.set(internalId || idOrCode || code);
          },
          error: _2 => { this.enteredBalanceSig.set(0); }
        });
      }
    });
  }
  private fetchEnteredStudentName(idOrCode: string){
    // Revert to path-based lookup: GET /api/students/:idOrCode
    this.http.get<any>(`/api/students/${encodeURIComponent(idOrCode)}`).subscribe({
      next: (s: any) => {
        const obj = (s && (s.student || s)) || {};
        const full = `${(obj.firstName || '').trim()} ${(obj.lastName || '').trim()}`.trim();
        const name = full || (obj.studentFullName || obj.fullName || '').toString();
        if (name) this.enteredNameSig.set(name);
        const internalId = String(obj.id || obj.studentId || idOrCode || '');
        this.enteredStudentInternalIdSig.set(internalId);
        if (obj.firstName) this.enteredFirstNameSig.set(String(obj.firstName));
        if (obj.lastName) this.enteredLastNameSig.set(String(obj.lastName));
      },
      error: _ => { /* Keep existing enteredName if lookup fails (e.g., 404) */ }
    });
  }

  viewEnteredInvoice(){
    const id = (this.enteredIdSig() || '').trim();
    if (!id) return;
    this.accounts.downloadStatement(id).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const w = window.open(url, '_blank');
        if (!w) {
          const a = document.createElement('a'); a.href = url; a.download = `invoice-${id}.pdf`; document.body.appendChild(a); a.click(); a.remove();
        }
        setTimeout(() => URL.revokeObjectURL(url), 3000);
      },
      error: _ => {}
    });
  }
}
