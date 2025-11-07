import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClassesService, type ClassEntity } from '../classes/classes.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { AttendanceService } from './attendance.service';

@Component({
  selector: 'app-attendance-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="toolbar">
        <h2>Attendance</h2>
        <div class="right">
          <button (click)="markAll(true)" [disabled]="!students().length"><span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 6L9 17l-5-5"/></svg></span>Mark all present</button>
          <button (click)="markAll(false)" [disabled]="!students().length"><span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg></span>Mark all absent</button>
          <button (click)="save()" [disabled]="!students().length || !date"><span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 7h14v12H5z"/><path d="M7 7V5h10v2"/><path d="M8 12h8"/></svg></span>Save</button>
        </div>
      </div>

      <div class="filters">
        <select [(ngModel)]="selectedClassId" (change)="loadStudents()">
          <option value="">Class: Select</option>
          <option *ngFor="let c of classes()" [value]="c.id">{{ c.name }} — {{ c.academicYear }}</option>
        </select>
        <input type="date" [(ngModel)]="date" />
        <select [(ngModel)]="term">
          <option value="">Term: All</option>
          <option>Term 1</option>
          <option>Term 2</option>
          <option>Term 3</option>
        </select>
      </div>

      <table class="table" *ngIf="students().length; else empty">
        <thead>
          <tr><th>#</th><th>Student</th><th>Present</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let s of students(); let i = index">
            <td>{{ i + 1 }}</td>
            <td>{{ s.firstName }} {{ s.lastName }} ({{ s.studentId || s.id }})</td>
            <td>
              <input type="checkbox" [checked]="presence[s.id] ?? true" (change)="toggle(s.id, $event.target.checked)" />
            </td>
          </tr>
        </tbody>
      </table>
      <ng-template #empty>
        <p>Select a class to load students.</p>
      </ng-template>
    </div>
  `,
  styles: [`
    .wrap{max-width:1100px;margin:24px auto}
    .toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .toolbar .right{display:flex;gap:8px;flex-wrap:wrap}
    .filters{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
    .filters input,.filters select{padding:8px;border:1px solid #ddd;border-radius:6px}
    .i{display:inline-flex;width:16px;height:16px;margin-right:6px}
    .i svg{width:16px;height:16px}
    .table{width:100%;border-collapse:collapse}
    .table th,.table td{border:1px solid #ddd;padding:8px;text-align:left}
  `]
})
export class AttendancePageComponent implements OnInit {
  private classesSvc = inject(ClassesService);
  private enrollmentsSvc = inject(EnrollmentsService);
  private attendanceSvc = inject(AttendanceService);

  classes = signal<ClassEntity[]>([]);
  students = signal<any[]>([]);
  selectedClassId = '';
  date = new Date().toISOString().slice(0,10);
  term = '';

  presence: Record<string, boolean | undefined> = {};

  ngOnInit(): void {
    this.classesSvc.list().subscribe(list => this.classes.set(list));
  }

  loadStudents(){
    const cid = this.selectedClassId;
    if (!cid) { this.students.set([]); this.presence = {}; return; }
    this.enrollmentsSvc.listByClass(cid).subscribe(list => {
      const studs = list.map((e: any) => e.student).filter(Boolean);
      this.students.set(studs);
      // default present = true
      this.presence = Object.fromEntries(studs.map((s: any) => [s.id, true]));
    });
  }

  toggle(id: string, val: boolean){ this.presence[id] = val; }
  markAll(val: boolean){ Object.keys(this.presence).forEach(k => this.presence[k] = val); }

  presentCount(){ return Object.values(this.presence).filter(v => v).length; }

  save(){
    if (!this.date) return;
    const term = this.term || undefined;
    const classId = this.selectedClassId || undefined;
    this.students().forEach((s: any) => {
      this.attendanceSvc.record({ studentId: s.id, classId, date: this.date, term, present: !!this.presence[s.id] }).subscribe();
    });
    alert('Attendance saved');
    try {
      localStorage.setItem('attendance_updated_at', String(Date.now()));
    } catch {}
  }
}
