import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'borrows' })
export class Borrow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  bookId: string;

  @Column({ type: 'varchar', length: 36 })
  memberId: string;

  @Column({ type: 'date' })
  borrowedOn: string; // yyyy-MM-dd

  @Column({ type: 'date', nullable: true })
  dueOn?: string | null;

  @Column({ type: 'date', nullable: true })
  returnedOn?: string | null;
}
