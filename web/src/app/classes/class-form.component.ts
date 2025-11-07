import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SettingsStateService } from '../settings/settings-state.service';
import { TeachersService, type Teacher } from '../teachers/teachers.service';
import { ClassesService, type ClassEntity } from './classes.service';

@Component({
  selector: 'app-class-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="top">
        <h2>{{ isEdit() ? 'Edit Class' : 'New Class' }}</h2>
      </div>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <label>Class name</label>
        <input formControlName="name" placeholder="e.g., 1 Blue or Lower 6 Sci" />

        <label>Grade level</label>
        <input formControlName="gradeLevel" placeholder="e.g., Form 1 or Lower 6" />
        <label>Academic year</label>
        <input formControlName="academicYear" placeholder="2025-2026" [readOnly]="true" />
        <label>Class teacher</label>
        <select formControlName="teacherId">
          <option value="">-- None --</option>
          <option *ngFor="let t of teachers()" [value]="t.id">{{ t.firstName }} {{ t.lastName }}</option>
        </select>
        <div class="actions">
          <button type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
          <button type="button" (click)="cancel()">Cancel</button>
        </div>
      </form>
      <div class="error" *ngIf="err()">{{ err() }}</div>
    </div>
  `,
  styles: [`.wrap{max-width:600px;margin:24px auto;display:block} .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px} .home{font-size:14px} form{display:grid;gap:8px} input,select{padding:8px;border:1px solid #ccc;border-radius:4px} .actions{display:flex;gap:8px} .error{color:#b00020}`]
})
export class ClassFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(ClassesService);
  private teachersSvc = inject(TeachersService);
  private settings = inject(SettingsStateService);

  // Keep academic year in sync from Settings for new-class flow
  private syncYear = effect(() => {
    const y = this.settings.academicYear();
    if (!this.isEdit()) {
      this.form.patchValue({ academicYear: y || '' }, { emitEvent: false });
    }
  });

  isEdit = signal(false);
  saving = signal(false);
  err = signal<string | null>(null);
  id: string | null = null;
  teachers = signal<Teacher[]>([]);

  form = this.fb.group({
    name: ['', Validators.required],
    gradeLevel: ['', Validators.required],
    academicYear: [{ value: '', disabled: true }],
    teacherId: [''],
  });

  ngOnInit() {
    this.teachersSvc.list().subscribe(list => this.teachers.set(list));
    this.settings.ensureLoaded();
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.isEdit.set(true);
      this.svc.get(this.id).subscribe((c: ClassEntity) => {
        this.form.patchValue({
          name: c.name,
          gradeLevel: c.gradeLevel,
          academicYear: c.academicYear,
          teacherId: c.classTeacher?.id || '',
        });
      });
    }
    if (!this.id) {
      const current = this.form.get('academicYear')?.value as string | null;
      const fromSettings = this.settings.academicYear();
      if (!current && fromSettings) {
        this.form.patchValue({ academicYear: fromSettings });
      }
    }
  }

  onSubmit() {
    const yearCtrl = this.form.get('academicYear');
    if (yearCtrl && !yearCtrl.value) {
      const fromSettings = this.settings.academicYear();
      if (fromSettings) {
        this.form.patchValue({ academicYear: fromSettings });
      }
    }
    if (this.form.invalid) return;
    this.saving.set(true);
    this.err.set(null);
    const raw = this.form.getRawValue() as any;
    const year = this.settings.academicYear() || this.form.get('academicYear')?.value || raw.academicYear || undefined;
    const payload: any = {
      name: raw.name ?? undefined,
      gradeLevel: raw.gradeLevel ?? undefined,
      academicYear: year,
    };
    const teacherId = (raw as any).teacherId as string | undefined;
    if (teacherId !== undefined) payload.teacherId = teacherId || undefined;

    const obs = this.isEdit() && this.id
      ? this.svc.update(this.id, payload)
      : this.svc.create({
          name: payload.name as string,
          gradeLevel: payload.gradeLevel as string,
          academicYear: payload.academicYear as string,
          teacherId: payload.teacherId as (string | undefined),
        });

    obs.subscribe({
      next: _ => { this.saving.set(false); this.router.navigateByUrl('/classes'); },
      error: e => { this.saving.set(false); this.err.set(e?.error?.message || 'Save failed'); }
    });
  }

  cancel() { this.router.navigateByUrl('/classes'); }

  // manual form, no auto helpers
}
