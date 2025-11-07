import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClassesService, type ClassEntity } from '../classes/classes.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { AttendanceService } from '../attendance/attendance.service';

interface Row {
  studentId: string;
  name: string;
  present: number;
  absent: number;
  total: number;
  percent: number;
}

@Component({
  selector: 'app-attendance-report-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="toolbar">
        <h2>Attendance Report</h2>
        <div class="right">
          <button (click)="exportCsv()" [disabled]="!rows().length">Export Excel (CSV)</button>
          <button (click)="exportPdf()" [disabled]="!rows().length">Download PDF</button>
        </div>
      </div>

      <div class="filters">
        <select [(ngModel)]="selectedClassId" (change)="load()">
          <option value="">Class: Select</option>
          <option *ngFor="let c of classes()" [value]="c.id">{{ c.name }} — {{ c.academicYear }}</option>
        </select>
        <select [(ngModel)]="term" (change)="load()">
          <option value="">Term: All</option>
          <option>Term 1</option>
          <option>Term 2</option>
          <option>Term 3</option>
        </select>
      </div>

      <table class="table" *ngIf="rows().length; else empty">
        <thead>
          <tr>
            <th>#</th>
            <th>Student</th>
            <th>Present</th>
            <th>Absent</th>
            <th>Total</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of rows(); let i = index">
            <td>{{ i + 1 }}</td>
            <td>{{ r.name }} ({{ r.studentId }})</td>
            <td>{{ r.present }}</td>
            <td>{{ r.absent }}</td>
            <td>{{ r.total }}</td>
            <td>{{ r.percent | number:'1.0-0' }}%</td>
          </tr>
        </tbody>
      </table>
      <ng-template #empty>
        <p>Select a class and term to load the report.</p>
      </ng-template>
    </div>
  `,
  styles: [`
    .wrap{max-width:1100px;margin:24px auto}
    .toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .toolbar .right{display:flex;gap:8px;flex-wrap:wrap}
    .filters{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
    .filters select{padding:8px;border:1px solid #ddd;border-radius:6px}
    .table{width:100%;border-collapse:collapse}
    .table th,.table td{border:1px solid #ddd;padding:8px;text-align:left}
  `]
})
export class AttendanceReportPageComponent implements OnInit {
  private classesSvc = inject(ClassesService);
  private enrollSvc = inject(EnrollmentsService);
  private attendanceSvc = inject(AttendanceService);

  classes = signal<ClassEntity[]>([]);
  selectedClassId = '';
  term = '';
  rows = signal<Row[]>([]);
  loading = signal(false);

  ngOnInit(): void {
    this.classesSvc.list().subscribe(list => this.classes.set(list));
  }

  load(){
    const cid = this.selectedClassId;
    if (!cid){ this.rows.set([]); return; }
    this.loading.set(true);
    this.enrollSvc.listByClass(cid).subscribe(list => {
      const studs = list.map((e: any) => e.student).filter(Boolean);
      // Load summary per student
      const term = this.term || undefined;
      const pending: Promise<Row>[] = studs.map((s: any) => new Promise<Row>(resolve => {
        this.attendanceSvc.summary({ studentId: s.id, term }).subscribe(sum => {
          const totalFromApi = sum?.total ?? 0;
          const present = sum?.present ?? 0;
          const absent = Math.max(0, totalFromApi - present);
          const total = present + absent; // ensure Total = Present + Absent
          const percent = total ? (present / total) * 100 : 0;
          resolve({ studentId: s.studentId || s.id, name: `${s.firstName} ${s.lastName}`, present, absent, total, percent });
        }, _ => resolve({ studentId: s.studentId || s.id, name: `${s.firstName} ${s.lastName}`, present: 0, absent: 0, total: 0, percent: 0 }));
      }));
      Promise.all(pending).then(rows => {
        // sort by name
        rows.sort((a,b) => a.name.localeCompare(b.name));
        this.rows.set(rows);
        this.loading.set(false);
      });
    }, _ => this.loading.set(false));
  }

  exportCsv(){
    const header = ['Student ID','Student','Present','Absent','Total','Percent'];
    const lines = this.rows().map(r => [r.studentId, r.name, r.present, r.absent, r.total, Math.round(r.percent)].join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${this.selectedClassId || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportPdf(){
    // Open a print-friendly window and let user save as PDF
    const w = window.open('', '_blank');
    if (!w) return;
    const title = 'Attendance Report';
    const style = `
      <style>
        body{font-family:Arial, sans-serif;padding:16px}
        h2{margin:0 0 10px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #ddd;padding:6px;text-align:left}
      </style>`;
    const header = `<h2>${title}</h2><div>Class: ${this.className(this.selectedClassId)} &nbsp; Term: ${this.term || 'All'}</div>`;
    const rows = this.rows().map((r,i) => `<tr><td>${i+1}</td><td>${r.name} (${r.studentId})</td><td>${r.present}</td><td>${r.absent}</td><td>${r.total}</td><td>${Math.round(r.percent)}%</td></tr>`).join('');
    const html = `${style}${header}<table><thead><tr><th>#</th><th>Student</th><th>Present</th><th>Absent</th><th>Total</th><th>%</th></tr></thead><tbody>${rows}</tbody></table>`;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  }

  private className(id: string){
    const c = this.classes().find(x => x.id === id);
    return c ? `${c.name} — ${c.academicYear}` : '-';
  }
}
