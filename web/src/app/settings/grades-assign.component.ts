import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarksService } from '../marks/marks.service';

export interface GradeBand { grade: string; min: number; max: number }
export interface CategoryGradeBands { category: string; bands: GradeBand[] }

@Component({
  selector: 'app-grades-assign',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <h2>Fix Grades</h2>
      <p class="hint">Define grade bands for different mark categories. Ranges are inclusive.</p>

      <div class="toolbar">
        <input type="text" [(ngModel)]="newCategory" placeholder="New category name" />
        <button (click)="addCategory()" [disabled]="!newCategory.trim()">Add Category</button>
        <span class="spacer"></span>
        <button class="recompute" (click)="recomputeGrades()" [disabled]="recomputing()">
          {{ recomputing() ? '⏳ Recomputing...' : '🔄 Recompute All Grades' }}
        </button>
        <button class="primary" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving...' : 'Save' }}</button>
      </div>

      <div class="cards">
        <div class="card" *ngFor="let cg of data(); let i=index">
          <header class="card-header">
            <strong>{{ cg.category }}</strong>
            <button class="link" (click)="removeCategory(i)">Remove</button>
          </header>
          <table>
            <thead>
              <tr>
                <th style="width:120px">Grade</th>
                <th style="width:120px">Min</th>
                <th style="width:120px">Max</th>
                <th style="width:80px"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let b of cg.bands; let j=index">
                <td><input type="text" [(ngModel)]="cg.bands[j].grade" placeholder="e.g. A" /></td>
                <td><input type="number" [(ngModel)]="cg.bands[j].min" min="0" max="100" /></td>
                <td><input type="number" [(ngModel)]="cg.bands[j].max" min="0" max="100" /></td>
                <td><button class="danger" (click)="removeBand(i, j)">Delete</button></td>
              </tr>
            </tbody>
          </table>
          <div class="actions">
            <button (click)="addBand(i)">Add Band</button>
            <button (click)="normalize(i)">Normalize 0-100</button>
          </div>
        </div>
      </div>

      <div class="status" *ngIf="message">{{ message }}</div>
    </section>
  `,
  styles: [`
    .page{padding:10px}
    h2{margin:0 0 8px 0}
    .hint{color:#6b7280;margin-bottom:10px}
    .toolbar{display:flex;gap:8px;align-items:center;margin-bottom:10px}
    .spacer{flex:1}
    .primary{background:#1d4ed8;color:#fff;border:0;padding:6px 10px;border-radius:6px;cursor:pointer}
    .primary:disabled{opacity:0.5;cursor:not-allowed}
    .recompute{background:#10b981;color:#fff;border:0;padding:6px 10px;border-radius:6px;cursor:pointer}
    .recompute:disabled{opacity:0.5;cursor:not-allowed}
    .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:10px}
    .card{border:1px solid #e5e7eb;border-radius:10px;padding:8px;background:#fff}
    .card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
    table{width:100%;border-collapse:collapse}
    th, td{border-bottom:1px solid #eee;padding:6px}
    input{width:100%;padding:6px;border:1px solid #e5e7eb;border-radius:6px}
    .actions{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}
    .danger{background:#fee2e2;border:1px solid #fecaca;color:#b91c1c;padding:4px 8px;border-radius:6px}
    .link{background:transparent;border:0;color:#1d4ed8;cursor:pointer}
    .status{margin-top:10px;color:#065f46}
  `]
})
export class GradesAssignComponent implements OnInit {
  private marks = inject(MarksService);
  data = signal<CategoryGradeBands[]>([]);
  saving = signal(false);
  recomputing = signal(false);
  newCategory = '';
  message = '';

  ngOnInit(): void {
    // Load existing config, fallback to defaults
    this.marks.getGradeBands().subscribe({
      next: (res: CategoryGradeBands[]) => {
        const payload = (res && Array.isArray(res)) ? res : [];
        if (payload.length) this.data.set(payload);
        else this.setDefault();
      },
      error: () => { this.setDefault(); }
    });
  }

  private setDefault(){
    this.data.set([
      { category: 'Overall', bands: this.defaultBands() },
      { category: 'Exam', bands: this.defaultBands() },
      { category: 'Test', bands: this.defaultBands() },
    ]);
  }

  defaultBands(): GradeBand[] {
    return [
      { grade: 'A', min: 80, max: 100 },
      { grade: 'B', min: 70, max: 79 },
      { grade: 'C', min: 60, max: 69 },
      { grade: 'D', min: 50, max: 59 },
      { grade: 'E', min: 40, max: 49 },
      { grade: 'F', min: 0, max: 39 },
    ];
  }

  addCategory(){
    const name = this.newCategory.trim();
    if (!name) return;
    if (this.data().some(c => c.category.toLowerCase() === name.toLowerCase())){
      this.message = 'Category already exists';
      return;
    }
    this.data.update(arr => [...arr, { category: name, bands: this.defaultBands() }]);
    this.newCategory = '';
  }

  removeCategory(i: number){
    this.data.update(arr => arr.filter((_, idx) => idx !== i));
  }

  addBand(i: number){
    this.data.update(arr => {
      arr[i].bands.push({ grade: '', min: 0, max: 0 });
      return [...arr];
    });
  }

  removeBand(i: number, j: number){
    this.data.update(arr => {
      arr[i].bands.splice(j, 1);
      return [...arr];
    });
  }

  normalize(i: number){
    const grades = ['A','B','C','D','E','F'];
    const ranges = [ [80,100],[70,79],[60,69],[50,59],[40,49],[0,39] ];
    this.data.update(arr => {
      arr[i].bands = grades.map((g, idx) => ({ grade: g, min: ranges[idx][0], max: ranges[idx][1] }));
      return [...arr];
    });
  }

  save(){
    this.saving.set(true);
    this.message = '';
    const payload = this.data();
    this.marks.saveGradeBands(payload).subscribe({
      next: (res: { success: boolean; message?: string }) => {
        this.message = res?.message || 'Grades saved';
        this.saving.set(false);
      },
      error: () => {
        this.message = 'Failed to save. Please try again.';
        this.saving.set(false);
      }
    });
  }

  recomputeGrades(){
    if (!confirm('This will recalculate grades for ALL marks in the database based on the current grading bands. Continue?')) {
      return;
    }

    this.recomputing.set(true);
    this.message = '';
    this.marks.recomputeGrades().subscribe({
      next: (res: { success: boolean; total?: number; updated?: number; message?: string }) => {
        this.message = `✅ Recomputed grades: ${res.updated || 0} of ${res.total || 0} marks updated`;
        this.recomputing.set(false);
      },
      error: (err: any) => {
        this.message = `❌ Failed to recompute grades: ${err?.error?.message || 'Unknown error'}`;
        this.recomputing.set(false);
      }
    });
  }
}
