import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { Teacher } from '../entities/teacher.entity';
import { ClassEntity } from '../entities/class.entity';
import { Subject } from '../entities/subject.entity';

@Unique('UQ_teacher_class_subject', ['teacher', 'klass', 'subject'])
@Unique('UQ_class_subject', ['klass', 'subject'])
@Entity({ name: 'teaching_assignments' })
export class TeachingAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Teacher, { eager: true, onDelete: 'CASCADE' })
  teacher: Teacher;

  @ManyToOne(() => ClassEntity, { eager: true, onDelete: 'CASCADE' })
  klass: ClassEntity;

  @ManyToOne(() => Subject, { eager: true, onDelete: 'SET NULL', nullable: true })
  subject?: Subject | null;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: 'active' | 'inactive';

  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
}
