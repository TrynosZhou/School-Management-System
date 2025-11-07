import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'report_remarks' })
export class ReportRemark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  studentId: string;

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  term?: string | null; // e.g., Term 1

  @Column({ type: 'text', nullable: true })
  teacherRemark?: string | null;

  @Column({ type: 'text', nullable: true })
  principalRemark?: string | null;

  // Workflow status: open -> teacher_done -> ready_for_pdf -> finalized
  @Column({ type: 'varchar', length: 40, nullable: true })
  status?: string | null;

  // Audit: who last updated each remark
  @Column({ type: 'varchar', length: 120, nullable: true })
  teacherUpdatedByName?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  principalUpdatedByName?: string | null;

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  examType?: string | null; // e.g., Midterm, End of Term

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
