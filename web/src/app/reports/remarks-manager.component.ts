import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ClassesService, type ClassEntity } from '../classes/classes.service';

interface Student {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
}

interface RemarkRecord {
  studentId: string;
  studentName: string;
  displayId: string;
  teacherRemark: string | null;
  principalRemark: string | null;
  status: string;
  isReady: boolean;
  isEditing: boolean;
  isSaving: boolean;
}

interface SubjectMark {
  subject: string;
  mark: number;
  grade: string;
  position?: number;
  positionTotal?: number;
}

interface StudentReportData {
  studentId: string;
  studentName: string;
  displayId: string;
  className: string;
  marks: SubjectMark[];
  teacherRemark: string;
  principalRemark: string;
  totalMarks: number;
  averageMarks: number;
  overallPosition?: number;
}

@Component({
  selector: 'app-remarks-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wrap">
      <div class="header">
        <h2>✏️ Report Card Remarks Manager</h2>
        <p class="subtitle">Add and edit teacher & principal remarks for parent report card access</p>
      </div>

      <div class="card">
        <h3>📌 Filters</h3>
        <div class="filters">
          <div class="filter-group">
            <label>Class *</label>
            <select [(ngModel)]="classId" (ngModelChange)="classChanged()">
              <option value="">Select class</option>
              <option *ngFor="let c of classes()" [value]="c.id">{{ c.name }} — {{ c.academicYear }}</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Term *</label>
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
          
          <button (click)="loadRemarks()" [disabled]="loading() || !classId || !term" class="btn-primary">
            {{ loading() ? '🔄 Loading...' : '🔍 Load Students' }}
          </button>
        </div>
      </div>

      <div *ngIf="error()" class="alert alert-error">
        {{ error() }}
      </div>

      <div *ngIf="success()" class="alert alert-success">
        {{ success() }}
      </div>

      <div *ngIf="records().length > 0" class="card">
        <div class="stats">
          <div class="stat-box ready">
            <div class="stat-value">{{ readyCount() }}</div>
            <div class="stat-label">✅ Ready for Parents</div>
          </div>
          <div class="stat-box pending">
            <div class="stat-value">{{ pendingCount() }}</div>
            <div class="stat-label">⏳ Pending</div>
          </div>
          <div class="stat-box total">
            <div class="stat-value">{{ records().length }}</div>
            <div class="stat-label">📊 Total Students</div>
          </div>
        </div>
      </div>

      <div *ngIf="records().length > 0" class="card">
        <div class="toolbar">
          <h3>Student Remarks ({{ records().length }})</h3>
          <div class="actions">
            <button (click)="expandAll()" class="btn-secondary">📖 Expand All</button>
            <button (click)="collapseAll()" class="btn-secondary">📕 Collapse All</button>
            <button (click)="saveAllDrafts()" [disabled]="savingAll()" class="btn-success">
              {{ savingAll() ? '⏳ Saving...' : '💾 Save All Changes' }}
            </button>
          </div>
        </div>

        <div class="records-list">
          <div *ngFor="let rec of records(); let i = index" 
               class="record-card"
               [class.ready]="rec.isReady"
               [class.pending]="!rec.isReady">
            <div class="record-header" (click)="toggleEdit(rec)">
              <div class="student-info">
                <span class="student-number">{{ i + 1 }}.</span>
                <strong class="student-id clickable" (click)="openReportModal(rec); $event.stopPropagation()" title="Click to view report card">{{ rec.displayId }}</strong>
                <span class="student-name">{{ rec.studentName }}</span>
              </div>
              <div class="header-actions">
                <span class="status-badge" 
                      [class.status-ready]="rec.status === 'ready_for_pdf'"
                      [class.status-draft]="rec.status !== 'ready_for_pdf'">
                  {{ rec.status === 'ready_for_pdf' ? '✅ Ready' : '📝 Draft' }}
                </span>
                <button class="toggle-btn" (click)="toggleEdit(rec); $event.stopPropagation()">
                  {{ rec.isEditing ? '▼' : '▶' }}
                </button>
              </div>
            </div>

            <div *ngIf="rec.isEditing" class="record-body">
              <div class="remark-section">
                <label class="remark-label">
                  <span class="label-text">👨‍🏫 Teacher's Remark</span>
                  <span class="char-count" 
                        [class.warning]="!rec.teacherRemark || rec.teacherRemark.length < 20">
                    {{ rec.teacherRemark?.length || 0 }} chars
                  </span>
                </label>
                <textarea 
                  [(ngModel)]="rec.teacherRemark"
                  placeholder="Enter teacher's remark for this student... (e.g., 'Excellent performance in mathematics. Shows strong analytical skills and dedication.')"
                  rows="3"
                  class="remark-input"
                  [class.empty]="!rec.teacherRemark || rec.teacherRemark.trim().length === 0"
                ></textarea>
              </div>

              <div class="remark-section">
                <label class="remark-label">
                  <span class="label-text">🎓 Principal's Remark</span>
                  <span class="char-count"
                        [class.warning]="!rec.principalRemark || rec.principalRemark.length < 20">
                    {{ rec.principalRemark?.length || 0 }} chars
                  </span>
                </label>
                <textarea 
                  [(ngModel)]="rec.principalRemark"
                  placeholder="Enter principal's remark for this student... (e.g., 'Well done. Continue to excel in all subjects and maintain good discipline.')"
                  rows="3"
                  class="remark-input"
                  [class.empty]="!rec.principalRemark || rec.principalRemark.trim().length === 0"
                ></textarea>
              </div>

              <div class="record-actions">
                <button (click)="saveRemark(rec)" 
                        [disabled]="rec.isSaving || (!rec.teacherRemark?.trim() && !rec.principalRemark?.trim())"
                        class="btn-save">
                  {{ rec.isSaving ? '⏳ Saving...' : '💾 Save' }}
                </button>
                <button (click)="clearRemark(rec)" class="btn-clear">
                  🗑️ Clear
                </button>
                <div *ngIf="rec.teacherRemark?.trim() && rec.principalRemark?.trim()" class="ready-indicator">
                  ✅ Both remarks present — will be available to parents
                </div>
                <div *ngIf="!rec.teacherRemark?.trim() || !rec.principalRemark?.trim()" class="pending-indicator">
                  ⚠️ Both remarks required for parent access
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="!loading() && records().length === 0 && classId && term" class="empty-state">
        <div class="empty-icon">📚</div>
        <p class="empty-title">No students found</p>
        <p class="empty-text">Try selecting a different class or ensure students are enrolled.</p>
      </div>

      <!-- Report Card Modal -->
      <div *ngIf="showModal()" class="modal-backdrop" (click)="closeModal()"></div>
      <div *ngIf="showModal()" class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="modal-title">
            <span class="modal-icon">📄</span>
            <span>Report Card Preview</span>
          </div>
          <button class="modal-close" (click)="closeModal()" type="button">✖</button>
        </div>
        <div class="modal-body">
          <div *ngIf="loadingReport()" class="modal-loading">
            <div class="spinner">⏳</div>
            <p>Loading report card...</p>
          </div>
          
          <div *ngIf="!loadingReport() && reportData()" class="report-preview">
            <!-- Student Info -->
            <div class="report-section">
              <h3 class="section-title">Student Information</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Student ID:</span>
                  <span class="info-value">{{ reportData()?.displayId }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Name:</span>
                  <span class="info-value">{{ reportData()?.studentName }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Class:</span>
                  <span class="info-value">{{ reportData()?.className }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Term:</span>
                  <span class="info-value">{{ term }}</span>
                </div>
              </div>
            </div>

            <!-- Marks Table -->
            <div class="report-section">
              <h3 class="section-title">📊 Academic Performance</h3>
              <div *ngIf="reportData()?.marks && reportData()!.marks.length > 0" class="marks-table-container">
                <table class="marks-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Mark</th>
                      <th>Grade</th>
                      <th>Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let mark of reportData()?.marks">
                      <td>{{ mark.subject }}</td>
                      <td>{{ mark.mark }}</td>
                      <td><span class="grade-badge">{{ mark.grade }}</span></td>
                      <td>{{ mark.position ? (mark.position + ' / ' + (mark.positionTotal || '?')) : '-' }}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td><strong>Total</strong></td>
                      <td><strong>{{ reportData()?.totalMarks }}</strong></td>
                      <td colspan="2"></td>
                    </tr>
                    <tr>
                      <td><strong>Average</strong></td>
                      <td><strong>{{ reportData()?.averageMarks?.toFixed(1) }}%</strong></td>
                      <td colspan="2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div *ngIf="!reportData()?.marks || reportData()!.marks.length === 0" class="no-marks">
                <p>No marks recorded for this term.</p>
              </div>
            </div>

            <!-- Remarks Section -->
            <div class="report-section">
              <h3 class="section-title">✍️ Remarks</h3>
              <div class="remark-form">
                <div class="form-group">
                  <label class="form-label">
                    <span>👨‍🏫 Teacher's Remark</span>
                    <span class="char-count">{{ modalTeacherRemark().length }} chars</span>
                  </label>
                  <textarea 
                    [(ngModel)]="modalTeacherRemark"
                    placeholder="Enter teacher's remark based on performance..."
                    rows="3"
                    class="form-textarea"
                  ></textarea>
                </div>
                <div class="form-group">
                  <label class="form-label">
                    <span>🎓 Principal's Remark</span>
                    <span class="char-count">{{ modalPrincipalRemark().length }} chars</span>
                  </label>
                  <textarea 
                    [(ngModel)]="modalPrincipalRemark"
                    placeholder="Enter principal's remark..."
                    rows="3"
                    class="form-textarea"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="modalError()" class="modal-error">
            {{ modalError() }}
          </div>
        </div>
        <div class="modal-footer">
          <button (click)="closeModal()" class="btn-secondary" type="button">Cancel</button>
          <button (click)="saveFromModal()" [disabled]="savingModal()" class="btn-primary" type="button">
            {{ savingModal() ? '⏳ Saving...' : '💾 Save Remarks' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wrap { max-width: 1400px; margin: 24px auto; padding: 0 16px; font-family: system-ui, -apple-system, sans-serif; }
    .header { margin-bottom: 24px; }
    .header h2 { margin: 0 0 8px; color: #111827; font-size: 28px; font-weight: 700; }
    .subtitle { color: #6b7280; font-size: 14px; margin: 0; }
    
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card h3 { margin: 0 0 16px; font-size: 18px; color: #111827; font-weight: 600; }
    
    .filters { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
    .filter-group { display: flex; flex-direction: column; gap: 6px; }
    .filter-group label { font-size: 13px; font-weight: 600; color: #374151; }
    
    select { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; min-width: 180px; background: #fff; }
    select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
    
    .btn-primary, .btn-success, .btn-secondary, .btn-save, .btn-clear {
      padding: 8px 16px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 14px;
    }
    .btn-primary { background: #3b82f6; color: #fff; }
    .btn-primary:hover:not(:disabled) { background: #2563eb; transform: translateY(-1px); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .btn-success { background: #10b981; color: #fff; }
    .btn-success:hover:not(:disabled) { background: #059669; transform: translateY(-1px); }
    .btn-success:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
    .btn-secondary:hover { background: #e5e7eb; }
    
    .btn-save { background: #3b82f6; color: #fff; }
    .btn-save:hover:not(:disabled) { background: #2563eb; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .btn-clear { background: #ef4444; color: #fff; }
    .btn-clear:hover { background: #dc2626; }
    
    .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
    .alert-error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .alert-success { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .stat-box { padding: 24px; border-radius: 10px; text-align: center; }
    .stat-box.ready { background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); }
    .stat-box.pending { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); }
    .stat-box.total { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); }
    .stat-value { font-size: 36px; font-weight: 700; color: #111827; }
    .stat-label { font-size: 13px; color: #6b7280; margin-top: 6px; font-weight: 500; }
    
    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
    .toolbar h3 { margin: 0; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    
    .records-list { display: flex; flex-direction: column; gap: 12px; }
    .record-card { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; transition: all 0.2s; }
    .record-card.ready { border-left: 4px solid #10b981; }
    .record-card.pending { border-left: 4px solid #f59e0b; }
    
    .record-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: #f9fafb; cursor: pointer; user-select: none; }
    .record-header:hover { background: #f3f4f6; }
    
    .student-info { display: flex; align-items: center; gap: 10px; }
    .student-number { color: #9ca3af; font-size: 14px; min-width: 30px; }
    .student-id { color: #3b82f6; font-size: 14px; min-width: 100px; }
    .student-id.clickable { cursor: pointer; text-decoration: underline; transition: all 0.2s; }
    .student-id.clickable:hover { color: #1d4ed8; transform: scale(1.05); }
    .student-name { color: #111827; font-size: 14px; font-weight: 500; }
    
    .header-actions { display: flex; align-items: center; gap: 10px; }
    .status-badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .status-ready { background: #10b981; color: #fff; }
    .status-draft { background: #f59e0b; color: #fff; }
    
    .toggle-btn { background: none; border: none; color: #6b7280; cursor: pointer; font-size: 16px; padding: 4px 8px; }
    .toggle-btn:hover { color: #111827; }
    
    .record-body { padding: 20px; background: #fff; }
    .remark-section { margin-bottom: 16px; }
    .remark-label { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .label-text { font-size: 14px; font-weight: 600; color: #374151; }
    .char-count { font-size: 12px; color: #9ca3af; }
    .char-count.warning { color: #f59e0b; font-weight: 600; }
    
    .remark-input { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; font-family: inherit; resize: vertical; transition: all 0.2s; }
    .remark-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
    .remark-input.empty { border-color: #fbbf24; background: #fffbeb; }
    .remark-input::placeholder { color: #9ca3af; }
    
    .record-actions { display: flex; gap: 10px; align-items: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb; flex-wrap: wrap; }
    .ready-indicator { color: #059669; font-size: 13px; font-weight: 600; margin-left: auto; }
    .pending-indicator { color: #d97706; font-size: 13px; font-weight: 600; margin-left: auto; }
    
    .empty-state { text-align: center; padding: 60px 20px; color: #6b7280; }
    .empty-icon { font-size: 64px; margin-bottom: 16px; }
    .empty-title { font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 8px; }
    .empty-text { font-size: 14px; margin: 0; }

    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; }
    .modal { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); background: #fff; border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.3); width: min(900px, 95vw); max-height: 85vh; display: flex; flex-direction: column; z-index: 1001; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 2px solid #e5e7eb; background: #f9fafb; }
    .modal-title { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 700; color: #111827; }
    .modal-icon { font-size: 24px; }
    .modal-close { background: none; border: none; font-size: 20px; color: #6b7280; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: all 0.2s; }
    .modal-close:hover { background: #e5e7eb; color: #111827; }
    .modal-body { padding: 20px; overflow-y: auto; flex: 1; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid #e5e7eb; background: #f9fafb; }
    
    .modal-loading { text-align: center; padding: 60px 20px; color: #6b7280; }
    .spinner { font-size: 48px; margin-bottom: 16px; animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    
    .report-preview { display: flex; flex-direction: column; gap: 24px; }
    .report-section { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
    .section-title { margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
    .info-label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; }
    .info-value { font-size: 14px; color: #111827; font-weight: 500; }
    
    .marks-table-container { overflow-x: auto; }
    .marks-table { width: 100%; border-collapse: collapse; }
    .marks-table thead th { background: #111827; color: #fff; padding: 10px; text-align: left; font-size: 13px; font-weight: 600; }
    .marks-table tbody td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    .marks-table tbody tr:hover { background: #f3f4f6; }
    .marks-table tfoot td { padding: 10px; background: #f9fafb; font-size: 14px; border-top: 2px solid #111827; }
    .grade-badge { display: inline-block; padding: 3px 8px; background: #3b82f6; color: #fff; border-radius: 4px; font-weight: 600; font-size: 12px; }
    .no-marks { text-align: center; padding: 40px 20px; color: #6b7280; }
    
    .remark-form { display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-label { display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 600; color: #374151; }
    .form-textarea { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; font-family: inherit; resize: vertical; }
    .form-textarea:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
    
    .modal-error { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 6px; margin-top: 16px; }
  `]
})
export class RemarksManagerComponent {
  private http = inject(HttpClient);
  private classesSvc = inject(ClassesService);

  classes = signal<ClassEntity[]>([]);
  classId = '';
  term = '';
  examType = '';

  // Modal state
  showModal = signal(false);
  loadingReport = signal(false);
  reportData = signal<StudentReportData | null>(null);
  modalTeacherRemark = signal('');
  modalPrincipalRemark = signal('');
  modalError = signal<string | null>(null);
  savingModal = signal(false);
  currentModalRecord: RemarkRecord | null = null;

  records = signal<RemarkRecord[]>([]);
  loading = signal(false);
  savingAll = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  constructor() {
    this.classesSvc.list().subscribe(res => this.classes.set(res));
  }

  classChanged() {
    this.records.set([]);
    this.error.set(null);
    this.success.set(null);
  }

  async loadRemarks() {
    if (!this.classId || !this.term) {
      this.error.set('Please select both class and term');
      return;
    }
    
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    
    try {
      // Get enrolled students
      const enrollments: any = await this.http.get(`/api/enrollments/class/${this.classId}`).toPromise();
      const students: Student[] = (enrollments || []).map((e: any) => e.student).filter(Boolean);
      
      if (students.length === 0) {
        this.records.set([]);
        this.loading.set(false);
        this.error.set('No students enrolled in this class');
        return;
      }

      // Load remarks for each student
      const records: RemarkRecord[] = [];
      for (const student of students) {
        try {
          const params: any = { studentId: student.id };
          if (this.term) params.term = this.term;
          if (this.examType) params.examType = this.examType;
          
          const remark: any = await this.http.get('/api/reports/remarks', { params }).toPromise();
          
          const teacherRemark = remark?.teacherRemark || '';
          const principalRemark = remark?.principalRemark || '';
          const status = remark?.status || 'draft';
          const isReady = status === 'ready_for_pdf' && teacherRemark.trim().length > 0 && principalRemark.trim().length > 0;
          
          records.push({
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            displayId: student.studentId || student.id,
            teacherRemark,
            principalRemark,
            status,
            isReady,
            isEditing: false,
            isSaving: false
          });
        } catch {
          // No remarks yet - create empty record
          records.push({
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            displayId: student.studentId || student.id,
            teacherRemark: '',
            principalRemark: '',
            status: 'draft',
            isReady: false,
            isEditing: false,
            isSaving: false
          });
        }
      }
      
      this.records.set(records);
      this.success.set(`✅ Loaded ${records.length} students`);
      
      setTimeout(() => this.success.set(null), 3000);
    } catch (err: any) {
      this.error.set(err?.error?.message || err?.message || 'Failed to load remarks');
    } finally {
      this.loading.set(false);
    }
  }

  toggleEdit(rec: RemarkRecord) {
    rec.isEditing = !rec.isEditing;
    this.records.set([...this.records()]);
  }

  expandAll() {
    const updated = this.records().map(r => ({ ...r, isEditing: true }));
    this.records.set(updated);
  }

  collapseAll() {
    const updated = this.records().map(r => ({ ...r, isEditing: false }));
    this.records.set(updated);
  }

  async saveRemark(rec: RemarkRecord) {
    if (!rec.teacherRemark?.trim() && !rec.principalRemark?.trim()) {
      return;
    }

    rec.isSaving = true;
    this.error.set(null);
    this.success.set(null);
    this.records.set([...this.records()]);
    
    try {
      const payload = {
        studentId: rec.studentId,
        term: this.term,
        examType: this.examType || undefined,
        teacherRemark: rec.teacherRemark,
        principalRemark: rec.principalRemark
      };
      
      const result: any = await this.http.put('/api/reports/remarks', payload).toPromise();
      
      // Update record status
      rec.status = result.status || 'draft';
      rec.isReady = rec.status === 'ready_for_pdf' && !!rec.teacherRemark?.trim() && !!rec.principalRemark?.trim();
      
      this.success.set(`✅ Saved remarks for ${rec.studentName}`);
      
      setTimeout(() => this.success.set(null), 3000);
    } catch (err: any) {
      this.error.set(`❌ Failed to save remarks for ${rec.studentName}: ${err?.error?.message || err?.message || 'Unknown error'}`);
    } finally {
      rec.isSaving = false;
      this.records.set([...this.records()]);
    }
  }

  clearRemark(rec: RemarkRecord) {
    rec.teacherRemark = '';
    rec.principalRemark = '';
    this.records.set([...this.records()]);
  }

  async saveAllDrafts() {
    const toSave = this.records().filter(r => 
      (r.teacherRemark?.trim() || r.principalRemark?.trim()) && r.status !== 'ready_for_pdf'
    );
    
    if (toSave.length === 0) {
      this.error.set('No changes to save');
      setTimeout(() => this.error.set(null), 3000);
      return;
    }

    this.savingAll.set(true);
    this.error.set(null);
    this.success.set(null);
    
    let saved = 0;
    for (const rec of toSave) {
      try {
        const payload = {
          studentId: rec.studentId,
          term: this.term,
          examType: this.examType || undefined,
          teacherRemark: rec.teacherRemark,
          principalRemark: rec.principalRemark
        };
        
        const result: any = await this.http.put('/api/reports/remarks', payload).toPromise();
        rec.status = result.status || 'draft';
        rec.isReady = rec.status === 'ready_for_pdf';
        saved++;
      } catch (err) {
        console.error(`Failed to save for ${rec.studentName}:`, err);
      }
    }
    
    this.records.set([...this.records()]);
    this.success.set(`✅ Saved ${saved} of ${toSave.length} student remarks`);
    this.savingAll.set(false);
    
    setTimeout(() => this.success.set(null), 5000);
  }

  readyCount() {
    return this.records().filter(r => r.isReady).length;
  }

  pendingCount() {
    return this.records().filter(r => !r.isReady).length;
  }

  async openReportModal(rec: RemarkRecord) {
    this.currentModalRecord = rec;
    this.showModal.set(true);
    this.loadingReport.set(true);
    this.modalError.set(null);
    this.reportData.set(null);
    
    // Pre-fill existing remarks
    this.modalTeacherRemark.set(rec.teacherRemark || '');
    this.modalPrincipalRemark.set(rec.principalRemark || '');

    try {
      // Fetch marks for this student
      const params: any = { 
        studentId: rec.studentId,
        term: this.term
      };
      if (this.examType) params.examType = this.examType;

      const marks: any[] = await this.http.get<any[]>('/api/marks', { params }).toPromise() || [];
      
      // Use grades from API (calculated based on configured grading bands)
      const subjectMarks: SubjectMark[] = marks.map(m => ({
        subject: m.subject?.name || 'Unknown',
        mark: Number(m.score) || 0,  // API uses 'score' not 'mark'
        grade: (m.grade && String(m.grade).trim()) || '-',
        position: m.position,
        positionTotal: m.positionTotal
      }));

      const totalMarks = subjectMarks.reduce((sum, m) => sum + m.mark, 0);
      const averageMarks = subjectMarks.length > 0 ? totalMarks / subjectMarks.length : 0;

      // Find class name
      const selectedClass = this.classes().find(c => c.id === this.classId);

      this.reportData.set({
        studentId: rec.studentId,
        studentName: rec.studentName,
        displayId: rec.displayId,
        className: selectedClass?.name || 'N/A',
        marks: subjectMarks,
        teacherRemark: rec.teacherRemark || '',
        principalRemark: rec.principalRemark || '',
        totalMarks,
        averageMarks
      });
    } catch (err: any) {
      this.modalError.set('Failed to load report card data: ' + (err?.error?.message || err?.message || 'Unknown error'));
    } finally {
      this.loadingReport.set(false);
    }
  }

  closeModal() {
    this.showModal.set(false);
    this.reportData.set(null);
    this.modalError.set(null);
    this.currentModalRecord = null;
  }

  async saveFromModal() {
    if (!this.currentModalRecord) return;

    this.savingModal.set(true);
    this.modalError.set(null);

    try {
      const payload = {
        studentId: this.currentModalRecord.studentId,
        term: this.term,
        examType: this.examType || undefined,
        teacherRemark: this.modalTeacherRemark(),
        principalRemark: this.modalPrincipalRemark()
      };

      const result: any = await this.http.put('/api/reports/remarks', payload).toPromise();

      // Update the record in the list
      this.currentModalRecord.teacherRemark = this.modalTeacherRemark();
      this.currentModalRecord.principalRemark = this.modalPrincipalRemark();
      this.currentModalRecord.status = result.status || 'draft';
      this.currentModalRecord.isReady = this.currentModalRecord.status === 'ready_for_pdf';

      this.records.set([...this.records()]);
      this.success.set(`✅ Saved remarks for ${this.currentModalRecord.studentName}`);
      
      setTimeout(() => this.success.set(null), 3000);
      
      // Close modal after successful save
      this.closeModal();
    } catch (err: any) {
      this.modalError.set('Failed to save remarks: ' + (err?.error?.message || err?.message || 'Unknown error'));
    } finally {
      this.savingModal.set(false);
    }
  }
}
