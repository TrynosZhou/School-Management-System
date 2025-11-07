import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-report-cards-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wrap">
      <h2>Generate Report Cards</h2>
      <div class="panel">
        <div class="field">
          <label>Class</label>
          <select [(ngModel)]="classId" (change)="clearStatus()">
            <option value="">-- Select class --</option>
            <option *ngFor="let c of classes()" [value]="c.id">{{ c.name }} <span class="small" *ngIf="c.academicYear">({{ c.academicYear }})</span></option>
          </select>
        </div>
        <div class="field">
          <label>Term</label>
          <select [(ngModel)]="term" (change)="clearStatus()">
            <option value="">-- Select term --</option>
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
        </div>
        <div class="field">
          <label>Exam Session (optional)</label>
          <select [(ngModel)]="examType" (change)="clearStatus()">
            <option value="">-- Select session --</option>
            <option value="Mid-Term">Mid-Term</option>
            <option value="End of Term">End of Term</option>
          </select>
        </div>
        <div class="actions">
          <button (click)="generate()" [disabled]="loading()">{{ loading() ? 'Generating…' : 'Generate' }}</button>
        </div>
        <div class="hint">This will open the first student's report card and allow navigating Next/Previous. Remarks will auto-save when moving to the next student.</div>
        <div class="err" *ngIf="err()">{{ err() }}</div>
        <div class="ok" *ngIf="ok()">{{ ok() }}</div>
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:900px;margin:24px auto;padding:0 12px}
    h2{margin:0 0 10px}
    .panel{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px;display:grid;gap:10px}
    .field{display:grid;gap:6px}
    label{font-weight:600}
    select,input{padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font:inherit}
    .actions{margin-top:4px}
    button{padding:8px 12px;border:1px solid #0b53a5;border-radius:8px;background:#0b53a5;cursor:pointer;color:#fff;font-weight:700}
    .hint{font-size:12px;color:#6b7280}
    .small{font-size:12px;color:#6b7280}
    .err{color:#b91c1c}
    .ok{color:#065f46}
  `]
})
export class ReportCardsPageComponent {
  private http = inject(HttpClient);
  private router = inject(Router);

  classes = signal<Array<{ id:string; name:string; academicYear?: string }>>([]);
  loading = signal(false);
  err = signal<string | null>(null);
  ok = signal<string | null>(null);

  classId = '';
  term = '';
  examType = '';

  constructor(){
    // load classes
    this.http.get<any[]>(`http://localhost:3000/api/classes`).subscribe({
      next: (rows) => {
        const out = (rows || []).map((c:any) => ({ id: c.id, name: c.name, academicYear: c.academicYear }));
        this.classes.set(out);
      },
      error: () => {}
    });
  }

  clearStatus(){ this.err.set(null); this.ok.set(null); }

  generate(){
    this.clearStatus();
    const cid = (this.classId || '').trim();
    const t = (this.term || '').trim();
    if (!cid || !t) { this.err.set('Please select a class and enter a term.'); return; }
    this.loading.set(true);
    // get enrollments to build sequence
    this.http.get<any[]>(`http://localhost:3000/api/enrollments/class/${encodeURIComponent(cid)}`).subscribe({
      next: rows => {
        const ids: string[] = [];
        (rows || []).forEach((r:any) => {
          const st = r?.student; if (!st) return;
          const sid = st.studentId || st.id; if (!sid) return;
          ids.push(String(sid));
        });
        if (!ids.length) { this.loading.set(false); this.err.set('No students found in the selected class.'); return; }
        // save sequence so the viewer can navigate and auto-save remarks on Next/Previous
        try { sessionStorage.setItem('report_seq', JSON.stringify({ ids })); } catch {}
        // navigate to first student's viewer with filters
        const first = ids[0];
        const u = new URL(window.location.origin + `/reports/report-card/${encodeURIComponent(first)}/view`);
        u.searchParams.set('term', t);
        u.searchParams.set('classId', cid);
        if (this.examType.trim()) u.searchParams.set('examType', this.examType.trim());
        this.loading.set(false);
        window.location.assign(u.toString());
      },
      error: () => { this.loading.set(false); this.err.set('Failed to load class enrollments.'); }
    });
  }
}
