import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClassesService, type ClassEntity } from '../classes/classes.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { ReportService } from './report.service';

@Component({
  selector: 'app-teachers-comment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="top">
        <h2>Teacher's Comments</h2>
      </div>

      <div class="card">
        <div class="filters">
          <div class="row">
            <label>Class</label>
            <select [(ngModel)]="selectedClassId">
              <option value="">Select class</option>
              <option *ngFor="let c of classes()" [value]="c.id">{{ c.name }} — {{ c.academicYear }}</option>
            </select>
            <label>Term</label>
            <select [(ngModel)]="term">
              <option value="">Select term</option>
              <option>Term 1</option>
              <option>Term 2</option>
              <option>Term 3</option>
            </select>
            <button (click)="loadClassStudents()" [disabled]="!selectedClassId || !term" aria-label="Load students">Load students</button>
          </div>
        </div>
      </div>

      <div *ngIf="loadErr()" class="err">{{ loadErr() }}</div>

      <div class="card" *ngIf="students().length">
        <div class="card-title">Students</div>
        <table class="table">
          <thead>
            <tr><th>#</th><th>Student I.D</th><th>First name</th><th>Last name</th><th>Teacher's comment</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of students(); let i = index">
              <td>{{ i + 1 }}</td>
              <td>{{ s.displayId }}</td>
              <td>{{ s.firstName }}</td>
              <td>{{ s.lastName }}</td>
              <td class="comment">
                <textarea [(ngModel)]="remarks[s.id]" rows="2" placeholder="Type comment..."></textarea>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="actions">
        <button (click)="saveAll()" [disabled]="!students().length || saving()" aria-label="Save comments">Save comments</button>
        <span class="ok" *ngIf="saveOk()">Saved {{ savedCount() }} of {{ students().length }}</span>
        <span class="err" *ngIf="saveErr()">{{ saveErr() }}</span>
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:1100px;margin:24px auto;padding:0 12px}
    .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .card{background:#fff;border:1px solid #eee;border-radius:10px;padding:12px;margin-bottom:12px}
    .card-title{font-weight:600;margin-bottom:8px}
    .filters .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    label{font-size:12px;color:#6b7280;margin-right:4px}
    select{padding:8px;border:1px solid #e5e7eb;border-radius:8px}
    button{padding:8px 12px;border:1px solid #1d4ed8;border-radius:8px;background:#1d4ed8;cursor:pointer;color:#ffffff}
    button[disabled]{opacity:0.6;cursor:not-allowed}
    .table{width:100%;border-collapse:collapse}
    .table th,.table td{border:1px solid #e5e7eb;padding:8px;text-align:left;vertical-align:top}
    .comment textarea{width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:8px}
    .actions{display:flex;align-items:center;gap:8px;margin-top:12px}
    .ok{color:#166534}
    .err{color:#b91c1c}
  `]
})
export class TeachersCommentComponent {
  private classesSvc = inject(ClassesService);
  private enrollmentsSvc = inject(EnrollmentsService);
  private reports = inject(ReportService);

  classes = signal<ClassEntity[]>([]);
  selectedClassId = '';
  term = '';
  students = signal<any[]>([]);
  remarks: Record<string,string> = {};
  loading = signal(false);
  loadErr = signal<string | null>(null);
  saving = signal(false);
  saveOk = signal(false);
  saveErr = signal<string | null>(null);
  savedCount = signal(0);

  constructor() {
    this.classesSvc.list().subscribe({ next: (res) => this.classes.set(res) });
  }

  loadClassStudents() {
    const cid = this.selectedClassId;
    if (!cid || !this.term) { this.students.set([]); return; }
    this.loading.set(true); this.loadErr.set(null); this.students.set([]); this.remarks = {};
    this.enrollmentsSvc.listByClass(cid).subscribe({
      next: (list: any[]) => {
        const studs = list.map((e: any) => e.student).filter(Boolean).map((s: any) => ({
          ...s,
          displayId: s.studentId || s.id,
        }));
        this.students.set(studs);
        studs.forEach((s: any) => {
          this.reports.getRemarks(s.id, this.term || undefined).subscribe({
            next: rec => { if (rec?.teacherRemark) this.remarks[s.id] = rec.teacherRemark; },
            error: _ => {}
          });
        });
      },
      error: _ => { this.loadErr.set('Failed to load students'); },
      complete: () => { this.loading.set(false); }
    });
  }

  saveAll(){
    const list = this.students();
    if (!list.length) return;
    this.saving.set(true); this.saveOk.set(false); this.saveErr.set(null); this.savedCount.set(0);
    let done = 0; let failed = 0;
    list.forEach(s => {
      const tr = (this.remarks[s.id] || '').trim();
      this.reports.saveRemarks({
        studentId: s.id,
        term: this.term || undefined,
        teacherRemark: tr || undefined,
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
