import { Component, inject, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthStateService } from '../auth/auth-state.service';
import { EntitlementsService } from '../auth/entitlements.service';
import { StudentsService, type Student } from '../students/students.service';
import { ClassesService, type ClassEntity } from '../classes/classes.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="joomla-layout">
      <div class="body" [class.collapsed]="sidebarCollapsed()">
        <aside class="sidemenu">
          <div class="side-top">
            <button class="collapse-btn" type="button" (click)="sidebarCollapsed.set(!sidebarCollapsed())" [title]="sidebarCollapsed() ? 'Expand' : 'Collapse'">{{ sidebarCollapsed() ? '»' : '«' }}</button>
          </div>
          <a class="menu-item" routerLink="/dashboard">
            <span class="ico">🏠</span>
            <span class="label">Home</span>
          </a>

          <div class="nav-group">
            <button class="nav-title" type="button" (click)="toggleGroup('registration')">
              <span class="ico">📝</span>
              <span class="label">Registration</span>
              <span class="caret" [class.open]="isOpen('registration')">▸</span>
            </button>
            <div class="nav-sub" *ngIf="isOpen('registration') && !sidebarCollapsed()">
              <a class="sub-item" routerLink="/students" *ngIf="has('students')"><span class="ico">🎓</span><span class="label">Students</span></a>
              <a class="sub-item" routerLink="/teachers" *ngIf="has('teachers')"><span class="ico">👩‍🏫</span><span class="label">Teachers</span></a>
              <a class="sub-item" routerLink="/view_id"><span class="ico">🆔</span><span class="label">Student IDs</span></a>
              <a class="sub-item" routerLink="/settings/promote-classes" *ngIf="isAdmin()"><span class="ico">⏫</span><span class="label">Promote Classes</span></a>
            </div>
          </div>

          <div class="nav-group">
            <button class="nav-title" type="button" (click)="toggleGroup('academics')">
              <span class="ico">📚</span>
              <span class="label">Academics</span>
              <span class="caret" [class.open]="isOpen('academics')">▸</span>
            </button>
            <div class="nav-sub" *ngIf="isOpen('academics') && !sidebarCollapsed()">
              <a class="sub-item" routerLink="/subjects" *ngIf="has('subjects')"><span class="ico">📘</span><span class="label">Subjects</span></a>
              <a class="sub-item" routerLink="/reports"><span class="ico">📈</span><span class="label">Reports</span></a>
              <a class="sub-item" routerLink="/classes" *ngIf="has('classes')"><span class="ico">🏫</span><span class="label">Class</span></a>
              <a class="sub-item" routerLink="/teaching-load"><span class="ico">📚</span><span class="label">Teaching Load</span></a>
              <a class="sub-item" routerLink="/e-learning"><span class="ico">🌐</span><span class="label">E-Learning</span></a>
              <a class="sub-item" routerLink="/timetable"><span class="ico">🗓️</span><span class="label">Timetable</span></a>
            </div>
          </div>

          <div class="nav-group">
            <button class="nav-title" type="button" (click)="toggleGroup('assessment')">
              <span class="ico">🧪</span>
              <span class="label">Attendance & Exams</span>
              <span class="caret" [class.open]="isOpen('assessment')">▸</span>
            </button>
            <div class="nav-sub" *ngIf="isOpen('assessment') && !sidebarCollapsed()">
              <a class="sub-item" routerLink="/attendance"><span class="ico">🗓️</span><span class="label">Attendance</span></a>
              <a class="sub-item" routerLink="/exams"><span class="ico">📝</span><span class="label">Exams</span></a>
              <a class="sub-item" routerLink="/marks/capture" *ngIf="has('marks')"><span class="ico">✍️</span><span class="label">Manage Marks</span></a>
              <a class="sub-item" routerLink="/reports"><span class="ico">📈</span><span class="label">Report Cards</span></a>
            </div>
          </div>

          <div class="nav-group">
            <button class="nav-title" type="button" (click)="toggleGroup('reports')">
              <span class="ico">📈</span>
              <span class="label">Reports</span>
              <span class="caret" [class.open]="isOpen('reports')">▸</span>
            </button>
            <div class="nav-sub" *ngIf="isOpen('reports') && !sidebarCollapsed()">
              <a class="sub-item" routerLink="/report_cards"><span class="ico">📄</span><span class="label">Report Cards</span></a>
              <a class="sub-item" routerLink="/reports/remarks-manager"><span class="ico">✏️</span><span class="label">Remarks Manager</span></a>
              <a class="sub-item" routerLink="/reports/teacher-comment"><span class="ico">💬</span><span class="label">Teacher Comment</span></a>
              <a class="sub-item" routerLink="/reports/teaching-periods"><span class="ico">⏱️</span><span class="label">Teaching Periods</span></a>
            </div>
          </div>

          <div class="nav-group">
            <button class="nav-title" type="button" (click)="toggleGroup('finance')">
              <span class="ico">💳</span>
              <span class="label">Finance</span>
              <span class="caret" [class.open]="isOpen('finance')">▸</span>
            </button>
            <div class="nav-sub" *ngIf="isOpen('finance') && !sidebarCollapsed()">
              <a class="sub-item" routerLink="/payments" *ngIf="false"><span class="ico">💵</span><span class="label">Payments</span> <span class="badge pending">7 Pending</span></a>
              <a class="sub-item" routerLink="/my-fees" *ngIf="false"><span class="ico">🧾</span><span class="label">View My Balance</span></a>
              <a class="sub-item" routerLink="/accounts/record-payment" *ngIf="isAdmin()"><span class="ico">🧮</span><span class="label">Record payment</span></a>
              <a class="sub-item" routerLink="/accounts/bulk-invoices" *ngIf="isAdmin()"><span class="ico">📤</span><span class="label">Bulk invoices</span></a>
              <a class="sub-item" routerLink="/accounts/my-fees" *ngIf="isAdmin()"><span class="ico">🧾</span><span class="label">My Fees Balance</span></a>
            </div>
          </div>

          <div class="nav-group">
            <button class="nav-title" type="button" (click)="toggleGroup('resources')">
              <span class="ico">📦</span>
              <span class="label">Resources</span>
              <span class="caret" [class.open]="isOpen('resources')">▸</span>
            </button>
            <div class="nav-sub" *ngIf="isOpen('resources') && !sidebarCollapsed()">
              <a class="sub-item" routerLink="/library"><span class="ico">📚</span><span class="label">Library</span></a>
              <a class="sub-item" routerLink="/transport_users"><span class="ico">🚌</span><span class="label">Transport</span></a>
            </div>
          </div>

          <div class="nav-group">
            <button class="nav-title" type="button" (click)="toggleGroup('hr')">
              <span class="ico">👔</span>
              <span class="label">Human Resource</span>
              <span class="caret" [class.open]="isOpen('hr')">▸</span>
            </button>
            <div class="nav-sub" *ngIf="isOpen('hr') && !sidebarCollapsed()">
              <a class="sub-item" routerLink="/hr/payroll"><span class="ico">💼</span><span class="label">Manage Payroll</span></a>
              <a class="sub-item" routerLink="/hr/employees"><span class="ico">🧑‍💼</span><span class="label">Employees</span></a>
            </div>
          </div>

          <div class="nav-group">
            <button class="nav-title" type="button" (click)="toggleGroup('communication')">
              <span class="ico">💬</span>
              <span class="label">Communication</span>
              <span class="caret" [class.open]="isOpen('communication')">▸</span>
            </button>
            <div class="nav-sub" *ngIf="isOpen('communication') && !sidebarCollapsed()">
              <button class="sub-item as-btn" type="button" (click)="openBulkMsg()"><span class="ico">✉️</span><span class="label">Messages</span></button>
            </div>
          </div>

          <div class="nav-group" *ngIf="isAdmin()">
            <button class="nav-title" type="button" (click)="toggleGroup('settings')">
              <span class="ico">⚙️</span>
              <span class="label">Settings</span>
              <span class="caret" [class.open]="isOpen('settings')">▸</span>
            </button>
            <div class="nav-sub" *ngIf="isOpen('settings') && !sidebarCollapsed()">
              <a class="sub-item" routerLink="/settings"><span class="ico">🛠️</span><span class="label">Configuration</span></a>
              <a class="sub-item" routerLink="/settings/grades_assign"><span class="ico">🧩</span><span class="label">Fix grades</span></a>
              <a class="sub-item" routerLink="/settings/publish-results"><span class="ico">📤</span><span class="label">Publish results</span></a>
              <a class="sub-item" routerLink="/settings/users"><span class="ico">👤</span><span class="label">User Management</span></a>
              <a class="sub-item" routerLink="/settings/promote-classes"><span class="ico">⏫</span><span class="label">Promote Classes</span></a>
            </div>
          </div>
        </aside>

        <main class="content">
          <div class="navbar">
            <div class="brand">Dashboard</div>
            <div class="userbar">
              <span class="who">{{ displayName() || 'User' }}</span>
            </div>
          </div>
          <div class="kpis">
            <div class="kpi-tile red">
              <div class="kpi-num">{{ stats().students | number }}</div>
              <div class="kpi-text">Total students</div>
            </div>
            <div class="kpi-tile green">
              <div class="kpi-num">{{ stats().teachers | number }}</div>
              <div class="kpi-text">Total teachers</div>
            </div>
            <div class="kpi-tile cyan">
              <div class="kpi-num">1</div>
              <div class="kpi-text">Total Parent</div>
            </div>
            <div class="kpi-tile blue">
              <div class="kpi-num">{{ todayPresent() | number }}</div>
              <div class="kpi-text">Today Present</div>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-header">Admissions Trend</div>
              <div class="card-body"><canvas #admChart width="640" height="240"></canvas></div>
            </div>
            <div class="card">
              <div class="card-header">Enrollments Trend</div>
              <div class="card-body"><canvas #enrChart width="640" height="240"></canvas></div>
            </div>
          </div>

          <div class="grid two">
            <div class="card">
              <div class="card-header">Recent Students</div>
              <div class="card-body list">
                <div class="list-item" *ngFor="let s of recentStudents()">
                  <div class="li-title">{{ s.firstName }} {{ s.lastName }}</div>
                  <div class="li-sub">ID: {{ s.studentId || s['id'] }}</div>
                </div>
                <div class="empty" *ngIf="!recentStudents().length">No recent students</div>
              </div>
            </div>
            <div class="card">
              <div class="card-header">Recent Classes</div>
              <div class="card-body list">
                <div class="list-item" *ngFor="let c of recentClasses()">
                  <div class="li-title">{{ c.name }}</div>
                  <div class="li-sub">{{ c.academicYear }}</div>
                </div>
                <div class="empty" *ngIf="!recentClasses().length">No classes</div>
              </div>
            </div>
          </div>

          

          <div class="modal-backdrop" *ngIf="showBulkMsg()" (click)="closeBulkMsg()"></div>
          <div class="modal" *ngIf="showBulkMsg()" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="title">Send message to parents</div>
              <button class="close" type="button" (click)="closeBulkMsg()">✖</button>
            </div>
            <div class="modal-body">
              <div class="filters">
                <label class="lbl">Recipients</label>
                <div class="radios">
                  <label><input type="radio" name="scope" [checked]="recipientScope()==='all'" (change)="setScope('all')"/> All parents</label>
                  <label><input type="radio" name="scope" [checked]="recipientScope()==='class'" (change)="setScope('class')"/> By class</label>
                </div>
                <div class="class-pick" *ngIf="recipientScope()==='class'">
                  <div class="hint">Select one or more classes.</div>
                  <div class="class-list">
                    <label *ngFor="let c of allClasses()">
                      <input type="checkbox" [checked]="selectedClassIds().has(c.id)" (change)="toggleClass(c.id, $event)"/> {{ c.name }} <span class="small">({{ c.academicYear }})</span>
                    </label>
                  </div>
                </div>
              </div>

              <label class="lbl">Template</label>
              <select class="inp" (change)="applyTemplate($any($event.target).value)">
                <option value="">-- Choose a template (optional) --</option>
                <option *ngFor="let t of templates" [value]="t.id">{{ t.name }}</option>
              </select>
              <div>
                <button class="btn" type="button" (click)="sendBulkMsg()" [disabled]="sending() || !canSend()">Send to Parents</button>
              </div>

              <label class="lbl">Subject</label>
              <input class="inp" type="text" [value]="msgSubject()" (input)="msgSubject.set($any($event.target).value)" placeholder="Enter subject" />
              <label class="lbl">Message</label>
              <textarea class="txt" rows="5" [value]="msgBody()" (input)="msgBody.set($any($event.target).value)" placeholder="Write your message"></textarea>
              <div class="hint">This will be sent to all linked parent emails. Configure SMTP in the server for real delivery.</div>
              <div class="err" *ngIf="sendErr()">{{ sendErr() }}</div>
              <div class="ok" *ngIf="sendOk()">Message sent to {{ sentCount() }} parent(s).</div>
            </div>
            <div class="modal-actions">
              <button class="btn" type="button" (click)="closeBulkMsg()" [disabled]="sending()">Cancel</button>
              <button class="btn primary" type="button" (click)="sendBulkMsg()" [disabled]="sending() || !canSend()">
                {{ sending() ? 'Sending…' : 'Send' }}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host{display:block;background:#fafafa;min-height:100vh}
    .navbar{background:#3f51b5;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:10px 16px;margin-bottom:16px}
    .navbar .brand{font-weight:700}
    .navbar .options{background:#fff;color:#0b53a5;border:none;border-radius:4px;padding:6px 10px;cursor:pointer}
    .userbar{display:flex;gap:8px;align-items:center}
    .who{font-weight:600}

    .body{display:grid;grid-template-columns:300px 1fr;gap:12px;padding:12px;transition:grid-template-columns .2s ease}
    .body.collapsed{grid-template-columns:80px 1fr}
    .sidemenu{background:#111827;border:1px solid #1f2937;border-radius:8px;padding:6px;display:flex;flex-direction:column;gap:2px;color:#e5e7eb}
    .side-top{display:flex;justify-content:flex-end}
    .collapse-btn{background:#1f2937;color:#e5e7eb;border:1px solid #374151;border-radius:6px;padding:4px 8px;cursor:pointer}
    .menu-item{padding:10px;color:#e5e7eb;text-decoration:none;border-radius:6px;display:flex;align-items:center;gap:10px}
    .menu-item:hover,.menu-item.active{background:#1f2937}
    .badge.pending{background:#ef4444;color:#fff;border-radius:12px;padding:1px 8px;font-size:12px;margin-left:6px}

    .nav-group{display:block;margin:0}
    .nav-title{width:100%;text-align:left;border:none;background:transparent;color:#e5e7eb;padding:10px;border-radius:6px;cursor:pointer;font-weight:600;display:flex;gap:10px;align-items:center;justify-content:space-between}
    .nav-title:hover{background:#1f2937}
    .nav-title .label{flex:1;text-align:left}
    .nav-sub{display:grid;padding-left:6px;margin:2px 0 4px 24px;border-left:2px solid #1f2937}
    .caret{display:inline-block;transition:transform .15s ease;color:#9ca3af}
    .caret.open{transform:rotate(90deg)}
    .ico{width:18px;text-align:center}
    .label{white-space:nowrap}
    .sub-item{padding:6px 8px;color:#d1d5db;text-decoration:none;border-radius:6px;display:flex;align-items:center;gap:8px}
    .sub-item.as-btn{background:transparent;border:0;text-align:left;cursor:pointer;font:inherit;color:#d1d5db}
    .sub-item:hover,.sub-item.active{background:#1f2937;color:#fff}

    .content{padding:8px}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px}
    .kpi-tile{color:#fff;border-radius:6px;padding:12px 14px}
    .kpi-tile .kpi-num{font-size:28px;font-weight:700}
    .kpi-tile .kpi-text{opacity:.9}
    .kpi-tile.red{background:#f44336}
    .kpi-tile.green{background:#4caf50}
    .kpi-tile.cyan{background:#03a9f4}
    .kpi-tile.blue{background:#3f51b5}

    .quick-title{margin:12px 0 8px 4px;color:#111827}
    .quick-icons{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
    .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:10px 0}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
    .card-header{padding:8px 10px;border-bottom:1px solid #e5e7eb;background:whitesmoke;font-weight:600}
    .card-body{padding:8px 10px}
    .list{display:grid;gap:8px}
    .list-item{display:flex;flex-direction:column;padding:6px 0;border-bottom:1px dashed #e5e7eb}
    .list-item:last-child{border-bottom:none}
    .li-title{font-weight:600}
    .li-sub{color:#6b7280;font-size:12px}
    .empty{color:#6b7280}
    .q{display:flex;flex-direction:column;align-items:center;justify-content:center;height:74px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;color:#111827;text-decoration:none}
    .btn-as{cursor:pointer}
    .q:hover{background:#f3f4f6}
    .q-ico{font-size:20px;margin-bottom:6px}

    .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.35)}
    .modal{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.2);width:min(900px,96vw);max-height:76vh;display:flex;flex-direction:column}
    .modal-header{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-bottom:1px solid #e5e7eb}
    .modal-header .title{font-weight:700}
    .modal-header .close{border:none;background:transparent;font-size:18px;cursor:pointer}
    .modal-body{display:grid;gap:6px;padding:8px 10px;overflow:auto;max-height:60vh}
    .lbl{font-size:14px;color:#374151}
    .inp,.txt{width:100%;box-sizing:border-box;border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px;font:inherit}
    .filters{display:grid;gap:6px;margin-bottom:6px}
    .radios{display:flex;gap:12px}
    .class-list{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:4px}
    .small{font-size:12px;color:#6b7280}
    .hint{font-size:12px;color:#6b7280}
    .err{color:#b91c1c}
    .ok{color:#065f46}
    .modal-actions{display:flex;justify-content:flex-end;gap:8px;padding:8px 10px;border-top:1px solid #e5e7eb}
    .btn{border:1px solid #e5e7eb;background:#fff;border-radius:6px;padding:8px 12px;cursor:pointer}
    .btn.primary{background:#0b53a5;color:#fff;border-color:#0b53a5}

    @media(max-width:1024px){
      .body{grid-template-columns:1fr}
      .sidemenu{order:2}
      .kpis{grid-template-columns:repeat(2,1fr)}
      .quick-icons{grid-template-columns:repeat(3,1fr)}
      .grid{grid-template-columns:1fr}
    }

    @media(max-width:640px){
      .kpis{grid-template-columns:1fr}
      .quick-icons{grid-template-columns:repeat(2,1fr)}
    }
  `]
})
export class DashboardComponent implements AfterViewInit {
  private http = inject(HttpClient);
  private auth = inject(AuthStateService);
  private ent = inject(EntitlementsService);
  private router = inject(Router);
  private studentsSvc = inject(StudentsService);
  private classesSvc = inject(ClassesService);
  stats = signal<{students:number; teachers:number; classes:number}>({ students: 0, teachers: 0, classes: 0 });
  recentStudents = signal<Student[]>([]);
  recentClasses = signal<ClassEntity[]>([]);
  admissions = signal<{ month: string; count: number }[]>([]);
  enrollmentsTrend = signal<{ month: string; count: number }[]>([]);
  schoolName = signal<string>('SchoolPro');
  todayPresent = signal<number>(0);
  showBulkMsg = signal(false);
  msgSubject = signal('');
  msgBody = signal('');
  sending = signal(false);
  sendErr = signal<string | null>(null);
  sendOk = signal(false);
  sentCount = signal(0);
  recipientScope = signal<'all'|'class'>('all');
  allClasses = signal<Array<{ id:string; name:string; academicYear?: string }>>([]);
  selectedClassIds = signal<Set<string>>(new Set());
  templates = [
    { id: 'term_update', name: 'Term Update', subject: 'Important update from {{school_name}}', body: 'Dear Parent,<br/><br/>We would like to inform you about important updates for this term at {{school_name}}.<br/><br/>Date: {{today}}<br/><br/>Kind regards,<br/>Administration' },
    { id: 'fee_reminder', name: 'Fees Reminder', subject: 'Reminder: Fee payment at {{school_name}}', body: 'Dear Parent,<br/><br/>This is a friendly reminder to settle any outstanding fees at {{school_name}}.<br/><br/>Please ignore if already paid.<br/><br/>Thank you.' },
  ] as Array<{ id:string; name:string; subject:string; body:string }>;

  @ViewChild('admChart', { static: false }) admChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('enrChart', { static: false }) enrChart?: ElementRef<HTMLCanvasElement>;

  openGroups = signal<Set<string>>(new Set());
  sidebarCollapsed = signal(true);

  constructor() {
    this.http.get<{students:number; teachers:number; classes:number}>(`http://localhost:3000/api/stats`).subscribe({
      next: (res) => this.stats.set(res),
    });

    this.studentsSvc.list(1, 5).subscribe({ next: res => this.recentStudents.set(res.data) });
    this.classesSvc.list().subscribe({ next: res => { this.recentClasses.set(res.slice(0,5)); this.allClasses.set(res || []); } });
    

    // fetch trends
    this.http.get<{ month:string; count:number }[]>(`http://localhost:3000/api/stats/admissionsTrend`).subscribe({
      next: (res) => { this.admissions.set(res); this.tryDrawCharts(); }
    });
    this.http.get<{ month:string; count:number }[]>(`http://localhost:3000/api/stats/enrollmentsTrend`).subscribe({
      next: (res) => { this.enrollmentsTrend.set(res); this.tryDrawCharts(); }
    });

    // fetch school name for label
    this.http.get<any>('http://localhost:3000/api/settings').subscribe({
      next: (s) => { if (s && s.schoolName) this.schoolName.set(s.schoolName); }
    });

    // Load today's present count
    this.loadTodayPresent();
    // Update when attendance is saved from another page/tab
    window.addEventListener('storage', (e) => {
      if (e.key === 'attendance_updated_at') this.loadTodayPresent();
    });
  }

  has(mod: string) {
    // admins see everything
    if (this.isAdmin()) return true;
    return this.ent.has(mod);
  }

  isAdmin() {
    const r = (this.auth.role() || '').toLowerCase();
    return r === 'admin' || r === 'administrator';
  }

  displayName(){
    const role = (this.auth.role() || '').toLowerCase();
    if (role === 'admin') return 'Administrator';
    return this.auth.fullName() || this.auth.email() || (role ? role.charAt(0).toUpperCase() + role.slice(1) : null);
  }

  

  goSearch(val: string) {
    const q = (val || '').trim();
    if (!q) return;
    this.router.navigate(['/students'], { queryParams: { q } });
  }

  ngAfterViewInit(): void {
    // draw once view ready
    this.tryDrawCharts();
  }

  private tryDrawCharts() {
    // draw admissions
    const admEl = this.admChart?.nativeElement;
    if (admEl && this.admissions().length) {
      this.drawLine(admEl, this.admissions().map((x: any) => x.count), this.admissions().map((x: any) => x.month));
    }
    // draw enrollments
    const enrEl = this.enrChart?.nativeElement;
    if (enrEl && this.enrollmentsTrend().length) {
      this.drawLine(enrEl, this.enrollmentsTrend().map((x: any) => x.count), this.enrollmentsTrend().map((x: any) => x.month), '#0ea5e9');
    }
  }

  private drawLine(canvas: HTMLCanvasElement, values: number[], labels: string[], stroke = '#6366f1') {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // clear
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const padding = { l: 36, r: 12, t: 16, b: 24 };
    const w = canvas.width - padding.l - padding.r;
    const h = canvas.height - padding.t - padding.b;
    const max = Math.max(1, ...values);
    const min = 0;
    const n = values.length;
    // axes
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.l, padding.t);
    ctx.lineTo(padding.l, padding.t + h);
    ctx.lineTo(padding.l + w, padding.t + h);
    ctx.stroke();
    // grid horizontal
    ctx.strokeStyle = '#f1f5f9';
    for (let i=1;i<=4;i++){
      const y = padding.t + (h * i / 4);
      ctx.beginPath(); ctx.moveTo(padding.l, y); ctx.lineTo(padding.l + w, y); ctx.stroke();
    }
    // plot line
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i=0;i<n;i++){
      const x = padding.l + (w * (n === 1 ? 0.5 : i/(n-1)));
      const val = values[i];
      const y = padding.t + h - ((val - min) / (max - min)) * h;
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
    // dots
    ctx.fillStyle = stroke;
    for (let i=0;i<n;i++){
      const x = padding.l + (w * (n === 1 ? 0.5 : i/(n-1)));
      const val = values[i];
      const y = padding.t + h - ((val - min) / (max - min)) * h;
      ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
    }
    // x labels (last and first)
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    if (labels.length){
      ctx.fillText(labels[0], padding.l, padding.t + h + 16);
      const last = labels[labels.length-1];
      const textWidth = ctx.measureText(last).width;
      ctx.fillText(last, padding.l + w - textWidth, padding.t + h + 16);
    }
  }

  private loadTodayPresent(){
    try {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth()+1).padStart(2,'0');
      const day = String(d.getDate()).padStart(2,'0');
      const date = `${y}-${m}-${day}`;
      this.http.get<number>(`http://localhost:3000/api/attendance/present-count`, { params: { date } as any }).subscribe({
        next: (n) => this.todayPresent.set(Number(n)||0),
        error: () => this.todayPresent.set(0),
      });
    } catch {
      this.todayPresent.set(0);
    }
  }

  openBulkMsg(){
    if (!this.isAdmin()) return; // only admins
    this.sendErr.set(null); this.sendOk.set(false); this.sentCount.set(0);
    this.showBulkMsg.set(true);
  }

  closeBulkMsg(){
    if (this.sending()) return;
    this.showBulkMsg.set(false);
  }

  canSend(){
    return !!this.msgSubject().trim() && !!this.msgBody().trim();
  }

  sendBulkMsg(){
    if (!this.canSend() || this.sending()) return;
    this.sending.set(true); this.sendErr.set(null); this.sendOk.set(false);
    const html = `<div>${this.msgBody().trim().replace(/\n/g,'<br/>')}</div>`;
    const subject = this.msgSubject().trim();
    const doPost = (studentIds?: string[]) => {
      const payload: any = { subject, html };
      if (studentIds && studentIds.length) payload.studentIds = studentIds;
      this.http.post<{ ok: boolean; sent?: number; message?: string }>('http://localhost:3000/api/parents/admin/bulk-email', payload).subscribe({
        next: (res) => {
          this.sending.set(false);
          if (res && (res as any).ok) {
            this.sendOk.set(true); this.sentCount.set((res as any).sent || 0);
            this.msgSubject.set(''); this.msgBody.set(''); this.selectedClassIds.set(new Set()); this.recipientScope.set('all');
          } else {
            this.sendErr.set((res as any)?.message || 'Failed to send');
          }
        },
        error: (e) => {
          this.sending.set(false);
          this.sendErr.set(e?.error?.message || 'Failed to send');
        }
      });
    };

    if (this.recipientScope()==='class') {
      const ids = Array.from(this.selectedClassIds());
      if (!ids.length) { this.sending.set(false); this.sendErr.set('Select at least one class'); return; }
      const requests = ids.map(id => this.http.get<any[]>(`http://localhost:3000/api/enrollments/class/${id}`));
      const students = new Set<string>();
      let done = 0; let failed = false;
      requests.forEach((obs) => {
        obs.subscribe({
          next: rows => {
            (rows||[]).forEach((r:any) => { if (r?.student?.id) students.add(r.student.id); });
            done++; if (done===requests.length && !failed) doPost(Array.from(students));
          },
          error: () => { if (!failed){ failed = true; this.sending.set(false); this.sendErr.set('Failed to load class enrollments'); } }
        });
      });
    } else {
      doPost();
    }
  }

  setScope(v: 'all'|'class'){ this.recipientScope.set(v); }

  toggleClass(id: string, ev: Event){
    const checked = (ev.target as HTMLInputElement).checked;
    const s = new Set(this.selectedClassIds());
    if (checked) s.add(id); else s.delete(id);
    this.selectedClassIds.set(s);
  }

  applyTemplate(id: string){
    const t = this.templates.find(x => x.id === id);
    if (!t) return;
    const repl = (s: string) => s
      .replace(/\{\{school_name\}\}/g, this.schoolName())
      .replace(/\{\{today\}\}/g, new Date().toLocaleDateString());
    this.msgSubject.set(repl(t.subject));
    this.msgBody.set(repl(t.body));
  }

  renderPreview(){
    const html = this.msgBody().trim();
    const text = html
      .replace(/\{\{school_name\}\}/g, this.schoolName())
      .replace(/\{\{today\}\}/g, new Date().toLocaleDateString());
    return `<div>${text}</div>`;
  }

  toggleGroup(key: string){
    const s = new Set(this.openGroups());
    if (s.has(key)) s.delete(key); else s.add(key);
    this.openGroups.set(s);
  }

  isOpen(key: string){
    return this.openGroups().has(key);
  }
}
