import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService, AuthResponse } from './auth.service';
import { finalize } from 'rxjs/operators';
import { AuthStateService } from './auth-state.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-wrapper card">
      <div class="tabs">
        <button [class.active]="mode() === 'login'" (click)="mode.set('login')">Sign in</button>
        <button [class.active]="mode() === 'register'" (click)="mode.set('register')">Register</button>
      </div>

      <ng-container *ngIf="mode() === 'login'; else showRegister">
        <h2>Login</h2>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <label>Email</label>
          <input type="email" formControlName="email" placeholder="email@example.com" />
          <div class="error" *ngIf="form.controls.email.touched && form.controls.email.invalid">Valid email required</div>

          <label>Password</label>
          <div class="pw-wrap">
            <input [type]="showPw() ? 'text' : 'password'" formControlName="password" placeholder="••••••••" />
            <button type="button" class="pw-toggle" (click)="showPw.set(!showPw())" [attr.aria-label]="showPw() ? 'Hide password' : 'Show password'">
              {{ showPw() ? '🙈' : '👁' }}
            </button>
          </div>
          <div class="error" *ngIf="form.controls.password.touched && form.controls.password.invalid">Min 6 characters</div>

          <button type="submit" [disabled]="form.invalid || loading()">{{ loading() ? 'Signing in…' : 'Sign in' }}</button>
        </form>
        <p class="muted small">Don't have an account? <a href="#" (click)="$event.preventDefault(); mode.set('register')">Create one</a></p>
        <p class="muted small">Are you a parent? <a routerLink="/parent/login">Go to Parent Portal</a></p>
      </ng-container>

      <ng-template #showRegister>
        <h2>Create account</h2>
        <form [formGroup]="regForm" (ngSubmit)="onRegister()">
          <label>Email</label>
          <input type="email" formControlName="email" placeholder="email@example.com" />
          <div class="error" *ngIf="regForm.controls.email.touched && regForm.controls.email.invalid">Valid email required</div>

          <label>Password</label>
          <div class="pw-wrap">
            <input [type]="showPwReg() ? 'text' : 'password'" formControlName="password" placeholder="Min 6 characters" />
            <button type="button" class="pw-toggle" (click)="showPwReg.set(!showPwReg())" [attr.aria-label]="showPwReg() ? 'Hide password' : 'Show password'">
              {{ showPwReg() ? '🙈' : '👁' }}
            </button>
          </div>
          <div class="error" *ngIf="regForm.controls.password.touched && regForm.controls.password.invalid">Min 6 characters</div>

          <ng-container *ngIf="regForm.controls.role.value === 'parent'">
            <label>Full name</label>
            <input type="text" formControlName="fullName" placeholder="e.g., Jane Doe" />
            <div class="error" *ngIf="regForm.controls.fullName.touched && regForm.controls.fullName.invalid">Full name is required for parents</div>

            <label>Contact Phone Number</label>
            <input type="tel" formControlName="contactNumber" placeholder="e.g. +233 541234567" />
            <div class="error" *ngIf="regForm.controls.contactNumber.touched && regForm.controls.contactNumber.invalid">Valid phone required (min 7 digits)</div>
          </ng-container>

          <label>Role</label>
          <select formControlName="role">
            <option value="admin">Administrator</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
            <option value="parent">Parent</option>
          </select>

          <button type="submit" [disabled]="regForm.invalid || loading()">{{ loading() ? 'Creating…' : 'Create account' }}</button>
        </form>
        <p class="muted small">Already have an account? <a href="#" (click)="$event.preventDefault(); mode.set('login')">Sign in</a></p>
        <p class="muted small">Parents: <a routerLink="/parent/login">Go to Parent Portal</a></p>
      </ng-template>

      <div class="error" *ngIf="err()">{{ err() }}</div>
    </div>
  `,
  styles: [`
    .login-wrapper { max-width: 420px; margin: 40px auto; display: block; padding:16px }
    form { display: grid; gap: 8px; }
    input, select { padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px; }
    .pw-wrap{position:relative;display:flex;align-items:center}
    .pw-wrap input{flex:1;padding-right:40px}
    .pw-toggle{position:absolute;right:6px;background:transparent;border:none;cursor:pointer;font-size:18px;line-height:1}
    button { padding: 10px; border-radius: 8px; border:1px solid #1d4ed8; background:#1d4ed8; color:#fff; cursor:pointer }
    button:disabled { background:#1d4ed8; border-color:#1d4ed8; color:#fff; opacity:1; cursor:default }
    button:active, button:focus { background:#1d4ed8; border-color:#1d4ed8; color:#fff; outline: none }
    .error { color: #b00020; font-size: 12px; margin-top:4px }
    .tabs{display:flex;gap:8px;margin-bottom:8px}
    .tabs button{border:1px solid #e5e7eb;background:#fff;padding:8px 12px;border-radius:8px;cursor:pointer}
    .tabs button.active{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}
    .muted{color:#6b7280}
    .small{font-size:12px}
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private authState = inject(AuthStateService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(false);
  mode = signal<'login'|'register'>('login');
  result = signal<AuthResponse | null>(null);
  err = signal<string | null>(null);
  showPw = signal(false);
  showPwReg = signal(false);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  regForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['student', [Validators.required]],
    fullName: ['', []],
    contactNumber: ['', [Validators.minLength(7)]],
  });

  onSubmit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.err.set(null);
    this.result.set(null);

    const raw = this.form.getRawValue();
    const email = String(raw.email || '').trim();
    const password = String(raw.password || '');
    this.auth.login({ email, password }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (res) => {
        this.result.set(res);
        localStorage.setItem('access_token', res.access_token);
        this.authState.refresh();
        const role = String(res?.user?.role || '').toLowerCase();
        const ret = this.route.snapshot.queryParamMap.get('returnUrl');
        const fallback = role === 'parent'
          ? '/parent/parent_student'
          : (role === 'student'
              ? '/student/dashboard'
              : '/dashboard'); // admin, teacher, and other roles go to main dashboard
        this.router.navigateByUrl(ret || fallback);
      },
      error: (e) => {
        this.err.set(e?.error?.message || e?.message || 'Login failed');
      },
    });
  }

  onRegister() {
    if (this.regForm.invalid) return;
    this.loading.set(true);
    this.err.set(null);
    const raw = this.regForm.getRawValue();
    const email = String(raw.email || '').trim();
    const password = String(raw.password || '');
    const role = String(raw.role || 'student').toLowerCase().trim();
    const isParent = role === 'parent';
    if (isParent && !String(raw.fullName || '').trim()) {
      this.err.set('Full name is required for parent accounts');
      this.loading.set(false);
      return;
    }
    const fullName = String(raw.fullName || '').trim() || undefined;
    const contactNumber = String(raw.contactNumber || '').trim() || undefined;
    if (isParent && (!contactNumber || contactNumber.length < 7)) {
      this.err.set('Contact phone is required for parent accounts');
      this.loading.set(false);
      return;
    }
    const handler = isParent
      ? this.auth.registerParent({ email, password, fullName, contactNumber })
      : this.auth.register({ email, password, role });
    handler.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (res) => {
        localStorage.setItem('access_token', res.access_token);
        this.authState.refresh();
        // Parents go to parent_student page; students to their balance; staff/admin to dashboard
        const path = isParent ? '/parent/parent_student' : (role === 'student' ? '/student/dashboard' : '/dashboard');
        this.router.navigateByUrl(path);
      },
      error: (e) => {
        const msg = e?.error?.message || e?.message || 'Registration failed';
        this.err.set(msg);
      },
    });
  }
}
