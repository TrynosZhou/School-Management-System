import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ClassesService, type ClassEntity } from '../classes/classes.service';

interface Teacher { id: string; name: string; }
interface Subject { id: string; name: string; code?: string; }
interface Assignment { id: string; classId: string; subjectId: string; teacherId: string; periods: number; }
interface Slot { day: number; period: number; classId?: string; subjectId?: string; teacherId?: string; breakLabel?: string }

@Component({
  selector: 'app-timetable-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="wrap">
      <h2>Timetable</h2>
      <div class="subnav">
        <a routerLink="/timetable/teachers">Teachers</a>
        <a routerLink="/timetable/subjects">Subjects</a>
        <a routerLink="/timetable/classes">Classes</a>
        <a routerLink="/timetable/slots">Time slots & breaks</a>
      </div>
      <div class="panel">
        <div class="row">
          <div class="field">
            <label>Days per week</label>
            <select [(ngModel)]="days" (change)="rebuildGrid()">
              <option *ngFor="let d of [5,6]" [ngValue]="d">{{ d }}</option>
            </select>
          </div>
          <div class="field">
            <label>Periods per day</label>
            <input type="number" [(ngModel)]="periodsPerDay" (change)="rebuildGrid()" min="1" max="16" />
          </div>
          <div class="field">
            <label>Time per period (minutes)</label>
            <select [(ngModel)]="minutesPerPeriod">
              <option *ngFor="let m of [35,40,45,50,60]" [ngValue]="m">{{ m }}</option>
            </select>
          </div>
          <div class="actions">
            <button type="button" class="primary" (click)="generate()">Generate</button>
            <button type="button" class="primary outline" [disabled]="!hasGrid()" (click)="exportPdf()">Export PDF</button>
          </div>
        </div>
        <div class="row">
          <div class="field grow">
            <label>Teachers</label>
            <div class="chips">
              <span class="chip" *ngFor="let t of teachers()">{{ t.name }}</span>
            </div>
            <div class="inline">
              <input [(ngModel)]="teacherName" placeholder="Add teacher name" />
              <button type="button" class="primary" (click)="addTeacher()" [disabled]="!teacherName.trim()">Add</button>
              <button type="button" (click)="loadTeachers()">Load from server</button>
            </div>
          </div>
          <div class="field grow">
            <label>Subjects</label>
            <div class="chips">
              <span class="chip" *ngFor="let s of subjects()">{{ s.name }}</span>
            </div>
            <div class="inline">
              <input [(ngModel)]="subjectName" placeholder="Add subject name" />
              <button type="button" class="primary" (click)="addSubject()" [disabled]="!subjectName.trim()">Add</button>
              <button type="button" (click)="loadSubjects()">Load from server</button>
            </div>
          </div>
          <div class="field grow">
            <label>Classes</label>
            <div class="chips">
              <span class="chip" *ngFor="let c of classes()">{{ c.name }} <span class="muted" *ngIf="c.academicYear">({{ c.academicYear }})</span></span>
            </div>
            <div class="inline">
              <button type="button" (click)="loadClasses()">Load from server</button>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="assign-wrap">
            <div class="assign-row" *ngFor="let a of assigns(); let i = index">
              <select [(ngModel)]="a.classId">
                <option value="">Class…</option>
                <option *ngFor="let c of classes()" [value]="c.id">{{ c.name }}</option>
              </select>
              <select [(ngModel)]="a.subjectId">
                <option value="">Subject…</option>
                <option *ngFor="let s of subjects()" [value]="s.id">{{ s.name }}</option>
              </select>
              <select [(ngModel)]="a.teacherId">
                <option value="">Teacher…</option>
                <option *ngFor="let t of teachers()" [value]="t.id">{{ t.name }}</option>
              </select>
              <input type="number" [(ngModel)]="a.periods" min="1" [max]="periodsPerDay*days"/>
              <button type="button" (click)="removeAssign(i)">Remove</button>
            </div>
            <button type="button" class="primary" (click)="addAssign()">Add assignment</button>
          </div>
        </div>
        <div class="err" *ngIf="err()">{{ err() }}</div>
        <div class="ok" *ngIf="ok()">{{ ok() }}</div>
      </div>

      <div class="grid-wrap" *ngIf="hasGrid()">
        <h3>Preview</h3>
        <div class="tt" *ngFor="let c of classes()">
          <div class="tt-title">{{ c.name }}</div>
          <table class="table">
            <thead>
              <tr>
                <th>Day/Period</th>
                <th *ngFor="let p of periods()">P{{ p }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let d of daysArr()">
                <td class="day">{{ dayLabel(d) }}</td>
                <td *ngFor="let p of periods()">
                  <div class="cell">
                    <ng-container *ngIf="!classSlots[c.id]?.[d]?.[p]?.breakLabel; else brk">
                      <div class="subj">{{ subjectNameBy(classSlots[c.id]?.[d]?.[p]?.subjectId) || '-' }}</div>
                      <div class="teach muted">{{ teacherNameBy(classSlots[c.id]?.[d]?.[p]?.teacherId) || '' }}</div>
                    </ng-container>
                    <ng-template #brk>
                      <div class="subj break">{{ classSlots[c.id][d][p].breakLabel }}</div>
                    </ng-template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:1200px;margin:24px auto;padding:0 12px;display:grid;gap:12px}
    h2{margin:0}
    .subnav{display:flex;gap:10px}
    .subnav a{display:inline-block;padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;text-decoration:none;color:#1d4ed8}
    .subnav a:hover{background:#f3f4f6}
    .panel{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px;display:grid;gap:12px}
    .row{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end}
    .field{display:grid;gap:6px}
    .field.grow{flex:1}
    label{font-weight:600}
    select,input{padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font:inherit}
    .actions{display:flex;gap:8px;margin-left:auto}
    button.primary{padding:8px 12px;border:1px solid #0b53a5;border-radius:8px;background:#0b53a5;cursor:pointer;color:#fff;font-weight:700}
    button.primary.outline{background:#fff;color:#0b53a5}
    .chips{display:flex;gap:6px;flex-wrap:wrap}
    .chip{background:#f3f4f6;border:1px solid #e5e7eb;border-radius:999px;padding:4px 8px}
    .inline{display:flex;gap:6px;align-items:center}
    .assign-wrap{display:grid;gap:8px}
    .assign-row{display:grid;grid-template-columns:1fr 1fr 1fr 100px auto;gap:6px;align-items:center}
    .muted{color:#6b7280}
    .ok{color:#065f46}
    .err{color:#b91c1c}
    .grid-wrap{display:grid;gap:12px}
    .tt{border:1px solid #e5e7eb;border-radius:10px;overflow:hidden}
    .tt-title{padding:8px 10px;background:#fafafa;border-bottom:1px solid #e5e7eb;font-weight:600}
    .table{width:100%;border-collapse:collapse}
    .table th,.table td{border:1px solid #e5e7eb;padding:6px}
    .day{font-weight:700}
    .cell{display:flex;flex-direction:column}
    .subj.break{font-weight:700;color:#1f2937}
    td:has(.subj.break){background:#f9fafb}
    @media print{ .panel{display:none} .tt{page-break-inside:avoid} }
  `]
})
export class TimetablePageComponent {
  private http = inject(HttpClient);
  private classesSvc = inject(ClassesService);

  classes = signal<ClassEntity[]>([]);
  teachers = signal<Teacher[]>([]);
  subjects = signal<Subject[]>([]);
  assigns = signal<Assignment[]>([]);

  teacherName = '';
  subjectName = '';

  days = 5;
  periodsPerDay = 8;
  minutesPerPeriod = 40;

  err = signal<string | null>(null);
  ok = signal<string | null>(null);

  // timetable slots by classId -> day -> period
  classSlots: Record<string, Record<number, Record<number, Slot>>> = {};

  constructor(){
    this.loadClasses();
  }

  loadClasses(){ this.classesSvc.list().subscribe({ next: rows => this.classes.set(rows), error: () => this.classes.set([]) }); }
  loadTeachers(){ this.http.get<any[]>(`/api/teachers`).subscribe({ next: rows => this.teachers.set((rows||[]).map(r=>({ id: r.id, name: `${r.firstName||''} ${r.lastName||''}`.trim()||r.name||r.id }))), error: () => {} }); }
  loadSubjects(){ this.http.get<any[]>(`/api/subjects`).subscribe({ next: rows => this.subjects.set((rows||[]).map(r=>({ id: r.id, name: r.name||r.code||r.id }))), error: () => {} }); }

  addTeacher(){ const id = crypto.randomUUID(); this.teachers.set([...this.teachers(), { id, name: this.teacherName.trim() }]); this.teacherName = ''; }
  addSubject(){ const id = crypto.randomUUID(); this.subjects.set([...this.subjects(), { id, name: this.subjectName.trim() }]); this.subjectName = ''; }
  addAssign(){ const id = crypto.randomUUID(); this.assigns.set([...this.assigns(), { id, classId: '', subjectId: '', teacherId: '', periods: 1 }]); }
  removeAssign(i: number){ const list = [...this.assigns()]; list.splice(i,1); this.assigns.set(list); }

  rebuildGrid(){ this.classSlots = {}; }
  hasGrid(){ return Object.keys(this.classSlots).length > 0; }
  daysArr(){ return Array.from({length:this.days}, (_,i)=>i); }
  periods(){ return Array.from({length:this.periodsPerDay}, (_,i)=>i+1); }
  dayLabel(i: number){ return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i] || `Day ${i+1}`; }
  subjectNameBy(id?: string){ return this.subjects().find(s=>s.id===id)?.name || ''; }
  teacherNameBy(id?: string){ return this.teachers().find(t=>t.id===id)?.name || ''; }

  generate(){
    this.err.set(null); this.ok.set(null);
    if (!this.classes().length) { this.err.set('Load classes first'); return; }
    if (this.days < 1 || this.periodsPerDay < 1) { this.err.set('Configure valid days and periods per day'); return; }
    // initialize grids per class
    this.classSlots = {};
    const cls = this.classes();
    const days = this.days; const perDay = this.periodsPerDay;
    // compute default break periods (Breakfast, Lunch)
    const b1 = Math.max(1, Math.min(perDay, Math.ceil(perDay/3))); // early break
    const b2 = Math.max(1, Math.min(perDay, Math.ceil(2*perDay/3))); // later break
    for (const c of cls) {
      this.classSlots[c.id] = {};
      for (let d=0; d<days; d++){ 
        this.classSlots[c.id][d] = {}; 
        // insert two breaks
        this.classSlots[c.id][d][b1] = { day: d, period: b1, classId: c.id, breakLabel: 'Breakfast Break' };
        if (b2 !== b1) this.classSlots[c.id][d][b2] = { day: d, period: b2, classId: c.id, breakLabel: 'Lunch Break' };
      }
    }
    // maps to check conflicts: teacherId -> day -> period occupied; class -> day -> period occupied
    const teachOcc: Record<string, Record<number, Set<number>>> = {};
    const classOcc: Record<string, Record<number, Set<number>>> = {};

    const list = this.assigns().filter(a=>a.classId && a.subjectId && a.teacherId && a.periods>0);
    // validate teacher/class/subject existence (teacher must be a known teacher, subject known, class known)
    for (const a of list){
      const tOk = !!this.teachers().find(t=>t.id===a.teacherId);
      const cOk = !!this.classes().find(c=>c.id===a.classId);
      const sOk = !!this.subjects().find(s=>s.id===a.subjectId);
      if (!tOk || !cOk || !sOk){
        this.err.set(!tOk ? 'Invalid assignment: teacher not found for selected class' : !sOk ? 'Invalid assignment: subject not found' : 'Invalid assignment: class not found');
        return;
      }
    }
    if (!list.length) { this.err.set('Add at least one assignment (class + subject + teacher + periods)'); return; }
    // naive round-robin placement
    for (const a of list){
      for (let k=0; k<a.periods; k++){
        let placed = false;
        for (let d=0; d<days && !placed; d++){
          for (let p=1; p<=perDay && !placed; p++){
            // check occupancy
            const occC = (classOcc[a.classId] ||= {}); const occCd = (occC[d] ||= new Set<number>());
            const occT = (teachOcc[a.teacherId] ||= {}); const occTd = (occT[d] ||= new Set<number>());
            // skip break periods
            if (p === b1 || p === b2) continue;
            const already = occCd.has(p) || occTd.has(p) || this.classSlots[a.classId]?.[d]?.[p];
            if (already) continue;
            // place
            (this.classSlots[a.classId][d] ||= {})[p] = { day: d, period: p, classId: a.classId, subjectId: a.subjectId, teacherId: a.teacherId };
            occCd.add(p); occTd.add(p);
            placed = true;
          }
        }
        if (!placed){ this.err.set('Could not place all lessons. Increase periods/day or reduce conflicts.'); return; }
      }
    }
    this.ok.set('Timetable generated. Review the preview below, then export.');
  }

  exportPdf(){
    // simple printable view
    const w = window.open('', '_blank'); if (!w) return;
    const css = `
      <style>
        body{font-family:Arial, sans-serif;}
        h2{margin:0 0 10px}
        .tt{border:1px solid #ddd;border-radius:8px;overflow:hidden;margin:8px 0}
        .tt-title{padding:8px 10px;background:#fafafa;border-bottom:1px solid #eee;font-weight:700}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #ddd;padding:6px}
        .day{font-weight:700}
        .break{font-weight:700;color:#111827;background:#f3f4f6}
        @media print{ .pagebreak{ page-break-before: always; } }
      </style>`;
    const parts: string[] = [];
    for (const c of this.classes()){
      const rows: string[] = [];
      rows.push('<tr><th>Day/Period</th>' + this.periods().map(p=>`<th>P${p}</th>`).join('') + '</tr>');
      for (let d=0; d<this.days; d++){
        const cells: string[] = [];
        for (let p=1; p<=this.periodsPerDay; p++){
          const sl = this.classSlots[c.id]?.[d]?.[p];
          if (sl?.breakLabel){
            cells.push(`<td class=\"break\">${sl.breakLabel}</td>`);
          } else {
            const subj = this.subjectNameBy(sl?.subjectId) || '-';
            const tch = this.teacherNameBy(sl?.teacherId) || '';
            cells.push(`<td><div>${subj}</div><div style=\"color:#666;font-size:12px\">${tch}</div></td>`);
          }
        }
        rows.push(`<tr><td class=\"day\">${this.dayLabel(d)}</td>${cells.join('')}</tr>`);
      }
      parts.push(`<div class=\"tt\"><div class=\"tt-title\">${c.name}</div><table>${rows.join('')}</table></div>`);
    }
    w.document.write(`<html><head><title>Timetable</title>${css}</head><body><h2>School Timetable</h2>${parts.join('<div class=\"pagebreak\"></div>')}<script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  }
}
