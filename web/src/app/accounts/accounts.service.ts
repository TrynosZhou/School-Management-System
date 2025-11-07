import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface AccountSettingsDto {
  currentTerm?: string | null;
  termFeeAmount: string;
  academicYear?: string | null;
  dayFeeAmount?: string;
  boarderFeeAmount?: string;
}

export interface BalanceItem { studentId: string; studentName: string; studentCode: string; balance: number }

@Injectable({ providedIn: 'root' })
export class AccountsService {
  private http = inject(HttpClient);
  private base = '/api/accounts';

  getSettings() { return this.http.get<AccountSettingsDto>(`${this.base}/settings`); }
  updateSettings(body: Partial<AccountSettingsDto>) { return this.http.patch<AccountSettingsDto>(`${this.base}/settings`, body); }

  bulkInvoices(body: { term?: string; academicYear?: string; amount?: string; description?: string }) {
    return this.http.post(`${this.base}/bulkInvoices`, body);
  }

  bulkInvoicesByClass(body: { classId: string; term?: string; academicYear?: string; amount?: string; description?: string }) {
    return this.http.post(`${this.base}/bulkInvoices/byClass`, body);
  }

  listBalances() { return this.http.get<BalanceItem[]>(`${this.base}/balances`); }

  termEnd(term?: string) { return this.http.post(`${this.base}/termEnd`, { term }); }
  yearEnd(academicYear?: string) { return this.http.post(`${this.base}/yearEnd`, { academicYear }); }

  getBalancePublic(studentId: string) { return this.http.get<any>(`${this.base}/public/balance/${encodeURIComponent(studentId)}`); }
  getBalanceAuth(idOrCode: string) { return this.http.get<any>(`${this.base}/student/${encodeURIComponent(idOrCode)}/balance`); }
  getTermBalance(idOrCode: string, term: string) { return this.http.get<any>(`${this.base}/student/${encodeURIComponent(idOrCode)}/balance/term/${encodeURIComponent(term)}`); }

  recordPayment(studentIdOrCode: string, amount: string, opts?: { note?: string; receiptNumber?: string; method?: string; reference?: string; receivedAt?: string; term?: string; academicYear?: string }) {
    const body: any = { studentIdOrCode, amount };
    if (opts?.note) body.note = opts.note;
    if (opts?.receiptNumber) body.receiptNumber = opts.receiptNumber;
    if (opts?.method) body.method = opts.method;
    if (opts?.reference) body.reference = opts.reference;
    if (opts?.receivedAt) body.receivedAt = opts.receivedAt;
    if (opts?.term) body.term = opts.term;
    if (opts?.academicYear) body.academicYear = opts.academicYear;
    return this.http.post(`${this.base}/payment`, body);
  }

  downloadBalancesCsv() {
    return this.http.get(`${this.base}/balances.csv`, { responseType: 'blob' as const });
  }

  downloadStatement(idOrCode: string) {
    return this.http.get(`${this.base}/invoice/${encodeURIComponent(idOrCode)}`, { responseType: 'blob' as const });
  }

  recentPayments(limit = 20, opts?: { from?: string; to?: string; method?: string }) {
    const params: any = { limit };
    if (opts?.from) params.from = opts.from;
    if (opts?.to) params.to = opts.to;
    if (opts?.method) params.method = opts.method;
    return this.http.get<any[]>(`${this.base}/payments/recent`, { params });
  }

  downloadReceipt(txId: string) {
    return this.http.get(`${this.base}/receipt/${encodeURIComponent(txId)}`, { responseType: 'blob' as const });
  }
}
