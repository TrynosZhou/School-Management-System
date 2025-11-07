import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TeachersService, type Teacher } from './teachers.service';
import { SubjectsService, type Subject } from '../subjects/subjects.service';
import { SubjectSelectComponent } from '../subjects/subject-select.component';

@Component({
  selector: 'app-teacher-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SubjectSelectComponent],
  template: `
    <div class="wrap">
      <div class="top">
        <h2>{{ isEdit() ? 'Edit Teacher' : 'New Teacher' }}</h2>
      </div>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <label>First name</label>
        <input formControlName="firstName" />
        <label>Last name</label>
        <input formControlName="lastName" />
        <label>Email</label>
        <input type="email" formControlName="email" />
        <label>Subjects Taught</label>
        <app-subject-select [multiple]="true" [(model)]="subjectsModel"></app-subject-select>

        <label>Date Of Birth</label>
        <input type="date" formControlName="dateOfBirth" />

        <label>Start Date</label>
        <input type="date" formControlName="startDate" />

        <label>Qualifications</label>
        <input formControlName="qualifications" />

        <label>Any Other Qualification</label>
        <input formControlName="anyOtherQualification" />

        <label>Contact Number</label>
        <input formControlName="contactNumber" />

        <label>Physical Address</label>
        <input formControlName="physicalAddress" />

        <label>Next Of Kin</label>
        <input formControlName="nextOfKin" />

        <label>Gender</label>
        <select formControlName="gender">
          <option value="">-- select --</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>

        <label>Any Other Role</label>
        <input formControlName="anyOtherRole" />
        <div class="actions">
          <button type="submit" [disabled]="form.invalid || saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
          <button type="button" (click)="cancel()">Cancel</button>
        </div>
      </form>
      <div class="error" *ngIf="err()">{{ err() }}</div>
    </div>
  `,
  styles: [`.wrap{max-width:600px;margin:24px auto;display:block} .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px} .home{font-size:14px} form{display:grid;gap:8px} input,select{padding:8px;border:1px solid #ccc;border-radius:4px} .actions{display:flex;gap:8px} .error{color:#b00020}`]
})
export class TeacherFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(TeachersService);
  private subjectsSvc = inject(SubjectsService);

  isEdit = signal(false);
  saving = signal(false);
  err = signal<string | null>(null);
  id: string | null = null;
  subjectsModel: string[] = [];
  subjectsList: Subject[] = [];

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    subjectTaught: [''],
    dateOfBirth: [''],
    startDate: [''],
    qualifications: [''],
    anyOtherQualification: [''],
    contactNumber: [''],
    physicalAddress: [''],
    nextOfKin: [''],
    gender: [''],
    anyOtherRole: [''],
  });

  ngOnInit() {
    // Load subjects first, then (if editing) load teacher and map stored names -> IDs
    this.subjectsSvc.list().subscribe((subs) => {
      this.subjectsList = subs || [];
      this.id = this.route.snapshot.paramMap.get('id');
      if (this.id) {
        this.isEdit.set(true);
        this.svc.get(this.id).subscribe((t: Teacher) => {
          this.form.patchValue(t);
          const raw = (t?.subjectTaught || '').toString();
          const tokens = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
          if (tokens.length && this.subjectsList.length) {
            const byId = new Map(this.subjectsList.map(s => [s.id, s.id] as const));
            const byName = new Map(this.subjectsList.map(s => [s.name.toLowerCase(), s.id] as const));
            const byCode = new Map(this.subjectsList.map(s => [(s.code||'').toLowerCase(), s.id] as const));
            this.subjectsModel = tokens
              .map(tok => byId.get(tok) || byName.get(tok.toLowerCase()) || byCode.get(tok.toLowerCase()) || '')
              .filter(Boolean) as string[];
          } else {
            this.subjectsModel = [];
          }
        });
      }
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.err.set(null);
    const raw = this.form.getRawValue();
    const buildPayload = () => ({
      firstName: raw.firstName ?? undefined,
      lastName: raw.lastName ?? undefined,
      email: raw.email ?? undefined,
      // Persist as comma-separated list of SUBJECT NAMES for readability
      subjectTaught: (this.subjectsModel && this.subjectsModel.length)
        ? this.subjectsModel
            .map(id => this.subjectsList.find(s => s.id === id))
            .filter((s): s is Subject => !!s)
            .map(s => s.name)
            .join(', ')
        : undefined,
      dateOfBirth: raw.dateOfBirth ?? undefined,
      startDate: raw.startDate ?? undefined,
      qualifications: raw.qualifications ?? undefined,
      anyOtherQualification: raw.anyOtherQualification ?? undefined,
      contactNumber: raw.contactNumber ?? undefined,
      physicalAddress: raw.physicalAddress ?? undefined,
      nextOfKin: raw.nextOfKin ?? undefined,
      gender: raw.gender ?? undefined,
      anyOtherRole: raw.anyOtherRole ?? undefined,
    });

    const proceed = () => {
      const payload = buildPayload();
      const obs = this.isEdit() && this.id
        ? this.svc.update(this.id, payload)
        : this.svc.create({
            firstName: payload.firstName as string,
            lastName: payload.lastName as string,
            email: payload.email as string,
            subjectTaught: payload.subjectTaught,
            dateOfBirth: payload.dateOfBirth,
            startDate: payload.startDate,
            qualifications: payload.qualifications,
            anyOtherQualification: payload.anyOtherQualification,
            contactNumber: payload.contactNumber,
            physicalAddress: payload.physicalAddress,
            nextOfKin: payload.nextOfKin,
            gender: payload.gender,
            anyOtherRole: payload.anyOtherRole,
          });
      obs.subscribe({
        next: _ => { this.saving.set(false); this.router.navigateByUrl('/teachers'); },
        error: e => { this.saving.set(false); this.err.set(e?.error?.message || 'Save failed'); }
      });
    };

    // Ensure subjects list is present before mapping IDs -> names
    if (!this.subjectsList.length && this.subjectsModel.length) {
      this.subjectsSvc.list().subscribe({ next: subs => { this.subjectsList = subs || []; proceed(); }, error: _ => proceed() });
    } else {
      proceed();
    }
  }

  cancel() { this.router.navigateByUrl('/teachers'); }
}
