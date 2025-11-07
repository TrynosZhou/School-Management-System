import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'account_settings' })
export class AccountSettings {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string; // 'global'

  @Column({ type: 'varchar', length: 50, nullable: true })
  currentTerm?: string | null; // e.g. 'Term 1', 'Term 2', etc.

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  termFeeAmount: string; // decimal as string

  // New: split fees for day scholars vs boarders
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  dayFeeAmount: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  boarderFeeAmount: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  academicYear?: string | null; // e.g. '2025/2026'

  // Next sequential receipt number (numeric part). Used to generate 'J' + 4 digits
  @Column({ type: 'int', default: 0 })
  receiptSeq: number;
}
