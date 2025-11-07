import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { AuthStateService } from '../auth/auth-state.service';

@Component({
  selector: 'app-parent-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-wrapper card">
      <div class="tabs">
        <button [class.active]="mode() === 'login'" (click)="mode.set('login')">Parent sign in</button>
        <button [class.active]="mode() === 'register'" (click)="mode.set('register')">Create parent account</button>
      </div>

      <ng-container *ngIf="mode() === 'login'; else showRegister">
        <h2>Parent Login</h2>
        <form [formGroup]="form" (ngSubmit)="onLogin()">
          <label>Email</label>
          <input type="email" formControlName="email" placeholder="email@example.com" />
          <div class="error" *ngIf="form.controls.email.touched && form.controls.email.invalid">Valid email required</div>

          <label>Password</label>
          <div class="pw-wrap">
            <input [type]="showPw() ? 'text' : 'password'" formControlName="password" placeholder="••••••••" />
            <button type="button" class="pw-toggle" (click)="showPw.set(!showPw())" [attr.aria-label]="showPw() ? 'Hide password' : 'Show password'">{{ showPw() ? '🙈' : '👁' }}</button>
          </div>
          <div class="error" *ngIf="form.controls.password.touched && form.controls.password.invalid">Min 6 characters</div>

          <button type="submit" [disabled]="form.invalid || loading()">{{ loading() ? 'Signing in…' : 'Sign in' }}</button>
        </form>
      </ng-container>

      <ng-template #showRegister>
        <h2>Create Parent Account</h2>
        <form [formGroup]="regForm" (ngSubmit)="onRegister()">
          <label>Email</label>
          <input type="email" formControlName="email" placeholder="email@example.com" />
          <div class="error" *ngIf="regForm.controls.email.touched && regForm.controls.email.invalid">Valid email required</div>

          <label>Contact Phone Number</label>
          <input type="tel" formControlName="contactNumber" placeholder="e.g. +233 541234567" />
          <div class="error" *ngIf="regForm.controls.contactNumber.touched && regForm.controls.contactNumber.invalid">Valid phone required (min 7 digits)</div>

          <label>Password</label>
          <div class="pw-wrap">
            <input [type]="showPwReg() ? 'text' : 'password'" formControlName="password" placeholder="Min 6 characters" />
            <button type="button" class="pw-toggle" (click)="showPwReg.set(!showPwReg())" [attr.aria-label]="showPwReg() ? 'Hide password' : 'Show password'">{{ showPwReg() ? '🙈' : '👁' }}</button>
          </div>
          <div class="error" *ngIf="regForm.controls.password.touched && regForm.controls.password.invalid">Min 6 characters</div>

          <button type="submit" [disabled]="regForm.invalid || loading()">{{ loading() ? 'Creating…' : 'Create account' }}</button>
        </form>
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
  `]
})
export class ParentLoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private authState = inject(AuthStateService);

  loading = signal(false);
  mode = signal<'login'|'register'>('login');
  err = signal<string | null>(null);
  showPw = signal(false);
  showPwReg = signal(false);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  regForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    contactNumber: ['', [Validators.required, Validators.minLength(7)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  onLogin(){
    if (this.form.invalid) return;
    this.loading.set(true); this.err.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login({ email: email!, password: password! }).subscribe({
      next: (res) => { localStorage.setItem('access_token', res.access_token); this.authState.refresh(); this.loading.set(false); this.router.navigateByUrl('/parent/parent_student'); },
      error: (e) => { this.err.set(e?.error?.message || 'Login failed'); this.loading.set(false); }
    });
  }

  onRegister(){
    if (this.regForm.invalid) return;
    this.loading.set(true); this.err.set(null);
    const { email, password, contactNumber } = this.regForm.getRawValue();
    this.auth.registerParent({ email: email!, password: password!, contactNumber: contactNumber! }).subscribe({
      next: (res) => { localStorage.setItem('access_token', res.access_token); this.authState.refresh(); this.loading.set(false); this.router.navigateByUrl('/parent/parent_student'); },
      error: (e) => { this.err.set(e?.error?.message || 'Registration failed'); this.loading.set(false); }
    });
  }
}
