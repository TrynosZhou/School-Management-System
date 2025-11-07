import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Student } from '../entities/student.entity';

export type TransactionType = 'invoice' | 'payment' | 'adjustment';

@Entity({ name: 'fee_transactions' })
export class FeeTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student, { eager: true, onDelete: 'CASCADE' })
  student: Student;

  @Column({ type: 'varchar', length: 20 })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string; // positive means debit for invoice; negative for credit

  @Column({ type: 'varchar', length: 50, nullable: true })
  term?: string | null;

  @Column({ type: 'varchar', length: 15, nullable: true })
  academicYear?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  receiptNumber?: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  method?: string | null; // e.g., cash, momo, bank

  @Column({ type: 'varchar', length: 120, nullable: true })
  reference?: string | null; // transaction ref

  @Column({ type: 'date', nullable: true })
  receivedAt?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
