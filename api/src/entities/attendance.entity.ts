import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Student } from './student.entity';
import { ClassEntity } from './class.entity';

@Entity({ name: 'attendance' })
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Student, { eager: true, onDelete: 'CASCADE' })
  student!: Student;

  @ManyToOne(() => ClassEntity, { eager: true, nullable: true, onDelete: 'SET NULL' })
  klass?: ClassEntity | null;

  @Column({ type: 'date' })
  date!: string; // YYYY-MM-DD

  @Column({ type: 'varchar', length: 20, nullable: true })
  term?: string | null; // e.g., Term 1

  @Column({ type: 'boolean', default: true })
  present!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
