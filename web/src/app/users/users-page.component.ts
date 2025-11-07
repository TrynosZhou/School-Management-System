import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { UsersService, type AppUser } from './users.service';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="wrap">
      <div class="top">
        <h2>Users</h2>
        <button type="button" (click)="startAdd()">Add User</button>
      </div>

      <table class="table" *ngIf="users().length; else empty">
        <thead>
          <tr>
            <th>Email</th>
            <th>Full Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let u of users()">
            <td>{{ u.email }}</td>
            <td>{{ u.fullName || '-' }}</td>
            <td>{{ u.role || '-' }}</td>
            <td>{{ u.status || 'ACTIVE' }}</td>
            <td>
              <div class="actions">
                <button type="button" (click)="startEdit(u)">Edit</button>
                <button type="button" class="danger" (click)="remove(u)" title="Delete user">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <ng-template #empty>
        <div class="muted">No users found.</div>
      </ng-template>

      <div class="modal-backdrop" *ngIf="showForm()" (click)="cancel()"></div>
      <div class="modal" *ngIf="showForm()" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="title">{{ isEdit() ? 'Edit User' : 'Add User' }}</div>
          <button class="close" type="button" (click)="cancel()">✖</button>
        </div>
        <form class="form" [formGroup]="form" (ngSubmit)="save()">
          <label>Email</label>
          <input formControlName="email" [readonly]="isEdit()"/>

          <label *ngIf="!isEdit()">Password</label>
          <input *ngIf="!isEdit()" type="password" formControlName="password" />

          <label>Full Name</label>
          <input formControlName="fullName" />

          <label>Contact Number</label>
          <input formControlName="contactNumber" />

          <label>Role</label>
          <select formControlName="role">
            <option value="">-- Select --</option>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
            <option value="parent">Parent</option>
          </select>

          <label>Status</label>
          <select formControlName="status">
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>

          <div class="actions">
            <button type="submit" [disabled]="form.invalid || saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
            <button type="button" (click)="cancel()" [disabled]="saving()">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:900px;margin:24px auto}
    .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb}
    th,td{padding:8px;border:1px solid #eee;text-align:left}
    .muted{color:#6b7280}
    .actions{display:inline-flex;gap:8px}
    .danger{background:#ef4444;color:#fff;border:1px solid #ef4444;border-radius:4px;padding:4px 8px}
    .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.35)}
    .modal{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.2);width:min(540px,96vw)}
    .modal-header{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-bottom:1px solid #e5e7eb}
    .modal-header .close{border:none;background:transparent;font-size:18px;cursor:pointer}
    .form{display:grid;gap:8px;padding:10px}
    input,select{padding:8px;border:1px solid #e5e7eb;border-radius:6px}
  `]
})
export class UsersPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(UsersService);

  users = signal<AppUser[]>([]);
  showForm = signal(false);
  isEdit = signal(false);
  currentId: string | null = null;
  saving = signal(false);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    fullName: [''],
    contactNumber: [''],
    role: [''],
    status: ['ACTIVE', Validators.required],
  });

  ngOnInit(): void {
    this.load();
  }

  load(){
    this.svc.list().subscribe({ next: rows => this.users.set(rows || []) });
  }

  startAdd(){
    this.isEdit.set(false); this.currentId = null; this.form.reset({ email: '', password: '', fullName: '', contactNumber: '', role: '', status: 'ACTIVE' }); this.showForm.set(true);
  }
  startEdit(u: AppUser){
    this.isEdit.set(true); this.currentId = u.id; this.form.reset({ email: u.email, password: '', fullName: u.fullName || '', contactNumber: u.contactNumber || '', role: u.role || '', status: u.status || 'ACTIVE' }); this.showForm.set(true);
  }
  cancel(){ if (this.saving()) return; this.showForm.set(false); }

  save(){
    if (this.form.invalid) return;
    this.saving.set(true);
    const raw = this.form.getRawValue();
    if (this.isEdit() && this.currentId) {
      this.svc.update(this.currentId, { fullName: raw.fullName || null, contactNumber: raw.contactNumber || null, role: raw.role || undefined, status: raw.status as any }).subscribe({
        next: () => { this.saving.set(false); this.showForm.set(false); this.load(); },
        error: () => { this.saving.set(false); }
      });
    } else {
      this.svc.create({ email: raw.email!, password: raw.password!, role: raw.role || undefined, fullName: raw.fullName || null, contactNumber: raw.contactNumber || null }).subscribe({
        next: () => { this.saving.set(false); this.showForm.set(false); this.load(); },
        error: () => { this.saving.set(false); }
      });
    }
  }

  remove(u: AppUser){
    if (!u?.id) return;
    try { if (!confirm(`Delete user ${u.email}?`)) return; } catch {}
    this.svc.remove(u.id).subscribe({ next: () => this.load() });
  }
}
