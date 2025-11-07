import { Component, OnInit, inject, signal, HostListener, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ReportService } from './report.service';
import { AuthStateService } from '../auth/auth-state.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-report-card-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="top">
        <h2>Report Card — {{ studentName() || 'Student' }} <span class="muted" *ngIf="studentDisplayId()">({{ studentDisplayId() }})</span></h2>
        <div class="muted">Term: {{ term() || 'All' }} <span *ngIf="examType()">• {{ examType() }}</span></div>
      </div>

      <div class="bar">
        <button (click)="prev()" [disabled]="!hasPrev()">⬅ Previous</button>
        <button (click)="next()" [disabled]="!hasNext()">Next ➡</button>
        <span class="muted" *ngIf="seqTotal()>0">{{ seqIndex()+1 }} / {{ seqTotal() }}</span>
        <span class="spacer"></span>
        <button (click)="preview()">🔄 Refresh</button>
        <button (click)="saveRemarksManually()" class="save-btn">💾 Save Remarks</button>
        <button (click)="download()">⬇ Download</button>
        <span class="save-indicator" 
              *ngIf="saveStatus()"
              [style.background]="saveStatus().includes('✅') ? '#d1fae5' : saveStatus().includes('❌') ? '#fee2e2' : saveStatus().includes('💾') ? '#dbeafe' : saveStatus().includes('⚠️') ? '#fef3c7' : '#d1fae5'"
              [style.color]="saveStatus().includes('✅') ? '#059669' : saveStatus().includes('❌') ? '#dc2626' : saveStatus().includes('💾') ? '#1d4ed8' : saveStatus().includes('⚠️') ? '#d97706' : '#059669'">
          {{ saveStatus() }}
        </span>
      </div>

      <div class="empty-warn" *ngIf="emptyMsg()">
        <strong>Note:</strong> {{ emptyMsg() }}
      </div>

      <div class="pdf-container">
        <iframe [src]="iframeUrlSafe()" referrerpolicy="no-referrer"></iframe>
        
        <!-- Interactive text areas overlaid at bottom of PDF -->
        <div class="remarks-overlay">
          <div class="remark-field teacher-field">
            <textarea 
              #teacherBox 
              [disabled]="isTeacherDisabled()" 
              [(ngModel)]="teacherRemark" 
              (ngModelChange)="onRemarkChange()" 
              placeholder="Type Form Teacher's remark here..."></textarea>
          </div>
          
          <div class="remark-field principal-field">
            <textarea 
              #principalBox 
              [disabled]="isPrincipalDisabled()" 
              [(ngModel)]="principalRemark" 
              (ngModelChange)="onRemarkChange()" 
              placeholder="Type Head's Comment here..."></textarea>
          </div>
        </div>
      </div>
      
      <div class="hint">
        💡 Type remarks directly in the text areas at the bottom of the report card. Changes auto-save.
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:1100px;margin:24px auto;padding:0 16px}
    .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .muted{color:#6b7280;font-size:14px}
    .bar{display:flex;gap:8px;align-items:center;margin:8px 0;background:#fff;padding:10px;border-radius:8px;border:1px solid #e5e7eb}
    .bar button{padding:8px 16px;border:1px solid #0b53a5;border-radius:8px;background:#0b53a5;cursor:pointer;color:#fff;font-weight:600;transition:all 0.2s;font-size:14px}
    .bar button:hover:not(:disabled){background:#1e40af;transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,0.1)}
    .bar button:disabled{opacity:0.5;cursor:not-allowed}
    .bar button.save-btn{background:#059669;border-color:#059669}
    .bar button.save-btn:hover:not(:disabled){background:#047857;border-color:#047857}
    .spacer{flex:1}
    .save-indicator{margin-left:8px;padding:6px 12px;font-size:13px;font-weight:600;border-radius:6px;animation:fadeIn 0.3s ease-in}
    @keyframes fadeIn{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}
    .empty-warn{margin:8px 0;padding:10px 12px;border-radius:8px;background:#fff7ed;border:1px solid #fed7aa;color:#92400e;font-size:14px}
    .pdf-container{position:relative;width:100%;margin:0 auto;background:#fff;border:2px solid #e5e7eb;border-radius:10px;overflow:visible;box-shadow:0 4px 6px rgba(0,0,0,0.1)}
    iframe{width:100%;height:1400px;border:0;display:block;background:#fff;pointer-events:none}
    .remarks-overlay{position:absolute;bottom:50px;left:50%;transform:translateX(-50%);width:85%;max-width:750px;height:140px;display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0;pointer-events:none}
    .remark-field{pointer-events:all;display:flex;flex-direction:column}
    .remark-field textarea{width:100%;height:100%;padding:8px;border:2px solid #3b82f6;border-radius:4px;font-size:12px;line-height:1.4;resize:none;background:rgba(255,255,255,0.98);box-shadow:0 2px 8px rgba(0,0,0,0.15);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;transition:all 0.2s}
    .remark-field textarea:focus{outline:none;border-color:#2563eb;background:#fff;box-shadow:0 4px 12px rgba(59,130,246,0.3)}
    .remark-field textarea:disabled{opacity:0.6;cursor:not-allowed;background:#f3f4f6}
    .remark-field textarea::placeholder{color:#9ca3af;font-style:italic;font-size:13px}
    .hint{margin-top:12px;padding:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;color:#1e40af;font-size:13px;text-align:center}
  `]
})
export class ReportCardViewerComponent implements OnInit, OnDestroy, AfterViewInit {
  private route = inject(ActivatedRoute);
  private reports = inject(ReportService);
  private auth = inject(AuthStateService);
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);

  studentId = signal<string>('');
  term = signal<string>('');
  examType = signal<string>('');
  classId = signal<string>('');
  iframeUrl = signal<string>('about:blank');
  iframeUrlSafe = signal<SafeResourceUrl>(this.sanitizer.bypassSecurityTrustResourceUrl('about:blank'));
  studentName = signal<string>('');
  studentDisplayId = signal<string>('');
  private initialized = false;
  teacherRemark = '';
  principalRemark = '';
  saveStatus = signal<string>('');
  emptyMsg = signal<string | null>(null);
  private saveTimer: any;
  private lastSavedTeacher = '';
  private lastSavedPrincipal = '';
  @ViewChild('teacherBox') teacherBox?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('principalBox') principalBox?: ElementRef<HTMLTextAreaElement>;
  // sequence navigation
  private seqIds: string[] = [];
  private seqKey = 'report_seq';
  private seqIdx = 0;

  ngOnInit(): void {
    // React to param changes within same component instance
    this.route.paramMap.subscribe(pm => {
      const newSid = pm.get('studentId') || '';
      const t = this.route.snapshot.queryParamMap.get('term') || '';
      const et = this.route.snapshot.queryParamMap.get('examType') || '';
      const cid = this.route.snapshot.queryParamMap.get('classId') || '';
      // Save pending changes for previous student
      if (this.initialized && this.isDirty()) this.doSave();
      this.studentId.set(newSid);
      this.term.set(t);
      this.examType.set(et);
      this.classId.set(cid);
      // Load student info for a friendly header
      try {
        const looksUuid = /[a-f0-9\-]{32,}/i.test(newSid);
        const base = '/api/students';
        const req$ = looksUuid
          ? this.http.get<any>(`${base}/${encodeURIComponent(newSid)}`)
          : this.http.get<any>(`${base}/byStudentId/${encodeURIComponent(newSid)}`);
        req$.subscribe({
          next: (st:any) => {
            const s = st?.student || st || {};
            const full = `${s.firstName || ''} ${s.lastName || ''}`.trim();
            if (full) this.studentName.set(full);
            const disp = s.studentId || s.id || newSid;
            this.studentDisplayId.set(String(disp));
          },
          error: () => { this.studentName.set(''); this.studentDisplayId.set(newSid); }
        });
      } catch { this.studentName.set(''); this.studentDisplayId.set(newSid); }
      // Reset local state and prefill remarks
      this.teacherRemark = '';
      this.principalRemark = '';
      this.lastSavedTeacher = '';
      this.lastSavedPrincipal = '';
      this.saveStatus.set('');
      this.reports.getRemarks(newSid, t || undefined, et || undefined).subscribe(rec => {
        if (rec && (rec.teacherRemark || rec.principalRemark)) {
          if (rec.teacherRemark) { this.teacherRemark = rec.teacherRemark; this.lastSavedTeacher = rec.teacherRemark; }
          if (rec.principalRemark) { this.principalRemark = rec.principalRemark; this.lastSavedPrincipal = rec.principalRemark; }
          this.updateIframe();
          this.initialized = true;
          this.tryFocus();
        } else {
          // Fallback to term-only remarks (e.g., saved from Teachers Comment page)
          this.reports.getRemarks(newSid, t || undefined).subscribe(rec2 => {
            if (rec2?.teacherRemark) { this.teacherRemark = rec2.teacherRemark; this.lastSavedTeacher = rec2.teacherRemark; }
            if (rec2?.principalRemark) { this.principalRemark = rec2.principalRemark; this.lastSavedPrincipal = rec2.principalRemark; }
            this.updateIframe();
            this.initialized = true;
            this.tryFocus();
          }, _ => { this.updateIframe(); this.initialized = true; this.tryFocus(); });
        }
      }, _ => {
        // On error, still attempt to load term-only remarks
        this.reports.getRemarks(newSid, t || undefined).subscribe(rec2 => {
          if (rec2?.teacherRemark) { this.teacherRemark = rec2.teacherRemark; this.lastSavedTeacher = rec2.teacherRemark; }
          if (rec2?.principalRemark) { this.principalRemark = rec2.principalRemark; this.lastSavedPrincipal = rec2.principalRemark; }
          this.updateIframe(); this.initialized = true; this.tryFocus();
        }, __ => { this.updateIframe(); this.initialized = true; this.tryFocus(); });
      });
      // init sequence vars from sessionStorage
      this.loadSequence(newSid);
    });
  }

  ngAfterViewInit(): void { this.tryFocus(); }

  private urlWith() {
    const u = new URL(`${window.location.origin}/api/reports/report-card/${this.studentId()}`);
    const t = this.term();
    const et = this.examType();
    const cid = this.classId();
    if (t) u.searchParams.set('term', t);
    if (et) u.searchParams.set('examType', et);
    if (cid) u.searchParams.set('classId', cid);
    u.searchParams.set('cb', String(Date.now()));
    return u.toString();
  }

  private currentBlobUrl: string | null = null;
  private triedDropExamType = false;
  private triedDropTerm = false;
  private updateIframe(){
    const url = this.urlWith();
    const token = localStorage.getItem('access_token') || '';
    const headers = token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : new HttpHeaders();
    this.http.get(url, { headers, responseType: 'blob', observe: 'response' as const }).subscribe({
      next: (resp) => {
        const blob = resp.body as Blob;
        if (this.currentBlobUrl) { try { URL.revokeObjectURL(this.currentBlobUrl); } catch {} }
        // Prefer server-provided filename, fallback to student full name
        let filename = '';
        try {
          const cd = resp.headers.get('Content-Disposition') || resp.headers.get('content-disposition') || '';
          const m = /filename\s*=\s*"?([^";]+)"?/i.exec(cd);
          if (m) filename = m[1];
        } catch {}
        if (!filename) {
          const suggested = (this.studentName() || '').trim();
          if (suggested) filename = `${suggested}.pdf`;
        }
        if (!filename) filename = 'report-card.pdf';
        const file = new File([blob], filename, { type: 'application/pdf' });
        const objectUrl = URL.createObjectURL(file);
        this.currentBlobUrl = objectUrl;
        this.iframeUrl.set(objectUrl);
        this.iframeUrlSafe.set(this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl));
        // Warn if blob looks empty (very small PDF)
        try {
          const sizeKb = Math.round((blob.size || 0) / 1024);
          const looksEmpty = sizeKb < 5;
          this.emptyMsg.set(looksEmpty ? 'No marks found for the selected filters. Only remarks may be visible.' : null);
          // Intelligent fallbacks: if empty and we have examType, retry without examType once
          if (looksEmpty) {
            const hadExam = !!this.examType();
            const hadTerm = !!this.term();
            if (hadExam && !this.triedDropExamType) {
              this.triedDropExamType = true;
              const prev = this.examType();
              this.examType.set('');
              this.updateIframe();
              // restore the examType so UI reflects original filter; iframe will continue to show fallback
              setTimeout(()=> this.examType.set(prev), 0);
              return;
            }
            if (hadTerm && !this.triedDropTerm) {
              this.triedDropTerm = true;
              const prevT = this.term();
              this.term.set('');
              this.updateIframe();
              setTimeout(()=> this.term.set(prevT), 0);
              return;
            }
          }
        } catch { this.emptyMsg.set(null); }
      },
      error: async (e: any) => {
        let msg = e?.message || 'Failed to load report card';
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
            msg = (parsed && parsed.message) || 'Access to this report card is blocked due to outstanding term fees. Please settle fees to view the report card.';
          } else if (e?.error?.message) {
            msg = e.error.message;
          }
        } catch {}
        this.iframeUrl.set('about:blank');
        this.iframeUrlSafe.set(this.sanitizer.bypassSecurityTrustResourceUrl('about:blank'));
        this.saveStatus.set(msg);
        this.emptyMsg.set(null);
      }
    });
  }

  onRemarkChange(){
    console.log('✏️ Remark changed - starting auto-save timer');
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(()=> this.doSave(), 800);
  }

  private doSave(){
    const tr = this.teacherRemark.trim();
    const pr = this.principalRemark.trim();
    const nothingChanged = tr === this.lastSavedTeacher && pr === this.lastSavedPrincipal;
    
    console.log('🔍 doSave called', { 
      studentId: this.studentId(), 
      teacherRemark: tr.substring(0, 50) + (tr.length > 50 ? '...' : ''),
      principalRemark: pr.substring(0, 50) + (pr.length > 50 ? '...' : ''),
      nothingChanged,
      lastSavedTeacher: this.lastSavedTeacher,
      lastSavedPrincipal: this.lastSavedPrincipal,
      term: this.term(),
      examType: this.examType()
    });
    
    if (!this.studentId()) {
      console.warn('⚠️ Skipping save - no student ID');
      return;
    }
    
    if (nothingChanged) {
      console.log('⏭️ Skipping save - no changes detected');
      return;
    }
    
    this.saveStatus.set('Saving...');
    const payload = {
      studentId: this.studentId(),
      term: this.term() || undefined,
      examType: this.examType() || undefined,
      teacherRemark: tr || undefined,
      principalRemark: pr || undefined,
    };
    
    console.log('💾 Calling API to save remarks:', payload);
    
    this.reports.saveRemarks(payload).subscribe({
      next: (response: any) => {
        console.log('✅ Remarks saved successfully! Response:', response);
        this.lastSavedTeacher = tr;
        this.lastSavedPrincipal = pr;
        const now = new Date();
        const hh = String(now.getHours()).padStart(2,'0');
        const mm = String(now.getMinutes()).padStart(2,'0');
        
        // Show status-based message
        if (response.status === 'ready_for_pdf') {
          this.saveStatus.set(`✅ Auto-saved at ${hh}:${mm} - Ready for parents!`);
        } else {
          this.saveStatus.set(`✅ Auto-saved at ${hh}:${mm}`);
        }
        setTimeout(()=> this.saveStatus.set(''), 4000);
      },
      error: (err) => {
        console.error('❌ Failed to save remarks! Error:', err);
        console.error('Error status:', err?.status);
        console.error('Error message:', err?.message);
        console.error('Error body:', err?.error);
        this.saveStatus.set('❌ Auto-save failed! Click Save Remarks button');
        setTimeout(()=> this.saveStatus.set(''), 5000);
      },
    });
  }

  private isDirty(){
    return this.teacherRemark.trim() !== this.lastSavedTeacher || this.principalRemark.trim() !== this.lastSavedPrincipal;
  }

  private tryFocus(){
    try {
      const role = (this.auth.role() || '').toLowerCase();
      let box: HTMLTextAreaElement | undefined;
      let disabled = false;
      if (role === 'principal') { box = this.principalBox?.nativeElement; disabled = this.isPrincipalDisabled(); }
      else if (role === 'teacher') { box = this.teacherBox?.nativeElement; disabled = this.isTeacherDisabled(); }
      else if (role === 'admin') { box = this.teacherBox?.nativeElement; disabled = this.isTeacherDisabled(); }
      else { return; }
      if (!box || disabled) return;
      setTimeout(()=>{ try { box.focus(); box.setSelectionRange(box.value.length, box.value.length); } catch {} }, 0);
    } catch {}
  }

  @HostListener('window:beforeunload')
  beforeUnload(){
    if (this.isDirty()) this.doSave();
  }

  ngOnDestroy(): void {
    if (this.isDirty()) this.doSave();
  }

  preview(){ this.updateIframe(); }

  saveRemarksManually(){
    console.log('💾 Manual save button clicked');
    // Clear any pending auto-save timer
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = undefined;
    }
    
    // Check if we have a student ID
    if (!this.studentId()) {
      this.saveStatus.set('⚠️ No student selected');
      setTimeout(() => this.saveStatus.set(''), 3000);
      return;
    }
    
    // Force immediate save (bypass change detection)
    const tr = this.teacherRemark.trim();
    const pr = this.principalRemark.trim();
    
    this.saveStatus.set('💾 Saving remarks...');
    const payload = {
      studentId: this.studentId(),
      term: this.term() || undefined,
      examType: this.examType() || undefined,
      teacherRemark: tr || undefined,
      principalRemark: pr || undefined,
    };
    
    console.log('💾 Force saving remarks with payload:', payload);
    
    this.reports.saveRemarks(payload).subscribe({
      next: (response: any) => {
        console.log('✅ Remarks saved successfully! Response:', response);
        this.lastSavedTeacher = tr;
        this.lastSavedPrincipal = pr;
        
        // Check if report card is ready for parents
        if (response.status === 'ready_for_pdf') {
          this.saveStatus.set('✅ Saved! Report card ready for parents');
        } else if (response.status === 'draft') {
          this.saveStatus.set('✅ Saved! Fill both remarks to publish');
        } else {
          this.saveStatus.set('✅ Remarks saved successfully!');
        }
        setTimeout(() => this.saveStatus.set(''), 4000);
      },
      error: (err) => {
        console.error('❌ Failed to save remarks! Error:', err);
        console.error('Error details:', { status: err?.status, message: err?.message, body: err?.error });
        this.saveStatus.set('❌ Save failed! Check console');
        setTimeout(() => this.saveStatus.set(''), 5000);
      },
    });
  }

  async download(){
    const sid = this.studentId();
    const t = this.term() || undefined;
    const et = this.examType() || undefined;
    
    console.log('📥 Download button clicked', { studentId: sid, term: t, examType: et });
    this.saveStatus.set('📥 Generating PDF...');
    
    try {
      await this.reports.downloadReportCard(sid, t, et);
      console.log('✅ Report card downloaded successfully');
      this.saveStatus.set('✅ PDF downloaded!');
      setTimeout(() => this.saveStatus.set(''), 2000);
    } catch (err: any) {
      console.error('❌ Download failed:', err);
      if (err?.status === 403) {
        this.saveStatus.set('❌ Report not ready - fill both remarks first!');
      } else {
        this.saveStatus.set('❌ Download failed! Check console');
      }
      setTimeout(() => this.saveStatus.set(''), 5000);
    }
  }
  openInNewTab(){
    // If we already have a blob URL, reuse; else fetch once
    if (this.currentBlobUrl) { window.open(this.currentBlobUrl, '_blank'); return; }
    const url = this.urlWith();
    const token = localStorage.getItem('access_token') || '';
    const headers = token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : new HttpHeaders();
    this.http.get(url, { headers, responseType: 'blob', observe: 'response' as const }).subscribe(resp => {
      const blob = resp.body as Blob;
      let filename = '';
      try {
        const cd = resp.headers.get('Content-Disposition') || resp.headers.get('content-disposition') || '';
        const m = /filename\s*=\s*"?([^";]+)"?/i.exec(cd);
        if (m) filename = m[1];
      } catch {}
      if (!filename) {
        const suggested = (this.studentName() || '').trim();
        if (suggested) filename = `${suggested}.pdf`;
      }
      if (!filename) filename = 'report-card.pdf';
      const file = new File([blob], filename, { type: 'application/pdf' });
      const wurl = URL.createObjectURL(file);
      window.open(wurl, '_blank');
      setTimeout(()=> URL.revokeObjectURL(wurl), 60_000);
    });
  }
  // sequence helpers
  private loadSequence(currentId: string){
    try {
      const raw = sessionStorage.getItem(this.seqKey);
      if (!raw) { this.seqIds = []; this.seqIdx = 0; return; }
      const obj = JSON.parse(raw) as { ids: string[] };
      this.seqIds = Array.isArray(obj?.ids) ? obj.ids : [];
      this.seqIdx = Math.max(0, this.seqIds.indexOf(currentId));
    } catch { this.seqIds = []; this.seqIdx = 0; }
  }
  hasPrev(){ return this.seqIdx > 0 && this.seqIds.length > 0; }
  hasNext(){ return this.seqIdx < this.seqIds.length - 1; }
  seqIndex(){ return this.seqIdx; }
  seqTotal(){ return this.seqIds.length; }
  prev(){ if (!this.hasPrev()) return; this.gotoIndex(this.seqIdx - 1); }
  next(){ if (!this.hasNext()) return; this.gotoIndex(this.seqIdx + 1); }
  private gotoIndex(i: number){
    if (this.isDirty()) this.doSave();
    this.seqIdx = i;
    const id = this.seqIds[i];
    const u = new URL(window.location.href);
    const base = u.origin;
    const url = new URL(base + `/reports/report-card/${id}/view`);
    const t = this.term();
    const et = this.examType();
    const cid = this.classId();
    if (t) url.searchParams.set('term', t);
    if (et) url.searchParams.set('examType', et);
    if (cid) url.searchParams.set('classId', cid);
    window.location.assign(url.toString());
  }

  isTeacherDisabled(){ const r = (this.auth.role() || '').toLowerCase(); return !(r === 'teacher' || r === 'admin'); }
  isPrincipalDisabled(){ const r = (this.auth.role() || '').toLowerCase(); return !(r === 'principal' || r === 'admin'); }
}
