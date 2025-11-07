import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SubjectsService, type Subject } from './subjects.service';

@Component({
  selector: 'app-subject-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="top">
        <h2>{{ isEdit() ? 'Edit Subject' : 'New Subject' }}</h2>
      </div>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <label>Code</label>
        <input formControlName="code" />
        <label>Name</label>
        <input formControlName="name" />
        <label>Teaching Periods</label>
        <input type="number" formControlName="teachingPeriods" min="0" max="60" />
        <div class="actions">
          <button type="submit" [disabled]="form.invalid || saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
          <button type="button" (click)="cancel()">Cancel</button>
        </div>
      </form>
      <div class="error" *ngIf="err()">{{ err() }}</div>
    </div>
  `,
  styles: [`.wrap{max-width:600px;margin:24px auto;display:block} .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px} .home{font-size:14px} form{display:grid;gap:8px} input{padding:8px;border:1px solid #ccc;border-radius:4px} .actions{display:flex;gap:8px} .error{color:#b00020}`]
})
export class SubjectFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(SubjectsService);

  isEdit = signal(false);
  saving = signal(false);
  err = signal<string | null>(null);
  id: string | null = null;

  form = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    teachingPeriods: [0, [Validators.min(0), Validators.max(60)]],
  });

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.isEdit.set(true);
      this.svc.get(this.id).subscribe((s: Subject) => {
        this.form.patchValue(s);
      });
    }
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.err.set(null);
    const raw = this.form.getRawValue();
    const payload = {
      code: (raw.code ?? '').trim(),
      name: (raw.name ?? '').trim(),
      teachingPeriods: Number(raw.teachingPeriods ?? 0),
    };

    const obs = this.isEdit() && this.id
      ? this.svc.update(this.id, payload)
      : this.svc.create({ code: payload.code as string, name: payload.name as string, teachingPeriods: payload.teachingPeriods as number });

    obs.subscribe({
      next: _ => { this.saving.set(false); this.router.navigateByUrl('/subjects'); },
      error: e => { this.saving.set(false); this.err.set(e?.error?.message || 'Save failed'); }
    });
  }

  cancel() { this.router.navigateByUrl('/subjects'); }
}
