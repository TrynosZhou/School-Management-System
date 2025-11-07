import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'settings' })
export class Settings {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string; // e.g., 'global'

  @Column({ type: 'varchar', length: 200, nullable: true })
  schoolName?: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  schoolAddress?: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  principalName?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl?: string | null;

  @Column({ type: 'text', nullable: true })
  gradingBandsJson?: string | null; // JSON array of { grade, range }

  @Column({ type: 'text', nullable: true })
  employeeGradesJson?: string | null; // JSON array of strings e.g. ["A1","A2"]

  @Column({ type: 'varchar', length: 20, nullable: true })
  primaryColor?: string | null; // e.g. #1d4ed8

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  dhFee: string; // Dining Hall fee per term

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  transportFee: string; // Transport fee per term for day scholars opting in

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  deskFee: string; // One-time desk fee for new students

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  finePerDay: string; // Library fine per overdue day

  @Column({ type: 'varchar', length: 20, nullable: true })
  academicYear?: string | null; // e.g. 2025/2026 or 2025

  @Column({ type: 'varchar', length: 10, nullable: true })
  studentIdPrefix?: string | null;
}
