import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type BookCategory = 'GENERAL' | 'SPECIAL';

@Entity({ name: 'books' })
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  isbn?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  barcode?: string | null;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  author?: string | null;

  @Column({ type: 'int', default: 1 })
  copies: number;

  @Column({ type: 'int', default: 1 })
  available: number;

  @Column({ type: 'varchar', length: 20, default: 'GENERAL' })
  category: BookCategory;
}
