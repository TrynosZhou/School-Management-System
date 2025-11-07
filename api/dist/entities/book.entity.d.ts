export type BookCategory = 'GENERAL' | 'SPECIAL';
export declare class Book {
    id: string;
    isbn?: string | null;
    barcode?: string | null;
    title: string;
    author?: string | null;
    copies: number;
    available: number;
    category: BookCategory;
}
