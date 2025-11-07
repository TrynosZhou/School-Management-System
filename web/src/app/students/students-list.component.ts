import { Component, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { StudentsService, type Student } from './students.service';
import { ReportService } from '../reports/report.service';
import { AuthStateService } from '../auth/auth-state.service';

@Component({
  selector: 'app-students-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="toolbar">
        <h2>Students</h2>
        <div class="right">
          <button (click)="viewClasses()">Classes</button>
          <button (click)="create()">New Student</button>
          <button *ngIf="canEnroll()" (click)="enroll()">Enroll student</button>
        </div>
      </div>

      <div class="kpis">
        <div class="kpi-tile red">
          <div class="num">{{ students().length }}</div>
          <div class="label">Total Students</div>
        </div>
        <div class="kpi-tile green">
          <div class="num">{{ maleCount() }}</div>
          <div class="label">Male</div>
        </div>
        <div class="kpi-tile cyan">
          <div class="num">{{ femaleCount() }}</div>
          <div class="label">Female</div>
        </div>
        <div class="kpi-tile blue">
          <div class="num">{{ boardersCount() }}</div>
          <div class="label">Boarders</div>
        </div>
      </div>

      <div class="filters">
        <input placeholder="Search by Student ID or Last name" (input)="onSearch($event)" />
      </div>

      <table class="table" *ngIf="students().length; else empty">
        <thead>
          <tr>
            <th>Student ID</th>
            <th>First</th>
            <th>Last</th>
            <th>Boarding</th>
            <th>DOB</th>
            <th>Religion</th>
            <th>Gender</th>
            <th>Address</th>
            <th>Contact Number</th>
            <th>User Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let s of students()">
            <td>
              <a href (click)="$event.preventDefault(); openModal(s)" title="View details">{{ s.studentId || '-' }}</a>
            </td>
            <td>{{ s.firstName }}</td>
            <td>{{ s.lastName }}</td>
            <td>{{ s.boardingStatus === 'boarder' ? 'Boarder' : 'Day' }}</td>
            <td>{{ s.dob || '-' }}</td>
            <td>{{ (s.religion || '').toLowerCase().includes('christ') ? 'Christianity' : 'Other' }}</td>
            <td>{{ s.gender || '-' }}</td>
            <td>{{ s.address || '-' }}</td>
            <td>{{ s.contactNumber || '-' }}</td>
            <td>
              <div class="actions">
                <a [routerLink]="['/students', s.id]">Edit</a>
                <a *ngIf="canDelete()" href (click)="$event.preventDefault(); deleteStudent(s)" title="Delete student">Delete</a>
                <a *ngIf="canEnroll()" [routerLink]="['/enrollments/new']" [queryParams]="{ studentId: s.id }">Enroll</a>
                <a *ngIf="canRecordPayment()" [routerLink]="['/accounts/record-payment']" [queryParams]="{ student: s.studentId || s.id }">Payments</a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Student Preview Modal -->
      <div *ngIf="showModal()" class="modal-backdrop" (click)="closeModal()"></div>
      <div *ngIf="showModal()" class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Student ID Card</h3>
          <button class="close" (click)="closeModal()" type="button">✖</button>
        </div>
        <div class="modal-body">
          <div *ngIf="loadingModal()" class="loading">⏳ Loading...</div>
          <div *ngIf="!loadingModal() && pdfSafeUrl()" style="height:560px">
            <iframe [src]="pdfSafeUrl()" style="width:100%;height:100%;border:0"></iframe>
          </div>
          <div *ngIf="!loadingModal() && !pdfSafeUrl() && selectedStudent() as st">
            <div class="grid">
              <div class="row"><span class="label">Last Name:</span> <span class="val">{{ st.lastName || '-' }}</span></div>
              <div class="row"><span class="label">First Name:</span> <span class="val">{{ st.firstName || '-' }}</span></div>
              <div class="row"><span class="label">Student ID:</span> <span class="val">{{ st.studentId || st.id }}</span></div>
              <div class="row"><span class="label">Gender:</span> <span class="val">{{ st.gender || '-' }}</span></div>
              <div class="row"><span class="label">Address:</span> <span class="val">{{ st.address || '-' }}</span></div>
              <div class="row"><span class="label">Class:</span> <span class="val">{{ selectedClassName() || '-' }}</span></div>
            </div>
          </div>
          <div *ngIf="modalError()" class="error">{{ modalError() }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn" *ngIf="pdfUrl()" (click)="openPdfInNewTab()" type="button">Open in new tab</button>
          <button class="btn" (click)="closeModal()" type="button">Close</button>
        </div>
      </div>
      <ng-template #empty>
        <p>No students yet.</p>
      </ng-template>
    </div>
  `,
  styles: [`
    .wrap{max-width:1100px;margin:24px auto}
    .toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .toolbar .right{display:flex;gap:28px}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:8px 0 14px}
    .kpi-tile{color:#fff;border-radius:6px;padding:12px}
    .kpi-tile .num{font-size:22px;font-weight:700;color:#fff}
    .kpi-tile .label{color:#fff;font-weight:700;opacity:1}
    .kpi-tile.red{background:#e05a47}
    .kpi-tile.green{background:#18a558}
    .kpi-tile.cyan{background:#12b6df}
    .kpi-tile.blue{background:#0b53a5}
    .filters{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
    .filters input,.filters select{padding:8px;border:1px solid #ddd;border-radius:6px}
    .filters input{width:260px !important}
    .table{width:100%;border-collapse:collapse}
    .table th,.table td{border:1px solid #ddd;padding:8px}
    /* Columns sizing */
    /* Wider Address (col 8) */
    .table th:nth-child(8), .table td:nth-child(8){
      width: 420px;
      white-space: normal;
      word-break: break-word;
    }
    /* Narrower Boarding (col 4) */
    .table th:nth-child(4), .table td:nth-child(4){
      width: 90px;
      white-space: nowrap;
    }
    /* Narrower Contact Number (col 9) */
    .table th:nth-child(9), .table td:nth-child(9){
      width: 130px;
      white-space: nowrap;
    }
    /* Center the User Actions header */
    .table th:nth-child(10){ text-align:center }
    .actions{display:inline-flex;gap:10px;align-items:center}
    .del{margin-left:0;background:#1d4ed8;border:1px solid #1d4ed8;color:#fff;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:11px;line-height:1;font-weight:600}
    .del:hover{filter:brightness(0.95)}
    @media(max-width:840px){.kpis{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:520px){.kpis{grid-template-columns:1fr}}

    /* Modal styles */
    .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000}
    .modal{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;border-radius:10px;box-shadow:0 20px 50px rgba(0,0,0,.3);width:min(700px,95vw);max-height:85vh;display:flex;flex-direction:column;z-index:1001}
    .modal-header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #eee}
    
    .modal-body{padding:16px;overflow:auto}
    .modal-footer{display:flex;justify-content:flex-end;padding:8px 12px;border-top:1px solid #eee;gap:8px;flex-wrap:wrap}
    .modal-footer .btn{padding:6px 10px;font-size:12px;line-height:1.2;border-radius:6px;max-width:180px;white-space:nowrap}
    .close{background:transparent;border:0;font-size:18px;cursor:pointer;color:#6b7280}
    .grid{display:grid;grid-template-columns:1fr;gap:10px}
    .row{display:flex;gap:8px}
    .label{width:130px;color:#6b7280;font-weight:600}
    .val{flex:1}
    .loading{color:#6b7280}
    .error{background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;padding:8px;border-radius:6px}
  `]
})
export class StudentsListComponent implements OnInit {
  private svc = inject(StudentsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthStateService);
  private reports = inject(ReportService);
  private sanitizer = inject(DomSanitizer);

  students = signal<Student[]>([]);
  private all = signal<Student[]>([]);
  private search = signal<string>('');

  // Modal state
  showModal = signal(false);
  selectedStudent = signal<Student | null>(null);
  selectedClassName = signal<string>('');
  loadingModal = signal(false);
  modalError = signal<string | null>(null);
  photoError = signal(false);
  pdfUrl = signal<string | null>(null);
  pdfSafeUrl = signal<SafeResourceUrl | null>(null);

  ngOnInit() {
    this.svc.list(1, 500).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res?.data ?? []);
        this.all.set(data);
        this.applyFilters();
      },
      error: () => {
        alert('Failed to load students. Ensure the API is running.');
      }
    });
    
    const qp = this.route.snapshot.queryParamMap;
    const q = (qp.get('q') || '').trim().toLowerCase();
    if (q) { this.search.set(q); this.applyFilters(); }
  }

  create() { this.router.navigateByUrl('/students/new'); }
  enroll() { this.router.navigateByUrl('/enrollments/new'); }
  viewClasses() { this.router.navigateByUrl('/classes'); }

  canEnroll() {
    const role = this.auth.role();
    return role === 'admin' || role === 'teacher';
  }

  canDelete() { return this.auth.role() === 'admin'; }

  canRecordPayment() { return this.auth.role() === 'admin'; }

  onSearch(ev: Event) { this.search.set((ev.target as HTMLInputElement).value.trim().toLowerCase()); this.applyFilters(); }

  private applyFilters() {
    const q = this.search();
    const filtered = this.all().filter(s => {
      if (q) {
        const text = `${s.studentId || ''} ${s.firstName} ${s.lastName}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
    if (filtered.length === 0 && this.all().length > 0 && q) {
      // Auto-clear filters to avoid confusing empty state
      this.search.set('');
      this.students.set(this.all());
      return;
    }
    this.students.set(filtered);
  }

  deleteStudent(s: Student) {
    if (!this.canDelete()) return;
    const name = `${s.firstName} ${s.lastName}`.trim();
    if (!confirm(`Delete student ${name || s.studentId || s.id}? This cannot be undone.`)) return;
    this.svc.remove(s.id).subscribe({
      next: () => {
        this.all.set(this.all().filter(x => x.id !== s.id));
        this.applyFilters();
      },
      error: (e) => {
        alert(e?.error?.message || 'Delete failed');
      }
    });
  }

  maleCount() { return this.students().filter(s => s.gender === 'male').length; }
  femaleCount() { return this.students().filter(s => s.gender === 'female').length; }
  boardersCount() { return this.students().filter(s => s.boardingStatus === 'boarder').length; }

  openModal(s: Student){
    this.selectedStudent.set(s);
    this.selectedClassName.set('');
    this.modalError.set(null);
    this.loadingModal.set(true);
    this.showModal.set(true);
    this.photoError.set(false);
    this.pdfUrl.set(null);
    this.svc.getEnrollmentsByStudent(s.id).subscribe({
      next: (rows: any[]) => {
        // pick the most recent active enrollment if available
        const active = (rows || []).find(r => (r?.status || '').toLowerCase() === 'active');
        const latest = active || (rows || [])[0];
        const className = latest?.classEntity?.name || latest?.klass?.name || '-';
        this.selectedClassName.set(className || '-');
        // After class, fetch the student's ID card PDF
        this.reports.getStudentIdCardBlob(s.studentId || s.id).then(blob => {
          if (!blob) { this.modalError.set('ID card not available for this student.'); this.loadingModal.set(false); return; }
          const url = URL.createObjectURL(blob);
          this.pdfUrl.set(url);
          this.pdfSafeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
          this.loadingModal.set(false);
        }).catch(() => { this.modalError.set('Failed to load ID card.'); this.loadingModal.set(false); });
      },
      error: () => {
        this.modalError.set('Failed to load class information');
        // Still try load ID card PDF even if class lookup fails
        this.reports.getStudentIdCardBlob(s.studentId || s.id).then(blob => {
          if (!blob) { this.loadingModal.set(false); return; }
          const url = URL.createObjectURL(blob);
          this.pdfUrl.set(url);
          this.pdfSafeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
          this.loadingModal.set(false);
        }).catch(() => { this.loadingModal.set(false); });
      }
    });
  }

  closeModal(){
    this.showModal.set(false);
    this.selectedStudent.set(null);
    this.modalError.set(null);
    const url = this.pdfUrl();
    if (url) { try { URL.revokeObjectURL(url); } catch {} }
    this.pdfUrl.set(null);
    this.pdfSafeUrl.set(null);
  }

  photoUrl(id: string){
    // Cache-bust to reflect recent uploads
    return `/api/students/${id}/photo?ts=${Date.now()}`;
  }

  onPhotoError(){ this.photoError.set(true); }

  initials(st: Student){
    const a = (st.firstName || '').trim();
    const b = (st.lastName || '').trim();
    const i1 = a ? a[0].toUpperCase() : '';
    const i2 = b ? b[0].toUpperCase() : '';
    return (i1 + i2) || 'ST';
  }

  openPdfInNewTab(){
    const url = this.pdfUrl();
    if (!url) return;
    const win = window.open(url, '_blank');
    if (!win) {
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.click();
    }
  }
}
