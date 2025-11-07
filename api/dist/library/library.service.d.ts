import { Repository } from 'typeorm';
import { Book } from '../entities/book.entity';
import { Member } from '../entities/member.entity';
import { Borrow } from '../entities/borrow.entity';
export declare class LibraryService {
    private readonly books;
    private readonly members;
    private readonly borrows;
    constructor(books: Repository<Book>, members: Repository<Member>, borrows: Repository<Borrow>);
    listBooks(): Promise<Book[]>;
    addBook(data: Partial<Book>): Promise<Book>;
    removeBook(id: string): Promise<{
        success: boolean;
    }>;
    findBookByBarcode(code: string): Promise<Book | null>;
    listMembers(): Promise<Member[]>;
    addMember(data: Partial<Member>): Promise<Member>;
    removeMember(id: string): Promise<{
        success: boolean;
    }>;
    listBorrows(opts?: {
        onLoan?: boolean;
        overdue?: boolean;
    }): Promise<Borrow[]>;
    borrow(data: Partial<Borrow>): Promise<Borrow>;
    returnBorrow(id: string, payload: Partial<Borrow>): Promise<Borrow>;
    returnByBarcode(barcode: string): Promise<Borrow>;
}
