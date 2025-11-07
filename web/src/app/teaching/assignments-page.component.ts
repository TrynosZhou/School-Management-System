import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TeachersService, type Teacher } from '../teachers/teachers.service';
import { ClassesService, type ClassEntity } from '../classes/classes.service';
import { SubjectsService, type Subject } from '../subjects/subjects.service';
import { TeachingService, type TeachingAssignment } from './teaching.service';
import { AuthStateService } from '../auth/auth-state.service';

@Component({
  selector: 'app-assignments-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="top">
        <h2>Teaching assignments</h2>
        <a routerLink="/dashboard" class="home">Home</a>
      </div>

      <form [formGroup]="form" (ngSubmit)="onAssign()" class="assign-form">
        <div class="row">
          <div>
            <label>Teacher</label>
            <select formControlName="teacherId" (change)="refreshForTeacher()">
              <option value="" disabled>Select teacher</option>
              <option *ngFor="let t of teachers()" [value]="t.id">{{ t.firstName }} {{ t.lastName }}</option>
            </select>
          </div>
          <div>
            <label>Class</label>
            <select formControlName="classId" (change)="refreshForClass()">
              <option value="" disabled>Select class</option>
              <option *ngFor="let c of classes()" [value]="c.id">{{ c.name }} — {{ c.academicYear }}</option>
            </select>
          </div>
          <div>
            <label>Subject (optional)</label>
            <select formControlName="subjectId">
              <option value="">-- Any subject --</option>
              <option *ngFor="let s of subjects()" [value]="s.id">{{ s.code }} — {{ s.name }}</option>
            </select>
          </div>
          <div>
            <label>Status</label>
            <select formControlName="status">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div class="actions">
          <button type="submit" [disabled]="form.invalid || saving() || isDuplicateAssignment()">{{ saving() ? 'Assigning…' : 'Assign' }}</button>
        </div>
      </form>

      <div class="error" *ngIf="err()">{{ err() }}</div>
      <div class="ok" *ngIf="ok()">Assignment saved</div>

      <div class="lists">
        <div class="list" *ngIf="currentClassAssignments().length">
          <h3>Assignments for selected class</h3>
          <table>
            <thead><tr><th>Teacher</th><th>Subject</th><th>Status</th></tr></thead>
            <tbody>
              <tr *ngFor="let a of currentClassAssignments()">
                <td>{{ a.teacher.firstName }} {{ a.teacher.lastName }}</td>
                <td>{{ a.subject ? (a.subject.code + ' — ' + a.subject.name) : 'Any' }}</td>
                <td>{{ a.status }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:900px;margin:24px auto}
    .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
    .home{font-size:14px}
    .assign-form .row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
    select{width:100%;padding:8px;border:1px solid #ddd;border-radius:6px}
    .actions{margin-top:12px}
    .error{color:#b00020;margin-top:8px}
    .ok{color:#166534;margin-top:8px}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th,td{border:1px solid #e5e7eb;padding:8px;text-align:left}
    @media(max-width:800px){.assign-form .row{grid-template-columns:1fr}}
  `]
})
export class AssignmentsPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private teachersSvc = inject(TeachersService);
  private classesSvc = inject(ClassesService);
  private subjectsSvc = inject(SubjectsService);
  private teaching = inject(TeachingService);
  private auth = inject(AuthStateService);

  teachers = signal<Teacher[]>([]);
  classes = signal<ClassEntity[]>([]);
  subjects = signal<Subject[]>([]);
  currentClassAssignments = signal<TeachingAssignment[]>([]);
  teacherAssignments = signal<TeachingAssignment[]>([]);

  saving = signal(false);
  ok = signal(false);
  err = signal<string | null>(null);

  form = this.fb.group({
    teacherId: ['', Validators.required],
    classId: ['', Validators.required],
    subjectId: [''],
    status: ['active', Validators.required],
  });

  ngOnInit() {
    this.teachersSvc.list().subscribe({ next: res => this.teachers.set(res) });
    this.classesSvc.list().subscribe({ next: res => this.classes.set(res) });
    this.subjectsSvc.list().subscribe({ next: res => this.subjects.set(res) });
  }

  refreshForClass() {
    const cid = this.form.value.classId as string;
    if (!cid) { this.currentClassAssignments.set([]); return; }
    this.teaching.listForClass(cid).subscribe(list => this.currentClassAssignments.set(list));
  }

  refreshForTeacher() {
    const tid = this.form.value.teacherId as string;
    if (!tid) { this.teacherAssignments.set([]); return; }
    this.teaching.listForTeacher(tid).subscribe(list => this.teacherAssignments.set(list));
  }

  isDuplicateAssignment() {
    const cid = this.form.value.classId as string;
    const sid = this.form.value.subjectId as string;
    const assignments = this.teacherAssignments();
    // Violates teacher one-class rule (active in another class)
    const otherActiveClass = assignments.some(a => a.status === 'active' && a.klass.id !== cid);
    if (otherActiveClass) return true;
    // Subject already taken in selected class (active)
    if (sid) {
      const taken = this.currentClassAssignments().some(a => a.status === 'active' && a.subject && a.subject.id === sid);
      if (taken) return true;
    }
    return false;
  }

  onAssign() {
    if (this.form.invalid) return;
    this.saving.set(true); this.ok.set(false); this.err.set(null);
    const raw = this.form.getRawValue();

    const cid = raw.classId!;
    const sid = (raw.subjectId || undefined) as string | undefined;

    // Enforce: teacher can only be assigned to one class (active)
    const otherActiveClass = this.teacherAssignments().some(a => a.status === 'active' && a.klass.id !== cid);
    if (otherActiveClass) {
      this.saving.set(false);
      this.err.set('This teacher is already assigned to another class (active). A teacher can only be assigned to one class.');
      return;
    }

    // Enforce: only one active teacher per subject in a class
    if (sid) {
      const taken = this.currentClassAssignments().some(a => a.status === 'active' && a.subject && a.subject.id === sid);
      if (taken) {
        this.saving.set(false);
        this.err.set('This subject already has a teacher for the selected class.');
        return;
      }
    }

    this.teaching.assign({
      teacherId: raw.teacherId!,
      classId: raw.classId!,
      subjectId: raw.subjectId || undefined,
      status: raw.status as 'active' | 'inactive',
    }).subscribe({
      next: (res) => {
        this.saving.set(false);
        if (res.success) { this.ok.set(true); this.refreshForClass(); }
        else this.err.set(res.message || 'Failed to assign');
      },
      error: (e) => { this.saving.set(false); this.err.set(e?.error?.message || 'Failed to assign'); }
    });
  }

  canAssign() {
    const role = this.auth.role();
    return role === 'admin' || role === 'teacher';
  }
}
