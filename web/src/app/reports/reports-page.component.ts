import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReportService } from './report.service';
import { ClassesService, type ClassEntity } from '../classes/classes.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="top">
        <h2 class="title">
          <span class="i">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4h16v14H4z"/><path d="M8 4v6h8"/></svg>
          </span>
          Reports
        </h2>
        <div class="actions">
          <a routerLink="/reports/marksheet" class="btn"><span class="bi">📄</span>Mark sheets</a>
          <a routerLink="/reports/honours-roll" class="btn"><span class="bi">🏅</span>Honours Roll</a>
          <a routerLink="/reports/teachers-comments" class="btn"><span class="bi">💬</span>Teacher's Comments</a>
        </div>
      </div>

      <div class="card filters">
        <h3>Generate class report cards</h3>
        <div class="row">
          <select [(ngModel)]="selectedClassId">
            <option value="">Select class</option>
            <option *ngFor="let c of classes()" [value]="c.id">{{ c.name }} — {{ c.academicYear }}</option>
          </select>
          <select [(ngModel)]="batchTerm">
            <option value="">Select term</option>
            <option>Term 1</option>
            <option>Term 2</option>
            <option>Term 3</option>
          </select>
          <select [(ngModel)]="batchExamType">
            <option value="">Select exam type</option>
            <option>Midterm</option>
            <option>End of Term</option>
          </select>
          <button class="btn primary" (click)="loadClassStudents()" [disabled]="!selectedClassId || !batchTerm || !batchExamType"><span class="bi">🔍</span>Load</button>
          <button class="btn" (click)="openAll()" [disabled]="!students().length"><span class="bi">🗂️</span>Open all</button>
          <button class="btn" (click)="openAllInOnePage()" [disabled]="!students().length"><span class="bi">🗒️</span>Open all (single page)</button>
          <button class="btn" (click)="downloadAll()" [disabled]="!students().length"><span class="bi">⬇️</span>Download all</button>
          <button class="btn" (click)="generateSequence()" [disabled]="!students().length"><span class="bi">▶️</span>Generate</button>
          <button class="btn" (click)="checkData()" [disabled]="!selectedClassId || !batchTerm"><span class="bi">🔎</span>Check data</button>
        </div>
        <div class="diag" *ngIf="diagMsg">
          <div class="line"><strong>Summary:</strong> {{ diagMsg }}</div>
          <div class="line" *ngIf="diagDetails"><code>{{ diagDetails }}</code></div>
        </div>
      </div>

      <div class="card single">
        <h3>Single student</h3>
        <div class="row">
          <input placeholder="Student ID" [(ngModel)]="studentId" />
          <select [(ngModel)]="term">
            <option value="">All terms</option>
            <option>Term 1</option>
            <option>Term 2</option>
            <option>Term 3</option>
          </select>
          <button class="btn" (click)="openSingle()" [disabled]="!studentId"><span class="bi">🗂️</span>Open</button>
          <button class="btn" (click)="downloadReportCard()" [disabled]="!studentId"><span class="bi">⬇️</span>Download</button>
        </div>
      </div>

      <div class="card publish">
        <h3>Publish results (notify parents)</h3>
        <div class="row">
          <select [(ngModel)]="pubClassId">
            <option value="">Select class (optional)</option>
            <option *ngFor="let c of classes()" [value]="c.id">{{ c.name }} — {{ c.academicYear }}</option>
          </select>
          <select [(ngModel)]="pubTerm">
            <option value="">Select term</option>
            <option>Term 1</option>
            <option>Term 2</option>
            <option>Term 3</option>
          </select>
          <button class="btn primary" (click)="publish()" [disabled]="!pubTerm || publishing"><span class="bi">📣</span>{{ publishing ? 'Publishing…' : 'Publish' }}</button>
          <span class="ok" *ngIf="publishOk">Sent {{ publishSent }} emails</span>
          <span class="err" *ngIf="publishErr">{{ publishErr }}</span>
        </div>
      </div>

      <div class="card" *ngIf="students().length">
        <h3>Students ({{ students().length }})</h3>
        <table class="table">
          <thead>
            <tr><th>#</th><th>Student</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of students(); let i = index">
              <td>{{ i + 1 }}</td>
              <td>{{ s.firstName }} {{ s.lastName }} ({{ s.studentId || s.id }})</td>
              <td class="actions">
                <button class="btn" (click)="openOne(s.id)"><span class="bi">🗂️</span>Open</button>
                <button class="btn" (click)="downloadOne(s.id)"><span class="bi">⬇️</span>Download</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="hint" *ngIf="!students().length && selectedClassId">
        No students found for the selected class.
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:1100px;margin:24px auto;padding:0 8px}
    .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .title{display:flex;gap:8px;align-items:center;margin:0}
    .actions{display:flex;gap:8px;align-items:center}
    .btn{display:inline-flex;gap:8px;align-items:center;border:1px solid #e5e7eb;background:#fff;border-radius:8px;padding:8px 12px;cursor:pointer;text-decoration:none;color:#111}
    .btn.primary{background:#0b53a5;border-color:#0b53a5;color:#fff}
    .bi{display:inline-flex;width:16px;height:16px}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin-bottom:12px}
    .filters .row,.single .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .filters select,.single input,.single select{padding:9px 10px;border:1px solid #e5e7eb;border-radius:8px}
    .publish .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .ok{color:#166534}.err{color:#b91c1c}
    .table{width:100%;border-collapse:collapse;margin-top:8px}
    .table th,.table td{border:1px solid #e5e7eb;padding:8px;text-align:left}
    .hint{color:#6b7280;margin-top:6px}
    .diag{margin-top:8px;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;background:#fff}
    .diag .line{margin:2px 0}
  `]
})
export class ReportsPageComponent {
  private reports = inject(ReportService);
  private classesSvc = inject(ClassesService);
  private enrollmentsSvc = inject(EnrollmentsService);
  private http = inject(HttpClient);

  studentId: string = '';
  term: string = '';
  classes = signal<ClassEntity[]>([]);
  selectedClassId: string = '';
  batchTerm: string = '';
  batchExamType: string = '';
  students = signal<any[]>([]);
  // publish
  pubClassId: string = '';
  pubTerm: string = '';
  publishing = false;
  publishOk = false;
  publishErr: string | null = null;
  publishSent = 0;
  diagMsg: string | null = null;
  diagDetails: string | null = null;

  constructor() {
    // load classes for batch section
    this.classesSvc.list().subscribe({ next: (res) => this.classes.set(res) });
  }

  publish(){
    if (!this.pubTerm || this.publishing) return;
    this.publishing = true; this.publishOk = false; this.publishErr = null; this.publishSent = 0;
    this.reports.publishResults(this.pubTerm, this.pubClassId || undefined).subscribe({
      next: r => { this.publishing = false; this.publishOk = true; this.publishSent = r?.sent || 0; },
      error: e => { this.publishing = false; this.publishErr = e?.error?.message || 'Publish failed'; }
    });
  }


  downloadReportCard() {
    const term = this.term || undefined;
    this.reports.downloadReportCard(this.studentId, term);
  }

  openSingle() {
    const term = this.term || undefined;
    const base = window.location.origin;
    const raw = (this.studentId || '').trim();
    if (!raw) return;
    const looksUuid = /[a-f0-9\-]{32,}/i.test(raw);
    const openWithId = (id: string) => {
      const url = new URL(`${base}/reports/report-card/${id}/view`);
      if (term) url.searchParams.set('term', term);
      if (this.selectedClassId) url.searchParams.set('classId', this.selectedClassId);
      window.open(url.toString(), '_blank');
    };
    if (looksUuid) { openWithId(raw); return; }
    // Resolve student code (e.g., JHS0000004) to UUID
    this.http.get<any>(`http://localhost:3000/api/students/byStudentId/${encodeURIComponent(raw)}`).subscribe({
      next: (st) => { const id = st?.id || st?.student?.id; if (id) openWithId(id); else alert('Student not found'); },
      error: () => alert('Student not found')
    });
  }

  loadClassStudents() {
    const cid = this.selectedClassId;
    if (!cid) { this.students.set([]); return; }
    this.enrollmentsSvc.listByClass(cid).subscribe(list => {
      const studs = list.map((e: any) => e.student).filter(Boolean);
      this.students.set(studs);
      // Open all report cards in sequence automatically after loading
      if (this.students().length) {
        // Open all in a single page to avoid popup blockers and ensure proper auth handling
        this.openAllInOnePage();
      }
    });
  }

  openOne(studentId: string) {
    const term = this.batchTerm || undefined;
    const examType = this.batchExamType || undefined;
    const base = window.location.origin;
    const url = new URL(`${base}/reports/report-card/${studentId}/view`);
    if (term) url.searchParams.set('term', term);
    if (examType) url.searchParams.set('examType', examType);
    if (this.selectedClassId) url.searchParams.set('classId', this.selectedClassId);
    window.open(url.toString(), '_blank');
  }

  downloadOne(studentId: string) {
    const term = this.batchTerm || undefined;
    const examType = this.batchExamType || undefined;
    this.reports.downloadReportCard(studentId, term, examType);
  }

  openAll() {
    for (const s of this.students()) this.openOne(s.id);
  }

  openAllInOnePage() {
    const term = this.batchTerm || undefined;
    const examType = this.batchExamType || undefined;
    const base = window.location.origin;
    const urls = this.students().map(s => {
      const u = new URL(`${base}/reports/report-card/${s.id}/view`);
      if (term) u.searchParams.set('term', term);
      if (examType) u.searchParams.set('examType', examType);
      if (this.selectedClassId) u.searchParams.set('classId', this.selectedClassId);
      return u.toString();
    });
    const w = window.open('about:blank', '_blank');
    if (!w) return;
    const html = `<!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Class Report Cards</title>
        <style>
          body{margin:0;padding:0;background:#f8fafc}
          .wrap{max-width:1100px;margin:16px auto;padding:0 8px}
          .item{background:#fff;border:1px solid #e5e7eb;border-radius:8px;margin:12px 0;overflow:hidden}
          .title{padding:8px 12px;border-bottom:1px solid #f1f5f9;font-weight:600}
          iframe{width:100%;height:1100px;border:0}
        </style>
      </head>
      <body>
        <div class="wrap">
          ${urls.map((u, i) => `<div class="item"><div class="title">Report ${i+1}</div><iframe src="${u}"></iframe></div>`).join('')}
        </div>
      </body>
      </html>`;
    w.document.write(html);
    w.document.close();
  }

  downloadAll() {
    // sequentially trigger downloads to avoid popup blockers
    const list = this.students();
    let i = 0;
    const next = () => {
      if (i >= list.length) return;
      this.downloadOne(list[i++].id);
      setTimeout(next, 400);
    };
    next();
  }

  generateSequence(){
    const ids = this.students().map(s => s.id);
    sessionStorage.setItem('report_seq', JSON.stringify({ ids }));
    if (!ids.length) return;
    const first = ids[0];
    const url = new URL(`${window.location.origin}/reports/report-card/${first}/view`);
    if (this.batchTerm) url.searchParams.set('term', this.batchTerm);
    if (this.batchExamType) url.searchParams.set('examType', this.batchExamType);
    if (this.selectedClassId) url.searchParams.set('classId', this.selectedClassId);
    window.open(url.toString(), '_blank');
  }

  checkData(){
    this.diagMsg = null; this.diagDetails = null;
    const cid = this.selectedClassId; const term = this.batchTerm;
    if (!cid || !term) return;
    this.reports.getMarksheetJson(cid, term).subscribe({
      next: (json:any) => {
        try {
          const students: any[] = json?.students || json?.data || [];
          const count = Array.isArray(students) ? students.length : 0;
          const first = count ? students[0] : null;
          const hasSubjects = first && Array.isArray(first.subjects || first.marks || first.results) && (first.subjects||first.marks||first.results).length>0;
          this.diagMsg = `Loaded marks JSON: ${count} student(s)${hasSubjects ? ' with subjects' : ''}.`;
          if (!count) this.diagDetails = 'No marks computed for this class/term. Try removing Exam Type or verify marks were captured.';
          else if (!hasSubjects) this.diagDetails = 'Student entries present but no subjects/marks. Ensure scores were captured for this term.';
          else this.diagDetails = null;
        } catch { this.diagMsg = 'Could not interpret marks JSON'; }
      },
      error: (e) => { this.diagMsg = e?.error?.message || 'Failed to load marks JSON'; }
    });
  }
}
