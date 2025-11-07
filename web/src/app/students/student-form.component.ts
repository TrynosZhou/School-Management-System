import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReportService } from '../reports/report.service';
import { StudentsService, type Student } from './students.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { AuthStateService } from '../auth/auth-state.service';
import { ParentsService } from '../parents/parents.service';

@Component({
  selector: 'app-student-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="top">
        <h2>{{ isEdit() ? 'Edit Student' : 'New Student' }}</h2>
        <a routerLink="/dashboard" class="home">Home</a>
      </div>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <label>First name</label>
        <input formControlName="firstName" />
        <label>Last name</label>
        <input formControlName="lastName" />
        <label>Boarding status</label>
        <select formControlName="boardingStatus">
          <option value="day">Day scholar</option>
          <option value="boarder">Boarder</option>
        </select>
        <label>DOB</label>
        <input type="date" formControlName="dob" />
        <label>Religion</label>
        <select formControlName="religion">
          <option value="">-- Select --</option>
          <option>Christianity</option>
          <option>Other</option>
        </select>
        <label>Gender</label>
        <select formControlName="gender">
          <option value="">-- Select --</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        <label>Address</label>
        <input formControlName="address" />
        <label>Contact Number</label>
        <input formControlName="contactNumber" />
        <label><input type="checkbox" formControlName="isStaffChild" /> Staff child (tuition waived)</label>
        <label><input type="checkbox" formControlName="takesMeals" /> Takes meals at Dining Hall (DH fee applies)</label>
        <label><input type="checkbox" formControlName="takesTransport" /> Takes transport (Transport fee applies)</label>
        <label>Student Photo</label>
        <input type="file" accept="image/*" (change)="onFileSelected($event)" />
        <div *ngIf="photoName" class="hint">{{ photoName }}</div>
        <div class="actions">
          <button type="submit" [disabled]="form.invalid || saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
          <button type="button" (click)="cancel()">Cancel</button>
          <button type="button" class="danger" *ngIf="isEdit() && canDelete()" (click)="deleteStudent()">Delete</button>
        </div>
      </form>
      <div class="error" *ngIf="err()">{{ err() }}</div>

      <div *ngIf="isEdit()" class="reports">
        <div class="reports-header">
          <h3>Report card</h3>
          <button type="button" (click)="openIdCard()">Open ID Card</button>
        </div>
        <div class="row">
          <label>Term (optional)</label>
          <select [(ngModel)]="reportTerm" [ngModelOptions]="{standalone:true}">
            <option value="">All terms</option>
            <option>Term 1</option>
            <option>Term 2</option>
            <option>Term 3</option>
          </select>
          <button type="button" (click)="downloadReport()">Download PDF</button>
        </div>
      </div>

      <div *ngIf="isEdit()" class="enrollments">
        <div class="enrollments-header">
          <h3>Enrollments</h3>
          <a *ngIf="canEnroll()" [routerLink]="['/enrollments/new']" [queryParams]="{ studentId: id }" class="btn">Enroll this student</a>
        </div>
        <table class="table" *ngIf="enrolls().length; else noEnr">
          <thead>
            <tr><th>Class</th><th>Year</th><th>Status</th><th>Start date</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let e of enrolls()">
              <td>{{ e.classEntity?.name }}</td>
              <td>{{ e.classEntity?.academicYear }}</td>
              <td>{{ e.status }}</td>
              <td>{{ e.startDate || '-' }}</td>
            </tr>
          </tbody>
        </table>
        <ng-template #noEnr><p>No enrollments yet.</p></ng-template>
      </div>

      <!-- Admin: Linked Parents -->
      <div *ngIf="isEdit() && isAdmin()" class="parents card">
        <div class="parents-header">
          <h3>Linked Parents</h3>
          <button type="button" (click)="refreshParents()">Refresh</button>
        </div>
        <div class="row">
          <button type="button" (click)="createInvite()" [disabled]="inviting">{{ inviting ? 'Creating…' : 'Create invite code' }}</button>
          <span class="ok" *ngIf="inviteCode">Code: {{ inviteCode }}</span>
          <span class="err" *ngIf="inviteErr">{{ inviteErr }}</span>
        </div>
        <ul class="list">
          <li *ngFor="let p of linkedParents()">{{ p.email }}</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`.wrap{max-width:900px;margin:24px auto;display:block} .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px} .home{font-size:14px} form{display:grid;gap:8px} input,select{padding:8px;border:1px solid #ccc;border-radius:4px} input[type='checkbox']{transform:translateY(2px);vertical-align:middle} .actions{display:flex;gap:8px;margin-top:8px} .actions .danger{background:#1d4ed8;border:1px solid #1d4ed8;color:#fff;font-weight:700;border-radius:6px;padding:8px 12px} .error{color:#b00020} .enrollments{margin-top:24px} .enrollments-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px} .table{width:100%;border-collapse:collapse} .table th,.table td{border:1px solid #ddd;padding:8px} .reports{margin-top:16px} .reports .row{display:flex;gap:8px;align-items:center} .parents{margin-top:16px;border:1px solid #e5e7eb;padding:12px;border-radius:8px;background:#fff} .parents-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px} .row{display:flex;gap:8px;align-items:center} .list{list-style:none;margin:8px 0 0;padding:0} .list li{padding:6px 0;border-bottom:1px solid #f1f5f9} .ok{color:#166534} .err{color:#b91c1c}`]
})
export class StudentFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(StudentsService);
  private enrollSvc = inject(EnrollmentsService);
  private auth = inject(AuthStateService);
  private reports = inject(ReportService);
  private parentsSvc = inject(ParentsService);

  isEdit = signal(false);
  saving = signal(false);
  err = signal<string | null>(null);
  id: string | null = null;
  enrolls = signal<any[]>([]);
  reportTerm: string = '';
  private selectedFile: File | null = null;
  photoName: string = '';
  // parents panel
  linkedParents = signal<Array<{ id: string; email: string }>>([]);
  inviting = false;
  inviteCode: string = '';
  inviteErr: string | null = null;

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    boardingStatus: ['day', Validators.required],
    dob: [''],
    religion: [''],
    address: [''],
    gender: [''],
    contactNumber: [''],
    isStaffChild: [false],
    takesMeals: [false],
    takesTransport: [false],
  });

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.isEdit.set(true);
      this.svc.get(this.id).subscribe((s: Student) => {
        this.form.patchValue(s);
      });
      this.enrollSvc.listByStudent(this.id).subscribe(list => this.enrolls.set(list));
      if (this.isAdmin()) this.refreshParents();
    }
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.err.set(null);
    const raw = this.form.getRawValue();
    const payload = {
      firstName: raw.firstName ?? undefined,
      lastName: raw.lastName ?? undefined,
      boardingStatus: raw.boardingStatus as 'day' | 'boarder',
      dob: raw.dob || undefined,
      religion: raw.religion || undefined,
      address: raw.address || undefined,
      gender: raw.gender || undefined,
      contactNumber: raw.contactNumber || undefined,
      isStaffChild: !!raw.isStaffChild,
      takesMeals: !!raw.takesMeals,
      takesTransport: !!raw.takesTransport,
    };

    const obs = this.isEdit() && this.id
      ? this.svc.update(this.id, payload)
      : this.svc.create(payload as any);

    obs.subscribe({
      next: async (result: any) => {
        // Auto-open ID card only on create
        const sid = result?.id || result?.studentId;
        if (sid && this.selectedFile) {
          try { await this.svc.uploadPhoto(sid, this.selectedFile).toPromise(); } catch {}
        }
        if (!this.isEdit() && sid) this.reports.openStudentIdCard(sid);
        this.saving.set(false);
        this.router.navigateByUrl('/students');
      },
      error: e => { this.saving.set(false); this.err.set(e?.error?.message || 'Save failed'); }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files && input.files.length ? input.files[0] : null;
    this.selectedFile = file;
    this.photoName = file ? file.name : '';
  }

  cancel() { this.router.navigateByUrl('/students'); }

  canEnroll() {
    const role = this.auth.role();
    return role === 'admin' || role === 'teacher';
  }

  downloadReport() {
    if (!this.id) return;
    const term = this.reportTerm || undefined;
    this.reports.downloadReportCard(this.id, term);
  }

  openIdCard() {
    if (!this.id) return;
    this.reports.openStudentIdCard(this.id);
  }

  canDelete() {
    return this.auth.role() === 'admin';
  }

  // admin helpers (linked parents/invites)
  isAdmin(){ return this.auth.role() === 'admin'; }
  refreshParents(){ if (!this.id) return; this.parentsSvc.adminListLinked(this.id).subscribe(rows => this.linkedParents.set(rows)); }
  createInvite(){
    if (!this.id || this.inviting) return;
    this.inviting = true; this.inviteErr = null; this.inviteCode = '';
    this.parentsSvc.adminCreateInvite(this.id).subscribe({
      next: r => { this.inviting = false; this.inviteCode = r?.code || ''; this.refreshParents(); },
      error: e => { this.inviting = false; this.inviteErr = e?.error?.message || 'Failed to create invite'; }
    });
  }

  deleteStudent() {
    if (!this.id) return;
    const ok = confirm('Are you sure you want to delete this student? This cannot be undone.');
    if (!ok) return;
    this.saving.set(true);
    this.svc.remove(this.id).subscribe({
      next: () => { this.saving.set(false); this.router.navigateByUrl('/students'); },
      error: (e) => { this.saving.set(false); this.err.set(e?.error?.message || 'Delete failed'); }
    });
  }
}
