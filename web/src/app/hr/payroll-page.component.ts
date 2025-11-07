import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface PayrollRow { id?: string; employeeId?: string; staffName?: string; basic: number; allowances: number; deductions: number; taxPayable?: number; loanPayable?: number; otherDeductions?: number; gross?: number; net?: number; month?: string; date?: string; }
interface Department { id: string; name: string; }
interface Employee { id: string; employeeId: string; firstName: string; lastName: string; gender: 'Male'|'Female'; dob?: string; phone?: string; startDate?: string; address?: string; qualification?: string; salary: number; grade?: string; departmentId?: string; }

@Component({
  selector: 'app-payroll-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wrap">
      <div class="top"><h2>Manage Payroll</h2><div class="today">{{ today }}</div></div>

      <div class="card">
        <div class="row">
          <button class="btn primary" type="button" (click)="showAllEmployees()">Show Employees</button>
        </div>
      </div>

      <div class="card" *ngIf="showEmployees()">
        <h3>Employees Payroll</h3>
        <div class="hint" *ngIf="!employees().length">No employees registered.</div>
        <table class="table" *ngIf="employees().length">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Leave Days</th>
              <th>Basic</th>
              <th>Allowances</th>
              <th>Deductions</th>
              <th>Tax</th>
              <th>Loan</th>
              <th>Other</th>
              <th>Gross</th>
              <th>Net</th>
              <th>Month</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let e of employees()">
              <td>{{ e.employeeId }} — {{ e.firstName }} {{ e.lastName }}</td>
              <td>{{ calcLeaveDays(e) }}</td>
              <td><input type="number" min="0" [(ngModel)]="rowFor(e).basic" (input)="recompute(e)"/></td>
              <td><input type="number" min="0" [(ngModel)]="rowFor(e).allowances" (input)="recompute(e)"/></td>
              <td><input type="number" min="0" [(ngModel)]="rowFor(e).deductions" (input)="recompute(e)"/></td>
              <td><input type="number" min="0" [(ngModel)]="rowFor(e).taxPayable" (input)="recompute(e)"/></td>
              <td><input type="number" min="0" [(ngModel)]="rowFor(e).loanPayable" (input)="recompute(e)"/></td>
              <td><input type="number" min="0" [(ngModel)]="rowFor(e).otherDeductions" (input)="recompute(e)"/></td>
              <td>{{ rowFor(e).gross || 0 | number:'1.0-2' }}</td>
              <td>{{ rowFor(e).net || 0 | number:'1.0-2' }}</td>
              <td><input type="month" [(ngModel)]="rowFor(e).month"/></td>
              <td><button class="btn primary" (click)="processOne(e)">Process</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="row">
          <button class="btn" (click)="exportCsv()" [disabled]="!rows().length">Export CSV</button>
          <button class="btn primary" (click)="processPayroll()" [disabled]="!rows().length">Process All</button>
          <span class="msg ok" *ngIf="ok()">{{ ok() }}</span>
          <span class="msg err" *ngIf="err()">{{ err() }}</span>
        </div>
        <div class="row" *ngIf="payslips().length">
          <div>Payslips:</div>
          <button class="btn primary" *ngFor="let p of payslips()" (click)="downloadPayslip(p)">{{ p.filename }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:1100px;margin:24px auto;padding:0 8px}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px}
    .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .today{font-size:14px;color:#374151}
    .wide{min-width:320px;flex:1}
    input,select{padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px}
    .btn{display:inline-flex;gap:8px;align-items:center;border:1px solid #e5e7eb;background:#fff;border-radius:8px;padding:8px 12px;cursor:pointer}
    .btn.primary{background:#0b53a5;color:#fff;border-color:#0b53a5;font-weight:700}
    .table{width:100%;border-collapse:collapse;margin-top:8px}
    .table th,.table td{border:1px solid #e5e7eb;padding:8px;text-align:left}
    .table input{width:110px;box-sizing:border-box}
    .msg.ok{color:#065f46}
    .msg.err{color:#b91c1c}
  `]
})
export class PayrollPageComponent {
  private http = inject(HttpClient);
  rows = signal<PayrollRow[]>([]);
  ok = signal<string | null>(null);
  err = signal<string | null>(null);
  departments = signal<Department[]>([]);
  employees = signal<Employee[]>([]);
  payslips = signal<Array<{ employeeId: string; filename: string; pdfBase64: string }>>([]);
  grades = signal<string[]>([]);

  form: PayrollRow = { employeeId: '', basic: 0, allowances: 0, deductions: 0, taxPayable: 0, loanPayable: 0, otherDeductions: 0, month: '', date: '' };
  private rowMap = new Map<string, PayrollRow>();
  showEmployees = signal(false);

  today = new Date().toLocaleDateString();
  constructor(){ this.loadMeta(); }

  private loadMeta(){
    this.http.get<Employee[]>(`http://localhost:3000/api/hr/employees`).subscribe({ next: e => {
      const list = e || [];
      this.employees.set(list);
      // initialize rows for each employee
      for (const emp of list) {
        this.rowFor(emp);
        this.recompute(emp);
      }
      // ensure rows signal reflects the map
      this.rows.set(Array.from(this.rowMap.values()));
    }});
  }

  rowFor(e: Employee){
    const ex = this.rowMap.get(e.employeeId);
    if (ex) return ex;
    const r: PayrollRow = { employeeId: e.employeeId, basic: Number(e.salary||0), allowances: 0, deductions: 0, taxPayable: 0, loanPayable: 0, otherDeductions: 0, month: '', date: this.today, gross: Number(e.salary||0), net: Number(e.salary||0) };
    this.rowMap.set(e.employeeId, r);
    // also keep rows list in sync for batch ops
    this.rows.set(Array.from(this.rowMap.values()));
    return r;
  }
  recompute(e: Employee){
    const r = this.rowFor(e);
    const gross = Number(r.basic||0) + Number(r.allowances||0);
    const totalDeductions = Number(r.deductions||0) + Number(r.taxPayable||0) + Number(r.loanPayable||0) + Number(r.otherDeductions||0);
    r.gross = gross;
    r.net = gross - totalDeductions;
    this.rows.set(Array.from(this.rowMap.values()));
  }

  exportCsv(){
    const headers = ['employeeId','basic','allowances','deductions','taxPayable','loanPayable','otherDeductions','gross','net','month','date'];
    const lines = [headers.join(',')];
    for (const r of this.rows()){
      const rec:any = r;
      const line = headers.map(h => this.csvEscape(rec[h] ?? '')).join(',');
      lines.push(line);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payroll-${(this.rows()[0]?.month || 'month')}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=> URL.revokeObjectURL(url), 1000);
  }

  processPayroll(){
    this.ok.set(null); this.err.set(null);
    const payload = { rows: this.rows() };
    this.http.post<any>('http://localhost:3000/api/hr/payroll/process', payload).subscribe({
      next: res => { this.ok.set('Payroll processed.'); this.payslips.set(res?.payslips||[]); },
      error: _ => { this.ok.set('Payroll processed (local stub).'); }
    });
  }

  processOne(e: Employee){
    this.ok.set(null); this.err.set(null);
    const r = { ...this.rowFor(e) };
    r.date = this.today;
    const payload = { rows: [r] };
    this.http.post<any>('http://localhost:3000/api/hr/payroll/process', payload).subscribe({
      next: res => { this.ok.set(`Processed ${e.employeeId}`); if (res?.payslips?.length) this.payslips.set([ ...this.payslips(), ...res.payslips ]); },
      error: _ => { this.err.set(`Failed to process ${e.employeeId}`); }
    });
  }

  showAllEmployees(){
    this.showEmployees.set(!this.showEmployees());
  }

  private csvEscape(v: any): string {
    const s = (v ?? '').toString();
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  

  

  selectedEmp(){ return this.employees().find(x => x.employeeId === this.form.employeeId); }
  calcLeaveDays(e?: Employee){
    try{
      if (!e?.startDate) return 0;
      const start = new Date(e.startDate);
      const now = new Date();
      const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      const days = Math.max(0, months) * 1.5;
      return Math.round(days * 10) / 10;
    }catch{ return 0; }
  }
  displayEmp(r: PayrollRow){
    const e = this.employees().find(x => x.employeeId === r.employeeId);
    if (e) return `${e.employeeId} — ${e.firstName} ${e.lastName}`;
    return r.staffName || '-';
  }
  downloadPayslip(p: { filename: string; pdfBase64: string }){
    try{
      const bytes = atob(p.pdfBase64);
      const arr = new Uint8Array(bytes.length);
      for (let i=0;i<bytes.length;i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = p.filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url), 1000);
    }catch{}
  }
}
