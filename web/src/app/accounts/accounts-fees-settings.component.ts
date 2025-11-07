import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { AccountsService, AccountSettingsDto } from './accounts.service';

@Component({
  selector: 'app-accounts-fees-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="wrap">
      <div class="top">
        <h2>Accounts — Fee Settings</h2>
      </div>

      <section class="card">
        <h3>Fee Settings</h3>
        <form [formGroup]="form" (ngSubmit)="saveSettings()">
          <div class="grid">
            <div>
              <label>Current Term</label>
              <input formControlName="currentTerm" placeholder="Term 1" />
            </div>
            <div>
              <label>Academic Year</label>
              <input formControlName="academicYear" placeholder="2025/2026" />
            </div>
            <div>
              <label>Term Fee Amount (fallback)</label>
              <input formControlName="termFeeAmount" placeholder="0.00" />
            </div>
            <div>
              <label>Day Fee Amount</label>
              <input formControlName="dayFeeAmount" placeholder="0.00" />
            </div>
            <div>
              <label>Boarder Fee Amount</label>
              <input formControlName="boarderFeeAmount" placeholder="0.00" />
            </div>
          </div>
          <div class="actions">
            <button type="submit" [disabled]="savingSettings()"><span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 7h14v12H5z"/><path d="M7 7V5h10v2"/><path d="M8 12h8"/></svg></span>{{ savingSettings() ? 'Saving…' : 'Save' }}</button>
            <span class="ok" *ngIf="okSettings()">Saved</span>
            <span class="err" *ngIf="errSettings()">{{ errSettings() }}</span>
          </div>
        </form>
      </section>
    </div>
  `,
  styles: [`
    .wrap{max-width:1000px;margin:24px auto;display:grid;gap:16px}
    .top{display:flex;justify-content:space-between;align-items:center}
    .card{background:#fff;border:1px solid #eee;border-radius:10px;padding:16px}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
    label{display:block;font-size:12px;color:#6b7280;margin-bottom:4px}
    input,select{width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:8px}
    .actions{display:flex;gap:12px;align-items:center;margin-top:10px}
    .ok{color:#166534}
    .err{color:#b91c1c}
    @media (max-width: 860px){ .grid{grid-template-columns:1fr} }
  `]
})
export class AccountsFeesSettingsComponent {
  private fb = inject(FormBuilder);
  private accounts = inject(AccountsService);

  form = this.fb.group({
    currentTerm: this.fb.control<string | null>(''),
    academicYear: this.fb.control<string | null>(''),
    termFeeAmount: this.fb.control<string>('0'),
    dayFeeAmount: this.fb.control<string>('0'),
    boarderFeeAmount: this.fb.control<string>('0'),
  });

  savingSettings = signal(false);
  okSettings = signal(false);
  errSettings = signal<string | null>(null);

  constructor(){
    this.accounts.getSettings().subscribe(s => this.form.patchValue(s as any));
  }

  saveSettings() {
    this.savingSettings.set(true); this.okSettings.set(false); this.errSettings.set(null);
    const body = this.form.getRawValue();
    this.accounts.updateSettings(body as AccountSettingsDto).subscribe({
      next: _ => { this.savingSettings.set(false); this.okSettings.set(true); },
      error: e => { this.savingSettings.set(false); this.errSettings.set(e?.error?.message || 'Save failed'); }
    });
  }
}
