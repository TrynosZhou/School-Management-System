import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClassesService, type ClassEntity } from '../classes/classes.service';
import { ReportService } from './report.service';

@Component({
  selector: 'app-marksheet-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="hero">
        <div class="title">
          <h2>Mark sheets</h2>
          <div class="desc">View, export and publish class results for a selected term.</div>
        </div>
      </div>
      <div class="subnav">
        <a routerLink="/reports/marksheet" class="link">Mark sheets</a>
        <a routerLink="/reports/honours-roll" class="link">Honours Roll</a>
      </div>
      <div class="toolbar">
        <div class="filters">
          <div class="field">
            <label>Class</label>
            <select [(ngModel)]="classId" [ngModelOptions]="{standalone:true}" (change)="load()">
              <option value="">-- Select class --</option>
              <option *ngFor="let c of classes()" [ngValue]="c.id">{{ c.name }} — {{ c.academicYear }}</option>
            </select>
          </div>
          <div class="field">
            <label>Term</label>
            <select [(ngModel)]="term" [ngModelOptions]="{standalone:true}" (change)="load()">
              <option value="">-- Select term --</option>
              <option>Term 1</option>
              <option>Term 2</option>
              <option>Term 3</option>
            </select>
          </div>
          <div class="field grow">
            <label>Search</label>
            <input [(ngModel)]="q" [ngModelOptions]="{standalone:true}" type="text" placeholder="Search student name or code" />
          </div>
        </div>
        <div class="actions">
          <button class="btn" title="Download PDF" (click)="downloadPdf()" [disabled]="!classId || !term || loading">
            <span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3v12"/><path d="M7 12l5 5 5-5"/><path d="M5 21h14"/></svg></span>
            PDF
          </button>
          <button class="btn" title="Download CSV" (click)="downloadCsv()" [disabled]="!classId || !term || loading">
            <span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3v12"/><path d="M7 12l5 5 5-5"/><path d="M5 21h14"/></svg></span>
            CSV
          </button>
          <button class="btn primary" title="Publish results (email parents)" (click)="publish()" [disabled]="!classId || !term || loading || publishing">
            <span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16v12H4z"/><path d="M4 4l8 7 8-7"/></svg></span>
            {{ publishing ? 'Publishing…' : 'Publish results' }}
          </button>
          <span class="ok" *ngIf="publishOk">Sent {{ publishSent }} emails<span *ngIf="publishSuppressed">, suppressed {{ publishSuppressed }}</span></span>
          <span class="err" *ngIf="publishErr">{{ publishErr }}</span>
        </div>
      </div>
      <div class="muted">Mark sheet includes all subjects written in selected class for the term. When publishing, report cards for students with arrears are suppressed from the Parent Portal and a warning is shown; fully paid students can view their report cards.</div>

      <div class="chart-card" *ngIf="!loading && passRates.length">
        <div class="chart-title">Pass Rate by Subject</div>
        <div class="chart">
          <div class="bar-row" *ngFor="let p of passRates">
            <div class="bar-label" [title]="p.name">{{ p.name }}</div>
            <div class="bar-wrap">
              <div class="bar-pass" [style.width.%]="p.rate"></div>
              <div class="bar-fail" *ngIf="p.rate < 100" [style.width.%]="100 - p.rate"></div>
              <div class="bar-val">{{ p.rate }}%</div>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="err" class="err">{{ err }}</div>
      <div *ngIf="loading">Loading…</div>
      <div class="table-wrap" *ngIf="!loading && subjects.length && students.length">
        <table class="table marksheet">
          <thead>
            <tr>
              <th class="sticky first">Student ID</th>
              <th class="sticky second">Full Name</th>
              <th class="subj" *ngFor="let s of subjects"><span class="v">{{ s.name }}</span></th>
              <th>Total</th><th>Average</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let st of filteredStudents()">
              <td class="sticky first">{{ st.studentId }}</td>
              <td class="sticky second">{{ st.name }}</td>
              <td *ngFor="let s of subjects">{{ scores[st.id]?.[s.id] || '-' }}</td>
              <td>{{ totals[st.id] ?? '-' }}</td>
              <td>{{ avgs[st.id] ?? '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [
    `.wrap{max-width:1200px;margin:20px auto;display:grid;gap:14px;padding:0 12px}
     .hero{background:#0b3d91;border-radius:12px;padding:16px;color:#fff}
     .hero .title h2{margin:0}
     .hero .desc{opacity:0.9;margin-top:4px}
     .subnav{display:flex;gap:10px}
     .subnav .link{display:inline-block;padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;text-decoration:none;color:#1d4ed8}
     .subnav .link:hover{background:#f3f4f6}
     .toolbar{position:sticky;top:52px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:10px;display:flex;gap:10px;align-items:flex-end;z-index:5}
     .filters{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;flex:1}
     .field{min-width:160px}
     .field.grow{flex:1}
     label{display:block;font-size:12px;color:#6b7280;margin-bottom:4px}
     select,input{padding:8px;border:1px solid #e5e7eb;border-radius:8px;width:100%}
     .actions{display:flex;gap:8px;align-items:center;margin-left:auto}
     .btn{display:flex;gap:6px;align-items:center;padding:8px 10px;border:1px solid #0b53a5;border-radius:8px;background:#0b53a5;cursor:pointer;color:#fff;font-weight:700}
     .btn.primary{border-color:#0b53a5;background:#0b53a5;color:#fff;font-weight:700}
     .btn:disabled{opacity:0.6;cursor:not-allowed}
     .i{display:inline-flex;width:16px;height:16px;margin-right:4px}
     .i svg{width:16px;height:16px}
     .ok{color:#166534}
     .err{color:#b91c1c}
     .muted{color:#6b7280}
     .chart-card{border:1px solid #e5e7eb;border-radius:10px;background:#fff}
     .chart-title{font-weight:600;padding:10px;border-bottom:1px solid #e5e7eb}
     .chart{display:grid;gap:8px;padding:10px}
     .bar-row{display:grid;grid-template-columns:180px 1fr;gap:10px;align-items:center}
     .bar-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
     .bar-wrap{position:relative;height:22px;background:#f3f4f6;border-radius:999px;overflow:hidden;display:flex}
     .bar-pass{height:100%;background:#1d4ed8}
     .bar-fail{height:100%;background:#ef4444}
     .bar-val{position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:12px;color:#fff;font-weight:700}
     .table-wrap{overflow:auto;border:1px solid #e5e7eb;border-radius:10px}
     .table{width:max-content;min-width:100%;border-collapse:separate;border-spacing:0}
     .table th,.table td{border:1px solid #e5e7eb;padding:8px 10px;vertical-align:bottom;background:#fff}
     .table thead th{position:sticky;top:0;z-index:2;background:#f8fafc}
     .table tbody tr:nth-child(even) td{background:#fcfdff}
     .table .sticky.first{position:sticky;left:0;z-index:3;background:#fff;width:110px;min-width:110px}
     .table .sticky.second{position:sticky;left:110px;z-index:3;background:#fff;max-width:120px;min-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
     .table th.subj{width:84px;text-align:center;padding:0 4px;height:120px;position:relative}
     .table th.subj .v{position:absolute;top:50%;left:50%;transform:translate(-50%, -50%) rotate(-90deg);transform-origin:center center;display:inline-block;white-space:nowrap;font-size:12px;line-height:1}
     @media (max-width: 860px){ .table th.subj{width:96px;height:110px} .table th.subj .v{font-size:12px} }
     @media print{
       .subnav, .toolbar{ display:none !important }
       .wrap{ max-width:100%; margin:0; gap:8px }
       .table{ width:100%; border-collapse:collapse }
       .table th,.table td{ padding:4px; border:1px solid #ddd }
       .table th.subj{ width:90px; height:110px }
       .table th.subj .v{ font-size:12px; transform-origin:left bottom }
       h2{ margin:0 0 6px 0 }
     }
    `
  ]
})
export class MarksheetPageComponent {
  private classesSvc = inject(ClassesService);
  private reports = inject(ReportService);
  classes = signal<ClassEntity[]>([]);
  classId = '';
  term = '';
  loading = false;
  err: string | null = null;
  publishing = false;
  publishOk = false;
  publishErr: string | null = null;
  publishSent = 0;
  publishSuppressed = 0;
  subjects: Array<{ id: string; code: string; name: string }> = [];
  students: Array<{ id: string; studentId: string; name: string }> = [];
  scores: Record<string, Record<string, string>> = {};
  totals: Record<string, string | undefined> = {};
  avgs: Record<string, string | undefined> = {};
  passRates: Array<{ id: string; name: string; rate: number }> = [];
  q = '';
  

  constructor(){
    this.classesSvc.list().subscribe(rows => this.classes.set(rows));
  }

  async downloadPdf(){
    if (!this.classId || !this.term) return;
    await this.reports.downloadMarksheetPdf(this.classId, this.term);
  }
  async downloadCsv(){
    if (!this.classId || !this.term) return;
    await this.reports.downloadMarksheetCsv(this.classId, this.term);
  }

  publish(){
    if (!this.classId || !this.term || this.publishing) return;
    this.publishing = true; this.publishOk = false; this.publishErr = null; this.publishSent = 0; this.publishSuppressed = 0;
    this.reports.publishResults(this.term, this.classId, { suppressArrears: true }).subscribe({
      next: r => { this.publishing = false; this.publishOk = true; this.publishSent = r?.sent || 0; this.publishSuppressed = r?.suppressed || 0; },
      error: e => { this.publishing = false; this.publishErr = e?.error?.message || 'Publish failed'; }
    });
  }

  async load(){
    if (!this.classId || !this.term) return;
    this.loading = true; this.err = null; this.subjects = []; this.students = []; this.scores = {}; this.totals = {}; this.avgs = {};
    try {
      const data: any = await this.reports.getMarksheetJson(this.classId, this.term).toPromise();
      if (!data || data.error) { this.err = data?.error || 'Failed to load'; }
      else {
        this.subjects = data.subjects || [];
        const rawStudents = data.students || [];
        this.students = rawStudents.map((s: any) => ({ id: s.id, name: s.name, studentId: s.code || s.studentId || s.id }));
        this.scores = data.scores || {};
        // compute totals and averages for preview
        for (const st of this.students) {
          let total = 0; let count = 0;
          for (const sub of this.subjects) {
            const v = this.scores[st.id]?.[sub.id];
            if (v != null && v !== '') { const n = Number(v); if (!isNaN(n)) { total += n; count++; } }
          }
          this.totals[st.id] = count ? total.toFixed(0) : '-';
          this.avgs[st.id] = count ? (total / count).toFixed(1) : '-';
        }
        // compute pass rates per subject (>= 50)
        const rates: Array<{ id: string; name: string; rate: number }> = [];
        for (const sub of this.subjects) {
          let sat = 0; let passed = 0;
          for (const st of this.students) {
            const raw = this.scores[st.id]?.[sub.id];
            if (raw != null && raw !== '') {
              const n = Number(raw);
              if (!isNaN(n)) { sat++; if (n >= 50) passed++; }
            }
          }
          const rate = sat ? Math.round((passed * 100) / sat) : 0;
          rates.push({ id: sub.id, name: sub.name || sub.code || 'Subject', rate });
        }
        // sort by subject name for stable order
        this.passRates = rates.sort((a,b) => a.name.localeCompare(b.name));
        
      }
    } catch (e: any) {
      this.err = e?.error?.message || 'Failed to load';
    } finally {
      this.loading = false;
    }
  }

  filteredStudents(){
    const q = (this.q || '').toLowerCase().trim();
    if (!q) return this.students;
    return this.students.filter(s => (s.name || '').toLowerCase().includes(q) || (s.studentId || '').toLowerCase().includes(q));
  }
}
