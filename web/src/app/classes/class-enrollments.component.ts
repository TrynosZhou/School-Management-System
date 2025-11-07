import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClassesService, type ClassEntity } from './classes.service';
import { EnrollmentsService, type Enrollment } from '../enrollments/enrollments.service';

@Component({
  selector: 'app-class-enrollments',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wrap">
      <div class="toolbar">
        <h2>Class Enrollments</h2>
      </div>

      <div class="filters">
        <label>Select Class</label>
        <select [value]="selectedId()" (change)="onSelect($event)">
          <option value="">-- choose a class --</option>
          <option *ngFor="let c of classes()" [value]="c.id">{{ c.name }}</option>
        </select>
      </div>

      <table class="table" *ngIf="enrollments().length; else empty">
        <thead>
          <tr>
            <th>Class</th>
            <th>Student ID</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>DOB</th>
            <th>Gender</th>
            <th>Contact Number</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let e of enrollments()">
            <td>{{ (e.classEntity?.name || '-') + (e.classEntity?.gradeLevel ? ' — ' + e.classEntity?.gradeLevel : '') }}</td>
            <td>{{ e.student?.studentId || '-' }}</td>
            <td>{{ e.student?.firstName }}</td>
            <td>{{ e.student?.lastName }}</td>
            <td>{{ e.student?.dob || '-' }}</td>
            <td>{{ e.student?.gender || '-' }}</td>
            <td>{{ e.student?.contactNumber || '-' }}</td>
          </tr>
        </tbody>
      </table>
      <ng-template #empty>
        <p class="muted">{{ selectedId() ? 'No enrollments for this class.' : 'Please select a class.' }}</p>
      </ng-template>
    </div>
  `,
  styles: [`
    .wrap{max-width:900px;margin:24px auto}
    .toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .filters{display:flex;gap:8px;align-items:center;margin-bottom:12px}
    select{padding:8px;border:1px solid #ddd;border-radius:6px}
    .table{width:100%;border-collapse:collapse}
    .table th,.table td{border:1px solid #ddd;padding:8px}
    .muted{color:#6b7280}
  `]
})
export class ClassEnrollmentsComponent implements OnInit {
  private classesSvc = inject(ClassesService);
  private enrollSvc = inject(EnrollmentsService);

  classes = signal<ClassEntity[]>([]);
  enrollments = signal<Enrollment[]>([]);
  selectedId = signal<string>('');

  ngOnInit(): void {
    this.classesSvc.list().subscribe(res => this.classes.set(res));
  }

  onSelect(ev: Event){
    const id = (ev.target as HTMLSelectElement).value;
    this.selectedId.set(id);
    this.enrollments.set([]);
    if (!id) return;
    this.enrollSvc.listByClass(id).subscribe(res => this.enrollments.set(res));
  }
}
