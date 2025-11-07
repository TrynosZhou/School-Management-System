import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Student } from '../entities/student.entity';

@Entity({ name: 'student_accounts' })
@Unique(['student'])
export class StudentAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student, { eager: true, onDelete: 'CASCADE' })
  student: Student;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance: string; // positive means owes
}
