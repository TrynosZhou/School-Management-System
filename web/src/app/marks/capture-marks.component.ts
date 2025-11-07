import { Component, OnInit, computed, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormControl, FormGroup, FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ClassesService, type ClassEntity } from '../classes/classes.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { MarksService } from './marks.service';
import { SubjectsService, type Subject } from '../subjects/subjects.service';
import { TeachingService, type TeachingAssignment } from '../teaching/teaching.service';
import { AuthStateService } from '../auth/auth-state.service';

@Component({
  selector: 'app-capture-marks',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="top">
        <h2 class="title"><span class="i">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M4 4h10l6 6v10a0 0 0 0 1 0 0H4a0 0 0 0 1 0 0V4z"/>
            <path d="M14 4v6h6"/>
          </svg>
        </span>Capture marks</h2>
        <div class="tips">Enter scores (0-100). Changes autosave per row.</div>
      </div>
      <div class="toolbar">
        <button type="button" class="btn primary" (click)="refresh()">
          <span class="bi">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0L11.342 7.41A.25.25 0 0 1 11.534 7"/><path d="M7.534 12a5 5 0 1 1 4.546-7.03.5.5 0 1 1-.906.422A4 4 0 1 0 8 12a.5.5 0 0 1 0 1 5 5 0 0 1-.466-1z"/></svg>
          </span>
          Refresh
        </button>
        <button type="button" class="btn primary" (click)="importCsv()">
          <span class="bi">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M.5 9.9a.5.5 0 0 1 .5-.5h4.793L4.146 7.754a.5.5 0 1 1 .708-.708l2.5 2.5a.5.5 0 0 1 0 .708l-2.5 2.5a.5.5 0 1 1-.708-.708L5.793 10.4H1a.5.5 0 0 1-.5-.5"/><path d="M13.5 2a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 13.5 14h-6A1.5 1.5 0 0 1 6 12.5v-1a.5.5 0 0 1 1 0v1A.5.5 0 0 0 7.5 13h6a.5.5 0 0 0 .5-.5v-9A.5.5 0 0 0 13.5 3h-6A.5.5 0 0 0 7 3.5v1a.5.5 0 0 1-1 0v-1A1.5 1.5 0 0 1 7.5 2z"/></svg>
          </span>
          Import CSV
        </button>
        <button type="button" class="btn primary" (click)="exportCsvMarks()">
          <span class="bi">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M.5 6.1a.5.5 0 0 1 .5.5h4.793L4.146 7.946a.5.5 0 1 0 .708.708l2.5-2.5a.5.5 0 0 0 0-.708l-2.5-2.5a.5.5 0 1 0-.708.708L5.793 5.6H1a.5.5 0 0 1-.5-.5"/><path d="M13.5 2A1.5 1.5 0 0 1 15 3.5v9A1.5 1.5 0 0 1 13.5 14h-6A1.5 1.5 0 0 1 6 12.5v-1a.5.5 0 0 1 1 0v1a.5.5 0 0 0 .5.5h6a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-6a.5.5 0 0 0-.5.5v1a.5.5 0 0 1-1 0v-1A1.5 1.5 0 0 1 7.5 2z"/></svg>
          </span>
          Export CSV
        </button>
        <input #csvFile type="file" accept=".csv" (change)="onCsvSelected($event)" hidden />
      </div>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="row">
          <div class="col term">
            <label><span class="i s">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            </span>Term</label>
            <select formControlName="session" (change)="onFilterChange()">
              <option value="" disabled>Select term</option>
              <option>Term 1</option>
              <option>Term 2</option>
              <option>Term 3</option>
            </select>
          </div>
          <div class="col">
            <label><span class="i s">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            </span>Exam Type</label>
            <select formControlName="examType" (change)="onFilterChange()">
              <option value="">Select exam type</option>
              <option>Midterm</option>
              <option>End of Term</option>
            </select>
          </div>
          <div class="col">
            <label><span class="i s">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            </span>Class</label>
            <select formControlName="classId" (change)="onClassChange()">
              <option value="" disabled>Select class</option>
              <option *ngFor="let c of classes()" [value]="c.id">{{ c.name }} — {{ c.academicYear }}</option>
            </select>
          </div>
          <div class="col">
            <label><span class="i s">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 19.5V4.5a2 2 0 0 1 2-2h8l6 6v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/></svg>
            </span>Subject</label>
            <select formControlName="subjectId" (change)="onFilterChange()">
              <option value="">Select subject</option>
              <option *ngFor="let s of subjects()" [value]="s.id">{{ s.code }} — {{ s.name }}</option>
            </select>
          </div>
          <div class="col btn-col">
            <button type="button" class="refresh" (click)="refresh()">
              <span class="i">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 12a9 9 0 1 1-3.51-7.07"/><path d="M21 3v6h-6"/></svg>
              </span>Refresh
            </button>
          </div>
        </div>

        <div class="table-wrap" *ngIf="entries.length">
          <table>
            <thead>
              <tr><th>#</th><th>Student</th><th>Mark Obtained</th><th>Grade</th><th>Comment</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let fg of entries.controls; let i = index" [formGroup]="fg">
                <td>{{ i + 1 }}</td>
                <td>{{ fg.get('studentName')?.value }}</td>
                <td>
                  <div class="input">
                    <span class="i s">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 5v14M5 12h14"/></svg>
                    </span>
                    <input type="number" formControlName="score" min="0" max="100" (input)="onRowChange(i)" (blur)="validateScore(i)" />
                  </div>
                </td>
                <td>{{ gradeFor(fg.get('score')?.value) }}</td>
                <td>
                  <div class="input">
                    <span class="i s">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>
                    </span>
                    <select class="suggest" [ngModel]="''" [ngModelOptions]="{standalone: true}" (ngModelChange)="applySuggestedComment(i, $event)">
                      <option value="">Select suggestion…</option>
                      <option *ngFor="let c of suggestionsFor(fg.get('score')?.value)" [value]="c">{{ c }}</option>
                    </select>
                    <input formControlName="comment" placeholder="Optional remark" (change)="onRowChange(i)" />
                  </div>
                </td>
                <td>
                  <span class="status saving" *ngIf="rowStatus[i] === 'saving'"><span class="i s spin">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2a10 10 0 1 0 10 10"/></svg>
                  </span>Saving…</span>
                  <span class="status ok" role="alert" *ngIf="isRowSaved(i)"><span class="i s">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
                  </span>saved</span>
                  <span class="status error" *ngIf="isError(i)"><span class="i s">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                  </span>{{ errorText(i) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="hint">Marks must be between 0 and 100.</div>
        </div>

        <div class="actions">
          <button type="submit" class="btn primary" [disabled]="form.invalid || saving() || !entries.length">
            <span class="i">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4h16v16H4z"/><path d="M4 8h16"/><path d="M8 4v8"/></svg>
            </span>{{ saving() ? 'Saving…' : 'Save all' }}
          </button>
        </div>

      </form>

      <div class="error" *ngIf="err()">{{ err() }}</div>
      <div class="ok banner" role="alert" *ngIf="ok() !== null">
        <span class="i s">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
        </span>Saved {{ ok() }} marks successfully
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:1100px;margin:24px auto;padding:0 8px}
    .top{display:flex;justify-content:space-between;align-items:end;margin-bottom:8px;gap:8px}
    .title{display:flex;align-items:center;gap:8px;margin:0}
    .tips{color:#6b7280;font-size:12px}
    .home{font-size:14px}
    .toolbar{display:flex;gap:8px;align-items:center;margin:8px 0 12px}
    .btn{display:inline-flex;gap:8px;align-items:center;border:1px solid #e5e7eb;background:#fff;border-radius:8px;padding:8px 12px;cursor:pointer}
    .btn.primary{background:#0b53a5;color:#fff;border-color:#0b53a5;font-weight:700}
    .bi{display:inline-flex;width:16px;height:16px}
    .bi svg{width:100%;height:100%}
    .menu{position:relative}
    .dropdown{position:absolute;top:40px;left:0;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 6px 16px rgba(0,0,0,0.08);display:none;min-width:180px;padding:6px}
    .dropdown.open{display:block}
    .dropdown button{display:block;width:100%;text-align:left;padding:6px 8px;border:0;background:#fff;border-radius:6px;cursor:pointer}
    .dropdown button:hover{background:#f3f4f6}
    .row{display:grid;grid-template-columns:220px 1fr 1fr 1fr 140px;gap:12px;margin-bottom:12px}
    .col.term select{width:100%}
    .col label{display:flex;align-items:center;gap:6px;color:#374151;font-weight:600;margin-bottom:4px}
    .col select,.col input{width:100%;padding:9px 10px;border:1px solid #e5e7eb;border-radius:8px;background:#fff}
    .btn-col{display:flex;align-items:flex-end}
    .refresh{display:inline-flex;align-items:center;gap:8px;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer}
    table{width:100%;border-collapse:separate;border-spacing:0}
    thead th{position:sticky;top:0;background:#f8fafc;border-bottom:1px solid #e5e7eb;padding:10px;text-align:left;font-weight:700;color:#374151}
    tbody td{border-bottom:1px solid #f1f2f6;padding:8px;text-align:left}
    tbody tr:nth-child(even){background:#fbfdff}
    .table-wrap{margin-top:12px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden}
    .actions{margin-top:12px}
    .error{color:#b00020;margin-top:8px}
    .ok{color:#166534;margin-top:8px}
    .ok.banner{display:inline-flex;align-items:center;gap:6px;background:#ecfdf5;border:1px solid #a7f3d0;padding:8px 10px;border-radius:8px}
    .hint{color:#6b7280;margin-top:6px}
    .i{display:inline-flex;width:18px;height:18px;color:#374151}
    .i.s{width:14px;height:14px}
    .i svg{width:100%;height:100%}
    .spin{animation:spin 1s linear infinite}
    @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
    .status{display:inline-flex;align-items:center;gap:6px}
    .status.ok{color:#166534}
    .status.saving{color:#4b5563}
    .status.error{color:#b91c1c}
    .input{display:flex;align-items:center;gap:6px;border:1px solid #e5e7eb;border-radius:8px;padding:2px 6px;background:#fff}
    .input input{border:0;outline:none;width:100%;padding:6px 4px}
    @media(max-width:700px){.row{grid-template-columns:1fr}}
  `]
})
export class CaptureMarksComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private classesSvc = inject(ClassesService);
  private enrollSvc = inject(EnrollmentsService);
  private marksSvc = inject(MarksService);
  private subjectsSvc = inject(SubjectsService);
  private teachingSvc = inject(TeachingService);
  private authState = inject(AuthStateService);
  private route = inject(ActivatedRoute);

  classes = signal<ClassEntity[]>([]);
  subjects = signal<Subject[]>([]);
  saving = signal(false);
  err = signal<string | null>(null);
  ok = signal<number | null>(null);
  rowStatus: Record<number, string | undefined> = {};
  private rowTimers: Record<number, any> = {};
  private myAssignments: TeachingAssignment[] = [];
  menuOpen = signal(false);
  // file input ref
  @ViewChild('csvFile') csvFile?: ElementRef<HTMLInputElement>;

  form = this.fb.group({
    session: ['', Validators.required],
    examType: [''],
    classId: ['', Validators.required],
    subjectId: [''],
    entries: this.fb.array([] as any[])
  });

  private bands = signal<Array<{ grade: string; min: number; max: number }>>([]);
  private defaultBands(): Array<{ grade: string; min: number; max: number }>{
    // Matches defaults shown on Settings page
    return [
      { grade: 'A*', min: 90, max: 100 },
      { grade: 'A',  min: 70, max: 89 },
      { grade: 'B',  min: 60, max: 69 },
      { grade: 'C',  min: 50, max: 59 },
      { grade: 'D',  min: 45, max: 49 },
      { grade: 'E',  min: 40, max: 44 },
      { grade: 'U',  min: 0,  max: 39 },
    ];
  }
  private refreshBands(){
    this.marksSvc.getGradeBands().subscribe({
      next: (cats) => {
        try {
          const list = Array.isArray(cats) ? cats : [];
          const overall = list.find((c: any) => (c?.category || '').toLowerCase() === 'overall') || list[0];
          const bands = Array.isArray(overall?.bands) ? overall.bands : [];
          
          const out = bands
            .map((b: any) => ({
              grade: String(b?.grade || '').trim(),
              min: Number(b?.min),
              max: Number(b?.max)
            }))
            .filter((b: any) => !!b.grade && Number.isFinite(b.min) && Number.isFinite(b.max))
            .sort((a: any, b: any) => b.min - a.min);
            
          if (out.length > 0) {
            this.bands.set(out);
            console.log('[Capture] Loaded grade bands from API:', out);
          } else {
            console.warn('[Capture] API bands invalid, using defaults');
            this.bands.set(this.defaultBands());
          }
        } catch (e) { 
          console.error('[Capture] Failed to parse bands:', e);
          this.bands.set(this.defaultBands()); 
        }
      },
      error: (e) => {
        console.error('[Capture] API error, using defaults:', e);
        this.bands.set(this.defaultBands());
      }
    });
  }

  // Suggested comments catalogue; kept simple and local
  private baseComments: Record<string, string[]> = {
    A: ['Excellent work', 'Outstanding performance', 'Keep it up'],
    B: ['Very good', 'Good progress', 'Well done'],
    C: ['Satisfactory', 'Fair effort', 'Needs consistent practice'],
    D: ['Below average', 'Needs improvement', 'Work harder'],
    E: ['Poor performance', 'Consider extra help', 'Significant improvement needed'],
    F: ['Failed', 'Urgent improvement required', 'See teacher for support'],
    general: ['Great participation', 'Shows improvement', 'Incomplete work', 'Missing assignment', 'Absent for test']
  };

  suggestionsFor(score: any): string[] {
    const g = this.gradeFor(score) || '';
    const byGrade = this.baseComments[g] || [];
    const common = this.baseComments['general'] || [];
    // dedupe and limit
    const out = Array.from(new Set([...byGrade, ...common]));
    return out.slice(0, 10);
  }

  applySuggestedComment(i: number, val: any){
    const text = String(val || '').trim();
    if (!text) return;
    const fg = this.entries.at(i) as FormGroup;
    const cur = String(fg.get('comment')?.value || '').trim();
    const next = cur ? `${cur} ${text}` : text;
    fg.get('comment')?.setValue(next);
    // Save immediately if we have a valid score; otherwise mark as changed and wait for score entry
    if (this.hasValidScore(i)) this.autoSaveRow(i); else this.onRowChange(i);
  }

  private hasValidScore(i: number): boolean {
    const fg = this.entries.at(i) as FormGroup;
    const score = fg?.get('score')?.value;
    if (score === null || score === undefined || score === '') return false;
    const n = Number(score);
    return Number.isFinite(n) && n >= 0 && n <= 100;
  }

  private hasComment(i: number): boolean {
    const fg = this.entries.at(i) as FormGroup;
    const c = String(fg?.get('comment')?.value || '').trim();
    return c.length > 0;
  }

  isRowSaved(i: number): boolean {
    return this.rowStatus[i] === 'saved' && this.hasValidScore(i) && this.hasComment(i);
  }
  private parseBands(json?: string | null): Array<{ grade: string; min: number; max: number }>{
    try {
      if (!json) return [];
      const arr = JSON.parse(json);
      if (!Array.isArray(arr)) return [];
      const out: Array<{ grade: string; min: number; max: number }> = [];
      for (const it of arr) {
        const g = (it?.grade || '').toString().trim();
        let min = Number((it?.min ?? '').toString());
        let max = Number((it?.max ?? '').toString());
        if ((isNaN(min) || isNaN(max)) && typeof it?.range === 'string') {
          const s = it.range.trim();
          // Format 1: "70 - 89" (supports hyphen, en/em dashes)
          let m = /(-?\d+(?:\.\d+)?)\s*[\-\u2013\u2014]\s*(-?\d+(?:\.\d+)?)/.exec(s);
          // Format 2: "70 to 89"
          if (!m) m = /(-?\d+(?:\.\d+)?)\s*to\s*(-?\d+(?:\.\d+)?)/i.exec(s);
          // Format 3: ">69 and < 90" or ">=70 and <=89"
          if (!m) {
            const m2 = /(>=|>)\s*(-?\d+(?:\.\d+)?)\s*(?:and|,)\s*(<=|<)\s*(-?\d+(?:\.\d+)?)/i.exec(s);
            if (m2) {
              const lowOp = m2[1]; const lowV = parseFloat(m2[2]);
              const highOp = m2[3]; const highV = parseFloat(m2[4]);
              min = lowOp === '>' ? (lowV + 0.0001) : lowV;
              max = highOp === '<' ? (highV - 0.0001) : highV;
            }
          }
          if (m && m.length >= 3) { min = parseFloat(m[1]); max = parseFloat(m[2]); }
        }
        if (!g || isNaN(min) || isNaN(max)) continue;
        if (min > max) { const t = min; min = max; max = t; }
        out.push({ grade: g, min, max });
      }
      out.sort((a,b) => b.min - a.min);
      return out;
    } catch { return []; }
  }
  gradeFor(score: any): string {
    if (score === null || score === undefined || score === '') return '';
    const n = Number(score);
    if (isNaN(n)) return '';
    
    // Use hardcoded bands if signal is empty (emergency fallback)
    let bands = this.bands();
    if (!bands || bands.length === 0) {
      console.error('[Capture gradeFor] Bands signal is EMPTY! Using hardcoded fallback');
      bands = [
        { grade: 'A*', min: 90, max: 100 },
        { grade: 'A', min: 70, max: 89 },
        { grade: 'B', min: 60, max: 69 },
        { grade: 'C', min: 50, max: 59 },
        { grade: 'D', min: 45, max: 49 },
        { grade: 'E', min: 40, max: 44 },
        { grade: 'U', min: 0, max: 39 },
      ];
    }
    
    // Check each band - FORCE convert min/max to numbers
    for (const b of bands) {
      const min = Number(b.min);
      const max = Number(b.max);
      if (!isNaN(min) && !isNaN(max) && n >= min && n <= max) {
        return b.grade;
      }
    }
    
    console.warn('[Capture gradeFor] No match found for score:', n, 'Bands:', bands);
    return '';
  }

  get entries(): FormArray<FormGroup> {
    return this.form.get('entries') as FormArray<FormGroup>;
  }
  private csvEscape(v: any): string {
    const s = (v ?? '').toString();
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }
  private splitCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++){
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i+1] === '"') { cur += '"'; i++; }
          else { inQuotes = false; }
        } else { cur += ch; }
      } else {
        if (ch === ',') { out.push(cur); cur = ''; }
        else if (ch === '"') { inQuotes = true; }
        else { cur += ch; }
      }
    }
    out.push(cur);
    return out;
  }

  toggleMenu(){ this.menuOpen.set(!this.menuOpen()); }
  importCsv(){ try { this.csvFile?.nativeElement?.click(); } catch {}}
  exportCsvMarks(){
    try {
      const raw = this.form.getRawValue() as any;
      const rows: string[] = [];
      const headers = ['studentId','studentName','score','comment','classId','subjectId','term','examType'];
      rows.push(headers.join(','));
      for (let i = 0; i < this.entries.length; i++){
        const fg = this.entries.at(i) as FormGroup;
        const rec = {
          studentId: (fg.get('studentId')?.value ?? '').toString(),
          studentName: (fg.get('studentName')?.value ?? '').toString(),
          score: (fg.get('score')?.value ?? '').toString(),
          comment: (fg.get('comment')?.value ?? '').toString(),
          classId: (raw?.classId ?? '').toString(),
          subjectId: (raw?.subjectId ?? '').toString(),
          term: (raw?.session ?? '').toString(),
          examType: (raw?.examType ?? '').toString(),
        } as any;
        const line = headers.map((h)=> this.csvEscape(rec[h] ?? '')).join(',');
        rows.push(line);
      }
      const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `marks-${raw?.classId || 'class'}-${raw?.session || 'term'}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=> URL.revokeObjectURL(url), 1000);
    } catch { alert('Failed to export CSV'); }
  }

  onCsvSelected(ev: Event){
    try {
      const input = ev.target as HTMLInputElement;
      const file = input.files && input.files[0];
      if (!file) return;
      const fr = new FileReader();
      fr.onload = () => {
        try {
          const text = (fr.result || '').toString();
          this.applyCsv(text);
        } catch { alert('Invalid CSV'); }
        try { input.value = ''; } catch {}
      };
      fr.readAsText(file);
    } catch { alert('Failed to read CSV file'); }
  }

  private applyCsv(csv: string){
    const lines = csv.split(/\r?\n/).filter(l=>l.trim().length>0);
    if (!lines.length) { alert('Empty CSV'); return; }
    const headers = lines[0].split(',').map(h=>h.trim().replace(/^"|"$/g,''));
    const idx = (name: string) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
    const iStudent = idx('studentId') >=0 ? idx('studentId') : idx('student');
    const iScore = idx('score');
    const iComment = idx('comment');
    if (iStudent < 0 || iScore < 0) { alert('CSV must include studentId and score columns'); return; }
    const mapIndexByStudent: Record<string, number> = {};
    for (let i=0;i<this.entries.length;i++){
      const fg = this.entries.at(i) as FormGroup;
      mapIndexByStudent[(fg.get('studentId')?.value || '').toString()] = i;
    }
    let updated = 0; let missing = 0;
    for (let r = 1; r < lines.length; r++){
      const cols = this.splitCsvLine(lines[r]);
      if (!cols.length) continue;
      const sid = (cols[iStudent] || '').toString().trim().replace(/^"|"$/g,'');
      if (!sid) continue;
      const idxRow = mapIndexByStudent[sid];
      if (idxRow === undefined){ missing++; continue; }
      const fg = this.entries.at(idxRow) as FormGroup;
      const scoreRaw = (cols[iScore] || '').toString().trim();
      const commentRaw = (iComment >=0 ? cols[iComment] : '').toString();
      const scoreNum = scoreRaw === '' ? null : Number(scoreRaw);
      fg.get('score')?.setValue(scoreNum);
      fg.get('comment')?.setValue(commentRaw);
      this.onRowChange(idxRow);
      updated++;
    }
    if (updated === 0) alert('No matching studentId found in CSV');
  }
  openHelp(){ alert('Enter marks between 0 and 100. Use Save all to persist.'); }
  clearAll(){ this.entries.controls.forEach((fg: any) => fg.get('score')?.setValue(null)); }
  validateAll(){ this.entries.controls.forEach((_: any, i: number) => this.validateScore(i)); }

  ngOnInit() {
    // Initialize with default bands immediately so grades show even before API loads
    this.bands.set(this.defaultBands());
    console.log('[Capture Init] Default bands set:', this.defaultBands());
    // Test grading with default bands
    console.log('[Capture Test] Grade for 78:', this.gradeFor(78));
    console.log('[Capture Test] Grade for 95:', this.gradeFor(95));
    console.log('[Capture Test] Grade for 55:', this.gradeFor(55));
    this.refreshBands();
    const role = this.authState.role();
    // Prefill from query params if provided (session, classId, subjectId)
    const qp = this.route.snapshot.queryParamMap;
    const qpSession = (qp.get('session') || '').trim();
    const qpClass = (qp.get('classId') || '').trim();
    const qpSubject = (qp.get('subjectId') || '').trim();
    if (qpSession) this.form.patchValue({ session: qpSession });
    if (qpClass) this.form.patchValue({ classId: qpClass });
    if (qpSubject) this.form.patchValue({ subjectId: qpSubject });
    if (role === 'teacher') {
      this.teachingSvc.listMine().subscribe({
        next: (assns) => {
          this.myAssignments = assns || [];
          // Unique classes from assignments
          const map = new Map<string, ClassEntity>();
          for (const a of this.myAssignments) { if (a.klass?.id) map.set(a.klass.id, a.klass as any); }
          this.classes.set(Array.from(map.values()));
          // Subjects will be set after class selection depending on assignment
          this.subjects.set([]);
        },
        error: () => {
          this.err.set('Failed to load your assignments');
        }
      });
    } else {
      // Admins (or others) see all classes and subjects
      this.classesSvc.list().subscribe({ next: (res) => {
        this.classes.set(res);
        // If classId was provided via query, trigger load
        const classId = (this.form.value.classId || '').toString();
        if (classId) this.onClassChange();
      }});
      this.subjectsSvc.list().subscribe({ next: (res) => this.subjects.set(res) });
    }
  }

  onClassChange() {
    const classId = this.form.value.classId as string;
    if (!classId) { this.entries.clear(); return; }
    this.err.set(null); this.ok.set(null); this.entries.clear();

    // If teacher, restrict subjects to assigned ones for selected class (unless class-level assignment present)
    const role = this.authState.role();
    if (role === 'teacher') {
      const assnsForClass = this.myAssignments.filter(a => a.klass?.id === classId);
      const hasClassLevel = assnsForClass.some(a => !a.subject);
      if (hasClassLevel) {
        // Can teach any subject in that class
        this.subjectsSvc.list().subscribe({ next: (res) => this.subjects.set(res) });
      } else {
        const subjMap = new Map<string, Subject>();
        for (const a of assnsForClass) { if (a.subject?.id) subjMap.set(a.subject.id, a.subject as any); }
        this.subjects.set(Array.from(subjMap.values()));
      }
    }
    this.refresh();
  }

  onFilterChange() {
    this.refresh();
  }

  refresh() {
    // Always reload bands so grades reflect current Settings
    this.refreshBands();
    const raw = this.form.getRawValue();
    const classId = raw.classId as string;
    // session and subjectId are used for saving; for loading the list we need classId
    if (!classId) { this.entries.clear(); return; }
    this.err.set(null); this.ok.set(null); this.entries.clear();
    this.enrollSvc.listByClass(classId).subscribe({
      next: (enrs) => {
        for (const e of enrs) {
          const student = (e as any).student;
          const fg = this.fb.group({
            studentId: [student.id],
            studentName: [`${student.firstName} ${student.lastName}`],
            score: [null as any, [Validators.min(0), Validators.max(100)]],
            comment: [''],
          });
          this.entries.push(fg);
        }
      },
      error: (e) => this.err.set(e?.error?.message || 'Failed to load students')
    });
  }

  onRowChange(i: number) {
    if (this.rowTimers[i]) clearTimeout(this.rowTimers[i]);
    this.rowTimers[i] = setTimeout(() => this.autoSaveRow(i), 700);
  }

  private autoSaveRow(i: number) {
    const fg = this.entries.at(i) as FormGroup;
    if (!fg) return;
    const score = fg.get('score')?.value;
    if (score === null || score === undefined || score === '') return;
    const n = Number(score);
    if (isNaN(n) || n < 0 || n > 100) return;
    const raw = this.form.getRawValue();
    if (!raw.session || !raw.classId) return;
    this.rowStatus[i] = 'saving';
    const payload = {
      session: raw.session as string,
      examType: (raw as any).examType || undefined,
      classId: raw.classId as string,
      subjectId: (raw as any).subjectId || undefined,
      entries: [{ studentId: fg.get('studentId')?.value, score: String(score ?? ''), comment: fg.get('comment')?.value || null }]
    };
    this.marksSvc.capture(payload).subscribe({
      next: (res) => {
        this.rowStatus[i] = res?.success ? 'saved' : `err:${res?.message || 'Save failed'}`;
        clearTimeout(this.rowTimers[i]);
        this.rowTimers[i] = setTimeout(() => { if (this.rowStatus[i] === 'saved') this.rowStatus[i] = undefined; }, 2000);
      },
      error: (e) => {
        this.rowStatus[i] = `err:${e?.error?.message || 'Save failed'}`;
        clearTimeout(this.rowTimers[i]);
        this.rowTimers[i] = setTimeout(() => this.rowStatus[i] = undefined, 3000);
      }
    });
  }

  validateScore(i: number) {
    const fg = this.entries.at(i) as FormGroup;
    const c = fg.get('score');
    if (!c) return;
    const v = Number(c.value);
    if (isNaN(v)) return;
    if (v < 0) c.setValue(0);
    if (v > 100) c.setValue(100);
  }

  isError(i: number): boolean {
    const s = this.rowStatus[i];
    return !!s && s.startsWith('err:');
  }

  errorText(i: number): string {
    const s = this.rowStatus[i];
    return s && s.startsWith('err:') ? s.slice(4) : '';
  }

  onSubmit() {
    if (this.form.invalid || !this.entries.length) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.err.set(null); this.ok.set(null);
    const raw = this.form.getRawValue();
    const payload = {
      session: raw.session!,
      examType: (raw as any).examType || undefined,
      classId: raw.classId!,
      subjectId: raw.subjectId || undefined,
      entries: raw.entries.map((x: any) => ({ studentId: x.studentId, score: String(x.score ?? ''), comment: x.comment || null }))
    };
    this.marksSvc.capture(payload).subscribe({
      next: (res) => { this.saving.set(false); res.success ? this.ok.set(res.saved || 0) : this.err.set(res.message || 'Save failed'); },
      error: (e) => { this.saving.set(false); this.err.set(e?.error?.message || 'Save failed'); }
    });
  }
}
