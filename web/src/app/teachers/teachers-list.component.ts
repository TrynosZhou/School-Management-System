import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TeachersService, type Teacher } from './teachers.service';
import { AuthStateService } from '../auth/auth-state.service';

@Component({
  selector: 'app-teachers-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="toolbar">
        <h2>Teachers</h2>
        <div class="right">
          <button (click)="create()">New Teacher</button>
          <button (click)="assignClass()" title="Assign a teacher to a class" class="assign">Assign Class</button>
        </div>
      </div>
      <div class="kpis">
        <div class="kpi-tile blue">
          <div class="num">{{ teachers().length }}</div>
          <div class="label">Total Teachers</div>
        </div>
        <div class="kpi-tile green">
          <div class="num">{{ withEmailCount() }}</div>
          <div class="label">With Email</div>
        </div>
        <div class="kpi-tile cyan">
          <div class="num">{{ withSubjectCount() }}</div>
          <div class="label">With Subject</div>
        </div>
        <div class="kpi-tile red">
          <div class="num">{{ withoutSubjectCount() }}</div>
          <div class="label">Without Subject</div>
        </div>
      </div>
      <table class="table" *ngIf="teachers().length; else empty">
        <thead>
          <tr><th>First</th><th>Last</th><th>Email</th><th>Subject Taught</th><th></th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let t of teachers()">
            <td>{{ t.firstName }}</td>
            <td>{{ t.lastName }}</td>
            <td>{{ t.email }}</td>
            <td>{{ t.subjectTaught || '-' }}</td>
            <td>
              <a [routerLink]="['/teachers', t.id]">Edit</a>
              <a href (click)="$event.preventDefault(); assignFor(t)" style="margin-left:8px">Assign Classes</a>
              <button class="del" *ngIf="canDelete()" (click)="deleteTeacher(t)" title="Delete teacher">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
      <ng-template #empty>
        <p>No teachers yet.</p>
      </ng-template>
    </div>
  `,
  styles: [`.wrap{max-width:900px;margin:24px auto}.toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:8px 0 14px}.kpi-tile{color:#fff;border-radius:6px;padding:12px}.kpi-tile .num{font-size:22px;font-weight:700}.kpi-tile .label{opacity:.9}.kpi-tile.red{background:#e05a47}.kpi-tile.green{background:#18a558}.kpi-tile.cyan{background:#12b6df}.kpi-tile.blue{background:#0b53a5}.table{width:100%;border-collapse:collapse}.table th,.table td{border:1px solid #ddd;padding:8px}.del{margin-left:8px;background:#1d4ed8;border:1px solid #1d4ed8;color:#fff;border-radius:6px;padding:4px 8px;cursor:pointer;font-weight:700}.del:hover{filter:brightness(0.95)}.assign{margin-left:8px;background:#0b53a5;border:1px solid #0b53a5;color:#fff;border-radius:6px;padding:6px 10px;cursor:pointer}@media(max-width:780px){.kpis{grid-template-columns:repeat(2,1fr)}}@media(max-width:520px){.kpis{grid-template-columns:1fr}}`]
})
export class TeachersListComponent implements OnInit {
  private svc = inject(TeachersService);
  private router = inject(Router);
  private auth = inject(AuthStateService);
  teachers = signal<Teacher[]>([]);

  ngOnInit() {
    this.svc.list().subscribe(res => this.teachers.set(res));
  }

  create() { this.router.navigateByUrl('/teachers/new'); }

  assignClass() { this.router.navigate(['/classes'], { queryParams: { assign: 'teacher' } }); }

  assignFor(t: Teacher) {
    if (!t || !t.id) return;
    this.router.navigate(['/teaching-load'], { queryParams: { teacherId: t.id } });
  }

  canDelete() { return this.auth.role() === 'admin'; }

  deleteTeacher(t: Teacher) {
    if (!this.canDelete()) return;
    const name = `${t.firstName} ${t.lastName}`.trim() || t.email || t.id;
    if (!confirm(`Delete teacher ${name}? This cannot be undone.`)) return;
    this.svc.remove(t.id).subscribe({
      next: () => this.teachers.set(this.teachers().filter(x => x.id !== t.id)),
      error: (e) => alert(e?.error?.message || 'Delete failed')
    });
  }

  withEmailCount() { return this.teachers().filter(t => !!(t.email && t.email.trim())).length; }
  withSubjectCount() { return this.teachers().filter(t => !!(t as any).subjectTaught && String((t as any).subjectTaught).trim() !== '').length; }
  withoutSubjectCount() { return this.teachers().filter(t => !((t as any).subjectTaught && String((t as any).subjectTaught).trim() !== '')).length; }
}
