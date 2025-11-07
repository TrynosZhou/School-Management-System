import { LibraryService } from './library.service';
import { Borrow } from '../entities/borrow.entity';
export declare class LibraryController {
    private readonly svc;
    constructor(svc: LibraryService);
    listBooks(): Promise<import("../entities/book.entity").Book[]>;
    addBook(body: any): Promise<import("../entities/book.entity").Book>;
    removeBook(id: string): Promise<{
        success: boolean;
    }>;
    lookup(barcode?: string): Promise<import("../entities/book.entity").Book | null>;
    listMembers(): Promise<import("../entities/member.entity").Member[]>;
    addMember(body: any): Promise<import("../entities/member.entity").Member>;
    removeMember(id: string): Promise<{
        success: boolean;
    }>;
    listBorrows(onLoan?: string, overdue?: string): Promise<Borrow[]>;
    borrow(body: Partial<Borrow>): Promise<Borrow>;
    returnBorrow(id: string, body: Partial<Borrow>): Promise<Borrow>;
    returnByBarcode(barcode: string): Promise<Borrow>;
}
