import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ParentsService } from './parents.service';
import { AccountsService } from '../accounts/accounts.service';
import { AuthStateService } from '../auth/auth-state.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="wrap">
      <div class="navbar">
        <div class="brand">Parent Dashboard</div>
        <div class="userbar">
          <span class="who">{{ displayName() || 'Parent' }}</span>
        </div>
      </div>
      <div class="top"></div>

      <div *ngIf="err()" class="err">{{ err() }}</div>
      <div *ngIf="loading()">Loading…</div>

      <div class="card" *ngIf="students().length">
        <h3>Your linked students</h3>
        <ul class="list">
          <li *ngFor="let s of students()">
            <div class="name">
              {{ s.firstName }} {{ s.lastName }}
              <span class="muted" *ngIf="s.studentId">(Student ID: {{ s.studentId }})</span>
            </div>
            <div class="actions">
              <span class="bal" [class.pos]="(balanceOf(s.id) ?? 0) <= 0" [class.neg]="(balanceOf(s.id) ?? 0) > 0">
                My Fees Balance: {{ (balanceOf(s.id) ?? 0) | number:'1.2-2' }}
              </span>
              <label class="lbl">Exam session</label>
              <select class="sel" [ngModel]="examTypeById()[s.id] || ''" (ngModelChange)="setExamType(s.id, $event)">
                <option value="">All</option>
                <option>Midterm</option>
                <option>End of Term</option>
              </select>
              <a [routerLink]="['/parent/students', s.id, 'report-card']" [queryParams]="{ examType: (examTypeById()[s.id] || undefined) }" class="btn">View</a>
              <button type="button" class="btn danger" (click)="unlink(s.id)" [disabled]="isUnlinking(s.id)">Unlink</button>
              <button type="button" class="btn danger" (click)="deleteStudent(s.id)" [disabled]="isUnlinking(s.id)">Delete</button>
            </div>
          </li>
        </ul>
      </div>

      <div class="muted" *ngIf="!loading() && !students().length">No students linked yet.</div>
    </div>
  `,
  styles: [`
    .wrap{max-width:900px;margin:24px auto;display:grid;gap:12px}
    .navbar{background:#3f51b5;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-radius:10px;margin-bottom:12px}
    .brand{font-weight:700}
    .userbar{display:flex;gap:8px;align-items:center}
    .who{font-weight:600}
    .options{background:#fff;color:#0b53a5;border:none;border-radius:4px;padding:6px 10px;cursor:pointer}
    .top{display:flex;justify-content:space-between;align-items:center}
    .link{border:1px solid #1d4ed8;background:#1d4ed8;color:#fff;padding:8px 12px;border-radius:8px;text-decoration:none;font-weight:700}
    .card{background:#fff;border:1px solid #eee;border-radius:10px;padding:12px}
    .list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
    .list li{display:flex;justify-content:space-between;align-items:center;border:1px solid #f1f2f6;border-radius:8px;padding:8px}
    .name{font-weight:600}
    .actions a:not(.btn){color:#1d4ed8;text-decoration:none}
    .actions a.btn{color:#fff}
    .actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;width:100%}
    .actions .btn{background:#1d4ed8;border:1px solid #1d4ed8;color:#fff;font-weight:700;border-radius:6px;padding:6px 10px;text-decoration:none}
    .actions .btn.danger{background:#1d4ed8;border-color:#1d4ed8;color:#fff;font-weight:700}
    .lbl{font-size:12px;color:#6b7280}
    .sel{padding:6px 8px;border:1px solid #e5e7eb;border-radius:6px}
    .btn{border:1px solid #1d4ed8;background:#1d4ed8;color:#fff;padding:6px 12px;border-radius:6px;text-decoration:none;font-weight:700;box-shadow:0 1px 2px rgba(0,0,0,.08)}
    .btn:hover{filter:brightness(0.95);border-color:#1d4ed8}
    .btn:focus{outline:2px solid #93c5fd;outline-offset:2px}
    .actions .btn{margin-left:auto;min-width:110px;text-align:center}
    .actions .btn.danger{background:#1d4ed8;border-color:#1d4ed8}
    .bal{font-weight:600}
    .bal.neg{color:#b91c1c}
    .bal.pos{color:#166534}
    .err{color:#b91c1c}
    .muted{color:#6b7280}
  `]
})
export class ParentDashboardComponent implements OnInit {
  private parents = inject(ParentsService);
  private accounts = inject(AccountsService);
  private auth = inject(AuthStateService);
  private router = inject(Router);
  students = signal<Array<{ id: string; studentId?: string | null; firstName: string; lastName: string }>>([]);
  loading = signal(false);
  err = signal<string | null>(null);
  balances = signal<Record<string, number>>({});
  examTypeById = signal<Record<string, string>>({});
  unlinking = signal<Record<string, boolean>>({});

  ngOnInit(): void {
    this.refresh();
  }

  displayName(){
    const role = (this.auth.role() || '').toLowerCase();
    if (role === 'admin') return 'Administrator';
    return this.auth.fullName() || this.auth.email() || (role ? role.charAt(0).toUpperCase() + role.slice(1) : null);
  }

  

  refresh(){
    this.loading.set(true); this.err.set(null);
    this.parents.myStudents().subscribe({
      next: rows => {
        this.loading.set(false);
        const list = rows || [];
        this.students.set(list);
        // fetch balances for each student id
        const current = { ...this.balances() };
        list.forEach(s => {
          this.accounts.getBalanceAuth(s.id).subscribe({
            next: (res: any) => { current[s.id] = Number(res?.balance || 0); this.balances.set({ ...current }); },
            error: () => { current[s.id] = 0; this.balances.set({ ...current }); }
          });
        });
      },
      error: e => { this.loading.set(false); this.err.set(e?.error?.message || 'Failed to load students'); }
    });
  }

  balanceOf(studentId: string): number | null {
    const b = this.balances()[studentId];
    return typeof b === 'number' ? b : null;
  }

  setExamType(studentId: string, val: string){
    const cur = { ...this.examTypeById() };
    if (val) cur[studentId] = val; else delete cur[studentId];
    this.examTypeById.set(cur);
  }

  isUnlinking(studentId: string){ return !!this.unlinking()[studentId]; }
  unlink(studentId: string){
    const map = { ...this.unlinking() }; map[studentId] = true; this.unlinking.set(map);
    // Find the student to prefer Student ID code if present
    const s = this.students().find(x => x.id === studentId);
    const useCode = s?.studentId && String(s.studentId).trim().length ? String(s.studentId) : null;
    const req$ = useCode ? this.parents.unlinkByCode(useCode!) : this.parents.unlink(studentId);
    req$.subscribe({
      next: _ => {
        const m2 = { ...this.unlinking() }; delete m2[studentId]; this.unlinking.set(m2);
        const list = this.students().filter(s => s.id !== studentId);
        this.students.set(list);
        const bal = { ...this.balances() }; if (studentId in bal) { delete bal[studentId]; this.balances.set(bal); }
        const exams = { ...this.examTypeById() }; if (studentId in exams) { delete exams[studentId]; this.examTypeById.set(exams); }
        // Force a server refresh to ensure no stale links remain
        this.refresh();
      },
      error: _ => { const m2 = { ...this.unlinking() }; delete m2[studentId]; this.unlinking.set(m2); this.err.set('Failed to unlink'); }
    });
  }

  deleteStudent(studentId: string){
    const s = this.students().find(x => x.id === studentId);
    const label = s ? `${s.firstName || ''} ${s.lastName || ''}`.trim() : 'this student';
    if (!confirm(`Remove ${label} from your dashboard?`)) return;
    // Prefer Student ID code for soft delete; fallback to UUID
    const useCode = s?.studentId && String(s.studentId).trim().length ? String(s.studentId) : null;
    const req$ = useCode ? this.parents.softDeleteByCode(useCode!) : this.parents.softDeleteById(studentId);
    req$.subscribe({
      next: _ => this.refresh(),
      error: _ => this.err.set('Failed to delete student')
    });
  }
}
