import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-marks-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="top">
        <h2>Mark Entry</h2>
      </div>
      <p>Placeholder for entering and managing marks/grades. Add class/subject selection and a grid for entries.</p>
    </div>
  `,
  styles: [`.wrap{max-width:900px;margin:24px auto} .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px} .home{font-size:14px}`]
})
export class MarksPageComponent {}
