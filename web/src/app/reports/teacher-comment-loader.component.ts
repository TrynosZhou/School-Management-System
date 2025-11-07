import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-teacher-comment-loader',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wrap">
      <h2>Teacher Comment</h2>
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
          <label>Exam Session</label>
          <select [(ngModel)]="examType" (change)="clearStatus()">
            <option value="">-- Select session --</option>
            <option value="Mid-Term">Mid-Term</option>
            <option value="End of Term">End of Term</option>
          </select>
        </div>
        <div class="actions">
          <button class="primary" (click)="load()" [disabled]="loading() || !classId || !term">{{ loading() ? 'Loading…' : 'Load' }}</button>
        </div>
        <div class="err" *ngIf="err()">{{ err() }}</div>
      </div>
      <div class="hint">After clicking Load, the first student's report card opens. Use Next/Previous to move through the class and enter remarks directly on each report card. Remarks auto-save.</div>
    </div>
  `,
  styles: [`
    .wrap{max-width:900px;margin:24px auto;padding:0 12px}
    h2{margin:0 0 10px}
    .panel{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px;display:grid;gap:10px}
    .field{display:grid;gap:6px}
    label{font-weight:600}
    select{padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font:inherit}
    .actions{margin-top:4px}
    button.primary{padding:8px 12px;border:1px solid #0b53a5;border-radius:8px;background:#0b53a5;cursor:pointer;color:#fff;font-weight:700}
    .small{font-size:12px;color:#6b7280}
    .hint{font-size:12px;color:#6b7280;margin-top:8px}
    .err{color:#b91c1c}
  `]
})
export class TeacherCommentLoaderComponent {
  private http = inject(HttpClient);

  classes = signal<Array<{ id:string; name:string; academicYear?: string }>>([]);
  loading = signal(false);
  err = signal<string | null>(null);

  classId = '';
  term = '';
  examType = '';

  constructor(){
    this.http.get<any[]>(`/api/classes`).subscribe({
      next: (rows) => {
        const out = (rows || []).map((c:any) => ({ id: c.id, name: c.name, academicYear: c.academicYear }));
        this.classes.set(out);
      },
      error: () => {}
    });
  }

  clearStatus(){ this.err.set(null); }

  load(){
    this.clearStatus();
    const cid = (this.classId || '').trim();
    const t = (this.term || '').trim();
    if (!cid || !t) { this.err.set('Please select a class and a term.'); return; }
    this.loading.set(true);
    this.http.get<any[]>(`/api/enrollments/class/${encodeURIComponent(cid)}`).subscribe({
      next: rows => {
        const ids: string[] = [];
        (rows || []).forEach((r:any) => {
          const st = r?.student; if (!st) return;
          const sid = st.studentId || st.id; if (!sid) return;
          ids.push(String(sid));
        });
        if (!ids.length) { this.loading.set(false); this.err.set('No students found in the selected class.'); return; }
        try { sessionStorage.setItem('report_seq', JSON.stringify({ ids })); } catch {}
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
