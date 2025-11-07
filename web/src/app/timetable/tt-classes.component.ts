import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClassesService, type ClassEntity } from '../classes/classes.service';

@Component({
  selector: 'app-tt-classes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wrap">
      <h2>Timetable • Classes</h2>
      <div class="panel">
        <div class="inline">
          <input [(ngModel)]="name" placeholder="Class name"/>
          <input [(ngModel)]="year" placeholder="Academic year (optional)"/>
          <button type="button" class="primary" (click)="add()" [disabled]="!name.trim()">Add</button>
          <button type="button" (click)="load()">Load from server</button>
        </div>
        <div class="list" *ngIf="rows().length">
          <div class="item" *ngFor="let c of rows(); let i = index">
            <div class="name">{{ c.name }}</div>
            <div class="sub">{{ c.academicYear || '' }}</div>
            <button type="button" class="danger" (click)="remove(i)">Remove</button>
          </div>
        </div>
        <div class="muted" *ngIf="!rows().length">No classes yet</div>
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:900px;margin:24px auto;padding:0 12px;display:grid;gap:12px}
    .panel{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px;display:grid;gap:10px}
    .inline{display:flex;gap:6px;flex-wrap:wrap}
    input{padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font:inherit}
    button.primary{padding:8px 12px;border:1px solid #0b53a5;border-radius:8px;background:#0b53a5;color:#fff;font-weight:700;cursor:pointer}
    button.danger{padding:6px 10px;border:1px solid #ef4444;border-radius:8px;background:#fff;color:#ef4444;cursor:pointer}
    .list{display:grid;gap:8px}
    .item{display:flex;gap:8px;align-items:center;justify-content:space-between;border:1px solid #e5e7eb;border-radius:8px;padding:8px}
    .name{font-weight:600}
    .sub{color:#6b7280}
    .muted{color:#6b7280}
  `]
})
export class TtClassesComponent {
  private classesSvc = inject(ClassesService);
  rows = signal<ClassEntity[]>([]);
  name = '';
  year = '';

  load(){ this.classesSvc.list().subscribe({ next: rows => this.rows.set(rows), error: () => this.rows.set([]) }); }
  add(){ const c: ClassEntity = { id: crypto.randomUUID(), name: this.name.trim(), academicYear: this.year.trim() } as any; this.rows.set([...this.rows(), c]); this.name=''; this.year=''; }
  remove(i:number){ const arr=[...this.rows()]; arr.splice(i,1); this.rows.set(arr); }
}
