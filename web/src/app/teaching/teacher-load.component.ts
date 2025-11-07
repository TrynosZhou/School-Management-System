import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeachersService, type Teacher } from '../teachers/teachers.service';
import { ClassesService, type ClassEntity } from '../classes/classes.service';
import { TeachingService, type TeachingAssignment } from './teaching.service';
import { SubjectsService, type Subject } from '../subjects/subjects.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-teacher-load',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wrap">
      <div class="top"><h2>Teaching Load</h2></div>

      <div class="row">
        <label>Select teacher</label>
        <select [(ngModel)]="selectedTeacherId" (change)="onTeacherChange()">
          <option value="">-- select --</option>
          <option *ngFor="let t of teachers()" [value]="t.id">{{ t.firstName }} {{ t.lastName }} ({{ t.email }})</option>
        </select>
      </div>

      <div *ngIf="selectedTeacherId" class="card">
        <div class="row head">
          <div class="hint">Tick classes taught by this teacher. Un-tick to unassign.</div>
          <div class="err" *ngIf="err()">{{ err() }}</div>
          <div class="ok" *ngIf="ok()">Saved</div>
        </div>
        <div class="class-list">
          <div class="row" *ngFor="let c of classes()">
            <label class="chk">
              <input type="checkbox" [checked]="assignedSet().has(c.id)" (change)="toggleClass(c, $event)" [disabled]="busy()"/>
              {{ c.name }} <span class="small">({{ c.academicYear }})</span>
            </label>
            <div class="subjects" [class.disabled]="busy()">
              <label *ngFor="let s of subjects()" class="subj">
                <input type="checkbox"
                  [disabled]="busy()"
                  [checked]="isSubjectSelected(c.id, s.id)"
                  (change)="onSubjectToggle(c, s.id, $any($event.target).checked)" />
                <span>{{ s.code }}</span>
              </label>
            </div>
          </div>
        </div>
        <div class="footer">
          <span class="total">Total Lessons: <strong>{{ totalLessons() }}</strong></span>
          <span class="total" style="margin-left:16px">Total Teaching Periods: <strong>{{ totalPeriods() }}</strong></span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:900px;margin:24px auto;padding:0 8px}
    .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .row{display:grid;gap:6px;margin-bottom:10px}
    select{padding:8px;border:1px solid #e5e7eb;border-radius:8px}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px}
    .class-list{display:grid;grid-template-columns:1fr;gap:8px}
    .class-list .row{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:flex-start}
    .class-list .chk{display:flex;gap:8px;align-items:center}
    .class-list .subjects{display:flex;flex-wrap:wrap;gap:10px}
    .class-list .subjects.disabled{opacity:0.6;pointer-events:none}
    .class-list .subjects .subj{display:flex;gap:6px;align-items:center;padding:4px 8px;border:1px solid #e5e7eb;border-radius:6px}
    .footer{display:flex;justify-content:flex-end;margin-top:10px}
    .total{font-size:14px;color:#111827}
    .small{font-size:12px;color:#6b7280}
    .hint{color:#6b7280}
    .err{color:#b91c1c}
    .ok{color:#065f46}
  `]
})
export class TeacherLoadComponent {
  private teachersSvc = inject(TeachersService);
  private classesSvc = inject(ClassesService);
  private teachingSvc = inject(TeachingService);
  private subjectsSvc = inject(SubjectsService);
  private route = inject(ActivatedRoute);

  teachers = signal<Teacher[]>([]);
  classes = signal<ClassEntity[]>([]);
  assignedSet = signal<Set<string>>(new Set());
  assignments = signal<TeachingAssignment[]>([]);
  subjects = signal<Subject[]>([]);
  subjectSel: Record<string, Set<string>> = {};
  selectedTeacherId: string = '';
  busy = signal(false);
  err = signal<string | null>(null);
  ok = signal(false);

  constructor(){
    this.teachersSvc.list().subscribe({ next: res => this.teachers.set(res || []) });
    this.classesSvc.list().subscribe({ next: res => this.classes.set(res || []) });
    this.subjectsSvc.list().subscribe({ next: res => this.subjects.set(res || []) });
    // Preselect teacher from query param (teacherId)
    this.route.queryParamMap.subscribe(pm => {
      const tid = (pm.get('teacherId') || '').trim();
      if (tid && tid !== this.selectedTeacherId) {
        this.selectedTeacherId = tid; this.onTeacherChange();
      }
    });
  }

  onTeacherChange(){
    this.err.set(null); this.ok.set(false);
    this.assignedSet.set(new Set());
    const id = this.selectedTeacherId;
    if (!id) return;
    // fetch checked classes (for class toggles)
    this.teachingSvc.listClassesForTeacher(id).subscribe({
      next: (ids) => this.assignedSet.set(new Set(ids || [])),
      error: () => this.assignedSet.set(new Set()),
    });
    // fetch full assignments (for period totals)
    this.teachingSvc.listForTeacher(id).subscribe({
      next: (rows) => {
        this.assignments.set(rows || []);
        // Prefill subject selections per class (multi)
        this.subjectSel = {};
        (rows||[]).forEach(r => {
          const cid = r.klass?.id; const sid = r.subject?.id;
          if (cid && sid) {
            const set = this.subjectSel[cid] || new Set<string>();
            set.add(sid); this.subjectSel[cid] = set;
          }
        });
      },
      error: () => this.assignments.set([]),
    });
  }

  toggleClass(c: ClassEntity, ev: Event){
    const checked = (ev.target as HTMLInputElement).checked;
    const teacherId = this.selectedTeacherId;
    if (!teacherId) return;
    this.busy.set(true); this.err.set(null); this.ok.set(false);
    if (checked) {
      // Mark class as assigned; if there are already selected subjects, ensure they are assigned
      const toEnsure = Array.from(this.subjectSel[c.id] || []);
      const calls = toEnsure.length ? toEnsure : [];
      const done = () => { this.busy.set(false); this.ok.set(true); this.refreshAssignments(); };
      if (!calls.length) { this.busy.set(false); this.ok.set(true); return; }
      let remaining = calls.length; this.err.set(null);
      calls.forEach(sid => {
        this.teachingSvc.assign({ teacherId, classId: c.id, subjectId: sid, status: 'active' }).subscribe({
          next: _ => { if (--remaining === 0) done(); },
          error: e => { this.err.set(e?.error?.message || 'Failed to assign'); if (--remaining === 0) done(); }
        });
      });
    } else {
      this.teachingSvc.unassign({ teacherId, classId: c.id }).subscribe({
        next: (res) => {
          this.busy.set(false);
          if (!(res && res.success)) { this.err.set(res?.message || 'Failed to unassign'); return; }
          const s = new Set(this.assignedSet()); s.delete(c.id); this.assignedSet.set(s); this.ok.set(true);
          // clear selections for this class
          delete this.subjectSel[c.id];
          // refresh assignments for totals
          this.refreshAssignments();
        },
        error: (e) => { this.busy.set(false); this.err.set(e?.error?.message || 'Failed to unassign'); }
      });
    }
  }

  private refreshAssignments(){
    const id = this.selectedTeacherId;
    if (!id) return;
    this.teachingSvc.listForTeacher(id).subscribe({ next: rows => {
      this.assignments.set(rows || []);
      this.subjectSel = {};
      (rows||[]).forEach(r => {
        const cid = r.klass?.id; const sid = r.subject?.id;
        if (cid && sid) { const set = this.subjectSel[cid] || new Set<string>(); set.add(sid); this.subjectSel[cid] = set; }
      });
    }});
  }

  totalPeriods(){
    // Sum periods for assignments that have a subject; ignore ones without subject
    const byId = new Map(this.subjects().map(s => [s.id, Number(s.teachingPeriods||0)] as const));
    return this.assignments().reduce((sum, a) => sum + (a.subject?.id ? (byId.get(a.subject.id) || 0) : 0), 0);
  }

  totalLessons(){
    // Count of lessons equals number of assigned class-subject pairs
    return this.assignments().filter(a => !!a.subject?.id).length;
  }

  isSubjectSelected(classId: string, subjectId: string){
    const set = this.subjectSel[classId];
    return !!(set && set.has(subjectId));
  }

  onSubjectToggle(c: ClassEntity, subjectId: string, checked: boolean){
    const classId = c.id; const teacherId = this.selectedTeacherId; if (!teacherId) return;
    let set = this.subjectSel[classId] || new Set<string>();
    if (checked) set.add(subjectId); else set.delete(subjectId);
    this.subjectSel[classId] = set;
    this.busy.set(true); this.err.set(null); this.ok.set(false);
    if (checked) {
      // If class not yet assigned, treat this as initial assignment and mark class assigned
      const assignClassFirst = !this.assignedSet().has(classId);
      this.teachingSvc.assign({ teacherId, classId, subjectId, status: 'active' }).subscribe({
        next: (res) => {
          this.busy.set(false);
          if (!(res && res.success)) { this.err.set(res?.message || 'Failed to assign'); return; }
          if (assignClassFirst) {
            const s = new Set(this.assignedSet()); s.add(classId); this.assignedSet.set(s);
          }
          this.ok.set(true);
          this.refreshAssignments();
        },
        error: (e) => { this.busy.set(false); this.err.set(e?.error?.message || 'Failed to assign'); }
      });
    } else {
      this.teachingSvc.unassignOne({ teacherId, classId, subjectId }).subscribe({
        next: (res) => {
          if (!(res && res.success)) { this.busy.set(false); this.err.set(res?.message || 'Failed to unassign'); return; }
          // If no subjects remain for this class after unchecking, unassign the class
          const remaining = (this.subjectSel[classId] || new Set<string>()).size;
          if (remaining === 0) {
            this.teachingSvc.unassign({ teacherId, classId }).subscribe({
              next: (ur) => {
                const s = new Set(this.assignedSet()); s.delete(classId); this.assignedSet.set(s);
                this.busy.set(false); this.ok.set(true); this.refreshAssignments();
              },
              error: (e2) => { this.busy.set(false); this.err.set(e2?.error?.message || 'Failed to unassign class'); }
            });
          } else {
            this.busy.set(false); this.ok.set(true); this.refreshAssignments();
          }
        },
        error: (e) => { this.busy.set(false); this.err.set(e?.error?.message || 'Failed to unassign'); }
      });
    }
  }
}
