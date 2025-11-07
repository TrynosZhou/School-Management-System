import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { SubjectsService, type Subject } from './subjects.service';

@Component({
  selector: 'app-subjects-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="toolbar">
        <h2>Subjects</h2>
        <div class="right">
          <button (click)="create()">New Subject</button>
        </div>
      </div>
      <div class="kpis">
        <div class="kpi-tile blue">
          <div class="num">{{ subjects().length }}</div>
          <div class="label">Total Subjects</div>
        </div>
        <div class="kpi-tile green">
          <div class="num">{{ withCodeCount() }}</div>
          <div class="label">With Code</div>
        </div>
        <div class="kpi-tile red">
          <div class="num">{{ withoutCodeCount() }}</div>
          <div class="label">Without Code</div>
        </div>
        <div class="kpi-tile cyan">
          <div class="num">{{ uniqueInitialsCount() }}</div>
          <div class="label">Unique Initials</div>
        </div>
        <div class="kpi-tile green">
          <div class="num">{{ totalPeriods() }}</div>
          <div class="label">Total Teaching Periods</div>
        </div>
      </div>
      <table class="table" *ngIf="subjects().length; else empty">
        <thead>
          <tr><th>Code</th><th>Name</th><th>Teaching Periods</th><th></th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let s of subjects()">
            <td>{{ s.code }}</td>
            <td>{{ s.name }}</td>
            <td>{{ s.teachingPeriods ?? 0 }}</td>
            <td><a [routerLink]="['/subjects', s.id]">Edit</a></td>
          </tr>
        </tbody>
      </table>
      <ng-template #empty>
        <p>No subjects yet.</p>
      </ng-template>
    </div>
  `,
  styles: [`.wrap{max-width:900px;margin:24px auto}.toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:8px 0 14px}.kpi-tile{color:#fff;border-radius:6px;padding:12px}.kpi-tile .num{font-size:22px;font-weight:700}.kpi-tile .label{opacity:.9}.kpi-tile.red{background:#e05a47}.kpi-tile.green{background:#18a558}.kpi-tile.cyan{background:#12b6df}.kpi-tile.blue{background:#0b53a5}.table{width:100%;border-collapse:collapse}.table th,.table td{border:1px solid #ddd;padding:8px}@media(max-width:780px){.kpis{grid-template-columns:repeat(2,1fr)}}@media(max-width:520px){.kpis{grid-template-columns:1fr}}`]
})
export class SubjectsListComponent implements OnInit {
  private svc = inject(SubjectsService);
  private router = inject(Router);
  subjects = signal<Subject[]>([]);

  ngOnInit() {
    this.svc.list().subscribe(res => this.subjects.set(res));
  }

  create() { this.router.navigateByUrl('/subjects/new'); }

  withCodeCount() { return this.subjects().filter(s => !!(s.code && s.code.trim())).length; }
  withoutCodeCount() { return this.subjects().filter(s => !(s.code && s.code.trim())).length; }
  uniqueInitialsCount() { return new Set(this.subjects().map(s => (s.name||'').trim()[0]?.toUpperCase()).filter(Boolean)).size; }
  totalPeriods() { return this.subjects().reduce((sum, s) => sum + (Number(s.teachingPeriods||0) || 0), 0); }
}
