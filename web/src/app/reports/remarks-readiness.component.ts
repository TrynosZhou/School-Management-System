import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ClassesService, type ClassEntity } from '../classes/classes.service';

interface RemarkStatus {
  studentId: string;
  studentName: string;
  displayId: string;
  term?: string;
  examType?: string;
  hasTeacherRemark: boolean;
  hasPrincipalRemark: boolean;
  status: string;
  isReady: boolean;
  teacherRemarkLength?: number;
  principalRemarkLength?: number;
}

@Component({
  selector: 'app-remarks-readiness',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wrap">
      <div class="header">
        <h2>📋 Remarks Readiness Dashboard</h2>
        <p class="subtitle">Monitor and manage report card remarks status for parent access</p>
      </div>

      <div class="card">
        <h3>Filters</h3>
        <div class="filters">
          <div class="filter-group">
            <label>Class</label>
            <select [(ngModel)]="classId" (ngModelChange)="classChanged()">
              <option value="">Select class</option>
              <option *ngFor="let c of classes()" [value]="c.id">{{ c.name }} — {{ c.academicYear }}</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Term</label>
            <select [(ngModel)]="term">
              <option value="">Select term</option>
              <option>Term 1</option>
              <option>Term 2</option>
              <option>Term 3</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Exam Type</label>
            <select [(ngModel)]="examType">
              <option value="">All</option>
              <option>Midterm</option>
              <option>End of Term</option>
            </select>
          </div>
          
          <button (click)="load()" [disabled]="loading() || !classId || !term" class="btn-primary">
            {{ loading() ? '🔄 Loading...' : '🔍 Check Status' }}
          </button>
        </div>
      </div>

      <div *ngIf="error()" class="alert alert-error">
        {{ error() }}
      </div>

      <div *ngIf="success()" class="alert alert-success">
        {{ success() }}
      </div>

      <div *ngIf="statuses().length > 0" class="card">
        <div class="stats">
          <div class="stat-box ready">
            <div class="stat-value">{{ readyCount() }}</div>
            <div class="stat-label">Ready for Parents</div>
          </div>
          <div class="stat-box pending">
            <div class="stat-value">{{ pendingCount() }}</div>
            <div class="stat-label">Missing Remarks</div>
          </div>
          <div class="stat-box total">
            <div class="stat-value">{{ statuses().length }}</div>
            <div class="stat-label">Total Students</div>
          </div>
        </div>
      </div>

      <div *ngIf="statuses().length > 0" class="card">
        <div class="toolbar">
          <h3>Student Remarks Status</h3>
          <div class="actions">
            <label class="checkbox-label">
              <input type="checkbox" [(ngModel)]="showOnlyPending" (ngModelChange)="load()">
              Show only pending
            </label>
            <button (click)="bulkPublish()" [disabled]="bulkPublishing()" class="btn-success">
              {{ bulkPublishing() ? '⏳ Publishing...' : '✅ Bulk Publish Ready' }}
            </button>
          </div>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Student ID</th>
                <th>Name</th>
                <th>Teacher Remark</th>
                <th>Principal Remark</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let st of filteredStatuses(); let i = index" 
                  [class.ready-row]="st.isReady"
                  [class.pending-row]="!st.isReady">
                <td>{{ i + 1 }}</td>
                <td><strong>{{ st.displayId }}</strong></td>
                <td>{{ st.studentName }}</td>
                <td>
                  <span class="badge" [class.badge-success]="st.hasTeacherRemark" [class.badge-warning]="!st.hasTeacherRemark">
                    {{ st.hasTeacherRemark ? '✓ Present' : '✗ Missing' }}
                  </span>
                  <small *ngIf="st.teacherRemarkLength" class="text-muted">({{ st.teacherRemarkLength }} chars)</small>
                </td>
                <td>
                  <span class="badge" [class.badge-success]="st.hasPrincipalRemark" [class.badge-warning]="!st.hasPrincipalRemark">
                    {{ st.hasPrincipalRemark ? '✓ Present' : '✗ Missing' }}
                  </span>
                  <small *ngIf="st.principalRemarkLength" class="text-muted">({{ st.principalRemarkLength }} chars)</small>
                </td>
                <td>
                  <span class="status-badge" 
                        [class.status-ready]="st.status === 'ready_for_pdf'"
                        [class.status-draft]="st.status === 'draft' || !st.status">
                    {{ st.status || 'draft' }}
                  </span>
                </td>
                <td>
                  <button (click)="editRemarks(st)" class="btn-sm">✏️ Edit</button>
                  <button (click)="testParentAccess(st)" class="btn-sm">🔍 Test</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div *ngIf="!loading() && statuses().length === 0 && classId && term" class="empty-state">
        <p>No students found for the selected class and term.</p>
        <p class="text-muted">Try selecting a different class or ensure students are enrolled.</p>
      </div>
    </div>
  `,
  styles: [`
    .wrap { max-width: 1400px; margin: 24px auto; padding: 0 16px; }
    .header { margin-bottom: 24px; }
    .header h2 { margin: 0 0 8px; color: #111827; font-size: 28px; }
    .subtitle { color: #6b7280; font-size: 14px; margin: 0; }
    
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card h3 { margin: 0 0 16px; font-size: 18px; color: #111827; }
    
    .filters { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
    .filter-group { display: flex; flex-direction: column; gap: 6px; }
    .filter-group label { font-size: 13px; font-weight: 600; color: #374151; }
    
    select { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; min-width: 180px; }
    select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
    
    .btn-primary { padding: 8px 16px; background: #3b82f6; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-primary:hover:not(:disabled) { background: #2563eb; transform: translateY(-1px); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .btn-success { padding: 8px 16px; background: #10b981; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-success:hover:not(:disabled) { background: #059669; transform: translateY(-1px); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .btn-success:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .btn-sm { padding: 4px 8px; font-size: 12px; border: 1px solid #d1d5db; background: #fff; border-radius: 6px; cursor: pointer; transition: all 0.2s; margin-right: 4px; }
    .btn-sm:hover { background: #f3f4f6; border-color: #9ca3af; }
    
    .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
    .alert-error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .alert-success { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .stat-box { padding: 20px; border-radius: 8px; text-align: center; }
    .stat-box.ready { background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); }
    .stat-box.pending { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); }
    .stat-box.total { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); }
    .stat-value { font-size: 36px; font-weight: 700; color: #111827; }
    .stat-label { font-size: 14px; color: #6b7280; margin-top: 4px; }
    
    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .toolbar h3 { margin: 0; }
    .actions { display: flex; gap: 12px; align-items: center; }
    .checkbox-label { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #374151; cursor: pointer; }
    
    .table-container { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    thead th { background: #f9fafb; padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
    tbody td { padding: 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    tbody tr:hover { background: #f9fafb; }
    .ready-row { background: #f0fdf4; }
    .pending-row { background: #fffbeb; }
    
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .badge-success { background: #d1fae5; color: #065f46; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    
    .status-badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .status-ready { background: #10b981; color: #fff; }
    .status-draft { background: #6b7280; color: #fff; }
    
    .text-muted { color: #9ca3af; font-size: 12px; margin-left: 4px; }
    
    .empty-state { text-align: center; padding: 40px; color: #6b7280; }
    .empty-state p { margin: 8px 0; }
  `]
})
export class RemarksReadinessComponent {
  private http = inject(HttpClient);
  private classesSvc = inject(ClassesService);

  classes = signal<ClassEntity[]>([]);
  classId = '';
  term = '';
  examType = '';
  showOnlyPending = false;

  statuses = signal<RemarkStatus[]>([]);
  loading = signal(false);
  bulkPublishing = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  constructor() {
    this.classesSvc.list().subscribe(res => this.classes.set(res));
  }

  classChanged() {
    this.statuses.set([]);
  }

  async load() {
    if (!this.classId || !this.term) return;
    
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    
    try {
      // Get enrolled students
      const enrollments: any = await this.http.get(`/api/enrollments/class/${this.classId}`).toPromise();
      const students = (enrollments || []).map((e: any) => e.student).filter(Boolean);
      
      if (students.length === 0) {
        this.statuses.set([]);
        this.loading.set(false);
        return;
      }

      // Check remarks for each student
      const statuses: RemarkStatus[] = [];
      for (const student of students) {
        try {
          const params: any = { studentId: student.id };
          if (this.term) params.term = this.term;
          if (this.examType) params.examType = this.examType;
          
          const remark: any = await this.http.get('/api/reports/remarks', { params }).toPromise();
          
          const hasTeacher = !!(remark?.teacherRemark && remark.teacherRemark.toString().trim().length > 0);
          const hasPrincipal = !!(remark?.principalRemark && remark.principalRemark.toString().trim().length > 0);
          const status = remark?.status || 'draft';
          const isReady = status === 'ready_for_pdf' && hasTeacher && hasPrincipal;
          
          statuses.push({
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            displayId: student.studentId || student.id,
            term: this.term,
            examType: this.examType || undefined,
            hasTeacherRemark: hasTeacher,
            hasPrincipalRemark: hasPrincipal,
            status,
            isReady,
            teacherRemarkLength: remark?.teacherRemark?.length,
            principalRemarkLength: remark?.principalRemark?.length
          });
        } catch (err) {
          // Student has no remarks record yet
          statuses.push({
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            displayId: student.studentId || student.id,
            term: this.term,
            examType: this.examType || undefined,
            hasTeacherRemark: false,
            hasPrincipalRemark: false,
            status: 'draft',
            isReady: false
          });
        }
      }
      
      this.statuses.set(statuses);
    } catch (err: any) {
      this.error.set(err?.error?.message || err?.message || 'Failed to load remarks status');
    } finally {
      this.loading.set(false);
    }
  }

  filteredStatuses() {
    if (this.showOnlyPending) {
      return this.statuses().filter(st => !st.isReady);
    }
    return this.statuses();
  }

  readyCount() {
    return this.statuses().filter(st => st.isReady).length;
  }

  pendingCount() {
    return this.statuses().filter(st => !st.isReady).length;
  }

  editRemarks(st: RemarkStatus) {
    // Navigate to report card viewer for this student
    const params = new URLSearchParams();
    if (st.term) params.set('term', st.term);
    if (st.examType) params.set('examType', st.examType);
    const url = `/reports/report-card/${st.studentId}/view?${params.toString()}`;
    window.location.href = url;
  }

  async testParentAccess(st: RemarkStatus) {
    this.error.set(null);
    this.success.set(null);
    
    try {
      const token = localStorage.getItem('access_token') || '';
      const params = new URLSearchParams();
      if (st.term) params.set('term', st.term);
      if (st.examType) params.set('examType', st.examType);
      
      const resp = await fetch(`/api/reports/report-card/${st.studentId}?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (resp.ok) {
        this.success.set(`✅ ${st.studentName}: Report card is accessible`);
      } else if (resp.status === 403) {
        const text = await resp.text();
        let msg = 'Access denied';
        try {
          const json = JSON.parse(text);
          msg = json.message || msg;
        } catch {}
        this.error.set(`❌ ${st.studentName}: ${msg}`);
      } else {
        this.error.set(`❌ ${st.studentName}: Error ${resp.status}`);
      }
    } catch (err: any) {
      this.error.set(`❌ ${st.studentName}: ${err.message}`);
    }
    
    setTimeout(() => {
      this.error.set(null);
      this.success.set(null);
    }, 5000);
  }

  async bulkPublish() {
    if (!this.term) return;
    
    this.bulkPublishing.set(true);
    this.error.set(null);
    this.success.set(null);
    
    try {
      // Update all students with complete remarks to ready_for_pdf
      const ready = this.statuses().filter(st => st.hasTeacherRemark && st.hasPrincipalRemark && st.status !== 'ready_for_pdf');
      
      if (ready.length === 0) {
        this.success.set('ℹ️ All eligible students are already published');
        this.bulkPublishing.set(false);
        return;
      }
      
      let updated = 0;
      for (const st of ready) {
        try {
          // Force status update by saving remarks again
          const payload = {
            studentId: st.studentId,
            term: st.term,
            examType: st.examType,
            teacherRemark: 'ready', // will be preserved by backend
            principalRemark: 'ready'
          };
          
          await this.http.put('/api/reports/remarks', payload).toPromise();
          updated++;
        } catch (err) {
          console.error(`Failed to publish for ${st.studentName}:`, err);
        }
      }
      
      this.success.set(`✅ Published ${updated} of ${ready.length} eligible report cards`);
      
      // Reload to reflect changes
      await this.load();
    } catch (err: any) {
      this.error.set(err?.error?.message || err?.message || 'Bulk publish failed');
    } finally {
      this.bulkPublishing.set(false);
    }
  }
}
