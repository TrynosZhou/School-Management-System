import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';

export interface SettingsDto {
  schoolName?: string | null;
  schoolAddress?: string | null;
  principalName?: string | null;
  logoUrl?: string | null;
  gradingBandsJson?: string | null;
  primaryColor?: string | null;
  employeeGradesJson?: string | null;
  dhFee?: string | null;
  transportFee?: string | null;
  deskFee?: string | null;
  finePerDay?: string | null;
  studentIdPrefix?: string | null;
}

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="top">
        <h2>Settings</h2>
        <a routerLink="/dashboard" class="home">Home</a>
      </div>

      <section class="mods">
        <div class="mods-title">Accounts — Fee Settings</div>
        <form [formGroup]="feesForm" (ngSubmit)="saveFees()">
          <div class="fees-grid">
            <div>
              <label>Current Term</label>
              <input class="short" formControlName="currentTerm" placeholder="Term 1" />
            </div>
            <div>
              <label>Academic Year</label>
              <input class="short" formControlName="academicYear" placeholder="2025/2026" />
            </div>
            <div>
              <label>Day Fee Amount</label>
              <input class="short" formControlName="dayFeeAmount" placeholder="0.00" />
            </div>
            <div>
              <label>Boarder Fee Amount</label>
              <input class="short" formControlName="boarderFeeAmount" placeholder="0.00" />
            </div>
          </div>
          <div class="actions">
            <button type="submit" [disabled]="savingFees()"><span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 7h14v12H5z"/><path d="M7 7V5h10v2"/><path d="M8 12h8"/></svg></span>{{ savingFees() ? 'Saving…' : 'Save Fee Settings' }}</button>
            <span class="ok" *ngIf="okFees()">Saved</span>
            <span class="err" *ngIf="errFees()">{{ errFees() }}</span>
          </div>
        </form>
      </section>

      

      <div class="submenu access">
        <div class="submenu-title">Module Access</div>
        <input placeholder="User email" [formControl]="emailCtrl" class="email" />
        <button (click)="loadUserModules()" [disabled]="loadingMods()"><span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M3 12h12M3 18h8"/></svg></span>{{ loadingMods() ? 'Loading…' : 'Load' }}</button>
        <span class="err" *ngIf="modsErr()">{{ modsErr() }}</span>
      </div>

      <div class="mods" *ngIf="modules().length">
        <div class="mods-title">Assign modules to: <strong>{{ currentEmail() || '—' }}</strong></div>
        <div class="mods-grid">
          <label *ngFor="let m of modules()">
            <input type="checkbox" [checked]="hasModule(m.key)" (change)="toggleModule(m.key, $any($event.target).checked)" />
            {{ m.label }}
          </label>
        </div>
        <div class="actions">
          <button (click)="saveUserModules()" [disabled]="savingMods() || !currentEmail()"><span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 7h14v12H5z"/><path d="M7 7V5h10v2"/><path d="M8 12h8"/></svg></span>{{ savingMods() ? 'Saving…' : 'Save Access' }}</button>
          <span class="ok" *ngIf="modsSaved()">Saved</span>
        </div>
      </div>

      <div class="mods">
        <div class="mods-title">Departments</div>
        <div class="actions">
          <input placeholder="Add Department" [value]="newDept()" (input)="newDept.set($any($event.target).value)" />
          <button (click)="addDepartment()">Add</button>
          <span class="ok" *ngIf="depOk()">Added</span>
          <span class="err" *ngIf="depErr()">{{ depErr() }}</span>
        </div>
        <div class="mods-grid">
          <div *ngFor="let d of departments()">{{ d.name }}</div>
        </div>
      </div>

      


      <form [formGroup]="form" (ngSubmit)="save()">
        <label>School name</label>
        <input formControlName="schoolName" />

        <label>School address</label>
        <textarea formControlName="schoolAddress"></textarea>

        <label>Principal name</label>
        <input formControlName="principalName" />

        <label>Logo URL (file path or http URL)</label>
        <input formControlName="logoUrl" />

        <div class="upload">
          <label>Upload Logo (PNG/JPG)</label>
          <input type="file" (change)="onLogo($event)" accept="image/*" />
          <span class="ok" *ngIf="logoOk()">Uploaded</span>
          <span class="err" *ngIf="logoErr()">{{ logoErr() }}</span>
        </div>

        <label>Grading bands JSON</label>
        <textarea formControlName="gradingBandsJson" rows="6" placeholder='[{"grade":"A","min":70,"max":89}, ...]'></textarea>

        <label>Employee Grades JSON</label>
        <textarea formControlName="employeeGradesJson" rows="4" placeholder='["A1","A2","B1","B2"]'></textarea>

        <label>Primary color (e.g., #1d4ed8)</label>
        <input formControlName="primaryColor" placeholder="#1d4ed8" />

        <label>Dining Hall (DH) fee per term</label>
        <input formControlName="dhFee" type="number" step="0.01" placeholder="0.00" />

        <label>Transport fee per term (Day scholars opting in)</label>
        <input formControlName="transportFee" type="number" step="0.01" placeholder="0.00" />

        <label>Desk fee (one-time for new students)</label>
        <input formControlName="deskFee" type="number" step="0.01" placeholder="0.00" />

        <label>Library fine per overdue day</label>
        <input formControlName="finePerDay" type="number" step="0.01" placeholder="0.00" />

        <label>Student ID Prefix</label>
        <input formControlName="studentIdPrefix" placeholder="e.g. JHS" />
        <small class="hint">Student IDs will be auto-generated as <strong>[PREFIX]</strong> followed by 7 digits. Example: JHS1234567</small>

        <div class="actions">
          <button type="submit" [disabled]="saving()"><span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 7h14v12H5z"/><path d="M7 7V5h10v2"/><path d="M8 12h8"/></svg></span>{{ saving() ? 'Saving…' : 'Save' }}</button>
          <span class="ok" *ngIf="ok()">Saved</span>
          <span class="err" *ngIf="err()">{{ err() }}</span>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .wrap{max-width:900px;margin:24px auto}
    .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .home{font-size:14px}
    .submenu{display:flex;align-items:center;gap:12px;margin:8px 0 16px}
    .submenu-title{font-weight:600;margin-right:4px}
    .submenu.access .email{min-width:260px}
    .mods{border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin:8px 0 16px}
    .mods-title{font-weight:600;margin-bottom:8px}
    .mods-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
    .fees-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;align-items:end}
    .actions input{padding:8px;border:1px solid #ddd;border-radius:6px}
    form{display:grid;gap:10px}
    input,textarea{padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;box-sizing:border-box}
    input.short{max-width:180px}
    .actions{display:flex;gap:12px;align-items:center;margin-top:8px}
    .ok{color:#166534}
    .err{color:#b00020}
    .upload{display:flex;gap:8px;align-items:center}
    .i{display:inline-flex;width:16px;height:16px;margin-right:6px}
    .i svg{width:16px;height:16px}
  `]
})
export class SettingsPageComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private readonly defaultBandsJson = '[\n  {"grade":"A*","min":90,"max":100,"range":"90 - 100"},\n  {"grade":"A","min":70,"max":89,"range":"70 - 89"},\n  {"grade":"B","min":60,"max":69,"range":"60 - 69"},\n  {"grade":"C","min":50,"max":59,"range":"50 - 59"},\n  {"grade":"D","min":45,"max":49,"range":"45 - 49"},\n  {"grade":"E","min":40,"max":44,"range":"40 - 44"},\n  {"grade":"U","min":0,"max":39,"range":"0 - 39"}\n]';

  saving = signal(false);
  ok = signal(false);
  err = signal<string | null>(null);

  // promotion moved to its own page


  form = this.fb.group({
    schoolName: this.fb.control<string | null>(''),
    schoolAddress: this.fb.control<string | null>(''),
    principalName: this.fb.control<string | null>(''),
    logoUrl: this.fb.control<string | null>(''),
    gradingBandsJson: this.fb.control<string | null>(''),
    primaryColor: this.fb.control<string | null>(''),
    employeeGradesJson: this.fb.control<string | null>(''),
    dhFee: this.fb.control<string | null>(''),
    transportFee: this.fb.control<string | null>(''),
    deskFee: this.fb.control<string | null>(''),
    finePerDay: this.fb.control<string | null>(''),
    studentIdPrefix: this.fb.control<string | null>(''),
  });

  // Accounts — Fee Settings form
  feesForm = this.fb.group({
    currentTerm: this.fb.control<string | null>(''),
    academicYear: this.fb.control<string | null>(''),
    dayFeeAmount: this.fb.control<string>('0'),
    boarderFeeAmount: this.fb.control<string>('0'),
  });

  savingFees = signal(false);
  okFees = signal(false);
  errFees = signal<string | null>(null);

  // Module access management state
  modules = signal<Array<{ key: string; label: string }>>([]);
  currentEmail = signal<string>('');
  selectedModules = signal<Set<string>>(new Set<string>());
  loadingMods = signal(false);
  savingMods = signal(false);
  modsSaved = signal(false);
  modsErr = signal<string | null>(null);
  emailCtrl = new FormControl<string>('');

  // Departments management
  departments = signal<Array<{ id:string; name:string }>>([]);
  newDept = signal<string>('');
  depOk = signal(false);
  depErr = signal<string | null>(null);
  

  ngOnInit(): void {
    this.http.get<SettingsDto>('/api/settings').subscribe(s => {
      this.form.patchValue(s);
      const cur = (this.form.get('gradingBandsJson')?.value || '').toString().trim();
      if (!cur) {
        this.form.patchValue({ gradingBandsJson: this.defaultBandsJson });
      }
    });
    // Load accounts fee settings
    this.http.get<any>('/api/accounts/settings').subscribe({
      next: (s) => this.feesForm.patchValue(s || {}),
      error: () => {}
    });
    // Load module list once
    this.http.get<Array<{key:string;label:string}>>('/api/settings/modules-list').subscribe({
      next: (mods) => this.modules.set(mods || []),
      error: () => {}
    });
    // Load departments
    this.http.get<Array<{ id:string; name:string }>>('/api/hr/departments').subscribe({
      next: (deps) => this.departments.set(deps || []),
      error: () => {}
    });
  }

  
  // ----- Module Access Methods -----
  loadUserModules() {
    const email = (this.emailCtrl.value || '').trim();
    this.modsErr.set(null); this.modsSaved.set(false);
    if (!email) { this.modsErr.set('Enter a user email'); return; }
    this.loadingMods.set(true);
    this.http.get<{ email: string; modules: string[] }>('/api/settings/user-modules', { params: { email } as any }).subscribe({
      next: (res) => {
        this.loadingMods.set(false);
        this.currentEmail.set(email);
        this.selectedModules.set(new Set(res?.modules || []));
      },
      error: (e) => { this.loadingMods.set(false); this.modsErr.set(e?.error?.message || 'Failed to load modules'); }
    });
  }

  hasModule(key: string): boolean {
    return this.selectedModules().has(key);
  }

  toggleModule(key: string, checked: boolean) {
    const set = new Set(this.selectedModules());
    if (checked) set.add(key); else set.delete(key);
    this.selectedModules.set(set);
  }

  saveUserModules() {
    const email = this.currentEmail();
    if (!email) { this.modsErr.set('No user loaded'); return; }
    this.savingMods.set(true); this.modsSaved.set(false); this.modsErr.set(null);
    const modules = Array.from(this.selectedModules());
    this.http.patch<{ success: boolean }>('/api/settings/user-modules', { email, modules }).subscribe({
      next: (r) => { this.savingMods.set(false); if (r?.success) this.modsSaved.set(true); else this.modsErr.set('Save failed'); },
      error: (e) => { this.savingMods.set(false); this.modsErr.set(e?.error?.message || 'Save failed'); }
    });
  }

  save() {
    this.saving.set(true); this.ok.set(false); this.err.set(null);
    const body = this.form.getRawValue();
    this.http.patch<SettingsDto>('/api/settings', body).subscribe({
      next: _ => { this.saving.set(false); this.ok.set(true); },
      error: e => { this.saving.set(false); this.err.set(e?.error?.message || 'Save failed'); }
    });
  }

  saveFees() {
    this.savingFees.set(true); this.okFees.set(false); this.errFees.set(null);
    const body = this.feesForm.getRawValue();
    this.http.patch<any>('/api/accounts/settings', body).subscribe({
      next: _ => { this.savingFees.set(false); this.okFees.set(true); },
      error: e => { this.savingFees.set(false); this.errFees.set(e?.error?.message || 'Save failed'); }
    });
  }

  addDepartment(){
    const name = (this.newDept() || '').trim();
    this.depOk.set(false); this.depErr.set(null);
    if (!name) { this.depErr.set('Enter a department name'); return; }
    this.http.post<{ id:string; name:string }>('/api/hr/departments', { name }).subscribe({
      next: d => {
        if (d && d.id) {
          this.departments.set([ ...this.departments(), d ]);
          this.newDept.set('');
          this.depOk.set(true);
        } else {
          this.depErr.set('Failed to add');
        }
      },
      error: (e) => { this.depErr.set(e?.error?.message || 'Failed to add'); }
    });
  }

  logoOk = signal(false);
  logoErr = signal<string | null>(null);
  onLogo(ev: Event) {
    this.logoOk.set(false); this.logoErr.set(null);
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    this.http.post<{ success:boolean; logoUrl?: string }>('/api/settings/logo', fd).subscribe({
      next: (r) => { if (r?.success) { this.logoOk.set(true); if (r.logoUrl) this.form.patchValue({ logoUrl: r.logoUrl }); } else { this.logoErr.set('Upload failed'); } },
      error: (e) => { this.logoErr.set(e?.error?.message || 'Upload failed'); }
    });
  }

  // promoteClasses moved
}
