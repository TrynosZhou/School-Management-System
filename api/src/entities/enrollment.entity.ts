import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Student } from './student.entity';
import { ClassEntity } from './class.entity';

@Entity({ name: 'enrollments' })
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student, (s) => s.enrollments, { eager: true, onDelete: 'CASCADE' })
  student: Student;

  @ManyToOne(() => ClassEntity, (c) => c.enrollments, { eager: true, onDelete: 'CASCADE' })
  classEntity: ClassEntity;

  @Column({ type: 'date', nullable: true })
  startDate?: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'completed' | 'withdrawn';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
