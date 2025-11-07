import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubjectsService, Subject } from './subjects.service';

@Component({
  selector: 'app-subject-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <select [multiple]="multiple" [(ngModel)]="model" (ngModelChange)="onChange($event)">
      <option [ngValue]="null" *ngIf="!multiple && placeholder">{{ placeholder }}</option>
      <option *ngFor="let s of subjects()" [ngValue]="s.id">{{ s.code || s.name }} — {{ s.name }}</option>
    </select>
  `,
  styles: [`
    select{min-width:260px;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px}
  `]
})
export class SubjectSelectComponent implements OnInit {
  private svc = inject(SubjectsService);

  subjects = signal<Subject[]>([]);

  @Input() multiple = false;
  @Input() placeholder: string = 'Select subject';
  @Input() model: string | string[] | null = null;
  @Output() modelChange = new EventEmitter<string | string[] | null>();

  ngOnInit() {
    this.svc.list().subscribe({ next: (res) => this.subjects.set(res || []) });
  }

  onChange(val: any){
    this.modelChange.emit(val);
  }
}
