import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ParentsService } from './parents.service';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-parent-report-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wrap">
      <h2>Report Card</h2>
      <div class="row">
        <label>Term</label>
        <select [(ngModel)]="term" (change)="load()">
          <option value="">All terms</option>
          <option>Term 1</option>
          <option>Term 2</option>
          <option>Term 3</option>
        </select>
        <label>Exam Session</label>
        <select [(ngModel)]="examType" (change)="load()">
          <option value="">All</option>
          <option>Midterm</option>
          <option>End of Term</option>
        </select>
      </div>
      <div *ngIf="err()" class="err">{{ err() }}</div>
      <div *ngIf="loading()">Loading…</div>
      <iframe *ngIf="pdfUrl()" [src]="pdfUrl()" class="viewer"></iframe>
    </div>
  `,
  styles: [`
    .wrap{max-width:1000px;margin:24px auto;display:grid;gap:10px}
    .row{display:flex;gap:8px;align-items:center}
    select{padding:8px;border:1px solid #e5e7eb;border-radius:8px}
    .viewer{width:100%;height:80vh;border:1px solid #e5e7eb;border-radius:8px}
    .err{color:#b91c1c}
  `]
})
export class ParentReportCardComponent {
  private route = inject(ActivatedRoute);
  private parents = inject(ParentsService);
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);

  term = '';
  examType = '';
  loading = signal(false);
  err = signal<string | null>(null);
  pdfUrl = signal<SafeResourceUrl | ''>('');

  ngOnInit(){ this.load(); }

  async load(){
    this.loading.set(true); this.err.set(null);
    // revoke any previous URL to free memory
    const prev = this.pdfUrl(); if (prev && typeof prev === 'string') { try { URL.revokeObjectURL(prev); } catch {} }
    this.pdfUrl.set('');
    const studentId = this.route.snapshot.paramMap.get('id')!;
    try {
      const params: any = {};
      // pull query params for examType (from parent dashboard link)
      this.examType = this.route.snapshot.queryParamMap.get('examType') || '';
      if (this.term) params.term = this.term;
      if (this.examType) params.examType = this.examType;
      const resp = await this.http.get(`/api/reports/report-card/${encodeURIComponent(studentId)}` as string, {
        params,
        responseType: 'blob' as const,
        observe: 'response' as const,
      }).toPromise();
      const blob = resp?.body;
      if (!blob) throw new Error('No content');
      // Derive filename from Content-Disposition or fetch student's full name
      let filename = '';
      try {
        const cd = resp?.headers?.get('Content-Disposition') || resp?.headers?.get('content-disposition') || '';
        const m = /filename\s*=\s*"?([^";]+)"?/i.exec(cd);
        if (m) filename = m[1];
      } catch {}
      if (!filename) {
        try {
          const student: any = await this.http.get(`/api/students/${encodeURIComponent(studentId)}`).toPromise();
          const s = (student && (student as any).student) || student || {};
          const full = `${s.firstName || ''} ${s.lastName || ''}`.trim();
          if (full) filename = `${full}.pdf`;
        } catch {}
      }
      if (!filename) filename = 'report-card.pdf';
      const file = new File([blob], filename, { type: 'application/pdf' });
      const url = URL.createObjectURL(file);
      const safe = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      this.pdfUrl.set(safe);
    } catch (e: any) {
      let msg = 'Failed to load';
      try {
        const status = Number(e?.status || 0);
        if (status === 403) {
          const errBlob = e?.error as Blob | undefined;
          let body = '';
          if (errBlob && typeof (errBlob as any).text === 'function') {
            body = await (errBlob as Blob).text();
          }
          let parsed: any = null;
          try { 
            // Check if body is HTML (starts with <!doctype or <html)
            if (body && !body.trim().startsWith('<')) {
              parsed = JSON.parse(body);
            }
          } catch {}
          msg = (parsed && parsed.message) || 'This report card is temporarily unavailable due to outstanding arrears. Please settle arrears to view.';
        } else {
          msg = e?.error?.message || e?.message || `Failed to load report card (${status || 'network error'})`;
        }
      } catch {}
      this.err.set(msg);
    } finally {
      this.loading.set(false);
    }
  }
}
