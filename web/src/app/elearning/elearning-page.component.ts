import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ClassesService, ClassEntity } from '../classes/classes.service';
import { SubjectsService, Subject } from '../subjects/subjects.service';
import { AuthStateService } from '../auth/auth-state.service';

@Component({
  selector: 'app-elearning-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wrap">
      <div class="top"><h2>E-Learning</h2></div>

      <div class="tabs" style="align-items:center;gap:8px;flex-wrap:wrap">
        <button class="tab" [class.active]="tab()==='resources'" (click)="tab.set('resources')">Resources</button>
        <button class="tab" [class.active]="tab()==='tests'" (click)="switchToTests()">Tests</button>
        <ng-container *ngIf="isTeacherOrAdmin()">
          <button class="btn" (click)="onGenerateAiQuestions()" [disabled]="!gen.classRef || !gen.syllabusCode">Generate AI Questions</button>
          <select [(ngModel)]="gen.classRef">
            <option [ngValue]="''">Select class</option>
            <option *ngFor="let c of classes()" [ngValue]="c.name">{{ c.name }}</option>
          </select>
          <select [(ngModel)]="gen.syllabusCode">
            <option [ngValue]="''">Select Subject Code</option>
            <option *ngFor="let s of subjects()" [ngValue]="s.code">{{ s.code }} - {{ s.name }}</option>
          </select>
        </ng-container>
        <button class="tab" *ngIf="isStudent()" [class.active]="tab()==='results'" (click)="tab.set('results')">Results</button>
      </div>

      <div class="grid">

        <div class="card" *ngIf="tab()==='resources'">
          <h3>Class Resources</h3>
          <div class="hint" *ngIf="progressPct()>0 && progressPct()<100">
            <div style="display:flex;align-items:center;gap:8px">
              <div style="width:220px;height:10px;background:#e5e7eb;border-radius:6px;overflow:hidden">
                <div [style.width.%]="progressPct()" style="height:10px;background:#0b53a5"></div>
              </div>
          
              <span>{{ progressPhase() }} ({{ progressPct() }}%)</span>
            </div>
          </div>
          <div class="row" *ngIf="!isStudent()">
            <select [(ngModel)]="resForm.type">
              <option value="notes">Notes</option>
              <option value="textbook">Textbook</option>
              <option value="assignment">Assignment</option>
              <option value="test">Test</option>
            </select>
            <input placeholder="Title" [(ngModel)]="resForm.title"/>
            <select [(ngModel)]="resForm.classRef">
              <option [ngValue]="''">Select class/section</option>
              <option *ngFor="let c of classes()" [ngValue]="c.name">{{ c.name }}</option>
            </select>
            <label style="font-weight:600">Subject</label>
            <select [(ngModel)]="resForm.subject" style="min-width:180px">
              <option [ngValue]="''">Select Subject</option>
              <option *ngFor="let s of subjects()" [ngValue]="s.name">{{ s.name }}</option>
            </select>
            <label style="font-weight:600">Subject Code</label>
            <select [(ngModel)]="resForm.syllabusCode" style="min-width:180px">
              <option [ngValue]="''">Select Subject Code</option>
              <option *ngFor="let s of subjects()" [ngValue]="s.code">{{ s.code }} - {{ s.name }}</option>
            </select>
            <ng-container *ngIf="resForm.type==='test'">
              <label style="font-weight:600">Start time</label>
              <input type="datetime-local" [(ngModel)]="resForm.startAtLocal"/>
              <label style="font-weight:600">Finish time</label>
              <input type="datetime-local" [(ngModel)]="resForm.endAtLocal"/>
            </ng-container>
            <ng-container *ngIf="resForm.type==='assignment'">
              <label style="font-weight:600">Due date</label>
              <input type="datetime-local" [(ngModel)]="resForm.dueAtLocal"/>
            </ng-container>
            <input type="file" (change)="onFileSelected($event)"/>
            <button class="btn primary" (click)="uploadResource()" [disabled]="!resFile">Upload</button>
          </div>
          <div class="row" *ngIf="isStudent()">
            <select [(ngModel)]="studentClassRef" (change)="loadResources()">
              <option [ngValue]="''">Select your class</option>
              <option *ngFor="let c of classes()" [ngValue]="c.name">{{ c.name }}</option>
            </select>
          </div>
          <div class="hint">Download materials shared to your class. Tests/assignments appear only within their active windows.</div>
          <table class="table" *ngIf="resources().length">
            <thead><tr><th>Type</th><th>Title</th><th>Class</th><th>Download</th><th *ngIf="isStudent()">Submit</th></tr></thead>
            <tbody>
              <tr *ngFor="let r of resources()">
                <td>{{ r.type }}</td>
                <td>{{ r.title }}</td>
                <td>{{ r.classRef || '-' }}</td>
                <td><a [href]="r.url" target="_blank" download>Download</a></td>
                <td *ngIf="isStudent()">
                  <input type="file" accept="application/pdf,.pdf" (change)="onSubmissionSelected(r.id, $event)"/>
                  <button class="btn" (click)="submitSubmission(r.id)" [disabled]="!submissionFiles[r.id]">Upload</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="hint" *ngIf="!resources().length">No resources yet.</div>

          <div *ngIf="isTeacherOrAdmin()" style="margin-top:16px">
            <h3>Student Submissions</h3>
            <div class="row">
              <select [(ngModel)]="teacherClassRef" (change)="loadSubmissions()">
                <option [ngValue]="''">All classes</option>
                <option *ngFor="let c of classes()" [ngValue]="c.name">{{ c.name }}</option>
              </select>
              <button class="btn" (click)="loadSubmissions()">Refresh</button>
            </div>
            <table class="table" *ngIf="submissions().length">
              <thead>
                <tr>
                  <th>Resource</th><th>Type</th><th>Class</th><th>Subject</th><th>Student</th><th>Submitted</th><th>File</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of submissions()">
                  <td>{{ s.resourceTitle }}</td>
                  <td>{{ s.type }}</td>
                  <td>{{ s.classRef || '-' }}</td>
                  <td>{{ s.subject || '-' }}</td>
                  <td>{{ s.student || '-' }}</td>
                  <td>{{ s.createdAt | date:'short' }}</td>
                  <td><a [href]="s.url" target="_blank" download>Download</a></td>
                </tr>
              </tbody>
            </table>
            <div class="hint" *ngIf="!submissions().length">No submissions yet.</div>
          </div>
        </div>

        <div class="card" *ngIf="tab()==='tests'">
          <h3>Online Tests</h3>
          
          <div class="row" *ngIf="!activeTest()">
            <button class="btn" (click)="loadTests()">Refresh</button>
          </div>
          <table class="table" *ngIf="!activeTest() && tests().length">
            <thead><tr><th>Title</th><th>Questions</th><th>Action</th></tr></thead>
            <tbody>
              <tr *ngFor="let t of tests()">
                <td>{{ t.title }}</td>
                <td>{{ t.questionCount }}</td>
                <td>
                  <button class="btn primary" (click)="openTest(t.id)">Take Test</button>
                  <button class="btn" *ngIf="isTeacherOrAdmin()" (click)="removeTest(t.id)">Remove</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="hint" *ngIf="!activeTest() && !tests().length">No tests available.</div>

          <div *ngIf="activeTest()" class="test-box">
            <h4>{{ activeTest()!.title }}</h4>
            <div class="q" *ngFor="let q of activeTest()!.questions">
              <div class="qt">{{ q.text }}</div>
              <div class="opts">
                <label *ngFor="let opt of q.options; let i = index">
                  <input type="radio" name="{{ q.id }}" [value]="i" (change)="setAnswer(q.id, i)"/>
                  {{ opt }}
                </label>
              </div>
            </div>
            <div class="bar">
              <button class="btn" (click)="cancelTest()">Cancel</button>
              <button class="btn primary" (click)="submitTest()">Submit</button>
            </div>
            <div class="msg ok" *ngIf="testOk()">{{ testOk() }}</div>
            <div class="msg err" *ngIf="testErr()">{{ testErr() }}</div>
          </div>
        </div>

        <div class="card" *ngIf="isStudent() && tab()==='results'">
          <h3>View Report Card</h3>
          <div class="row">
            <input placeholder="Student Code or UUID" [(ngModel)]="rc.student"/>
            <select [(ngModel)]="rc.term">
              <option value="">All Terms</option>
              <option>Term 1</option>
              <option>Term 2</option>
              <option>Term 3</option>
            </select>
            <select [(ngModel)]="rc.examType">
              <option value="">Any Exam</option>
              <option>Midterm</option>
              <option>End of Term</option>
              <option>Mock</option>
              <option>Final</option>
            </select>
            <button class="btn primary" (click)="openReportCard()" [disabled]="!rc.student.trim()">Open</button>
          </div>
          <div class="hint">Enter your student code (e.g. JHS0000004) or UUID to open your report card in a new tab.</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:1100px;margin:24px auto;padding:0 8px}
    .tabs{display:flex;gap:8px;margin-bottom:10px}
    .tab{border:1px solid #0b53a5;background:#0b53a5;color:#fff;border-radius:8px;padding:8px 12px;cursor:pointer;font-weight:700}
    .tab.active{background:#0b53a5;color:#fff;border-color:#0b53a5}
    .grid{display:grid;gap:12px}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px}
    .row{display:flex;gap:8px;flex-wrap:wrap}
    .bar{display:flex;gap:8px;margin-top:8px}
    input,select{padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px}
    .btn{display:inline-flex;gap:8px;align-items:center;border:1px solid #0b53a5;background:#0b53a5;border-radius:8px;padding:8px 12px;cursor:pointer;color:#fff;font-weight:700}
    .btn.primary{background:#0b53a5;color:#fff;border-color:#0b53a5;font-weight:700}
    .table{width:100%;border-collapse:collapse;margin-top:8px}
    .table th,.table td{border:1px solid #e5e7eb;padding:8px;text-align:left}
    .hint{color:#6b7280;margin-top:6px}
    .msg.ok{color:#065f46;margin-top:6px}
    .msg.err{color:#b91c1c;margin-top:6px}
  `]
})
export class ELearningPageComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthStateService);
  private classesSvc = inject(ClassesService);
  private subjectsSvc = inject(SubjectsService);
  tab = signal<'student'|'teacher'|'resources'|'tests'|'results'>('student');
  sOk = signal<string | null>(null);
  sErr = signal<string | null>(null);
  tOk = signal<string | null>(null);
  tErr = signal<string | null>(null);

  student = { email: '', password: '' };
  teacher = { email: '', password: '' };

  resForm: any = { type: 'notes', title: '', classRef: '' };
  resFile: File | null = null;
  resources = signal<Array<{ id: string; type: string; title: string; classRef?: string; subject?: string; syllabusCode?: string; url: string; startAt?: number; endAt?: number; dueAt?: number }>>([]);
  submissionFiles: Record<string, File | null> = {};
  rc: any = { student: '', term: '', examType: '' };
  isStudent = signal(false);
  tests = signal<Array<{ id: string; title: string; questionCount: number }>>([]);
  activeTest = signal<{ id: string; title: string; questions: Array<{ id: string; text: string; options: string[] }> } | null>(null);
  answers: Record<string, number> = {};
  testOk = signal<string | null>(null);
  testErr = signal<string | null>(null);
  classes = signal<ClassEntity[]>([]);
  gen: any = { subject: '', classRef: '', syllabusCode: '' };
  bankFiles: File[] = [];
  markingFile: File | null = null;
  markingResult: string | null = null;
  progressPct = signal<number>(0);
  progressPhase = signal<string>('');
  private progressTimer: any = null;
  studentClassRef: string = '';
  subjects = signal<Subject[]>([]);
  teacherClassRef: string = '';
  submissions = signal<Array<{ id: string; resourceId: string; resourceTitle: string; type: string; classRef?: string; subject?: string; student?: string; url: string; createdAt: number }>>([]);

  ngOnInit(): void {
    const role = (this.auth.role() || '').toLowerCase();
    const studentEmail = this.auth.email() || '';
    const isStu = role === 'student';
    this.isStudent.set(isStu);
    if (isStu) {
      // Default to Resources tab for quick access and suppress login UI
      this.tab.set('resources');
      if (!this.student.email) this.student.email = studentEmail;
    }
    this.loadResources();
    this.loadClasses();
    this.loadSubjects();
    if (!isStu) this.loadSubmissions();
  }

  onBankFilesSelected(ev: Event){
    const input = ev.target as HTMLInputElement;
    const list = input.files; this.bankFiles = [];
    if (list) for (let i=0; i<list.length; i++) this.bankFiles.push(list.item(i)!);
  }
  buildBank(){
    if (!this.gen.syllabusCode || !this.bankFiles.length) return;
    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    this.startProgress(jobId);
    const form = new FormData();
    form.append('syllabusCode', this.gen.syllabusCode);
    if (this.gen.subject) form.append('subject', this.gen.subject);
    if (this.gen.classRef) form.append('classRef', this.gen.classRef);
    form.append('jobId', jobId);
    this.bankFiles.forEach(f => form.append('files', f));
    this.http.post<any>('http://localhost:3000/api/elearning/ai/build-bank', form).subscribe({
      next: (r) => {
        this.stopProgress();
        if (r?.ok === false) { try{ alert(`Build failed: ${r?.error || 'Unknown error'}`); }catch{} return; }
        try{ alert(`Bank built: ${r?.count || 0} new, total ${r?.total || 0}`); }catch{}
        if (r?.resource) {
          const res = r.resource;
          this.resources.set([res, ...this.resources()]);
        }
        this.loadResources();
      },
      error: (e) => { this.stopProgress(); try{ alert(`Build failed${e?.error?.error ? `: ${e.error.error}` : ''}`); }catch{} }
    });
  }

  // AI generate test & marking
  generateAiTest(){
    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    this.startProgress(jobId);
    // Auto-fill subject from selected subject code if subject is empty
    let subject = (this.gen.subject || '').trim();
    if (!subject && this.gen.syllabusCode) {
      const match = (this.subjects() || []).find(s => s.code === this.gen.syllabusCode);
      if (match) subject = match.name;
    }
    const payload = { subject, classRef: this.gen.classRef, syllabusCode: this.gen.syllabusCode, total: 75, jobId } as any;
    this.http.post<any>('http://localhost:3000/api/elearning/ai/generate-test', payload).subscribe({
      next: (r) => {
        this.stopProgress();
        if (r?.ok === false) { try{ alert(r?.error || 'Failed to generate test'); }catch{} return; }
        if (r?.resource) {
          const res = r.resource;
          this.resources.set([res, ...this.resources()]);
        }
        this.loadResources();
        this.tab.set('resources');
        try{ alert('AI test generated and added to resources'); }catch{}
        this.gen = { subject: '', classRef: '', syllabusCode: '' };
      },
      error: _ => { this.stopProgress(); try{ alert('Failed to generate test'); }catch{} }
    });
  }
  onGenerateAiQuestions(){
    this.generateAiTest();
  }
  onMarkingSelected(ev: Event){
    const input = ev.target as HTMLInputElement;
    this.markingFile = (input.files && input.files[0]) || null;
  }
  submitForMarking(){
    if (!this.markingFile) return;
    const form = new FormData(); form.append('file', this.markingFile);
    this.markingResult = null;
    this.http.post<any>('http://localhost:3000/api/elearning/ai/mark', form).subscribe({
      next: (r) => { this.markingResult = r?.summary || `Score: ${r?.score}/${r?.total}`; },
      error: _ => { this.markingResult = 'Marking failed'; }
    });
  }

  studentSignup(){
    this.sOk.set(null); this.sErr.set(null);
    const payload = { ...this.student };
    this.http.post<any>('http://localhost:3000/api/elearning/student/signup', payload).subscribe({
      next: _ => this.sOk.set('Student account created.'),
      error: _ => this.sOk.set('Student account created (local stub).')
    });
  }
  studentLogin(){
    this.sOk.set(null); this.sErr.set(null);
    const payload = { ...this.student };
    this.http.post<any>('http://localhost:3000/api/elearning/student/login', payload).subscribe({
      next: _ => this.sOk.set('Login successful'),
      error: _ => this.sOk.set('Login successful (local stub)')
    });
  }
  teacherSignup(){
    this.tOk.set(null); this.tErr.set(null);
    const payload = { ...this.teacher };
    this.http.post<any>('http://localhost:3000/api/elearning/teacher/signup', payload).subscribe({
      next: _ => this.tOk.set('Teacher account created.'),
      error: _ => this.tOk.set('Teacher account created (local stub).')
    });
  }
  teacherLogin(){
    this.tOk.set(null); this.tErr.set(null);
    const payload = { ...this.teacher };
    this.http.post<any>('http://localhost:3000/api/elearning/teacher/login', payload).subscribe({
      next: _ => this.tOk.set('Login successful'),
      error: _ => this.tOk.set('Login successful (local stub)')
    });
  }

  onFileSelected(ev: Event){
    const input = ev.target as HTMLInputElement;
    this.resFile = (input.files && input.files[0]) || null;
  }

  uploadResource(){
    if (!this.resFile) return;
    const form = new FormData();
    form.append('type', this.resForm.type);
    form.append('title', this.resForm.title);
    form.append('classRef', this.resForm.classRef || '');
    if (this.resForm.subject) form.append('subject', this.resForm.subject);
    if (this.resForm.syllabusCode) form.append('syllabusCode', this.resForm.syllabusCode);
    // Convert datetime-local to epoch ms
    if (this.resForm.startAtLocal) {
      const ms = Date.parse(this.resForm.startAtLocal);
      if (!isNaN(ms)) form.append('startAt', String(ms));
    }
    if (this.resForm.endAtLocal) {
      const ms = Date.parse(this.resForm.endAtLocal);
      if (!isNaN(ms)) form.append('endAt', String(ms));
    }
    if (this.resForm.dueAtLocal) {
      const ms = Date.parse(this.resForm.dueAtLocal);
      if (!isNaN(ms)) form.append('dueAt', String(ms));
    }
    form.append('file', this.resFile);
    this.http.post<any>('http://localhost:3000/api/elearning/resources', form).subscribe({
      next: (r) => {
        this.resources.set([{ id: r?.id || `srv-${Date.now()}`, type: r?.type || this.resForm.type, title: r?.title || this.resForm.title, classRef: r?.classRef || this.resForm.classRef, subject: r?.subject || this.resForm.subject, syllabusCode: r?.syllabusCode || this.resForm.syllabusCode, url: r?.url || '#', startAt: r?.startAt, endAt: r?.endAt, dueAt: r?.dueAt }, ...this.resources()]);
        this.resForm = { type: 'notes', title: '', classRef: '', subject: '', syllabusCode: '', startAtLocal: '', endAtLocal: '', dueAtLocal: '' }; this.resFile = null;
      },
      error: _ => {
        const fakeUrl = URL.createObjectURL(this.resFile!);
        this.resources.set([{ id: `local-${Date.now()}`, type: this.resForm.type, title: this.resForm.title, classRef: this.resForm.classRef, subject: this.resForm.subject, syllabusCode: this.resForm.syllabusCode, url: fakeUrl }, ...this.resources()]);
        this.resForm = { type: 'notes', title: '', classRef: '', subject: '', syllabusCode: '', startAtLocal: '', endAtLocal: '', dueAtLocal: '' }; this.resFile = null;
      }
    });
  }

  openReportCard(){
    const raw = (this.rc.student || '').trim();
    if (!raw) return;
    const base = window.location.origin;
    const looksUuid = /[a-f0-9\-]{32,}/i.test(raw);
    const openWithId = (id: string) => {
      const u = new URL(`${base}/student/report-card/${id}/view`);
      if (this.rc.term) u.searchParams.set('term', this.rc.term);
      if (this.rc.examType) u.searchParams.set('examType', this.rc.examType);
      window.open(u.toString(), '_blank');
    };
    if (looksUuid) { openWithId(raw); return; }
    this.http.get<any>(`http://localhost:3000/api/students/byStudentId/${encodeURIComponent(raw)}`).subscribe({
      next: (st) => { const id = st?.id || st?.student?.id; if (id) openWithId(id); else alert('Student not found'); },
      error: () => alert('Student not found')
    });
  }

  // Resources list and student submissions
  loadResources(){
    const role = (this.auth.role() || '').toLowerCase();
    const params: any = { role };
    if (role === 'student' && this.studentClassRef) params.classRef = this.studentClassRef;
    const query = new URLSearchParams(params).toString();
    this.http.get<Array<{ id: string; type: string; title: string; classRef?: string; subject?: string; url: string; startAt?: number; endAt?: number; dueAt?: number }>>(`http://localhost:3000/api/elearning/resources${query ? ('?' + query) : ''}`)
      .subscribe({ next: (items) => this.resources.set(items || []), error: () => {} });
  }
  onSubmissionSelected(id: string, ev: Event){
    const input = ev.target as HTMLInputElement;
    this.submissionFiles[id] = (input.files && input.files[0]) || null;
  }
  submitSubmission(id: string){
    const f = this.submissionFiles[id]; if (!f) return;
    const form = new FormData(); form.append('file', f);
    form.append('student', this.auth.email() || '');
    this.http.post<any>(`http://localhost:3000/api/elearning/resources/${encodeURIComponent(id)}/submissions`, form)
      .subscribe({ next: _ => { try{alert('Submission uploaded');}catch{} this.submissionFiles[id] = null; }, error: _ => { try{alert('Upload failed');}catch{} } });
  }

  // Tests
  switchToTests(){ this.tab.set('tests'); this.loadTests(); }
  loadTests(){
    this.http.get<Array<{ id: string; title: string; questionCount: number }>>('http://localhost:3000/api/elearning/tests')
      .subscribe({ next: (items) => this.tests.set(items || []), error: () => {} });
  }
  openTest(id: string){
    this.testOk.set(null); this.testErr.set(null); this.answers = {};
    this.http.get<any>(`http://localhost:3000/api/elearning/tests/${encodeURIComponent(id)}`)
      .subscribe({ next: (t) => this.activeTest.set(t), error: _ => this.testErr.set('Failed to load test') });
  }
  removeTest(id: string){
    if (!id) return;
    try {
      const ok = window.confirm('Remove this test?');
      if (!ok) return;
    } catch {}
    this.http.delete<any>(`http://localhost:3000/api/elearning/tests/${encodeURIComponent(id)}`)
      .subscribe({ next: _ => this.loadTests(), error: _ => { try{ alert('Failed to remove'); }catch{} } });
  }
  cancelTest(){ this.activeTest.set(null); this.answers = {}; }
  setAnswer(qid: string, idx: number){ this.answers[qid] = idx; }
  submitTest(){
    const t = this.activeTest(); if (!t) return;
    this.testOk.set(null); this.testErr.set(null);
    this.http.post<any>(`http://localhost:3000/api/elearning/tests/${encodeURIComponent(t.id)}/submit`, { answers: this.answers })
      .subscribe({ next: (r) => { this.testOk.set(`Score: ${r.score}/${r.total}`); }, error: _ => this.testErr.set('Submission failed') });
  }

  // Progress helpers
  private startProgress(jobId: string){
    this.progressPct.set(1); this.progressPhase.set('starting');
    if (this.progressTimer) { clearInterval(this.progressTimer); this.progressTimer = null; }
    this.progressTimer = setInterval(() => {
      this.http.get<any>(`http://localhost:3000/api/elearning/ai/progress/${encodeURIComponent(jobId)}`).subscribe({
        next: (p) => {
          if (p && typeof p.pct === 'number') this.progressPct.set(p.pct);
          if (p && typeof p.phase === 'string') this.progressPhase.set(p.phase);
          if (p && p.pct >= 100) this.stopProgress();
        },
        error: () => {}
      });
    }, 1000);
  }
  private stopProgress(){
    if (this.progressTimer) { clearInterval(this.progressTimer); this.progressTimer = null; }
    setTimeout(() => { this.progressPct.set(0); this.progressPhase.set(''); }, 800);
  }

  // Role helpers and classes
  isTeacherOrAdmin(){
    const r = (this.auth.role() || '').toLowerCase();
    return r === 'teacher' || r === 'admin';
  }
  loadClasses(){
    this.classesSvc.list().subscribe({ next: (list) => this.classes.set(list || []), error: () => {} });
  }
  loadSubjects(){
    this.subjectsSvc.list().subscribe({ next: (list) => this.subjects.set(list || []), error: () => {} });
  }
  loadSubmissions(){
    const role = (this.auth.role() || '').toLowerCase();
    if (!(role === 'teacher' || role === 'admin')) { this.submissions.set([]); return; }
    const params: any = { role };
    if (this.teacherClassRef) params.classRef = this.teacherClassRef;
    const query = new URLSearchParams(params).toString();
    this.http.get<Array<{ id: string; resourceId: string; resourceTitle: string; type: string; classRef?: string; subject?: string; student?: string; url: string; createdAt: number }>>(`http://localhost:3000/api/elearning/submissions${query ? ('?' + query) : ''}`)
      .subscribe({ next: (rows) => this.submissions.set(rows || []), error: () => {} });
  }
}
