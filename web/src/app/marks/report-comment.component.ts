import { Component, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClassesService, type ClassEntity } from '../classes/classes.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { ReportService } from '../reports/report.service';

interface Item {
  id: string;
  displayId: string;
  firstName: string;
  lastName: string;
  teacherRemark: string;
  principalRemark: string;
  teacherInitials?: string;
  principalInitials?: string;
}

@Component({
  selector: 'app-report-comment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wrap">
      <div class="top">
        <h2>Marks — Report Comment</h2>
      </div>

      <div class="card">
        <div class="filters">
          <label>Class</label>
          <select [(ngModel)]="classId">
            <option value="">Select class</option>
            <option *ngFor="let c of classes()" [value]="c.id">{{ c.name }} — {{ c.academicYear }}</option>
          </select>
          <label>Term</label>
          <select [(ngModel)]="term">
            <option value="">Select term</option>
            <option>Term 1</option>
            <option>Term 2</option>
            <option>Term 3</option>
          </select>
          <label>Exam Type</label>
          <select [(ngModel)]="examType">
            <option value="">Default</option>
            <option>Midterm</option>
            <option>End of Term</option>
          </select>
          <button (click)="load()" [disabled]="!classId || !term" aria-label="Load students">Load students</button>
          <button (click)="publish()" [disabled]="!classId || !term || publishing" aria-label="Publish results">{{ publishing ? 'Publishing…' : 'Publish results' }}</button>
        </div>
      </div>

      <div class="card">
        <div class="filters">
          <div class="row">
            <label>Teacher initials (all)</label>
            <input [(ngModel)]="teacherInitialsGlobal" placeholder="e.g. J.D" />
            <label>Principal initials (all)</label>
            <input [(ngModel)]="principalInitialsGlobal" placeholder="e.g. A.B" />
          </div>
        </div>
      </div>

      <div *ngIf="err()" class="err">{{ err() }}</div>

      <div *ngIf="items().length" class="list">
        <div class="item" *ngFor="let it of items(); let i = index">
          <div class="title">{{ i + 1 }}. {{ it.firstName }} {{ it.lastName }} ({{ it.displayId }})</div>
          
          <div class="pdf-container-item">
            <iframe [src]="safeFrameUrl(it)" title="Report card preview" referrerpolicy="no-referrer"></iframe>
            
            <!-- Interactive text areas overlaid at bottom of PDF -->
            <div class="remarks-overlay">
              <div class="remark-field teacher-field">
                <textarea 
                  [(ngModel)]="it.teacherRemark" 
                  (ngModelChange)="onRemarkChange(it)" 
                  placeholder="Type Form Teacher's remark here..."></textarea>
              </div>
              
              <div class="remark-field principal-field">
                <textarea 
                  [(ngModel)]="it.principalRemark" 
                  (ngModelChange)="onRemarkChange(it)" 
                  placeholder="Type Head's Comment here..."></textarea>
              </div>
            </div>
          </div>
          <div class="initials">
            <div>
              <label>Teacher initials (this student)</label>
              <input [(ngModel)]="it.teacherInitials" placeholder="optional" />
            </div>
            <div>
              <label>Principal initials (this student)</label>
              <input [(ngModel)]="it.principalInitials" placeholder="optional" />
            </div>
          </div>
          <div class="actions">
            <button (click)="downloadWithRemark(it)" [disabled]="!term" aria-label="Download stamped PDF">Download with remark</button>
          </div>
          
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:1200px;margin:24px auto;padding:0 12px}
    .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:10px;margin-bottom:12px}
    .filters{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .filters .row{display:flex;gap:12px;width:100%;align-items:center}
    select{padding:8px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px}
    button{padding:8px 12px;border:1px solid #1d4ed8;border-radius:8px;background:#1d4ed8;color:#fff;cursor:pointer;font-weight:600;transition:all 0.2s}
    button:hover:not(:disabled){background:#1e40af;border-color:#1e40af;transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,0.1)}
    button:disabled{opacity:0.5;cursor:not-allowed}
    .err{color:#b91c1c;padding:8px;background:#fee2e2;border-radius:8px;margin:8px 0}
    .item{background:#fff;border:1px solid #e5e7eb;border-radius:12px;margin:16px 0;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
    .title{padding:12px 16px;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:#fff;font-weight:600;font-size:16px;display:flex;justify-content:space-between;align-items:center;gap:8px}
    .title .open{font-weight:400;font-size:13px;color:#fff;text-decoration:none;background:rgba(255,255,255,0.2);padding:4px 12px;border-radius:6px;transition:all 0.2s}
    .title .open:hover{background:rgba(255,255,255,0.3)}
    .pdf-container-item{position:relative;width:100%;background:#fff;border-top:1px solid #e5e7eb;overflow:visible}
    iframe{width:100%;height:1400px;border:0;display:block;background:#fff;pointer-events:none}
    .remarks-overlay{position:absolute;bottom:50px;left:50%;transform:translateX(-50%);width:85%;max-width:750px;height:140px;display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0;pointer-events:none}
    .remark-field{pointer-events:all;display:flex;flex-direction:column}
    .remark-field textarea{width:100%;height:100%;padding:8px;border:2px solid #3b82f6;border-radius:4px;font-size:12px;line-height:1.4;resize:none;background:rgba(255,255,255,0.98);box-shadow:0 2px 8px rgba(0,0,0,0.15);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;transition:all 0.2s}
    .remark-field textarea:focus{outline:none;border-color:#2563eb;background:#fff;box-shadow:0 4px 12px rgba(59,130,246,0.3)}
    .remark-field textarea::placeholder{color:#9ca3af;font-style:italic;font-size:13px}
    .initials{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px 16px;background:#f9fafb;border-top:1px solid #e5e7eb}
    .initials label{font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:4px}
    .initials input{width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px}
    .initials input:focus{outline:none;border-color:#3b82f6}
    .actions{padding:12px 16px;background:#f9fafb;border-top:1px solid #e5e7eb}
  `]
})
export class ReportCommentComponent {
  private classesSvc = inject(ClassesService);
  private enrollmentsSvc = inject(EnrollmentsService);
  private sanitizer = inject(DomSanitizer);
  private reports = inject(ReportService);

  classes = signal<ClassEntity[]>([]);
  classId = '';
  term = '';
  examType = '';

  items = signal<Item[]>([]);
  err = signal<string | null>(null);
  publishing = false;
  teacherInitialsGlobal = '';
  principalInitialsGlobal = '';

  constructor(){
    this.classesSvc.list().subscribe(res => this.classes.set(res));
  }

  private saveTimers: Record<string, any> = {};
  onRemarkChange(it: Item){
    const id = it.id;
    console.log('✏️ Remark changed for student:', id, it.firstName, it.lastName);
    if (this.saveTimers[id]) clearTimeout(this.saveTimers[id]);
    this.saveTimers[id] = setTimeout(() => {
      const payload = {
        studentId: it.id,
        term: this.term || undefined,
        examType: this.examType || undefined,
        teacherRemark: (it.teacherRemark || '').trim() || undefined,
        principalRemark: (it.principalRemark || '').trim() || undefined,
      };
      console.log('💾 Saving remarks for student:', id, payload);
      this.reports.saveRemarks(payload).subscribe({
        next: (response) => {
          console.log('✅ Remarks saved successfully for student:', id, response);
        },
        error: (err) => {
          console.error('❌ Failed to save remarks for student:', id, err);
          this.err.set('Failed to auto-save remarks');
        }
      });
    }, 800);
  }

  load(){
    if (!this.classId || !this.term) return;
    this.err.set(null);
    this.items.set([]);
    this.enrollmentsSvc.listByClass(this.classId).subscribe({
      next: (enrs: any[]) => {
        const studs = enrs.map(e => e.student).filter(Boolean);
        const list: Item[] = studs.map((s: any) => ({
          id: s.id,
          displayId: s.studentId || s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          teacherRemark: '',
          principalRemark: '',
        }));
        this.items.set(list);
        // Prefill saved remarks per student
        for (const it of this.items()) {
          const term = this.term || undefined;
          const examType = this.examType || undefined;
          this.reports.getRemarks(it.id, term, examType).subscribe(rec => {
            if (rec && (rec.teacherRemark || rec.principalRemark)) {
              if (typeof rec.teacherRemark === 'string') it.teacherRemark = rec.teacherRemark;
              if (typeof rec.principalRemark === 'string') it.principalRemark = rec.principalRemark;
            } else {
              // Fallback to term-only remarks (e.g., saved from Teachers Comment page)
              this.reports.getRemarks(it.id, term).subscribe(rec2 => {
                if (!rec2) return;
                if (typeof rec2.teacherRemark === 'string') it.teacherRemark = rec2.teacherRemark;
                if (typeof rec2.principalRemark === 'string') it.principalRemark = rec2.principalRemark;
              });
            }
          });
        }
      },
      error: _ => this.err.set('Failed to load students')
    });
  }

  buildUrl(it: Item): string {
    const u = new URL(`/api/reports/report-card/${it.id}`, window.location.origin);
    if (this.term) u.searchParams.set('term', this.term);
    if (this.examType) u.searchParams.set('examType', this.examType);
    // Do NOT include remarks in the URL to avoid iframe reload/flicker
    return u.toString();
  }

  safeFrameUrl(it: Item): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.buildUrl(it));
  }

  // No overlay inputs; typing occurs directly in interactive PDF fields.

  async publish(){
    if (!this.classId || !this.term) return;
    try {
      this.publishing = true;
      const resp: any = await this.reports.publishReports(this.classId, this.term, this.examType || undefined).toPromise();
      const ct = resp?.headers?.get ? (resp.headers.get('content-type') || '') : '';
      const body: Blob | null = resp?.body || null;
      if (body && ct.includes('application/pdf')) {
        await this.reports.downloadBlob(body, `published-reports-${this.classId}-${this.term}.pdf`);
      } else if (body) {
        // Attempt to read JSON error message from Blob
        try {
          const txt = await (body as Blob).text();
          // Check if txt is HTML (starts with <!doctype or <html)
          if (!txt.trim().startsWith('<')) {
            const j = JSON.parse(txt);
            this.err.set(j?.error || j?.message || 'Failed to publish reports');
          } else {
            this.err.set('Failed to publish reports');
          }
        } catch {
          this.err.set('Failed to publish reports');
        }
      } else {
        this.err.set('Failed to publish reports');
      }
    } catch (e: any) {
      // HttpErrorResponse path
      try {
        const blob: any = e?.error;
        if (blob && typeof blob.text === 'function') {
          const txt = await blob.text();
          // Check if txt is HTML (starts with <!doctype or <html)
          if (!txt.trim().startsWith('<!doctype') && !txt.trim().startsWith('<html')) {
            const j = JSON.parse(txt);
            this.err.set(j?.error || j?.message || 'Failed to publish reports');
          } else {
            this.err.set('Failed to publish reports');
          }
        } else {
          this.err.set('Failed to publish reports');
        }
      } catch {
        this.err.set('Failed to publish reports');
      }
    } finally {
      this.publishing = false;
    }
  }

  async downloadWithRemark(it: Item){
    try {
      const blob = await this.reports.getReportCardBlob(it.id, this.term || undefined, this.examType || undefined);
      if (!blob) { this.err.set('Failed to fetch report PDF'); return; }
      // 0a) Mask original Teacher's label area (left side) to allow re-positioning
      const maskedLeft = await this.reports.maskPdfArea(blob, {
        x: 24,       // left margin area where Teacher's label sits
        y: 230,      // around teacher label row
        width: 180,  // cover the label text area on the left
        height: 40,  // generous height to clear artifacts
        pageIndex: 0
      });
      // 0b) Mask duplicate 'Head/Principal's remark' label on same row as Teacher's label (right side)
      const masked = await this.reports.maskPdfArea(maskedLeft, {
        x: 180,      // much further left to cover the whole row area
        y: 230,      // cover above the baseline as well
        width: 460,  // sweep across the row to the right margin
        height: 40,  // generous height to remove any leftover marks
        pageIndex: 0
      });
      // 1a) Stamp Teacher's label slightly above remark with reduced spacing
      const teacherLabelY = 238; // adjusted downwards by 2 points
      const stampedTeacherLabel = await this.reports.stampReportWithRemark(masked, "Teacher's remark", {
        x: 36,
        y: teacherLabelY,
        maxWidth: 492,
        fontSize: 10,
        pageIndex: 0,
        bold: true,
      });
      // 1b) Stamp Teacher's remark (aligned under Teacher's label)
      const stampedTeacher = await this.reports.stampReportWithRemark(stampedTeacherLabel, it.teacherRemark || '', {
        x: 36,      // aligned to left
        y: 212,     // one full blank line below the label (fontSize 10 => lineHeight ~12)
        maxWidth: 492,
        fontSize: 10,
        pageIndex: 0,
      });
      // 2) Stamp Principal's label just above the principal's remark
      const principalX = 36;
      const principalY = 160; // principal text baseline
      const stampedWithLabel = await this.reports.stampReportWithRemark(stampedTeacher, "Head/Principal's remark", {
        x: principalX,
        y: principalY + 14, // one line above principal remark
        maxWidth: 492,
        fontSize: 10, // align with teacher label size; tweak if needed
        pageIndex: 0,
        bold: true,
      });
      // 3) Stamp Principal's remark
      const stampedBoth = await this.reports.stampReportWithRemark(stampedWithLabel, it.principalRemark || '', {
        x: principalX,
        y: principalY,
        maxWidth: 492,
        fontSize: 10,
        pageIndex: 0,
      });
      // 4) Stamp initials (global fallback, per-student override if provided)
      const teacherInit = (it.teacherInitials || this.teacherInitialsGlobal || '').trim();
      const principalInit = (it.principalInitials || this.principalInitialsGlobal || '').trim();
      let stampedWithTeacherInit = stampedBoth;
      if (teacherInit) {
        // Place initials just above the 'Signature-Form Teacher' label (moved up again)
        stampedWithTeacherInit = await this.reports.stampReportWithRemark(stampedBoth, teacherInit, {
          x: 120, y: 126, maxWidth: 160, fontSize: 12, pageIndex: 0, bold: true
        });
      }
      let finalStamped = stampedWithTeacherInit;
      if (principalInit) {
        // Place initials just above the 'Signature-Head/Principal' label (moved up again)
        finalStamped = await this.reports.stampReportWithRemark(stampedWithTeacherInit, principalInit, {
          x: 380, y: 126, maxWidth: 160, fontSize: 12, pageIndex: 0, bold: true
        });
      }
      const filename = `report-card-${it.displayId || it.id}.pdf`;
      await this.reports.downloadBlob(finalStamped, filename);
    } catch {
      this.err.set('Failed to stamp report');
    }
  }
}
