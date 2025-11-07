import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ReportService } from '../reports/report.service';

@Component({
  selector: 'app-publish-results',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wrap">
      <h2>Publish results</h2>
      <div class="card">
        <p class="muted">Clicking this will send report cards to parents for all classes for the current term. Students with arrears will be suppressed on the Parent Portal.</p>
        <div class="row">
          <button class="btn primary" (click)="publish()" [disabled]="loading()">
            {{ loading() ? 'Publishing…' : 'Publish results for all classes' }}
          </button>
          <span class="ok" *ngIf="ok()">Sent {{ sent() }} emails<span *ngIf="suppressed()">, suppressed {{ suppressed() }}</span>.</span>
          <span class="err" *ngIf="err()">{{ err() }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:800px;margin:24px auto;padding:0 12px;display:grid;gap:12px}
    h2{margin:0}
    .card{border:1px solid #e5e7eb;border-radius:10px;background:#fff;padding:12px;display:grid;gap:10px}
    .row{display:flex;gap:10px;align-items:center}
    .btn{display:flex;align-items:center;gap:6px;padding:10px 12px;border:1px solid #0b53a5;border-radius:8px;background:#0b53a5;color:#fff;font-weight:700;cursor:pointer}
    .btn:disabled{opacity:.6;cursor:not-allowed}
    .muted{color:#6b7280}
    .ok{color:#166534}
    .err{color:#b91c1c}
  `]
})
export class PublishResultsComponent implements OnInit {
  private http = inject(HttpClient);
  private reports = inject(ReportService);

  loading = signal(false);
  ok = signal(false);
  err = signal<string | null>(null);
  sent = signal(0);
  suppressed = signal(0);
  currentTerm = '';

  async ngOnInit(){
    try {
      const s: any = await this.http.get('/api/settings').toPromise();
      this.currentTerm = (s?.currentTerm || s?.term || '').toString();
    } catch {}
  }

  publish(){
    this.err.set(null); this.ok.set(false); this.sent.set(0); this.suppressed.set(0); this.loading.set(true);
    const term = this.currentTerm || '';
    this.reports.publishResults(term, undefined, { suppressArrears: true }).subscribe({
      next: (r) => { this.loading.set(false); this.ok.set(true); this.sent.set((r as any)?.sent || 0); this.suppressed.set((r as any)?.suppressed || 0); },
      error: (e) => { this.loading.set(false); this.err.set(e?.error?.message || 'Failed to publish'); }
    });
  }
}
