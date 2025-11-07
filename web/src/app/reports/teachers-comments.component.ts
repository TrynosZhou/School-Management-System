import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from './report.service';
import { ClassesService, type ClassEntity } from '../classes/classes.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';

interface StudentRow {
  id: string;
  displayId: string;
  name: string;
  comment: string;
  principalComment: string;
  loading: boolean;
  error?: string | null;
}

@Component({
  selector: 'app-teachers-comments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wrap">
      <h2>Remarks</h2>

      <div class="filters">
        <div class="row">
          <label>Term</label>
          <select [(ngModel)]="term">
            <option value="">Select term</option>
            <option>Term 1</option>
            <option>Term 2</option>
            <option>Term 3</option>
          </select>

          <label>Class</label>
          <select [(ngModel)]="classId">
            <option value="">Select class</option>
            <option *ngFor="let c of classes()" [value]="c.id">{{ c.name }} — {{ c.academicYear }}</option>
          </select>

          <label>Exam type</label>
          <select [(ngModel)]="examType">
            <option value="">Select type</option>
            <option>Midterm</option>
            <option>End of Term</option>
          </select>

          <button class="primary" (click)="load()" [disabled]="!classId || !term || !examType || loading()">{{ loading() ? 'Loading…' : 'Load' }}</button>
        </div>
      </div>

      <div *ngIf="loadErr()" class="err">{{ loadErr() }}</div>

      <div *ngIf="students().length" class="list">
        <div class="head">
          <div class="col idx">#</div>
          <div class="col name">Student</div>
          <div class="col comment">Teacher's remark</div>
          <div class="col comment">Headmaster's remark</div>
          <div class="col status">Status</div>
        </div>
        <div class="row item" *ngFor="let s of students(); let i = index">
          <div class="col idx">{{ i + 1 }}</div>
          <div class="col name">{{ s.name }} ({{ s.displayId }})</div>
          <div class="col comment">
            <textarea [(ngModel)]="s.comment" rows="2" placeholder="Type teacher's remark..."></textarea>
          </div>
          <div class="col comment">
            <textarea [(ngModel)]="s.principalComment" rows="2" placeholder="Type headmaster's remark..."></textarea>
          </div>
          <div class="col status">
            <span *ngIf="s.loading">Loading…</span>
            <span class="err" *ngIf="s.error">{{ s.error }}</span>
          </div>
        </div>
      </div>

      <div class="actions" *ngIf="students().length">
        <button class="primary" (click)="saveAll()" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save all comments' }}</button>
        <span class="ok" *ngIf="saveOk()">Saved {{ savedCount() }} of {{ students().length }}</span>
        <span class="err" *ngIf="saveErr()">{{ saveErr() }}</span>
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:1100px;margin:24px auto;padding:0 12px}
    h2{margin:0 0 12px}
    .filters{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin-bottom:12px}
    .filters .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    label{font-size:12px;color:#6b7280;margin-right:4px}
    select{padding:8px;border:1px solid #e5e7eb;border-radius:8px}
    button{padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer}
    button.primary{background:#0b53a5;border-color:#0b53a5;color:#fff;font-weight:700}
    .err{color:#b91c1c}
    .ok{color:#166534;margin-left:8px}
    .list{border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;background:#fff}
    .head,.item{display:grid;grid-template-columns:48px 1fr 1.5fr 1.5fr 140px;gap:8px;align-items:center}
    .head{background:#f8fafc;border-bottom:1px solid #e5e7eb;padding:8px}
    .item{border-top:1px solid #f1f5f9;padding:8px}
    .col.comment textarea{width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:8px}
    .actions{display:flex;align-items:center;gap:8px;margin-top:12px}
    @media(max-width:1024px){.head,.item{grid-template-columns:36px 1fr 1fr 1fr 120px}}
    @media(max-width:760px){.head,.item{grid-template-columns:32px 1fr 1fr 1fr}}
  `]
})
export class TeachersCommentsComponent {
  private classesSvc = inject(ClassesService);
  private enrollmentsSvc = inject(EnrollmentsService);
  private reports = inject(ReportService);

  classes = signal<ClassEntity[]>([]);
  term: string = '';
  classId: string = '';
  examType: string = '';

  students = signal<StudentRow[]>([]);
  loading = signal(false);
  loadErr = signal<string | null>(null);

  saving = signal(false);
  saveOk = signal(false);
  saveErr = signal<string | null>(null);
  savedCount = signal(0);

  constructor(){
    this.classesSvc.list().subscribe(res => this.classes.set(res));
  }

  load(){
    if (!this.term || !this.classId) return;
    this.loading.set(true); this.loadErr.set(null); this.students.set([]);
    this.enrollmentsSvc.listByClass(this.classId).subscribe({
      next: (enrs: any[]) => {
        const studs = enrs.map(e => e.student).filter(Boolean);
        const rows: StudentRow[] = studs.map((s: any) => ({
          id: s.id,
          displayId: s.studentId || s.id,
          name: `${s.firstName} ${s.lastName}`,
          comment: '',
          principalComment: '',
          loading: true,
          error: null,
        }));
        this.students.set(rows);
        // Prefill remarks per student
        rows.forEach((row) => {
          this.reports.getRemarks(row.id, this.term || undefined, this.examType || undefined).subscribe({
            next: rec => { 
              row.comment = (rec?.teacherRemark || '').toString(); 
              row.principalComment = (rec?.principalRemark || '').toString(); 
              row.loading = false; 
            },
            error: _ => { row.loading = false; row.error = 'Failed to load'; }
          });
        });
      },
      error: _ => { this.loading.set(false); this.loadErr.set('Failed to load students'); }
    });
    // release loading state once initial requests scheduled
    setTimeout(()=> this.loading.set(false), 300);
  }

  saveAll(){
    const list = this.students();
    if (!list.length) return;
    this.saving.set(true); this.saveOk.set(false); this.saveErr.set(null); this.savedCount.set(0);
    let done = 0; let failed = 0;
    list.forEach(row => {
      const tr = (row.comment || '').trim();
      this.reports.saveRemarks({
        studentId: row.id,
        term: this.term || undefined,
        examType: this.examType || undefined,
        teacherRemark: tr || undefined,
        principalRemark: (row.principalComment || '').trim() || undefined,
      }).subscribe({
        next: _ => { done++; this.savedCount.set(done); this.saveOk.set(true); },
        error: _ => { failed++; },
        complete: () => {
          if (done + failed >= list.length) {
            this.saving.set(false);
            if (failed) this.saveErr.set(`${failed} failed`);
          }
        }
      });
    });
  }
}
