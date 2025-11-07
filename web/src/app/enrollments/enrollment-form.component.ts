import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EnrollmentsService } from './enrollments.service';
import { StudentsService, type Student } from '../students/students.service';
import { ClassesService, type ClassEntity } from '../classes/classes.service';

@Component({
  selector: 'app-enrollment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="top">
        <h2>New Enrollment</h2>
      </div>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <label>Student</label>
        <div class="sel-info" *ngIf="selectedName()">
          <span class="hint">Selected:</span> {{ selectedName() }}
        </div>
        <select formControlName="studentId">
          <option value="" disabled>Select a student</option>
          <option *ngFor="let s of students()" [value]="s.id">{{ s.firstName }} {{ s.lastName }} ({{ s.email }})</option>
        </select>

        <label>Class</label>
        <select formControlName="classId">
          <option value="" disabled>Select a class</option>
          <option *ngFor="let c of classes()" [value]="c.id">{{ c.name }} — {{ c.academicYear }}</option>
        </select>

        <label>Start date</label>
        <input type="date" formControlName="startDate" />

        <div class="actions">
          <button type="submit" [disabled]="form.invalid || saving()">{{ saving() ? 'Enrolling…' : 'Enroll' }}</button>
          <button type="button" (click)="cancel()">Cancel</button>
        </div>
      </form>
      <div class="error" *ngIf="err()">{{ err() }}</div>
    </div>
  `,
  styles: [`.wrap{max-width:600px;margin:24px auto;display:block} .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px} .home{font-size:14px} form{display:grid;gap:8px} select,input{padding:8px;border:1px solid #ccc;border-radius:4px} .sel-info{font-size:13px;color:#374151;margin:-2px 0 4px} .sel-info .hint{color:#6b7280;margin-right:4px} .actions{display:flex;gap:8px} .error{color:#b00020}`]
})
export class EnrollmentFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private enrollSvc = inject(EnrollmentsService);
  private studentsSvc = inject(StudentsService);
  private classesSvc = inject(ClassesService);

  students = signal<Student[]>([]);
  classes = signal<ClassEntity[]>([]);
  saving = signal(false);
  err = signal<string | null>(null);

  form = this.fb.group({
    studentId: ['', Validators.required],
    classId: ['', Validators.required],
    startDate: [''],
  });

  ngOnInit() {
    // Load a large page to include all students for selection
    this.studentsSvc.list(1, 1000).subscribe({ next: (res) => this.students.set(res.data) });
    this.classesSvc.list().subscribe({ next: (res) => this.classes.set(res) });
    const qp = this.route.snapshot.queryParamMap;
    const sid = qp.get('studentId');
    const cid = qp.get('classId');
    if (sid) this.form.patchValue({ studentId: sid });
    if (cid) this.form.patchValue({ classId: cid });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.err.set(null);
    const raw = this.form.getRawValue();
    this.enrollSvc.create({
      studentId: raw.studentId!,
      classId: raw.classId!,
      startDate: raw.startDate || null,
      status: 'active',
    }).subscribe({
      next: _ => { this.saving.set(false); this.router.navigateByUrl('/classes'); },
      error: e => { this.saving.set(false); this.err.set(e?.error?.message || 'Enroll failed'); }
    });
  }

  cancel() { this.router.navigateByUrl('/classes'); }

  selectedName(){
    const sid = this.form.get('studentId')?.value as string | null;
    if (!sid) return null;
    const s = this.students().find(x => x.id === sid);
    return s ? `${s.firstName} ${s.lastName}` : null;
  }
}
