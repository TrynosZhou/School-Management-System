import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Book } from '../entities/book.entity';
import { Member } from '../entities/member.entity';
import { Borrow } from '../entities/borrow.entity';

@Injectable()
export class LibraryService {
  constructor(
    @InjectRepository(Book) private readonly books: Repository<Book>,
    @InjectRepository(Member) private readonly members: Repository<Member>,
    @InjectRepository(Borrow) private readonly borrows: Repository<Borrow>,
  ) {}

  // Books
  listBooks() { return this.books.find({ order: { title: 'ASC' } }); }
  async addBook(data: Partial<Book>) {
    const b = this.books.create({
      title: (data.title || '').trim(),
      author: data.author || null,
      isbn: data.isbn || null,
      barcode: data.barcode || null,
      copies: data.copies && data.copies > 0 ? data.copies : 1,
      available: data.copies && data.copies > 0 ? data.copies : 1,
      category: (data.category as any) || 'GENERAL',
    });
    if (!b.title) throw new BadRequestException('Title required');
    return this.books.save(b);
  }
  async removeBook(id: string) {
    const active = await this.borrows.count({ where: { bookId: id, returnedOn: null as any } });
    if (active > 0) throw new BadRequestException('Cannot delete: book currently on loan');
    await this.books.delete(id);
    return { success: true };
  }
  async findBookByBarcode(code: string) {
    return this.books.findOne({ where: { barcode: code } });
  }

  // Members
  listMembers() { return this.members.find({ order: { name: 'ASC' } }); }
  async addMember(data: Partial<Member>) {
    const m = this.members.create({
      name: (data.name || '').trim(),
      email: data.email || null,
      phone: data.phone || null,
    });
    if (!m.name) throw new BadRequestException('Name required');
    return this.members.save(m);
  }
  async removeMember(id: string) {
    const active = await this.borrows.count({ where: { memberId: id, returnedOn: null as any } });
    if (active > 0) throw new BadRequestException('Cannot delete: member has active loans');
    await this.members.delete(id);
    return { success: true };
  }

  // Borrows
  async listBorrows(opts?: { onLoan?: boolean; overdue?: boolean }) {
    let where: any = {};
    if (opts?.onLoan) where.returnedOn = null; 
    if (opts?.overdue) where = { ...where, returnedOn: null, dueOn: LessThan(new Date().toISOString().slice(0,10)) };
    return this.borrows.find({ where, order: { borrowedOn: 'DESC' } });
  }

  async borrow(data: Partial<Borrow>) {
    if (!data.bookId || !data.memberId) throw new BadRequestException('bookId and memberId required');
    const book = await this.books.findOne({ where: { id: data.bookId } });
    if (!book) throw new NotFoundException('Book not found');
    if ((book.available || 0) <= 0) {
      const active = await this.borrows.find({ where: { bookId: book.id, returnedOn: null as any }, order: { dueOn: 'ASC' } });
      const nextDue = active[0]?.dueOn || null;
      throw new BadRequestException(nextDue ? `Book on loan, due on ${nextDue}` : 'Book on loan');
    }
    const borrowedOn = data.borrowedOn || new Date().toISOString().slice(0,10);
    const b = this.borrows.create({
      bookId: data.bookId!,
      memberId: data.memberId!,
      borrowedOn,
      dueOn: data.dueOn || null,
      returnedOn: null,
    });
    await this.borrows.save(b);
    await this.books.update(book.id, { available: Math.max(0, (book.available || 0) - 1) });
    return b;
  }

  async returnBorrow(id: string, payload: Partial<Borrow>) {
    const r = await this.borrows.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Borrow not found');
    if (r.returnedOn) return r;
    const book = await this.books.findOne({ where: { id: r.bookId } });
    const returnedOn = payload.returnedOn || new Date().toISOString().slice(0,10);
    r.returnedOn = returnedOn;
    r.dueOn = payload.dueOn ?? r.dueOn;
    // increment availability first
    if (book) await this.books.update(book.id, { available: (book.available || 0) + 1 });
    // if overdue, clear history (delete record)
    const wasOverdue = r.dueOn ? returnedOn > r.dueOn : false;
    if (wasOverdue) {
      await this.borrows.delete(r.id);
      return { ...r } as Borrow;
    } else {
      await this.borrows.save(r);
      return r;
    }
  }

  async returnByBarcode(barcode: string) {
    const book = await this.books.findOne({ where: { barcode } });
    if (!book) throw new NotFoundException('Book not found');
    const active = await this.borrows.findOne({ where: { bookId: book.id, returnedOn: null as any } });
    if (!active) throw new NotFoundException('No active loan for this book');
    return this.returnBorrow(active.id, {});
  }
}
