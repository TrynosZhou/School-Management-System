import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Student } from '../entities/student.entity';

export type InvoiceStatus = 'unpaid' | 'partially_paid' | 'paid';

@Entity({ name: 'fee_invoices' })
export class FeeInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student, { eager: true, onDelete: 'CASCADE' })
  student: Student;

  @Column({ type: 'varchar', length: 50 })
  term: string; // e.g. Term 1

  @Column({ type: 'varchar', length: 15 })
  academicYear: string; // e.g. 2025/2026

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string; // invoice amount

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 20, default: 'unpaid' })
  status: InvoiceStatus;

  @CreateDateColumn()
  createdAt: Date;
}
