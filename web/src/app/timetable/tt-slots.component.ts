import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface BreakDef { day: number; period: number; label?: string }

@Component({
  selector: 'app-tt-slots',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wrap">
      <h2>Timetable • Time Slots & Breaks</h2>
      <div class="panel">
        <div class="row">
          <div class="field">
            <label>Days per week</label>
            <select [(ngModel)]="days">
              <option *ngFor="let d of [5,6]" [ngValue]="d">{{ d }}</option>
            </select>
          </div>
          <div class="field">
            <label>Periods per day</label>
            <select [(ngModel)]="periodsPerDay">
              <option *ngFor="let n of [6,7,8,9]" [ngValue]="n">{{ n }}</option>
            </select>
          </div>
          <div class="field">
            <label>Minutes per period</label>
            <select [(ngModel)]="minutesPerPeriod">
              <option *ngFor="let m of [35,40,45,50,60]" [ngValue]="m">{{ m }}</option>
            </select>
          </div>
        </div>
        <div class="row">
          <div class="field grow">
            <label>Add Break</label>
            <div class="inline">
              <select [(ngModel)]="newBreakDay">
                <option *ngFor="let d of daysArr(); let i = index" [ngValue]="i">{{ dayLabel(i) }}</option>
              </select>
              <select [(ngModel)]="newBreakPeriod">
                <option *ngFor="let p of periodsArr()" [ngValue]="p">P{{ p }}</option>
              </select>
              <input [(ngModel)]="newBreakLabel" placeholder="Label (optional)"/>
              <button type="button" class="primary" (click)="addBreak()">Add</button>
            </div>
          </div>
        </div>
        <div class="list" *ngIf="breaks().length">
          <div class="item" *ngFor="let b of breaks(); let i = index">
            <div>{{ dayLabel(b.day) }} — P{{ b.period }} <span class="muted" *ngIf="b.label">({{ b.label }})</span></div>
            <button type="button" class="danger" (click)="removeBreak(i)">Remove</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:900px;margin:24px auto;padding:0 12px;display:grid;gap:12px}
    .panel{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px;display:grid;gap:10px}
    .row{display:flex;gap:12px;flex-wrap:wrap}
    .field{display:grid;gap:6px}
    .field.grow{flex:1}
    label{font-weight:600}
    select,input{padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font:inherit}
    .inline{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
    .list{display:grid;gap:8px}
    .item{display:flex;align-items:center;justify-content:space-between;border:1px solid #e5e7eb;border-radius:8px;padding:8px}
    .muted{color:#6b7280}
    button.primary{padding:8px 12px;border:1px solid #0b53a5;border-radius:8px;background:#0b53a5;color:#fff;font-weight:700;cursor:pointer}
    button.danger{padding:6px 10px;border:1px solid #ef4444;border-radius:8px;background:#fff;color:#ef4444;cursor:pointer}
  `]
})
export class TtSlotsComponent {
  days = 5;
  periodsPerDay = 8;
  minutesPerPeriod = 40;
  breaks = signal<BreakDef[]>([]);

  newBreakDay = 0;
  newBreakPeriod = 1;
  newBreakLabel = '';

  daysArr(){ return Array.from({length:this.days}, (_,i)=>i); }
  periodsArr(){ return Array.from({length:this.periodsPerDay}, (_,i)=>i+1); }
  dayLabel(i:number){ return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i] || `Day ${i+1}`; }

  addBreak(){
    const b: BreakDef = { day: this.newBreakDay, period: this.newBreakPeriod, label: (this.newBreakLabel||'').trim() || undefined };
    this.breaks.set([...this.breaks(), b]);
    this.newBreakLabel = '';
  }
  removeBreak(i:number){ const arr=[...this.breaks()]; arr.splice(i,1); this.breaks.set(arr); }
}
