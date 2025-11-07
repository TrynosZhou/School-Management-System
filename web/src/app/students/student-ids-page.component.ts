import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ClassesService, type ClassEntity } from '../classes/classes.service';
import { ReportService } from '../reports/report.service';

@Component({
  selector: 'app-student-ids-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="wrap">
      <div class="top">
        <h2>Student ID Cards</h2>
      </div>
      <form [formGroup]="form" (ngSubmit)="load()">
        <label>Select class</label>
        <select formControlName="classId">
          <option value="">-- Select class --</option>
          <option *ngFor="let c of classes()" [value]="c.id">{{ c.name }} <span class="muted">({{ c.academicYear }})</span></option>
        </select>
        <button type="submit" [disabled]="!form.value.classId">Load</button>
        <span class="err" *ngIf="err()">{{ err() }}</span>
      </form>
      <p class="hint">When loaded, all saved student ID cards for the selected class will open in a single PDF, in sequence.</p>
    </div>
  `,
  styles: [`.wrap{max-width:800px;margin:24px auto} .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px} form{display:grid;gap:8px;grid-template-columns:1fr auto;align-items:end} label{grid-column:1/-1} select{padding:8px;border:1px solid #e5e7eb;border-radius:6px} button{padding:8px 12px;border:1px solid #0b53a5;background:#0b53a5;color:#fff;border-radius:6px} .muted{color:#6b7280} .hint{color:#6b7280;margin-top:8px} .err{color:#b91c1c;margin-left:8px}`]
})
export class StudentIdsPageComponent {
  private fb = inject(FormBuilder);
  private classesSvc = inject(ClassesService);
  private reports = inject(ReportService);

  classes = signal<ClassEntity[]>([]);
  err = signal<string | null>(null);

  form = this.fb.group({ classId: this.fb.control<string>('') });

  constructor(){
    this.classesSvc.list().subscribe({ next: res => this.classes.set(res), error: () => this.classes.set([]) });
  }

  async load(){
    this.err.set(null);
    const classId = this.form.value.classId || '';
    if (!classId) { this.err.set('Select a class first'); return; }
    try {
      await this.reports.openStudentIdsByClass(classId);
    } catch (e: any) {
      this.err.set(e?.error?.message || 'Failed to load');
    }
  }
}
