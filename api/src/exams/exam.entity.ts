import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { ClassEntity } from '../entities/class.entity';
import { Subject } from '../entities/subject.entity';
import { Teacher } from '../entities/teacher.entity';

@Entity({ name: 'exams' })
export class ExamEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  term!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  academicYear!: string | null;

  @ManyToOne(() => Subject, { nullable: true, eager: true })
  subject?: Subject | null;

  @ManyToOne(() => ClassEntity, { nullable: true, eager: true })
  classEntity?: ClassEntity | null;

  @Column({ type: 'datetime', nullable: true })
  dateTime!: Date | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  venue!: string | null;

  // Simple JSON arrays for invigilators/rooms for MVP
  @ManyToOne(() => Teacher, { nullable: true, eager: true })
  invigilator1?: Teacher | null;

  @ManyToOne(() => Teacher, { nullable: true, eager: true })
  invigilator2?: Teacher | null;

  @Column({ type: 'varchar', length: 20, default: 'scheduled' })
  status!: 'scheduled' | 'completed' | 'cancelled';

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'datetime', nullable: true })
  finalizedAt!: Date | null;
}
