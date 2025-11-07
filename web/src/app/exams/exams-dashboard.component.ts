import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ExamsService, ExamDto } from './exams.service';
import { ClassesService, type ClassEntity } from '../classes/classes.service';
import { SubjectsService, type Subject } from '../subjects/subjects.service';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-exams-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="top">
        <h2>Exams</h2>
        <div class="actions">
          <button class="btn primary" (click)="openCreate()">➕ Create New Exam</button>
          <button class="btn" (click)="exportCsv()">📄 Export CSV</button>
        </div>
      </div>

      <div class="filters">
        <input placeholder="Search by name, venue" [(ngModel)]="q" (input)="refresh()" />
        <select [(ngModel)]="classId" (change)="refresh()">
          <option value="">All classes</option>
          <option *ngFor="let c of classes()" [value]="c.id">{{ c.name }} — {{ c.academicYear }}</option>
        </select>
        <select [(ngModel)]="subjectId" (change)="refresh()">
          <option value="">All subjects</option>
          <option *ngFor="let s of subjects()" [value]="s.id">{{ s.code }} — {{ s.name }}</option>
        </select>
        <input type="date" [(ngModel)]="from" (change)="refresh()" />
        <input type="date" [(ngModel)]="to" (change)="refresh()" />
      </div>

      <table class="table" *ngIf="rows().length; else empty">
        <thead>
          <tr>
            <th>Name</th>
            <th>Term</th>
            <th>Year</th>
            <th>Class</th>
            <th>Subject</th>
            <th>Date</th>
            <th>Time</th>
            <th>Venue</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let e of rows()">
            <td>{{ e.name }}</td>
            <td>{{ e.term || '-' }}</td>
            <td>{{ e.academicYear || '-' }}</td>
            <td>{{ e.classEntity?.name || '-' }}</td>
            <td>{{ e.subject?.name || '-' }}</td>
            <td>{{ (e.dateTime ? (e.dateTime | date:'yyyy-MM-dd') : '-') }}</td>
            <td>{{ (e.dateTime ? (e.dateTime | date:'HH:mm') : '-') }}</td>
            <td>{{ e.venue || '-' }}</td>
            <td>{{ e.status || '-' }}</td>
            <td>
              <div class="row-actions">
                <button class="btn" (click)="gotoMarks(e)">Enter Marks</button>
                <button class="btn" [disabled]="e.status === 'completed'" (click)="finalize(e)">Finalize</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <ng-template #empty><div class="muted">No exams scheduled</div></ng-template>

      <div class="modal-backdrop" *ngIf="showCreate()" (click)="closeCreate()"></div>
      <div class="modal" *ngIf="showCreate()" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Create Exam</h3>
          <button class="close" (click)="closeCreate()" type="button">✖</button>
        </div>
        <div class="modal-body">
          <form [formGroup]="form" (ngSubmit)="create()">
            <div class="grid">
              <div>
                <label>Name</label>
                <input formControlName="name" placeholder="e.g., Midterm Maths" />
              </div>
              <div>
                <label>Term</label>
                <input formControlName="term" placeholder="Term 1" />
              </div>
              <div>
                <label>Academic Year</label>
                <input formControlName="academicYear" placeholder="2025/2026" />
              </div>
              <div>
                <label>Class</label>
                <select formControlName="classId">
                  <option value="">Select class</option>
                  <option *ngFor="let c of classes()" [value]="c.id">{{ c.name }} — {{ c.academicYear }}</option>
                </select>
              </div>
              <div>
                <label>Subject</label>
                <select formControlName="subjectId">
                  <option value="">Select subject</option>
                  <option *ngFor="let s of subjects()" [value]="s.id">{{ s.code }} — {{ s.name }}</option>
                </select>
              </div>
              <div>
                <label>Date</label>
                <input type="date" formControlName="date" />
              </div>
              <div>
                <label>Time</label>
                <input type="time" formControlName="time" />
              </div>
              <div>
                <label>Venue</label>
                <input formControlName="venue" placeholder="Room 3" />
              </div>
              <div>
                <label>Invigilator 1</label>
                <select formControlName="invigilator1Id">
                  <option value="">Optional</option>
                  <option *ngFor="let t of teachers()" [value]="t.id">{{ t.firstName }} {{ t.lastName }}</option>
                </select>
              </div>
              <div>
                <label>Invigilator 2</label>
                <select formControlName="invigilator2Id">
                  <option value="">Optional</option>
                  <option *ngFor="let t of teachers()" [value]="t.id">{{ t.firstName }} {{ t.lastName }}</option>
                </select>
              </div>
              <div>
                <label>Status</label>
                <select formControlName="status">
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div class="full">
                <label>Notes</label>
                <textarea formControlName="notes" rows="3"></textarea>
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn primary" type="submit" [disabled]="creating()">{{ creating() ? 'Creating…' : 'Create' }}</button>
              <span class="err" *ngIf="err()">{{ err() }}</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:1100px;margin:24px auto;padding:0 8px}
    .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .actions{display:flex;gap:8px}
    .filters{display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap}
    .filters input,.filters select{padding:8px;border:1px solid #e5e7eb;border-radius:8px}
    .filters input{min-width:220px}
    .btn{display:inline-flex;gap:6px;align-items:center;border:1px solid #0b53a5;background:#0b53a5;color:#fff;border-radius:8px;padding:8px 12px;cursor:pointer;font-weight:700}
    .btn.primary{background:#0b53a5;color:#fff;border-color:#0b53a5;font-weight:700}
    .table{width:100%;border-collapse:collapse}
    th,td{padding:8px;border-bottom:1px solid #f1f2f6;text-align:left}
    .muted{color:#6b7280}
    .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.4)}
    .modal{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;border-radius:10px;box-shadow:0 20px 50px rgba(0,0,0,.3);width:min(800px,95vw);max-height:88vh;display:flex;flex-direction:column}
    .modal-header{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid #eee}
    .close{background:transparent;border:0;font-size:18px;cursor:pointer;color:#6b7280}
    .modal-body{padding:14px;overflow:auto}
    .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
    .grid .full{grid-column:1/-1}
    label{display:block;font-size:12px;color:#6b7280;margin-bottom:4px;font-weight:700}
    input,select,textarea{width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:8px}
    .modal-actions{display:flex;gap:10px;align-items:center;margin-top:12px}
    .err{color:#b91c1c}
  `]
})
export class ExamsDashboardComponent implements OnInit {
  private exams = inject(ExamsService);
  private classesSvc = inject(ClassesService);
  private subjectsSvc = inject(SubjectsService);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  rows = signal<ExamDto[]>([]);
  classes = signal<ClassEntity[]>([]);
  subjects = signal<Subject[]>([]);
  teachers = signal<Array<{ id:string; firstName:string; lastName:string }>>([]);
  showCreate = signal(false);
  creating = signal(false);
  err = signal<string | null>(null);

  q = '';
  classId = '';
  subjectId = '';
  from = '';
  to = '';

  form = this.fb.group({
    name: [''],
    term: [''],
    academicYear: [''],
    classId: [''],
    subjectId: [''],
    date: [''],
    time: [''],
    venue: [''],
    invigilator1Id: [''],
    invigilator2Id: [''],
    status: ['scheduled'],
    notes: [''],
  });

  ngOnInit(): void {
    this.refresh();
    this.classesSvc.list().subscribe({ next: (res) => this.classes.set(res || []) });
    this.subjectsSvc.list().subscribe({ next: (res) => this.subjects.set(res || []) });
    this.http.get<Array<{ id:string; firstName:string; lastName:string }>>('/api/teachers').subscribe({ next: (t) => this.teachers.set(t || []) });
  }

  refresh(){
    this.exams.list({ q: this.q || undefined, classId: this.classId || undefined, subjectId: this.subjectId || undefined, from: this.from || undefined, to: this.to || undefined })
      .subscribe({ next: rows => this.rows.set(rows || []) });
  }

  openCreate(){ this.err.set(null); this.showCreate.set(true); }
  closeCreate(){ this.showCreate.set(false); }

  create(){
    const body = this.form.getRawValue() as any;
    this.creating.set(true); this.err.set(null);
    this.exams.create(body).subscribe({
      next: _ => { this.creating.set(false); this.showCreate.set(false); this.refresh(); },
      error: (e) => { this.creating.set(false); this.err.set(e?.error?.message || 'Create failed'); }
    });
  }

  exportCsv(){
    this.exams.exportCsv({ q: this.q || undefined, classId: this.classId || undefined, subjectId: this.subjectId || undefined, from: this.from || undefined, to: this.to || undefined })
      .subscribe(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'exams.csv'; a.click();
        setTimeout(()=>URL.revokeObjectURL(url), 500);
      });
  }

  gotoMarks(e: ExamDto){
    const qp: any = {};
    if (e.term) qp.session = e.term;
    if (e.classEntity?.id) qp.classId = e.classEntity.id;
    if (e.subject?.id) qp.subjectId = e.subject.id;
    this.router.navigate(['/marks/capture'], { queryParams: qp });
  }

  finalize(e: ExamDto){
    if (!e?.id) return;
    this.creating.set(true);
    this.exams.finalize(e.id).subscribe({
      next: _ => { this.creating.set(false); this.refresh(); },
      error: (err) => { this.creating.set(false); this.err.set(err?.error?.message || 'Finalize failed'); }
    });
  }
}
