import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Book { id?: string; isbn?: string; title: string; author?: string; copies?: number; available?: number; }
interface Member { id?: string; name: string; email?: string; phone?: string; }
interface Borrow { id?: string; bookId: string; memberId: string; borrowedOn?: string; dueOn?: string; returnedOn?: string | null; }

@Component({
  selector: 'app-library-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wrap">
      <div class="top"><h2>Library</h2></div>

      <div class="tabs">
        <button class="tab" [class.active]="tab()==='books'" (click)="tab.set('books')">Books</button>
        <button class="tab" [class.active]="tab()==='members'" (click)="tab.set('members')">Members</button>
        <button class="tab" [class.active]="tab()==='borrows'" (click)="tab.set('borrows')">Borrowings</button>
      </div>

      <div class="hint" *ngIf="err()">{{ err() }}</div>

      <div *ngIf="tab()==='books'" class="card">
        <div class="row">
          <input placeholder="ISBN" [(ngModel)]="newBook.isbn"/>
          <input placeholder="Title" [(ngModel)]="newBook.title"/>
          <input placeholder="Author" [(ngModel)]="newBook.author"/>
          <input type="number" min="0" placeholder="Copies" [(ngModel)]="newBook.copies"/>
          <button class="btn primary" (click)="addBook()">Add Book</button>
        </div>
        <table class="table" *ngIf="books().length">
          <thead><tr><th>ISBN</th><th>Title</th><th>Author</th><th>Copies</th><th>Available</th><th>Actions</th></tr></thead>
          <tbody>
            <tr *ngFor="let b of books()">
              <td>{{ b.isbn || '-' }}</td>
              <td>{{ b.title }}</td>
              <td>{{ b.author || '-' }}</td>
              <td>{{ b.copies ?? '-' }}</td>
              <td>{{ b.available ?? '-' }}</td>
              <td>
                <button class="btn" (click)="removeBook(b)">Remove</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="hint" *ngIf="!books().length">No books yet.</div>
      </div>

      <div *ngIf="tab()==='members'" class="card">
        <div class="row">
          <input placeholder="Full name" [(ngModel)]="newMember.name"/>
          <input placeholder="Email" [(ngModel)]="newMember.email"/>
          <input placeholder="Phone" [(ngModel)]="newMember.phone"/>
          <button class="btn primary" (click)="addMember()">Add Member</button>
        </div>
        <table class="table" *ngIf="members().length">
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Actions</th></tr></thead>
          <tbody>
            <tr *ngFor="let m of members()">
              <td>{{ m.name }}</td>
              <td>{{ m.email || '-' }}</td>
              <td>{{ m.phone || '-' }}</td>
              <td>
                <button class="btn" (click)="removeMember(m)">Remove</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="hint" *ngIf="!members().length">No members yet.</div>
      </div>

      <div *ngIf="tab()==='borrows'" class="card">
        <div class="row">
          <select [(ngModel)]="borrowForm.bookId">
            <option value="">Select book</option>
            <option *ngFor="let b of books()" [value]="b.id">{{ b.title }}</option>
          </select>
          <select [(ngModel)]="borrowForm.memberId">
            <option value="">Select member</option>
            <option *ngFor="let m of members()" [value]="m.id">{{ m.name }}</option>
          </select>
          <input type="date" [(ngModel)]="borrowForm.dueOn"/>
          <button class="btn primary" (click)="borrow()" [disabled]="!borrowForm.bookId || !borrowForm.memberId">Borrow</button>
        </div>
        <div class="row">
          <input placeholder="Scan/Enter Book Barcode" [(ngModel)]="borrowBarcode" />
          <select [(ngModel)]="borrowMemberId">
            <option value="">Select member</option>
            <option *ngFor="let m of members()" [value]="m.id">{{ m.name }}</option>
          </select>
          <input type="date" [(ngModel)]="borrowDueOn"/>
          <button class="btn" (click)="borrowByBarcode()" [disabled]="!borrowBarcode || !borrowMemberId">Borrow by Barcode</button>
        </div>
        <div class="row">
          <input placeholder="Return: Scan/Enter Book Barcode" [(ngModel)]="returnBarcode" />
          <button class="btn" (click)="returnByBarcode()" [disabled]="!returnBarcode">Return by Barcode</button>
        </div>
        <div class="row">
          <button class="btn" (click)="setFilter('all')" [disabled]="borrowFilter()==='all'">All</button>
          <button class="btn" (click)="setFilter('on')" [disabled]="borrowFilter()==='on'">On Loan</button>
          <button class="btn" (click)="setFilter('overdue')" [disabled]="borrowFilter()==='overdue'">Overdue</button>
        </div>
        <table class="table" *ngIf="borrows().length">
          <thead><tr><th>Book</th><th>Member</th><th>Borrowed</th><th>Due</th><th>Returned</th><th>Actions</th></tr></thead>
          <tbody>
            <tr *ngFor="let r of borrows()">
              <td>{{ findBook(r.bookId)?.title || r.bookId }}</td>
              <td>{{ findMember(r.memberId)?.name || r.memberId }}</td>
              <td>{{ r.borrowedOn | date:'yyyy-MM-dd' }}</td>
              <td>{{ r.dueOn | date:'yyyy-MM-dd' }}</td>
              <td>{{ r.returnedOn ? (r.returnedOn | date:'yyyy-MM-dd') : '-' }}</td>
              <td>
                <button class="btn" (click)="markReturned(r)" [disabled]="!!r.returnedOn">Mark returned</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="hint" *ngIf="!borrows().length">No borrowings yet.</div>
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:1100px;margin:24px auto;padding:0 8px}
    .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .tabs{display:flex;gap:8px;margin-bottom:8px}
    .tab{border:1px solid #0b53a5;background:#0b53a5;color:#fff;border-radius:8px;padding:8px 12px;cursor:pointer;font-weight:700}
    .tab.active{background:#0b53a5;color:#fff;border-color:#0b53a5}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px}
    .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
    input,select{padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px}
    .btn{display:inline-flex;gap:8px;align-items:center;border:1px solid #0b53a5;background:#0b53a5;color:#fff;border-radius:8px;padding:8px 12px;cursor:pointer;font-weight:700}
    .btn.primary{background:#0b53a5;color:#fff;border-color:#0b53a5;font-weight:700}
    .btn:disabled{opacity:.6;cursor:not-allowed}
    .table{width:100%;border-collapse:collapse;margin-top:8px}
    .table th,.table td{border:1px solid #e5e7eb;padding:8px;text-align:left}
    .hint{color:#6b7280;margin-top:6px}
  `]
})
export class LibraryPageComponent {
  private http = inject(HttpClient);
  tab = signal<'books'|'members'|'borrows'>('books');
  err = signal<string | null>(null);

  // state
  books = signal<Book[]>([]);
  members = signal<Member[]>([]);
  borrows = signal<Borrow[]>([]);
  borrowFilter = signal<'all'|'on'|'overdue'>('all');

  newBook: Book = { title: '', copies: 1 };
  newMember: Member = { name: '' };
  borrowForm: Borrow = { bookId: '', memberId: '', dueOn: undefined } as any;

  constructor(){ this.loadAll(); }

  private loadAll(){ this.loadBooks(); this.loadMembers(); this.loadBorrows(); }

  private loadBooks(){
    this.http.get<Book[]>(`http://localhost:3000/api/library/books`).subscribe({
      next: res => this.books.set(res || []),
      error: _ => { this.books.set(this.books()); /* keep existing */ }
    });
  }
  private loadMembers(){
    this.http.get<Member[]>(`http://localhost:3000/api/library/members`).subscribe({
      next: res => this.members.set(res || []),
      error: _ => { this.members.set(this.members()); }
    });
  }
  private loadBorrows(){
    const params: any = {};
    if (this.borrowFilter()==='on') params.onLoan = '1';
    if (this.borrowFilter()==='overdue') params.overdue = '1';
    this.http.get<Borrow[]>(`http://localhost:3000/api/library/borrows`, { params }).subscribe({
      next: res => this.borrows.set(res || []),
      error: _ => { this.borrows.set(this.borrows()); }
    });
  }

  addBook(){
    const payload: Book = { ...this.newBook };
    if (!payload.title?.trim()) return;
    this.http.post<Book>(`http://localhost:3000/api/library/books`, payload).subscribe({
      next: b => { this.newBook = { title: '', copies: 1 }; this.books.set([...(this.books()), b]); },
      error: _ => {
        // fallback: local add
        const b: Book = { ...payload, id: cryptoRandom(), available: payload.copies ?? 1 };
        this.books.set([...(this.books()), b]);
      }
    });
  }

  addMember(){
    const payload: Member = { ...this.newMember };
    if (!payload.name?.trim()) return;
    this.http.post<Member>(`http://localhost:3000/api/library/members`, payload).subscribe({
      next: m => { this.newMember = { name: '' }; this.members.set([...(this.members()), m]); },
      error: _ => { const m: Member = { ...payload, id: cryptoRandom() }; this.members.set([...(this.members()), m]); }
    });
  }

  borrow(){
    const now = new Date().toISOString().slice(0,10);
    const payload: Borrow = { ...this.borrowForm, borrowedOn: now, returnedOn: null };
    if (!payload.bookId || !payload.memberId) return;
    this.err.set(null);
    this.http.post<Borrow>(`http://localhost:3000/api/library/borrows`, payload).subscribe({
      next: r => { this.borrows.set([r, ...this.borrows()]); this.borrowForm = { bookId: '', memberId: '', dueOn: undefined } as any; this.tab.set('borrows'); },
      error: (e) => { this.err.set(e?.error?.message || 'Borrow failed'); }
    });
  }

  markReturned(r: Borrow){
    if (r.returnedOn) return;
    const updated = { ...r, returnedOn: new Date().toISOString().slice(0,10) };
    this.http.put<Borrow>(`http://localhost:3000/api/library/borrows/${r.id}`, updated).subscribe({
      next: _ => this.loadBorrows(),
      error: _ => this.loadBorrows()
    });
  }

  setFilter(f: 'all'|'on'|'overdue') { this.borrowFilter.set(f); this.loadBorrows(); }

  // Delete actions
  removeBook(b: Book){
    if (!b.id) { this.books.set(this.books().filter(x => x !== b)); return; }
    this.http.delete(`http://localhost:3000/api/library/books/${b.id}`).subscribe({
      next: _ => { this.books.set(this.books().filter(x => x.id !== b.id)); },
      error: (e) => { this.err.set(e?.error?.message || 'Delete failed'); }
    });
  }
  removeMember(m: Member){
    if (!m.id) { this.members.set(this.members().filter(x => x !== m)); return; }
    this.http.delete(`http://localhost:3000/api/library/members/${m.id}`).subscribe({
      next: _ => { this.members.set(this.members().filter(x => x.id !== m.id)); },
      error: (e) => { this.err.set(e?.error?.message || 'Delete failed'); }
    });
  }

  // Barcode flows
  borrowBarcode: string = '';
  borrowMemberId: string = '';
  borrowDueOn: string | undefined;
  returnBarcode: string = '';
  borrowByBarcode(){
    if (!this.borrowBarcode || !this.borrowMemberId) return;
    // lookup book by barcode then borrow
    this.err.set(null);
    this.http.get<any>(`http://localhost:3000/api/library/books/lookup`, { params: { barcode: this.borrowBarcode } as any }).subscribe({
      next: (book) => {
        if (!book || !book.id) { this.err.set('Book not found'); return; }
        const now = new Date().toISOString().slice(0,10);
        const payload: Borrow = { bookId: book.id, memberId: this.borrowMemberId, borrowedOn: now, dueOn: this.borrowDueOn, returnedOn: null } as any;
        this.http.post<Borrow>(`http://localhost:3000/api/library/borrows`, payload).subscribe({
          next: r => { this.borrows.set([r, ...this.borrows()]); this.borrowBarcode=''; this.borrowMemberId=''; this.borrowDueOn=undefined; },
          error: (e) => { this.err.set(e?.error?.message || 'Borrow failed'); }
        });
      },
      error: _ => this.err.set('Lookup failed')
    });
  }
  returnByBarcode(){
    if (!this.returnBarcode) return;
    this.err.set(null);
    this.http.post<any>(`http://localhost:3000/api/library/borrows/return-by-barcode`, { barcode: this.returnBarcode }).subscribe({
      next: _ => { this.returnBarcode=''; this.loadBorrows(); },
      error: (e) => { this.err.set(e?.error?.message || 'Return failed'); }
    });
  }

  findBook(id?: string){ return this.books().find(b => b.id === id); }
  findMember(id?: string){ return this.members().find(m => m.id === id); }
}

function cryptoRandom(){
  try {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
  } catch { return Math.random().toString(36).slice(2); }
}
