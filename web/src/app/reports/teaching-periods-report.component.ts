import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportService } from './report.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-teaching-periods-report',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wrap">
      <div class="top">
        <h2>Teaching Periods</h2>
        <div class="actions">
          <button (click)="downloadPdf()">Download PDF</button>
          <button (click)="downloadCsv()">Export CSV</button>
        </div>
      </div>
      <div class="hint">All registered teachers, their classes and total teaching periods.</div>
      <div class="err" *ngIf="err()">{{ err() }}</div>
      <table class="table" *ngIf="rows().length; else empty">
        <thead>
          <tr><th>Teacher</th><th>Email</th><th>Classes</th><th class="num">Total Periods</th><th>Actions</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of rows()">
            <td>{{ r.teacher.name }}</td>
            <td>{{ r.teacher.email || '-' }}</td>
            <td>{{ classesFor(r) }}</td>
            <td class="num">{{ r.total }}</td>
            <td>
              <button class="link" title="Add classes to teach" (click)="addClasses(r.teacher.id)">+</button>
            </td>
          </tr>
        </tbody>
      </table>
      <ng-template #empty>
        <p>No data.</p>
      </ng-template>
    </div>
  `,
  styles: [`
    .wrap{max-width:1000px;margin:24px auto;padding:0 8px}
    .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .actions{display:flex;gap:8px}
    button{padding:8px 12px;border:1px solid #0b53a5;background:#0b53a5;color:#fff;border-radius:6px;font-weight:700}
    .link{padding:4px 10px;border:1px solid #e5e7eb;background:#fff;color:#111827;border-radius:6px;cursor:pointer}
    .hint{color:#cbd5e1;margin-bottom:8px}
    .err{color:#fecaca;margin:8px 0}
    .table{width:100%;border-collapse:collapse;background:transparent}
    .table th,.table td{border:1px solid #e5e7eb;padding:10px;color:inherit;font-weight:inherit}
    .table th{background:whitesmoke;font-weight:700}
    .table th.num,.table td.num{text-align:right}
  `]
})
export class TeachingPeriodsReportComponent implements OnInit {
  private reports = inject(ReportService);
  private router = inject(Router);
  rows = signal<Array<{ teacher:{id:string;name:string;email:string}; items:Array<{className:string;subjectName:string;periods:number}>; total:number }>>([]);
  err = signal<string | null>(null);

  ngOnInit(){
    this.load();
  }

  load(){
    this.err.set(null);
    this.reports.getTeachingPeriodsJson().subscribe({
      next: (res) => this.rows.set(res || []),
      error: (e) => this.err.set(e?.error?.message || 'Failed to load')
    });
  }

  async downloadPdf(){
    try { await this.reports.downloadTeachingPeriodsPdf(); } catch {}
  }

  async downloadCsv(){
    try { await this.reports.downloadTeachingPeriodsCsv(); } catch {}
  }

  classesFor(r: { items: Array<{className:string}> }){
    const uniq = Array.from(new Set((r.items||[]).map(it => it.className).filter(Boolean)));
    return uniq.length ? uniq.join(', ') : '-';
  }

  addClasses(teacherId: string){
    this.router.navigateByUrl(`/teaching-load?teacherId=${encodeURIComponent(teacherId)}`);
  }
}
