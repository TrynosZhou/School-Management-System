import { CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../entities/user.entity';
import { Student } from '../entities/student.entity';

@Entity({ name: 'parent_students' })
@Index(['parent', 'student'], { unique: true })
export class ParentStudent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false })
  parent: User;

  @ManyToOne(() => Student, { nullable: false, onDelete: 'CASCADE' })
  student: Student;

  @CreateDateColumn()
  createdAt: Date;
}
