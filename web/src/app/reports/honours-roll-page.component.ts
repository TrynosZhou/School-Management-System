import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClassesService, type ClassEntity } from '../classes/classes.service';
import { ReportService } from './report.service';

interface HonoursRow { id: string; name: string; code: string; studentId?: string; avg: number; total: number; count: number; passed: number; stream?: string | null }

@Component({
  selector: 'app-honours-roll-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="wrap">
      <h2>Honours Roll</h2>
      <div class="row">
        <div>
          <label>Academic year (optional)</label>
          <input [(ngModel)]="academicYear" placeholder="e.g. 2025/2026" />
        </div>
        <div>
          <label>Grade</label>
          <select [(ngModel)]="gradeLevel">
            <option value="">-- Select grade --</option>
            <option *ngFor="let g of gradeLevels()" [ngValue]="g">{{ g }}</option>
          </select>
        </div>
        <div>
          <label>Term</label>
          <select [(ngModel)]="term">
            <option value="">-- Select term --</option>
            <option>Term 1</option>
            <option>Term 2</option>
            <option>Term 3</option>
          </select>
        </div>
        <div>
          <label>Exam Type</label>
          <select [(ngModel)]="examType">
            <option value="">-- Select exam type --</option>
            <option>Midterm</option>
            <option>End of Term</option>
          </select>
        </div>
        <div>
          <label>Top N</label>
          <input type="number" min="1" [(ngModel)]="topN" />
        </div>
        <div class="actions">
          <button (click)="generate()" [disabled]="!gradeLevel || !term || !examType">
            <span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5v14M5 12h14"/></svg></span>
            Generate
          </button>
          <button (click)="downloadPdf()" [disabled]="!rows().length">
            <span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3v12"/><path d="M7 12l5 5 5-5"/><path d="M5 21h14"/></svg></span>
            Download PDF
          </button>
          <button (click)="downloadCsv()" [disabled]="!rows().length">
            <span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3v12"/><path d="M7 12l5 5 5-5"/><path d="M5 21h14"/></svg></span>
            Download Excel
          </button>
        </div>
      </div>
      <div class="hint">Honours roll shows top students by average marks for the selected grade and term. All streams are combined unless specified by your data model.</div>

      <div *ngIf="err" class="err">{{ err }}</div>
      <div *ngIf="loading">Generating…</div>

      <div *ngIf="!loading && rows().length">
        <table class="table">
          <thead>
            <tr><th>Position</th><th>Full Name</th><th>Student ID</th><th>Total</th><th>Average</th><th>Subj_Passed</th><th>Subj_Count</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of rows(); let i = index">
              <td>{{ i + 1 }}</td>
              <td>{{ r.name }}</td>
              <td>{{ r.code }}</td>
              <td>{{ r.total | number:'1.0-0' }}</td>
              <td>{{ r.avg | number:'1.1-1' }}</td>
              <td>{{ r.passed }}</td>
              <td>{{ r.count }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:1000px;margin:24px auto;display:grid;gap:12px}
    .row{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap}
    label{display:block;font-size:12px;color:#6b7280;margin-bottom:4px}
    select,input{padding:8px;border:1px solid #e5e7eb;border-radius:8px}
    .actions{display:flex;gap:8px}
    .i{display:inline-flex;width:16px;height:16px;margin-right:6px}
    .i svg{width:16px;height:16px}
    .hint{color:#9ca3af}
    .group{margin-top:12px}
    .group-title{font-weight:600;margin:8px 0}
    .table{width:100%;border-collapse:collapse}
    .table th,.table td{border:1px solid #e5e7eb;padding:6px;text-align:left}
  `]
})
export class HonoursRollPageComponent {
  private classesSvc = inject(ClassesService);
  private reports = inject(ReportService);

  classes = signal<ClassEntity[]>([]);
  gradeLevels = signal<string[]>([]);
  gradeLevel = '';
  term = '';
  academicYear = '';
  examType = '';
  topN = 10;
  loading = false;
  err: string | null = null;

  rows = signal<HonoursRow[]>([]);
  groupedRows = signal<Record<string, HonoursRow[]>>({});
  groupedRowsKeys = signal<string[]>([]);
  schoolName = '';
  schoolAddress = '';
  logoUrl = '';
  private logoDataUrl: string | '' = '';

  constructor(){
    this.classesSvc.list().subscribe(rows => {
      this.classes.set(rows);
      const uniq = Array.from(new Set(rows.map(r => r.gradeLevel).filter(Boolean)));
      this.gradeLevels.set(uniq);
      // Set sensible defaults if not already selected
      if (!this.gradeLevel && uniq.length) {
        // Pick the lowest (or first) grade by natural order
        const sorted = [...uniq].sort();
        this.gradeLevel = sorted[0];
      }
      if (!this.term) {
        this.term = this.inferCurrentTerm();
      }
      if (!this.examType) {
        this.examType = this.defaultExamType();
      }
      if (!this.academicYear) {
        this.academicYear = this.inferAcademicYearForGrade(this.gradeLevel) || '';
      }
      // Auto-generate once defaults are ready and nothing is shown yet
      if (this.gradeLevel && this.term && this.examType && !this.rows().length) {
        // Defer to next tick to ensure signals have propagated
        setTimeout(() => this.generate(), 0);
      }
    });
  }

  private inferCurrentTerm(): string {
    const m = new Date().getMonth() + 1; // 1-12
    if (m <= 4) return 'Term 1';
    if (m <= 8) return 'Term 2';
    return 'Term 3';
  }

  private defaultExamType(): string { return 'End of Term'; }

  private inferAcademicYearForGrade(gradeLevel: string): string | null {
    const rows = this.classes();
    if (!rows.length) return null;
    const list = rows.filter(r => String(r.gradeLevel) === String(gradeLevel));
    if (!list.length) return null;
    // Choose the most frequent academicYear among classes in the grade; fallback to latest lexicographically
    const freq = new Map<string, number>();
    list.forEach(r => { const y = r.academicYear || ''; if (!y) return; freq.set(y, (freq.get(y) || 0) + 1); });
    if (freq.size) {
      let best = '';
      let bestN = -1;
      freq.forEach((n, y) => { if (n > bestN) { best = y; bestN = n; } });
      return best;
    }
    const years = Array.from(new Set(list.map(r => r.academicYear).filter(Boolean) as string[]));
    if (years.length) return years.sort().pop() || null;
    return null;
  }

  async generate(){
    if (!this.gradeLevel || !this.term || !this.examType) return;
    this.loading = true; this.err = null; this.rows.set([]); this.groupedRows.set({}); this.groupedRowsKeys.set([]);
    try {
      const data: any = await this.reports.getHonoursByGradeJson(this.gradeLevel, this.term, this.examType, this.academicYear || undefined).toPromise();
      if (!data || data.error) { this.err = data?.error || 'Failed to load'; return; }
      this.schoolName = data.schoolName || this.schoolName || 'SchoolPro';
      this.schoolAddress = data.schoolAddress || this.schoolAddress || '';
      this.logoUrl = data.logoUrl || this.logoUrl || '';
      // Try embed logo as data URL to avoid CORS/visibility issues during print
      if (this.logoUrl) {
        try { this.logoDataUrl = (await this.toDataUrl(this.logoUrl)) || ''; } catch { this.logoDataUrl = ''; }
      }
      const groups = (data.groups || {}) as Record<string, Array<{ id:string; name:string; studentId:string; avg:number; total:number; count:number; A?:number; B?:number; C?:number; D?:number }>>;
      const keys = Object.keys(groups);
      const collected: HonoursRow[] = [];
      keys.forEach(k => {
        const list = groups[k] || [];
        list.forEach(r => {
          const passed = (Number((r as any).A)||0) + (Number((r as any).B)||0) + (Number((r as any).C)||0) + (Number((r as any).D)||0);
          collected.push({ id: (r as any).id || '', name: r.name, code: r.studentId, studentId: r.studentId, total: r.total, count: Number((r as any).count)||0, avg: r.avg, passed, stream: null });
        });
      });
      // Sort combined across grade and apply Top N globally
      collected.sort((a,b) => b.avg - a.avg);
      const finalRows = this.topN > 0 ? collected.slice(0, this.topN) : collected;
      this.rows.set(finalRows);
    } catch (e: any) {
      this.err = e?.error?.message || 'Failed to generate honours roll';
    } finally {
      this.loading = false;
    }
  }

  downloadCsv(){
    if (!this.gradeLevel || !this.term || !this.examType) return;
    this.reports.downloadHonoursByGradeCsv(this.gradeLevel, this.term, this.examType, this.academicYear || undefined);
  }

  downloadPdf(){
    // Use a printable HTML view for now
    const w = window.open('about:blank', '_blank'); if (!w) return;
    const trs = this.rows().map((r,i) => `<tr><td>${i+1}</td><td>${r.name}</td><td>${r.code}</td><td>${r.total.toFixed(0)}</td><td>${r.avg.toFixed(1)}</td><td>${r.passed}</td><td>${r.count}</td></tr>`).join('');
    const rowsHtml = `<table class=\"table\"><thead><tr><th>Position</th><th>Full Name</th><th>Student ID</th><th>Total</th><th>Average</th><th>Subj_Passed</th><th>Subj_Count</th></tr></thead><tbody>${trs}</tbody></table>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Honours Roll</title>
      <style>
        body{margin:0;padding:0;background:#f8fafc;font-family:Arial, sans-serif}
        .banner{background:#0b3d91;color:#fff;padding:10px 12px;display:flex;align-items:center;gap:12px}
        .banner .logo{width:220px;height:90px;object-fit:contain;background:transparent}
        .banner .meta{flex:1;text-align:center}
        .banner .name{font-weight:700;font-size:16px}
        .banner .addr{font-size:12px;opacity:0.95}
        .wrap{max-width:1000px;margin:16px auto;padding:0 8px}
        .title{font-weight:700;font-size:18px;margin:8px 0}
        .group{margin-top:12px}
        .group-title{font-weight:600;margin:8px 0}
        .table{width:100%;border-collapse:collapse}
        .table th,.table td{border:1px solid #e5e7eb;padding:6px;text-align:left}
      </style></head>
      <body>
        <div class="banner">
          ${(this.logoDataUrl || this.logoUrl) ? `<img class=\"logo\" src=\"${this.logoDataUrl || this.logoUrl}\" alt=\"Logo\" />` : ''}
          <div class="meta">
            <div class="name">${this.schoolName || 'SchoolPro'}</div>
            ${this.schoolAddress ? `<div class="addr">${this.schoolAddress}</div>` : ''}
          </div>
        </div>
        <div class="wrap">
          <div class="title">Honours Roll — ${this.gradeLevel} — ${this.term}${this.academicYear ? ' — ' + this.academicYear : ''}</div>
          ${rowsHtml}
        </div>
      </body></html>`;
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 300);
  }

  private async toDataUrl(url: string): Promise<string> {
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) return '';
      const blob = await res.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  }
}
