import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountsService } from './accounts.service';
import { ClassesService, type ClassEntity } from '../classes/classes.service';

@Component({
  selector: 'app-accounts-bulk-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wrap">
      <div class="top">
        <h2>Accounts — Bulk Invoices</h2>
      </div>

      <section class="card" id="bulk-invoices">
        <h3>Bulk Invoices</h3>
        <div class="grid">
          <div>
            <label>Term</label>
            <input [(ngModel)]="bulk.term" [ngModelOptions]="{standalone:true}" placeholder="leave blank to use settings" />
          </div>
          <div>
            <label>Academic Year</label>
            <input [(ngModel)]="bulk.year" [ngModelOptions]="{standalone:true}" placeholder="leave blank to use settings" />
          </div>
          <div>
            <label>Amount</label>
            <input [(ngModel)]="bulk.amount" [ngModelOptions]="{standalone:true}" placeholder="leave blank to use settings" />
          </div>
          <div>
            <label>Description</label>
            <input [(ngModel)]="bulk.desc" [ngModelOptions]="{standalone:true}" placeholder="e.g., Term fees" />
          </div>
          <div>
            <label>Class (optional)</label>
            <select [(ngModel)]="bulk.classId" [ngModelOptions]="{standalone:true}">
              <option value="">All students</option>
              <option *ngFor="let c of classes()" [ngValue]="c.id">{{ c.name }} — {{ c.academicYear }}</option>
            </select>
          </div>
        </div>
        <div class="actions">
          <button (click)="generateBulk()" [disabled]="busy()"><span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 6v12M6 12h12"/></svg></span>{{ busy() ? 'Generating…' : 'Generate Invoices' }}</button>
          <span class="ok" *ngIf="ok()">{{ okMsg() }}</span>
          <span class="err" *ngIf="err()">{{ err() }}</span>
        </div>
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
export class AccountsBulkInvoicesComponent {
  private accounts = inject(AccountsService);
  private classesSvc = inject(ClassesService);

  classes = signal<ClassEntity[]>([]);
  busy = signal(false);
  ok = signal(false);
  okMsg = signal('');
  err = signal<string | null>(null);

  bulk: { term: string; year: string; amount: string; desc: string; classId?: string } = { term: '', year: '', amount: '', desc: '', classId: '' };

  constructor(){
    this.classesSvc.list().subscribe({ next: rows => this.classes.set(rows) });
  }

  generateBulk(){
    this.busy.set(true); this.ok.set(false); this.err.set(null);
    const req$ = (this.bulk.classId)
      ? this.accounts.bulkInvoicesByClass({ classId: this.bulk.classId, term: this.bulk.term || undefined, academicYear: this.bulk.year || undefined, amount: this.bulk.amount || undefined, description: this.bulk.desc || undefined })
      : this.accounts.bulkInvoices({ term: this.bulk.term || undefined, academicYear: this.bulk.year || undefined, amount: this.bulk.amount || undefined, description: this.bulk.desc || undefined });
    req$.subscribe({
      next: (_res: any) => {
        this.busy.set(false);
        this.ok.set(true);
        const msg = 'Bulk invoicing is completed successfully';
        console.log(msg);
        this.okMsg.set(msg);
      },
      error: (e) => { this.busy.set(false); this.err.set(e?.error?.message || 'Bulk generation failed'); }
    });
  }
}
