import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { AccountsService, AccountSettingsDto, BalanceItem } from './accounts.service';

@Component({
  selector: 'app-accounts-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="top">
        <h2>Accounts — Admin</h2>
      </div>

      <section class="card" id="record-payment">
        <h3><span class="ico purple">💳</span> Record Payment</h3>
        <div class="grid rp-grid">
          <div class="full">
            <label><span class="ico blue">🆔</span> Student ID or Code</label>
            <div class="row">
              <input [(ngModel)]="pay.student" [ngModelOptions]="{standalone:true}" placeholder="UUID or code like JHS0000001" />
              <button class="btn" type="button" (click)="lookupBalance()" [disabled]="lookupBusy()"><span class="i green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 21l-4.35-4.35"/><circle cx="10.5" cy="10.5" r="6.5"/></svg></span>{{ lookupBusy() ? 'Checking…' : 'Check Balance' }}</button>
            </div>
            <div class="muted small" *ngIf="lookupErr()">{{ lookupErr() }}</div>
          </div>
          <div>
            <label><span class="ico teal">🧮</span> Current Balance</label>
            <div class="balance" [class.pos]="(currentBalance()||0) >= 0" [class.neg]="(currentBalance()||0) < 0">{{ (currentBalance() ?? 0) | number:'1.2-2' }}</div>
          </div>
          <div>
            <label><span class="ico pink">👤</span> Student Name</label>
            <div class="name">{{ studentName() || '-' }}</div>
          </div>
          <div>
            <label><span class="ico emerald">💵</span> Amount</label>
            <input [(ngModel)]="pay.amount" [ngModelOptions]="{standalone:true}" placeholder="0.00" />
          </div>
          <div>
            <label><span class="ico gray">📝</span> Note</label>
            <input [(ngModel)]="pay.note" [ngModelOptions]="{standalone:true}" placeholder="optional" />
          </div>
          <div>
            <label><span class="ico amber">🧾</span> Receipt # (auto)</label>
            <input [(ngModel)]="pay.receiptNumber" [ngModelOptions]="{standalone:true}" placeholder="auto-generated e.g., J1234" />
          </div>
          <div>
            <label><span class="ico indigo">🏦</span> Method</label>
            <select [(ngModel)]="pay.method" [ngModelOptions]="{standalone:true}">
              <option value="">Select…</option>
              <option>cash</option>
              <option>momo</option>
              <option>bank</option>
              <option>cheque</option>
              <option>card</option>
            </select>
          </div>
          <div>
            <label><span class="ico sky">🔗</span> Reference</label>
            <input [(ngModel)]="pay.reference" [ngModelOptions]="{standalone:true}" placeholder="txn ref" />
          </div>
          <div>
            <label><span class="ico lime">📅</span> Date Of Transaction (YYYY-MM-DD)</label>
            <input [(ngModel)]="pay.receivedAt" [ngModelOptions]="{standalone:true}" placeholder="YYYY-MM-DD" />
          </div>
          <div>
            <label><span class="ico violet">📘</span> Term</label>
            <input [(ngModel)]="pay.term" [ngModelOptions]="{standalone:true}" placeholder="Term 1" />
            <div class="muted small">Auto-fills from Settings. Required.</div>
          </div>
          <div>
            <label><span class="ico rose">🏫</span> Academic Year</label>
            <input [(ngModel)]="pay.academicYear" [ngModelOptions]="{standalone:true}" placeholder="2025/2026" />
            <div class="muted small">Auto-fills from Settings. Required.</div>
          </div>
        </div>
        <div class="actions">
          <button (click)="recordPayment()" [disabled]="payBusy() || !(pay.term?.trim() && pay.academicYear?.trim())"><span class="i emerald"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 6v12M6 12h12"/></svg></span>{{ payBusy() ? 'Recording…' : 'Record Payment' }}</button>
          <span class="ok" *ngIf="payOk()">{{ payOkMsg() }}</span>
          <span class="err" *ngIf="payErr()">{{ payErr() }}</span>
        </div>
      </section>

      

      

      <section class="card">
        <h3><span class="ico slate">🗓️</span> Period Close</h3>
        <div class="actions">
          <button (click)="termEnd()" [disabled]="closeBusy()"><span class="i sky"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 6h16M4 12h12M4 18h8"/></svg></span>Term End</button>
          <button (click)="yearEnd()" [disabled]="closeBusy()"><span class="i purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></span>Year End</button>
          <span class="ok" *ngIf="closeOk()">{{ closeOkMsg() }}</span>
          <span class="err" *ngIf="closeErr()">{{ closeErr() }}</span>
        </div>
      </section>

      <section class="card" id="outstanding">
        <h3>Outstanding Balances</h3>
        <div class="actions">
          <button (click)="exportCsv()"><span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3v12"/><path d="M7 12l5 5 5-5"/><path d="M5 21h14"/></svg></span>Export CSV</button>
        </div>
        <table class="table" *ngIf="balances().length; else empty">
          <thead>
            <tr>
              <th>Student</th>
              <th>Code</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let b of balances()">
              <td>{{ b.studentName }}</td>
              <td>{{ b.studentCode }}</td>
              <td>{{ b.balance | number:'1.2-2' }}</td>
            </tr>
          </tbody>
        </table>
        <ng-template #empty><div class="muted">No balances yet</div></ng-template>
      </section>

      <section class="card">
        <h3>Recent Payments</h3>
        <div class="actions">
          <button (click)="loadRecent()"><span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4v6h6"/><path d="M20 20v-6h-6"/><path d="M20 8a8 8 0 10.001 8.001V8z"/></svg></span>Refresh</button>
        </div>
        <table class="table" *ngIf="recent().length; else norecent">
          <thead>
            <tr>
              <th>Date</th>
              <th>Student</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Receipt #</th>
              <th>Reference</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let t of recent()">
              <td>{{ t.receivedAt || (t.createdAt | date:'medium') }}</td>
              <td>{{ t.student?.firstName }} {{ t.student?.lastName }}</td>
              <td>{{ (0 - (t.amount || 0)) | number:'1.2-2' }}</td>
              <td>{{ t.method || '-' }}</td>
              <td>{{ t.receiptNumber || '-' }}</td>
              <td>{{ t.reference || '-' }}</td>
              <td><button (click)="downloadReceipt(t.id)"><span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16v16H4z"/><path d="M7 8h10M7 12h10M7 16h6"/></svg></span>View Receipt</button></td>
            </tr>
          </tbody>
        </table>
        <ng-template #norecent><div class="muted">No recent payments</div></ng-template>
      </section>
    </div>
  `,
  styles: [`
    .wrap{max-width:1000px;margin:24px auto;display:grid;gap:16px}
    .top{display:flex;justify-content:space-between;align-items:center}
    .home{font-size:14px}
    .card{background:#fff;border:1px solid #eee;border-radius:10px;padding:16px}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
    .rp-grid .full{grid-column:1/-1}
    .rp-grid .row{display:flex;gap:8px;align-items:center}
    .ico{display:inline-flex;align-items:center;justify-content:center;margin-right:6px}
    .i{display:inline-flex;align-items:center;justify-content:center;margin-right:6px}
    .blue{color:#2563eb}
    .green{color:#16a34a}
    .teal{color:#0d9488}
    .pink{color:#db2777}
    .emerald{color:#059669}
    .gray{color:#6b7280}
    .amber{color:#d97706}
    .indigo{color:#4f46e5}
    .sky{color:#0ea5e9}
    .lime{color:#65a30d}
    .violet{color:#7c3aed}
    .rose{color:#e11d48}
    .purple{color:#9333ea}
    .slate{color:#334155}
    .name{padding:8px;border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb}
    .balance{padding:8px;border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb}
    .balance.pos{color:#065f46}
    .balance.neg{color:#991b1b}
    label{display:block;font-size:12px;color:#6b7280;margin-bottom:4px;font-weight:700}
    input,select{width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:8px}
    .actions{display:flex;gap:12px;align-items:center;margin-top:10px}
    .ok{color:#166534}
    .err{color:#b91c1c}
    .table{width:100%;border-collapse:collapse}
    th,td{padding:8px;border-bottom:1px solid #f1f2f6;text-align:left}
    .table button{background:#0b53a5;color:#fff;font-weight:600;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;font-size:13px;transition:background 0.2s}
    .table button:hover{background:#073d7a}
    .table .i{width:16px;height:16px;margin-right:4px}
    .table .i svg{width:16px;height:16px}
    .muted{color:#9ca3af}
    @media (max-width: 860px){ .grid{grid-template-columns:1fr} }
  `]
})
export class AccountsAdminComponent implements OnInit {
  private accounts = inject(AccountsService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  

  closeBusy = signal(false);
  closeOk = signal(false);
  closeOkMsg = signal('');
  closeErr = signal<string | null>(null);

  balances = signal<BalanceItem[]>([]);
  recent = signal<any[]>([]);

  // Payment state
  pay: { student: string; amount: string; note?: string; receiptNumber?: string; method?: string; reference?: string; receivedAt?: string; term?: string; academicYear?: string } = { student: '', amount: '' };
  payBusy = signal(false);
  payOk = signal(false);
  payOkMsg = signal('');
  payErr = signal<string | null>(null);
  currentBalance = signal<number | null>(null);
  studentName = signal<string | null>(null);
  lookupBusy = signal(false);
  lookupErr = signal<string | null>(null);

  // Bulk state includes optional classId for class-filtered generation

  ngOnInit(): void {
    this.refreshBalances();
    this.loadRecent();
    // Auto-scroll to section based on route
    const url = this.router.url;
    let targetId: string | null = null;
    if (url.endsWith('/record-payment')) targetId = 'record-payment';
    else if (url.endsWith('/fees-settings')) targetId = 'fees-settings';
    const view = this.route.snapshot.queryParamMap.get('view');
    if (!targetId && view === 'pending') targetId = 'outstanding';
    if (targetId) {
      setTimeout(() => {
        const el = document.getElementById(targetId!);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
    // Prefill student from query param when coming from Students list or my-fees page
    const studentQP = this.route.snapshot.queryParamMap.get('student');
    if (studentQP) {
      this.pay.student = studentQP;
      // Auto-lookup balance when student is pre-filled
      setTimeout(() => this.lookupBalance(), 100);
    }
    // Prefill today's date for Date Of Transaction if empty
    if (!this.pay.receivedAt) this.pay.receivedAt = new Date().toISOString().slice(0,10);
    // Prefill Term and Academic Year from settings if available
    this.accounts.getSettings().subscribe({
      next: (s: AccountSettingsDto) => {
        if (!this.pay.term && s?.currentTerm) this.pay.term = s.currentTerm || '';
        if (!this.pay.academicYear && s?.academicYear) this.pay.academicYear = s.academicYear || '';
      },
      error: () => {}
    });
  }

  

  

  termEnd() {
    this.closeBusy.set(true); this.closeOk.set(false); this.closeErr.set(null);
    this.accounts.termEnd().subscribe({
      next: (res: any) => { this.closeBusy.set(false); this.closeOk.set(true); this.closeOkMsg.set(`Closed ${res.termClosed || 'term'}`); },
      error: e => { this.closeBusy.set(false); this.closeErr.set(e?.error?.message || 'Term end failed'); }
    });
  }

  yearEnd() {
    this.closeBusy.set(true); this.closeOk.set(false); this.closeErr.set(null);
    this.accounts.yearEnd().subscribe({
      next: (res: any) => { this.closeBusy.set(false); this.closeOk.set(true); this.closeOkMsg.set(`Closed ${res.yearClosed || 'year'}`); },
      error: e => { this.closeBusy.set(false); this.closeErr.set(e?.error?.message || 'Year end failed'); }
    });
  }

  private refreshBalances() {
    this.accounts.listBalances().subscribe({ next: rows => this.balances.set(rows) });
  }

  recordPayment() {
    const student = (this.pay.student || '').trim();
    const amount = (this.pay.amount || '').trim();
    if (!student || !amount) { this.payErr.set('Student and amount are required'); return; }
    const term = (this.pay.term || '').trim();
    const academicYear = (this.pay.academicYear || '').trim();
    if (!term || !academicYear) { this.payErr.set('Enter Term and Academic Year (or set them in Settings)'); return; }
    this.payBusy.set(true); this.payOk.set(false); this.payErr.set(null);
    this.accounts.recordPayment(student, amount, {
      note: this.pay.note || undefined,
      receiptNumber: this.pay.receiptNumber || undefined,
      method: this.pay.method || undefined,
      reference: this.pay.reference || undefined,
      receivedAt: this.pay.receivedAt || undefined,
      term: term || undefined,
      academicYear: academicYear || undefined,
    }).subscribe({
      next: (res: any) => {
        this.payBusy.set(false); this.payOk.set(true); this.payOkMsg.set(`Saved. Receipt #: ${res?.receiptNumber || '-'} | New balance: ${Number(res.balance).toFixed(2)}`);
        this.refreshBalances();
        this.pay.amount = '';
        // Clear receipt field; next one will be generated by server
        this.pay.receiptNumber = '';
        this.loadRecent();
      },
      error: (e) => { this.payBusy.set(false); this.payErr.set(e?.error?.message || 'Payment failed'); }
    });
  }

  exportCsv() {
    this.accounts.downloadBalancesCsv().subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'balances.csv'; a.click();
      URL.revokeObjectURL(url);
    });
  }

  loadRecent() {
    this.accounts.recentPayments(20).subscribe(rows => this.recent.set(rows));
  }

  downloadReceipt(txId: string) {
    if (!txId) return;
    
    // Fetch the PDF with authentication using HttpClient
    const url = `http://localhost:3000/api/accounts/receipt/${encodeURIComponent(txId)}`;
    
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        // Create a blob URL and open in new tab to display the PDF
        const blobUrl = URL.createObjectURL(blob);
        const newWindow = window.open(blobUrl, '_blank');
        
        // Clean up the blob URL after opening
        if (newWindow) {
          // Delay cleanup to allow the PDF to load
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        } else {
          // If popup was blocked, offer download instead
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `receipt-${txId}.pdf`;
          a.click();
          URL.revokeObjectURL(blobUrl);
        }
      },
      error: (error) => {
        console.error('Error fetching receipt:', error);
        alert('Failed to load receipt. Please ensure you are logged in and try again.');
      }
    });
  }

  lookupBalance(){
    const idOrCode = (this.pay.student || '').trim();
    if (!idOrCode){ this.lookupErr.set('Enter student ID/code or last name'); return; }
    this.lookupBusy.set(true); this.lookupErr.set(null);
    this.accounts.getBalanceAuth(idOrCode).subscribe({
      next: (res:any) => {
        this.currentBalance.set(Number(res?.balance || 0));
        // Fetch student full name
        const looksUuid = /[a-f0-9\-]{32,}/i.test(idOrCode);
        const base = '/api/students';
        const req$ = looksUuid
          ? this.http.get<any>(`${base}/${encodeURIComponent(idOrCode)}`)
          : this.http.get<any>(`${base}/byStudentId/${encodeURIComponent(idOrCode)}`);
        req$.subscribe({
          next: (st: any) => { this.studentName.set(`${st?.firstName || ''} ${st?.lastName || ''}`.trim() || null); this.lookupBusy.set(false); },
          error: () => { this.studentName.set(null); this.lookupBusy.set(false); }
        });
      },
      error: (e) => { this.lookupBusy.set(false); this.lookupErr.set(e?.error?.message || 'Could not fetch balance'); this.currentBalance.set(null); this.studentName.set(null); }
    });
  }

  private genReceipt(): string {
    const n = Math.floor(1000 + Math.random() * 9000); // 4 digits
    return `J${n}`;
  }
}
