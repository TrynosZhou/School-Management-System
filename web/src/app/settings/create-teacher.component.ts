import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-create-teacher',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="top">
        <h2>Create teacher account</h2>
        <a routerLink="/settings" class="home">Back to Settings</a>
      </div>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <label>Email</label>
        <input type="email" formControlName="email" placeholder="teacher@example.com" />
        <div class="err" *ngIf="form.controls.email.touched && form.controls.email.invalid">Valid email required</div>

        <label>Password</label>
        <input type="password" formControlName="password" placeholder="Min 6 characters" />
        <div class="err" *ngIf="form.controls.password.touched && form.controls.password.invalid">Min 6 characters</div>

        <div class="actions">
          <button type="submit" [disabled]="form.invalid || saving()">{{ saving() ? 'Creating…' : 'Create account' }}</button>
          <span class="ok" *ngIf="ok()">Created</span>
          <span class="err" *ngIf="err()">{{ err() }}</span>
        </div>
      </form>
      <p class="muted">Note: This action will not affect your current session.</p>
    </div>
  `,
  styles: [`
    .wrap{max-width:600px;margin:24px auto}
    .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .home{font-size:14px}
    form{display:grid;gap:10px}
    input{padding:8px;border:1px solid #ddd;border-radius:6px}
    .actions{display:flex;gap:12px;align-items:center}
    .ok{color:#166534}
    .err{color:#b00020}
    .muted{color:#6b7280;font-size:12px;margin-top:8px}
  `]
})
export class CreateTeacherComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  saving = signal(false);
  ok = signal(false);
  err = signal<string | null>(null);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  onSubmit(){
    if (this.form.invalid) return;
    this.saving.set(true); this.ok.set(false); this.err.set(null);
    const { email, password } = this.form.getRawValue();
    // Call register with role=teacher but DO NOT store returned access_token
    this.http.post<{ access_token: string }>('http://localhost:3000/api/auth/register', {
      email: email!, password: password!, role: 'teacher'
    }).subscribe({
      next: _ => { this.saving.set(false); this.ok.set(true); this.form.reset(); },
      error: (e) => { this.saving.set(false); this.err.set(e?.error?.message || 'Creation failed'); }
    });
  }
}
