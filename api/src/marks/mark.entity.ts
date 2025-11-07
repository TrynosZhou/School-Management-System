import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Student } from '../entities/student.entity';
import { ClassEntity } from '../entities/class.entity';
import { Subject } from '../entities/subject.entity';

@Entity({ name: 'marks' })
export class Mark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student, { eager: true, onDelete: 'CASCADE' })
  student: Student;

  @ManyToOne(() => ClassEntity, { eager: true, onDelete: 'CASCADE' })
  klass: ClassEntity;

  @ManyToOne(() => Subject, { eager: true, onDelete: 'SET NULL', nullable: true })
  subject?: Subject | null;

  @Column({ type: 'varchar', length: 100 })
  session: string; // e.g., "Term 1 2025"

  @Column({ type: 'varchar', length: 100, nullable: true })
  examType?: string | null; // e.g., Midterm, End of Term

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  score: string; // store as string per TypeORM decimal

  @Column({ type: 'varchar', length: 500, nullable: true })
  comment?: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  grade?: string | null;

  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
}
