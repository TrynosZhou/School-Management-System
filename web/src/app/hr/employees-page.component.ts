import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Department { id: string; name: string; }
interface Employee { id: string; employeeId: string; firstName: string; lastName: string; gender: 'Male'|'Female'; dob?: string; phone?: string; startDate?: string; address?: string; qualification?: string; salary: number; grade?: string; departmentId?: string; }

@Component({
  selector: 'app-employees-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wrap">
      <div class="top"><h2>Employees</h2></div>

      <div class="card">
        <h3>Add New Employee</h3>
        <div class="row">
          <input placeholder="First Name" [(ngModel)]="newEmp.firstName"/>
          <input placeholder="Last Name" [(ngModel)]="newEmp.lastName"/>
          <select [(ngModel)]="newEmp.gender">
            <option>Male</option>
            <option>Female</option>
          </select>
          <input type="date" placeholder="DOB" [(ngModel)]="newEmp.dob"/>
          <input placeholder="Contact Phone" [(ngModel)]="newEmp.phone"/>
          <input type="date" placeholder="Start Date" [(ngModel)]="newEmp.startDate"/>
          <input class="wide" placeholder="Full Address" [(ngModel)]="newEmp.address"/>
          <input placeholder="Qualification" [(ngModel)]="newEmp.qualification"/>
          <input type="number" min="0" placeholder="Salary" [(ngModel)]="newEmp.salary"/>
          <select [(ngModel)]="newEmp.grade">
            <option value="">Select Grade</option>
            <option *ngFor="let g of grades()" [value]="g">{{ g }}</option>
          </select>
          <select [(ngModel)]="newEmp.departmentId">
            <option value="">Select Department</option>
            <option *ngFor="let d of departments()" [value]="d.id">{{ d.name }}</option>
          </select>
          <button class="btn primary" (click)="addEmployee()" [disabled]="!canCreate()">Add Employee</button>
          <span class="msg err" *ngIf="addErr()">{{ addErr() }}</span>
        </div>
      </div>

      <div class="card">
        <div class="row">
          <input class="wide" placeholder="Search by name or ID" [(ngModel)]="query"/>
          <button class="btn" (click)="reload()">Refresh</button>
        </div>
        <table class="table" *ngIf="employees().length; else empty">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Gender</th>
              <th>Department</th>
              <th>Salary</th>
              <th>Grade</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let e of filteredEmployees(); let i = index">
              <td>{{ e.employeeId }}</td>
              <td>
                <ng-container *ngIf="editId() !== e.id; else editName">
                  {{ e.firstName }} {{ e.lastName }}
                </ng-container>
                <ng-template #editName>
                  <input placeholder="First Name" [(ngModel)]="editForm.firstName"/>
                  <input placeholder="Last Name" [(ngModel)]="editForm.lastName"/>
                </ng-template>
              </td>
              <td>
                <ng-container *ngIf="editId() !== e.id; else editGender">
                  {{ e.gender }}
                </ng-container>
                <ng-template #editGender>
                  <select [(ngModel)]="editForm.gender">
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </ng-template>
              </td>
              <td>
                <ng-container *ngIf="editId() !== e.id; else editDept">
                  {{ findDeptName(e.departmentId) }}
                </ng-container>
                <ng-template #editDept>
                  <select [(ngModel)]="editForm.departmentId">
                    <option value="">Select Department</option>
                    <option *ngFor="let d of departments()" [value]="d.id">{{ d.name }}</option>
                  </select>
                </ng-template>
              </td>
              <td>
                <ng-container *ngIf="editId() !== e.id; else editSalary">
                  {{ e.salary | number:'1.0-2' }}
                </ng-container>
                <ng-template #editSalary>
                  <input type="number" min="0" [(ngModel)]="editForm.salary"/>
                </ng-template>
              </td>
              <td>
                <ng-container *ngIf="editId() !== e.id; else editGrade">
                  {{ e.grade || '-' }}
                </ng-container>
                <ng-template #editGrade>
                  <select [(ngModel)]="editForm.grade">
                    <option value="">Select Grade</option>
                    <option *ngFor="let g of grades()" [value]="g">{{ g }}</option>
                  </select>
                </ng-template>
              </td>
              <td>
                <ng-container *ngIf="editId() !== e.id; else editActions">
                  <button class="btn" (click)="startEdit(e)">Edit</button>
                  <button class="btn danger" (click)="deleteEmployee(e)">Delete</button>
                </ng-container>
                <ng-template #editActions>
                  <button class="btn" (click)="saveEdit(e)" [disabled]="!canSaveEdit()">Save</button>
                  <button class="btn" (click)="cancelEdit()">Cancel</button>
                </ng-template>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #empty>
          <div class="hint">No employees found.</div>
        </ng-template>
        <span class="msg ok" *ngIf="ok()">{{ ok() }}</span>
        <span class="msg err" *ngIf="err()">{{ err() }}</span>
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:1100px;margin:24px auto;padding:0 8px}
    .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin-bottom:12px}
    .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px}
    .wide{min-width:320px;flex:1}
    input,select{padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px}
    .table{width:100%;border-collapse:collapse;margin-top:8px}
    .table th,.table td{border:1px solid #e5e7eb;padding:8px;text-align:left;vertical-align:middle}
    .btn{display:inline-flex;gap:8px;align-items:center;border:1px solid #0b53a5;background:#0b53a5;border-radius:8px;padding:6px 10px;cursor:pointer;color:#fff;font-weight:700;margin:2px 6px 2px 0}
    .btn.primary{background:#0b53a5;color:#fff;border-color:#0b53a5;font-weight:700}
    .btn.danger{background:#0b53a5;color:#fff;border-color:#0b53a5}
    .table td .btn{margin-right:6px;margin-bottom:4px}
    .table td .btn:last-child{margin-right:0}
    .msg.ok{color:#065f46}
    .msg.err{color:#b91c1c}
    .hint{color:#6b7280}
  `]
})
export class EmployeesPageComponent {
  private http = inject(HttpClient);
  employees = signal<Employee[]>([]);
  departments = signal<Department[]>([]);
  grades = signal<string[]>([]);

  ok = signal<string|null>(null);
  err = signal<string|null>(null);
  addErr = signal<string|null>(null);

  query = '';

  newEmp: any = { firstName:'', lastName:'', gender:'Male', dob:'', phone:'', startDate:'', address:'', qualification:'', salary:0, grade:'', departmentId:'' };

  editId = signal<string|undefined>(undefined);
  editForm: any = {};

  constructor(){ this.loadMeta(); }

  private loadMeta(){
    this.reload();
    this.http.get<Department[]>(`http://localhost:3000/api/hr/departments`).subscribe({ next: d => this.departments.set(d||[]) });
    this.http.get<any>(`http://localhost:3000/api/settings`).subscribe({ next: s => {
      const raw = (s?.employeeGradesJson || '').toString().trim();
      let list: string[] = [];
      if (raw) {
        try { const arr = JSON.parse(raw); if (Array.isArray(arr)) list = arr.map((x:any)=> String(x)); }
        catch { list = raw.split(',').map((x:string)=> x.trim()).filter(Boolean); }
      }
      this.grades.set(list);
    }});
  }

  reload(){
    this.http.get<Employee[]>(`http://localhost:3000/api/hr/employees`).subscribe({ next: e => this.employees.set(e||[]) });
  }

  filteredEmployees(){
    const q = (this.query||'').toLowerCase().trim();
    if (!q) return this.employees();
    return this.employees().filter(e =>
      e.employeeId.toLowerCase().includes(q) ||
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q)
    );
  }

  canCreate(){
    if (!this.newEmp.firstName?.trim() || !this.newEmp.lastName?.trim()) return false;
    if (this.grades().length>0 && !this.newEmp.grade) return false;
    return true;
  }

  addEmployee(){
    this.addErr.set(null); this.ok.set(null); this.err.set(null);
    const p = { ...this.newEmp, salary: Number(this.newEmp.salary||0) };
    this.http.post<Employee>(`http://localhost:3000/api/hr/employees`, p).subscribe({
      next: e => { this.employees.set([ ...this.employees(), e ]); this.newEmp = { firstName:'', lastName:'', gender:'Male', dob:'', phone:'', startDate:'', address:'', qualification:'', salary:0, grade:'', departmentId:'' }; },
      error: e => { this.addErr.set(e?.error?.message || 'Failed to add'); }
    });
  }

  startEdit(e: Employee){
    this.editId.set(e.id);
    this.editForm = { ...e };
  }

  canSaveEdit(){
    if (!this.editForm.firstName?.trim() || !this.editForm.lastName?.trim()) return false;
    if (this.grades().length>0 && !this.editForm.grade) return false;
    return true;
  }

  saveEdit(e: Employee){
    this.ok.set(null); this.err.set(null);
    const body = { ...this.editForm };
    delete (body as any).id; delete (body as any).employeeId;
    this.http.patch<Employee>(`http://localhost:3000/api/hr/employees/${e.id}`, body).subscribe({
      next: up => {
        this.employees.set(this.employees().map(x => x.id === up.id ? up : x));
        this.editId.set(undefined);
      },
      error: er => { this.err.set(er?.error?.message || 'Failed to save'); }
    });
  }

  cancelEdit(){
    this.editId.set(undefined);
  }

  deleteEmployee(e: Employee){
    if (!confirm('Delete this employee?')) return;
    this.ok.set(null); this.err.set(null);
    this.http.delete<any>(`http://localhost:3000/api/hr/employees/${e.id}`).subscribe({
      next: _ => { this.employees.set(this.employees().filter(x => x.id !== e.id)); },
      error: er => { this.err.set(er?.error?.message || 'Failed to delete'); }
    });
  }

  findDeptName(id?: string){ return this.departments().find(d => d.id === id)?.name || '-'; }
}
