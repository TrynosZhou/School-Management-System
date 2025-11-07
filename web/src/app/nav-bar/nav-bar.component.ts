import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { AuthStateService } from '../auth/auth-state.service';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="global-nav">
      <button class="menu-btn" (click)="toggle()" aria-label="Toggle navigation">
        <span></span><span></span><span></span>
      </button>
      <div class="brand" routerLink="/dashboard">SchoolPro</div>
      <nav [class.open]="open()">
        <a routerLink="/dashboard" routerLinkActive="active" (click)="close()">Dashboard</a>
        <a routerLink="/students" routerLinkActive="active" [hidden]="isStudent()" (click)="close()">Students</a>
        <div class="dropdown" [hidden]="isStudent()" [class.open]="showTeachers()">
          <button class="dropbtn" (click)="toggleTeachers()" type="button">Teachers ▾</button>
          <div class="menu">
            <a routerLink="/teachers" routerLinkActive="active" (click)="closeAndHideTeachers()">Overview</a>
            <a routerLink="/teaching/assignments" routerLinkActive="active" [hidden]="!isAdmin()" (click)="closeAndHideTeachers()">Assign to Classes</a>
          </div>
        </div>
        <div class="dropdown" [hidden]="isStudent()" [class.open]="showClasses()">
          <button class="dropbtn" (click)="toggleClasses()" type="button">Classes ▾</button>
          <div class="menu">
            <a routerLink="/classes" routerLinkActive="active" (click)="closeAndHideClasses()">Overview</a>
            <a routerLink="/classes/enrollments" routerLinkActive="active" (click)="closeAndHideClasses()">Class Enrollments</a>
          </div>
        </div>
        <a routerLink="/subjects" routerLinkActive="active" [hidden]="isStudent()" (click)="close()">Subjects</a>
        <div class="dropdown" [hidden]="!canCaptureMarks()" [class.open]="showAttExams()">
          <button class="dropbtn" (click)="toggleAttExams()" type="button">Attendance & Exams ▾</button>
          <div class="menu">
            <a routerLink="/attendance" routerLinkActive="active" (click)="closeAndHideAttExams()">Attendance</a>
            <a routerLink="/exams" routerLinkActive="active" (click)="closeAndHideAttExams()">Exams</a>
          </div>
        </div>
        <div class="dropdown" [hidden]="!canCaptureMarks()" [class.open]="showMarks()">
          <button class="dropbtn" (click)="toggleMarks()" type="button">Marks ▾</button>
          <div class="menu">
            <a routerLink="/marks/capture" routerLinkActive="active" (click)="closeAndHideMarks()">Capture marks</a>
            <a routerLink="/marks/report-comment" routerLinkActive="active" (click)="closeAndHideMarks()">Report Comment</a>
            <a routerLink="/marks/teachers-comment" routerLinkActive="active" (click)="closeAndHideMarks()">Teacher's comment</a>
          </div>
        </div>
        <div class="dropdown" [class.open]="showReports()">
          <button class="dropbtn" (click)="toggleReports()" type="button">Reports ▾</button>
          <div class="menu">
            <a routerLink="/reports" routerLinkActive="active" (click)="closeAndHideReports()">Overview</a>
            <a routerLink="/reports" routerLinkActive="active" (click)="closeAndHideReports()">Report Cards</a>
            <a routerLink="/reports/teacher-comment" routerLinkActive="active" (click)="closeAndHideReports()">Teacher Comment</a>
            <a routerLink="/reports/remarks-manager" routerLinkActive="active" (click)="closeAndHideReports()">Remarks Manager</a>
            <a routerLink="/reports/remarks-readiness" routerLinkActive="active" (click)="closeAndHideReports()">Remarks Readiness</a>
            <a routerLink="/reports/marksheet" routerLinkActive="active" (click)="closeAndHideReports()">Mark sheets</a>
            <a routerLink="/reports/attendance" routerLinkActive="active" (click)="closeAndHideReports()">Attendance</a>
          </div>
        </div>
        <a routerLink="/parent/login" routerLinkActive="active" (click)="close()">Parent Portal</a>
        <div class="dropdown" [hidden]="!isStudent()" [class.open]="showAccounts()">
          <button class="dropbtn" (click)="toggleAccounts()" type="button">Accounts ▾</button>
          <div class="menu">
            <a routerLink="/my-fees" routerLinkActive="active" (click)="closeAndHideAccounts()">View My Balance</a>
          </div>
        </div>
        <div class="dropdown" [hidden]="!isAdmin()" [class.open]="showAccounts()">
          <button class="dropbtn" (click)="toggleAccounts()" type="button">Accounts ▾</button>
          <div class="menu">
            <a routerLink="/accounts/record-payment" routerLinkActive="active" (click)="closeAndHideAccounts()">Record payment</a>
            <a routerLink="/accounts/fees-settings" routerLinkActive="active" (click)="closeAndHideAccounts()">Fees settings</a>
            <a routerLink="/accounts/bulk-invoices" routerLinkActive="active" (click)="closeAndHideAccounts()">Bulk invoices</a>
            <a routerLink="/accounts/my-fees" routerLinkActive="active" (click)="closeAndHideAccounts()">My Fees Balance</a>
          </div>
        </div>
        <div class="dropdown" [hidden]="!isAdmin()" [class.open]="showSettings()">
          <button class="dropbtn" (click)="toggleSettings()" type="button">Settings ▾</button>
          <div class="menu">
            <a routerLink="/settings" routerLinkActive="active" (click)="closeAndHideSettings()">Configuration</a>
            <a routerLink="/settings/grades_assign" routerLinkActive="active" (click)="closeAndHideSettings()">Fix grades</a>
            <a routerLink="/settings/publish-results" routerLinkActive="active" (click)="closeAndHideSettings()">Publish results</a>
            <a routerLink="/settings/users" routerLinkActive="active" (click)="closeAndHideSettings()">User Management</a>
            <a routerLink="/settings/promote-classes" routerLinkActive="active" (click)="closeAndHideSettings()">Promote Classes</a>
          </div>
        </div>
      </nav>
      <div class="spacer"></div>
      <div class="user">
        <span class="role">{{ displayName() || 'user' }}</span>
        <button class="logout" (click)="logout()">Logout</button>
      </div>
    </header>
  `,
  styles: [`
    .global-nav{position:sticky;top:0;z-index:1000;display:flex;align-items:center;gap:8px;padding:8px 10px;background:#fff;border-bottom:1px solid #eee}
    .brand{font-weight:700;cursor:pointer}
    nav{display:flex;gap:0.5cm}
    nav a{text-decoration:none;color:#374151;padding:3px 5px;border-radius:6px;font-weight:700}
    nav a:hover{background:#f3f4f6}
    nav a.active{color:#1d4ed8;background:#eff6ff}
    .dropdown{position:relative}
    .dropbtn{background:transparent;border:0;cursor:pointer;padding:3px 5px;border-radius:6px;color:#374151;font-weight:700}
    .dropbtn:hover{background:#f3f4f6}
    .menu{position:absolute;top:30px;left:0;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 6px 16px rgba(0,0,0,0.08);display:none;min-width:200px;padding:3px}
    .menu a{display:block;padding:5px 7px;border-radius:6px}
    .dropdown.open .menu{display:block}
    .spacer{flex:1}
    .user{display:flex;gap:8px;align-items:center}
    .email{font-size:12px;color:#6b7280}
    .logout{padding:6px 10px}
    .menu-btn{display:none;background:transparent;border:0;padding:6px;margin-right:4px;cursor:pointer}
    .menu-btn span{display:block;width:20px;height:2px;background:#111;margin:3px 0}
    @media(max-width: 860px){
      nav{display:none;position:absolute;left:0;right:0;top:48px;background:#fff;border-bottom:1px solid #eee;padding:4px 8px;flex-direction:column}
      nav.open{display:flex}
      .menu-btn{display:block}
      .dropdown{position:static}
      .menu{position:static;display:block;border:0;box-shadow:none;padding:0;margin-left:6px}
    }
  `]
})
export class NavBarComponent implements OnInit {
  private auth = inject(AuthStateService);
  private router = inject(Router);

  open = signal(false);
  showReports = signal(false);
  showMarks = signal(false);
  showClasses = signal(false);
  showTeachers = signal(false);
  showSettings = signal(false);
  showAccounts = signal(false);
  showAttExams = signal(false);

  toggle(){ this.open.set(!this.open()); }
  close(){ this.open.set(false); }
  toggleMarks(){ this.showMarks.set(!this.showMarks()); }
  closeAndHideMarks(){ this.close(); this.showMarks.set(false); }
  toggleReports(){ this.showReports.set(!this.showReports()); }
  closeAndHideReports(){ this.close(); this.showReports.set(false); }
  toggleClasses(){ this.showClasses.set(!this.showClasses()); }
  closeAndHideClasses(){ this.close(); this.showClasses.set(false); }
  toggleTeachers(){ this.showTeachers.set(!this.showTeachers()); }
  closeAndHideTeachers(){ this.close(); this.showTeachers.set(false); }
  toggleSettings(){ this.showSettings.set(!this.showSettings()); }
  closeAndHideSettings(){ this.close(); this.showSettings.set(false); }
  toggleAccounts(){ this.showAccounts.set(!this.showAccounts()); }
  closeAndHideAccounts(){ this.close(); this.showAccounts.set(false); }
  toggleAttExams(){ this.showAttExams.set(!this.showAttExams()); }
  closeAndHideAttExams(){ this.close(); this.showAttExams.set(false); }

  role(): string | null { return this.auth.role(); }
  email(): string | null { return this.auth.email(); }
  displayName(): string | null { return this.auth.fullName() || this.auth.role(); }
  isAdmin(): boolean {
    const r = (this.auth.role() || '').toLowerCase();
    return r === 'admin' || r === 'administrator';
  }
  isStudent(): boolean { return this.auth.role() === 'student'; }
  canCaptureMarks(): boolean { const r = this.auth.role(); return r === 'admin' || r === 'teacher'; }

  ngOnInit(): void {
    this.router.events.subscribe(ev => {
      if (ev instanceof NavigationEnd) this.close();
    });
  }

  logout(){
    localStorage.removeItem('access_token');
    this.auth.refresh();
    this.close();
    this.router.navigateByUrl('/login');
  }
}
