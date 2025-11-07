import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ClassesService, type ClassEntity } from './classes.service';

@Component({
  selector: 'app-classes-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="toolbar">
        <h2>Classes</h2>
        <div class="right">
          <button (click)="viewEnrollments()">View Enrollments</button>
          <button (click)="viewStudents()">Students</button>
          <button (click)="create()">New Class</button>
        </div>
      </div>
      <div class="kpis">
        <div class="kpi-tile blue">
          <div class="num">{{ classes().length }}</div>
          <div class="label">Total Classes</div>
        </div>
        <div class="kpi-tile green">
          <div class="num">{{ withTeacherCount() }}</div>
          <div class="label">With Teacher</div>
        </div>
        <div class="kpi-tile red">
          <div class="num">{{ withoutTeacherCount() }}</div>
          <div class="label">Without Teacher</div>
        </div>
        <div class="kpi-tile cyan">
          <div class="num">{{ gradeLevelsCount() }}</div>
          <div class="label">Grade Levels</div>
        </div>
      </div>
      <table class="table" *ngIf="classes().length; else empty">
        <thead>
          <tr><th>Name</th><th>Grade</th><th>Year</th><th>Class teacher</th><th></th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let c of classes()">
            <td>{{ c.name }}</td>
            <td>{{ c.gradeLevel }}</td>
            <td>{{ c.academicYear }}</td>
            <td>{{ c.classTeacher ? (c.classTeacher.firstName + ' ' + c.classTeacher.lastName) : '-' }}</td>
            <td>
              <a [routerLink]="['/classes', c.id]" style="margin-right:8px">Edit</a>
              <button (click)="remove(c)" class="danger">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
      <ng-template #empty>
        <p>No classes yet.</p>
      </ng-template>
    </div>
  `,
  styles: [`.wrap{max-width:900px;margin:24px auto}.toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.toolbar .right{display:flex;gap:8px}.toolbar .right button, .table button{background:#0b53a5;border:1px solid #0b53a5;color:#fff;font-weight:700;border-radius:8px;padding:6px 10px;cursor:pointer}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:8px 0 14px}.kpi-tile{color:#fff;border-radius:6px;padding:12px}.kpi-tile .num{font-size:22px;font-weight:700}.kpi-tile .label{opacity:.9}.kpi-tile.red{background:#e05a47}.kpi-tile.green{background:#18a558}.kpi-tile.cyan{background:#12b6df}.kpi-tile.blue{background:#0b53a5}.table{width:100%;border-collapse:collapse}.table th,.table td{border:1px solid #ddd;padding:8px} .danger{background:#dc2626;border:1px solid #dc2626;color:#fff;border-radius:6px;padding:4px 8px} @media(max-width:780px){.kpis{grid-template-columns:repeat(2,1fr)}}@media(max-width:520px){.kpis{grid-template-columns:1fr}}`]
})
export class ClassesListComponent implements OnInit {
  private svc = inject(ClassesService);
  private router = inject(Router);
  classes = signal<ClassEntity[]>([]);

  ngOnInit() {
    this.svc.list().subscribe(res => this.classes.set(res));
  }

  create() { this.router.navigateByUrl('/classes/new'); }
  viewEnrollments() { this.router.navigateByUrl('/classes/enrollments'); }
  viewStudents() { this.router.navigateByUrl('/students'); }

  withTeacherCount() { return this.classes().filter(c => !!c.classTeacher).length; }
  withoutTeacherCount() { return this.classes().filter(c => !c.classTeacher).length; }
  gradeLevelsCount() { return new Set(this.classes().map(c => c.gradeLevel)).size; }

  remove(c: ClassEntity) {
    const ok = confirm(`Delete class "${c.name}"? This cannot be undone.`);
    if (!ok) return;
    this.svc.remove(c.id).subscribe({
      next: () => this.classes.set(this.classes().filter(x => x.id !== c.id)),
      error: (e) => alert(e?.error?.message || 'Failed to delete class'),
    });
  }
}
