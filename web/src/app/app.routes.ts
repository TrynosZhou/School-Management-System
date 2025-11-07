import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { StudentsListComponent } from './students/students-list.component';
import { StudentFormComponent } from './students/student-form.component';
import { TeachersListComponent } from './teachers/teachers-list.component';
import { TeacherFormComponent } from './teachers/teacher-form.component';
import { authGuard } from './auth/auth.guard';
import { teacherOrAdminGuard } from './auth/role.guard';
import { ClassesListComponent } from './classes/classes-list.component';
import { ClassFormComponent } from './classes/class-form.component';
import { ReportsPageComponent } from './reports/reports-page.component';
import { TeachersCommentComponent } from './reports/teachers-comment.component';
import { MarksPageComponent } from './marks/marks-page.component';
import { CaptureMarksComponent } from './marks/capture-marks.component';
import { AssignmentsPageComponent } from './teaching/assignments-page.component';
import { SubjectsListComponent } from './subjects/subjects-list.component';
import { SubjectFormComponent } from './subjects/subject-form.component';
import { EnrollmentFormComponent } from './enrollments/enrollment-form.component';
import { SettingsPageComponent } from './settings/settings-page.component';
import { adminGuard } from './auth/admin.guard';
import { studentGuard } from './auth/student.guard';
import { notStudentGuard } from './auth/not-student.guard';
import { AccountsAdminComponent } from './accounts/accounts-admin.component';
import { AccountsFeesSettingsComponent } from './accounts/accounts-fees-settings.component';
import { MyFeesComponent } from './accounts/my-fees.component';
import { StudentDashboardComponent } from './student/student-dashboard.component';
import { AccountsBulkInvoicesComponent } from './accounts/accounts-bulk-invoices.component';
import { AttendancePageComponent } from './attendance/attendance-page.component';
import { MarksheetPageComponent } from './reports/marksheet-page.component';
import { AttendanceReportPageComponent } from './reports/attendance-report-page.component';
import { ReportCardViewerComponent } from './reports/report-card-viewer.component';
import { entitlementGuard } from './auth/entitlement.guard';
import { ParentLoginComponent } from './parents/parent-login.component';
import { parentGuard } from './auth/parent.guard';
import { LibraryPageComponent } from './library/library-page.component';
import { ELearningPageComponent } from './elearning/elearning-page.component';
import { PayrollPageComponent } from './hr/payroll-page.component';
import { StudentIdsPageComponent } from './students/student-ids-page.component';
import { PromoteClassesComponent } from './settings/promote-classes.component';
import { ParentDashboardComponent } from './parents/parent-dashboard.component';
import { RemarksReadinessComponent } from './reports/remarks-readiness.component';
import { RemarksManagerComponent } from './reports/remarks-manager.component';
// Teaching Load page (lazy)

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  // Parent portal
  { path: 'parent/login', component: ParentLoginComponent },
  { path: 'parent', component: ParentDashboardComponent, canActivate: [parentGuard] },
  { path: 'parent/dashboard', component: ParentDashboardComponent, canActivate: [parentGuard] },
  // link-student disabled
  { path: 'parent/parent_student', loadComponent: () => import('./parents/parent-student.component').then(m => m.ParentStudentComponent), canActivate: [parentGuard] },
  { path: 'parent/students/:id/report-card', loadComponent: () => import('./parents/parent-report-card.component').then(m => m.ParentReportCardComponent), canActivate: [parentGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [notStudentGuard] },
  { path: 'students', component: StudentsListComponent, canActivate: [notStudentGuard, entitlementGuard], data: { module: 'students' } },
  { path: 'students/new', component: StudentFormComponent, canActivate: [notStudentGuard, entitlementGuard], data: { module: 'students' } },
  { path: 'students/:id', component: StudentFormComponent, canActivate: [notStudentGuard, entitlementGuard], data: { module: 'students' } },
  { path: 'teachers', component: TeachersListComponent, canActivate: [notStudentGuard, entitlementGuard], data: { module: 'teachers' } },
  { path: 'teachers/new', component: TeacherFormComponent, canActivate: [notStudentGuard, entitlementGuard], data: { module: 'teachers' } },
  { path: 'teachers/:id', component: TeacherFormComponent, canActivate: [notStudentGuard, entitlementGuard], data: { module: 'teachers' } },
  { path: 'students/id-cards', component: StudentIdsPageComponent, canActivate: [notStudentGuard, entitlementGuard], data: { module: 'students' } },
  { path: 'view_id', component: StudentIdsPageComponent, canActivate: [notStudentGuard, entitlementGuard], data: { module: 'students' } },
  { path: 'subjects', component: SubjectsListComponent, canActivate: [notStudentGuard, entitlementGuard], data: { module: 'subjects' } },
  { path: 'subjects/new', component: SubjectFormComponent, canActivate: [notStudentGuard, entitlementGuard], data: { module: 'subjects' } },
  { path: 'subjects/:id', component: SubjectFormComponent, canActivate: [notStudentGuard, entitlementGuard], data: { module: 'subjects' } },
  { path: 'classes', component: ClassesListComponent, canActivate: [notStudentGuard, entitlementGuard], data: { module: 'classes' } },
  { path: 'classes/new', component: ClassFormComponent, canActivate: [notStudentGuard, entitlementGuard], data: { module: 'classes' } },
  { path: 'classes/enrollments', loadComponent: () => import('./classes/class-enrollments.component').then(m => m.ClassEnrollmentsComponent), canActivate: [notStudentGuard, entitlementGuard], data: { module: 'enrollments' } },
  { path: 'classes/:id', component: ClassFormComponent, canActivate: [notStudentGuard, entitlementGuard], data: { module: 'classes' } },
  { path: 'teaching-load', loadComponent: () => import('./teaching/teacher-load.component').then(m => m.TeacherLoadComponent), canActivate: [teacherOrAdminGuard], data: { module: 'classes' } },
  { path: 'timetable', loadComponent: () => import('./timetable/timetable-page.component').then(m => m.TimetablePageComponent), canActivate: [notStudentGuard, entitlementGuard], data: { module: 'classes' } },
  { path: 'timetable/teachers', loadComponent: () => import('./timetable/tt-teachers.component').then(m => m.TtTeachersComponent), canActivate: [notStudentGuard, entitlementGuard], data: { module: 'classes' } },
  { path: 'timetable/subjects', loadComponent: () => import('./timetable/tt-subjects.component').then(m => m.TtSubjectsComponent), canActivate: [notStudentGuard, entitlementGuard], data: { module: 'classes' } },
  { path: 'timetable/classes', loadComponent: () => import('./timetable/tt-classes.component').then(m => m.TtClassesComponent), canActivate: [notStudentGuard, entitlementGuard], data: { module: 'classes' } },
  { path: 'timetable/slots', loadComponent: () => import('./timetable/tt-slots.component').then(m => m.TtSlotsComponent), canActivate: [notStudentGuard, entitlementGuard], data: { module: 'classes' } },
  { path: 'enrollments/new', component: EnrollmentFormComponent, canActivate: [teacherOrAdminGuard, entitlementGuard], data: { module: 'enrollments' } },
  { path: 'reports', component: ReportsPageComponent, canActivate: [authGuard, entitlementGuard], data: { module: 'reports' } },
  { path: 'reports/teaching-periods', loadComponent: () => import('./reports/teaching-periods-report.component').then(m => m.TeachingPeriodsReportComponent), canActivate: [authGuard, entitlementGuard], data: { module: 'reports' } },
  { path: 'reports/marksheet', component: MarksheetPageComponent, canActivate: [authGuard, entitlementGuard], data: { module: 'reports' } },
  { path: 'reports/attendance', component: AttendanceReportPageComponent, canActivate: [authGuard, entitlementGuard], data: { module: 'reports' } },
  { path: 'reports/honours-roll', loadComponent: () => import('./reports/honours-roll-page.component').then(m => m.HonoursRollPageComponent), canActivate: [authGuard, entitlementGuard], data: { module: 'reports' } },
  { path: 'reports/teachers-comments', loadComponent: () => import('./reports/teachers-comments.component').then(m => m.TeachersCommentsComponent), canActivate: [authGuard, entitlementGuard], data: { module: 'reports' } },
  { path: 'reports/teacher-comment', loadComponent: () => import('./reports/teacher-comment-loader.component').then(m => m.TeacherCommentLoaderComponent), canActivate: [authGuard, entitlementGuard], data: { module: 'reports' } },
  { path: 'reports/teachers-comment', component: TeachersCommentComponent, canActivate: [teacherOrAdminGuard, entitlementGuard], data: { module: 'reports' } },
  { path: 'reports/remarks-readiness', component: RemarksReadinessComponent, canActivate: [teacherOrAdminGuard] },
  { path: 'reports/remarks-manager', component: RemarksManagerComponent, canActivate: [teacherOrAdminGuard] },
  { path: 'reports/report-card/:studentId/view', component: ReportCardViewerComponent, canActivate: [teacherOrAdminGuard] },
  { path: 'student/report-card/:studentId/view', component: ReportCardViewerComponent, canActivate: [studentGuard] },
  { path: 'report_cards', loadComponent: () => import('./reports/report-cards-page.component').then(m => m.ReportCardsPageComponent), canActivate: [authGuard, entitlementGuard], data: { module: 'reports' } },
  { path: 'settings/publish-results', loadComponent: () => import('./settings/publish-results.component').then(m => m.PublishResultsComponent), canActivate: [adminGuard], data: { module: 'settings' } },
  { path: 'settings/users', loadComponent: () => import('./users/users-page.component').then(m => m.UsersPageComponent), canActivate: [adminGuard], data: { module: 'settings' } },
  { path: 'settings/grades_assign', loadComponent: () => import('./settings/grades-assign.component').then(m => m.GradesAssignComponent), canActivate: [adminGuard], data: { module: 'settings' } },
  { path: 'marks/teachers-comment', component: TeachersCommentComponent, canActivate: [teacherOrAdminGuard, entitlementGuard], data: { module: 'reports' } },
  { path: 'accounts', component: AccountsAdminComponent, canActivate: [adminGuard], data: { module: 'accounts' } },
  { path: 'accounts/record-payment', component: AccountsAdminComponent, canActivate: [adminGuard], data: { module: 'accounts' } },
  { path: 'accounts/fees-settings', component: AccountsFeesSettingsComponent, canActivate: [adminGuard], data: { module: 'accounts' } },
  { path: 'accounts/bulk-invoices', component: AccountsBulkInvoicesComponent, canActivate: [adminGuard], data: { module: 'accounts' } },
  { path: 'accounts/my-fees', component: MyFeesComponent, canActivate: [adminGuard], data: { module: 'accounts' } },
  { path: 'student/dashboard', component: StudentDashboardComponent, canActivate: [studentGuard] },
  { path: 'my-fees', redirectTo: 'student/dashboard', pathMatch: 'full' },
  { path: 'settings', component: SettingsPageComponent, canActivate: [adminGuard], data: { module: 'settings' } },
  { path: 'settings/create-teacher', loadComponent: () => import('./settings/create-teacher.component').then(m => m.CreateTeacherComponent), canActivate: [adminGuard], data: { module: 'settings' } },
  { path: 'settings/promote-classes', component: PromoteClassesComponent, canActivate: [adminGuard], data: { module: 'settings' } },
  { path: 'marks', component: MarksPageComponent, canActivate: [notStudentGuard, entitlementGuard], data: { module: 'marks' } },
  { path: 'marks/capture', component: CaptureMarksComponent, canActivate: [teacherOrAdminGuard, entitlementGuard], data: { module: 'marks' } },
  { path: 'marks/report-comment', loadComponent: () => import('./marks/report-comment.component').then(m => m.ReportCommentComponent), canActivate: [teacherOrAdminGuard] },
  { path: 'attendance', component: AttendancePageComponent, canActivate: [teacherOrAdminGuard, entitlementGuard], data: { module: 'attendance' } },
  { path: 'exams', loadComponent: () => import('./exams/exams-dashboard.component').then(m => m.ExamsDashboardComponent), canActivate: [teacherOrAdminGuard] },
  { path: 'teaching/assignments', component: AssignmentsPageComponent, canActivate: [teacherOrAdminGuard, entitlementGuard], data: { module: 'teaching' } },
  { path: 'library', component: LibraryPageComponent, canActivate: [authGuard] },
  { path: 'transport_users', loadComponent: () => import('./transport/transport-users.component').then(m => m.TransportUsersComponent), canActivate: [authGuard] },
  { path: 'e-learning', component: ELearningPageComponent, canActivate: [authGuard] },
  { path: 'hr/employees', loadComponent: () => import('./hr/employees-page.component').then(m => m.EmployeesPageComponent), canActivate: [authGuard] },
  { path: 'hr/payroll', component: PayrollPageComponent, canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
];
