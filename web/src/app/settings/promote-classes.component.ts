import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-promote-classes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wrap">
      <div class="top">
        <h2>Promote Classes</h2>
        <a routerLink="/settings" class="home">Back to Settings</a>
      </div>

      <div class="card">
        <p>Promote all classes to the next level. Form 6 classes will be moved to <strong>Graduated Class</strong>.</p>
        <div class="actions">
          <button (click)="promote()" [disabled]="busy()">{{ busy() ? 'Promoting…' : 'Promote Classes' }}</button>
          <span class="ok" *ngIf="ok()">{{ summary() }}</span>
          <span class="err" *ngIf="err()">{{ err() }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:800px;margin:24px auto;display:grid;gap:16px}
    .top{display:flex;justify-content:space-between;align-items:center}
    .card{background:#fff;border:1px solid #eee;border-radius:10px;padding:16px}
    .actions{display:flex;gap:12px;align-items:center;margin-top:10px}
    .ok{color:#166534}
    .err{color:#b91c1c}
    .home{font-size:14px}
  `]
})
export class PromoteClassesComponent {
  private http = inject(HttpClient);

  busy = signal(false);
  ok = signal(false);
  err = signal<string | null>(null);
  summary = signal('');

  promote(){
    if (this.busy()) return;
    this.busy.set(true); this.ok.set(false); this.err.set(null); this.summary.set('');
    this.http.post<{ success:boolean; promoted:number; graduated:number }>('http://localhost:3000/api/classes/promote', {})
      .subscribe({
        next: (r) => {
          this.busy.set(false);
          if (r?.success) { this.ok.set(true); this.summary.set(`${r.promoted} promoted, ${r.graduated} graduated`); }
          else { this.err.set('Promotion failed'); }
        },
        error: (e) => { this.busy.set(false); this.err.set(e?.error?.message || 'Promotion failed'); }
      });
  }
}
