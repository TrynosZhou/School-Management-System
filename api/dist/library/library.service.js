"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibraryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const book_entity_1 = require("../entities/book.entity");
const member_entity_1 = require("../entities/member.entity");
const borrow_entity_1 = require("../entities/borrow.entity");
let LibraryService = class LibraryService {
    books;
    members;
    borrows;
    constructor(books, members, borrows) {
        this.books = books;
        this.members = members;
        this.borrows = borrows;
    }
    listBooks() { return this.books.find({ order: { title: 'ASC' } }); }
    async addBook(data) {
        const b = this.books.create({
            title: (data.title || '').trim(),
            author: data.author || null,
            isbn: data.isbn || null,
            barcode: data.barcode || null,
            copies: data.copies && data.copies > 0 ? data.copies : 1,
            available: data.copies && data.copies > 0 ? data.copies : 1,
            category: data.category || 'GENERAL',
        });
        if (!b.title)
            throw new common_1.BadRequestException('Title required');
        return this.books.save(b);
    }
    async removeBook(id) {
        const active = await this.borrows.count({ where: { bookId: id, returnedOn: null } });
        if (active > 0)
            throw new common_1.BadRequestException('Cannot delete: book currently on loan');
        await this.books.delete(id);
        return { success: true };
    }
    async findBookByBarcode(code) {
        return this.books.findOne({ where: { barcode: code } });
    }
    listMembers() { return this.members.find({ order: { name: 'ASC' } }); }
    async addMember(data) {
        const m = this.members.create({
            name: (data.name || '').trim(),
            email: data.email || null,
            phone: data.phone || null,
        });
        if (!m.name)
            throw new common_1.BadRequestException('Name required');
        return this.members.save(m);
    }
    async removeMember(id) {
        const active = await this.borrows.count({ where: { memberId: id, returnedOn: null } });
        if (active > 0)
            throw new common_1.BadRequestException('Cannot delete: member has active loans');
        await this.members.delete(id);
        return { success: true };
    }
    async listBorrows(opts) {
        let where = {};
        if (opts?.onLoan)
            where.returnedOn = null;
        if (opts?.overdue)
            where = { ...where, returnedOn: null, dueOn: (0, typeorm_2.LessThan)(new Date().toISOString().slice(0, 10)) };
        return this.borrows.find({ where, order: { borrowedOn: 'DESC' } });
    }
    async borrow(data) {
        if (!data.bookId || !data.memberId)
            throw new common_1.BadRequestException('bookId and memberId required');
        const book = await this.books.findOne({ where: { id: data.bookId } });
        if (!book)
            throw new common_1.NotFoundException('Book not found');
        if ((book.available || 0) <= 0) {
            const active = await this.borrows.find({ where: { bookId: book.id, returnedOn: null }, order: { dueOn: 'ASC' } });
            const nextDue = active[0]?.dueOn || null;
            throw new common_1.BadRequestException(nextDue ? `Book on loan, due on ${nextDue}` : 'Book on loan');
        }
        const borrowedOn = data.borrowedOn || new Date().toISOString().slice(0, 10);
        const b = this.borrows.create({
            bookId: data.bookId,
            memberId: data.memberId,
            borrowedOn,
            dueOn: data.dueOn || null,
            returnedOn: null,
        });
        await this.borrows.save(b);
        await this.books.update(book.id, { available: Math.max(0, (book.available || 0) - 1) });
        return b;
    }
    async returnBorrow(id, payload) {
        const r = await this.borrows.findOne({ where: { id } });
        if (!r)
            throw new common_1.NotFoundException('Borrow not found');
        if (r.returnedOn)
            return r;
        const book = await this.books.findOne({ where: { id: r.bookId } });
        const returnedOn = payload.returnedOn || new Date().toISOString().slice(0, 10);
        r.returnedOn = returnedOn;
        r.dueOn = payload.dueOn ?? r.dueOn;
        if (book)
            await this.books.update(book.id, { available: (book.available || 0) + 1 });
        const wasOverdue = r.dueOn ? returnedOn > r.dueOn : false;
        if (wasOverdue) {
            await this.borrows.delete(r.id);
            return { ...r };
        }
        else {
            await this.borrows.save(r);
            return r;
        }
    }
    async returnByBarcode(barcode) {
        const book = await this.books.findOne({ where: { barcode } });
        if (!book)
            throw new common_1.NotFoundException('Book not found');
        const active = await this.borrows.findOne({ where: { bookId: book.id, returnedOn: null } });
        if (!active)
            throw new common_1.NotFoundException('No active loan for this book');
        return this.returnBorrow(active.id, {});
    }
};
exports.LibraryService = LibraryService;
exports.LibraryService = LibraryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(book_entity_1.Book)),
    __param(1, (0, typeorm_1.InjectRepository)(member_entity_1.Member)),
    __param(2, (0, typeorm_1.InjectRepository)(borrow_entity_1.Borrow)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], LibraryService);
//# sourceMappingURL=library.service.js.map