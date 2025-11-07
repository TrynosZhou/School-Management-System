import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Student } from '../entities/student.entity';

@Entity({ name: 'parent_link_tokens' })
@Index(['code'], { unique: true })
export class ParentLinkToken {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Student, { nullable: false }) student: Student;
  @Column() code: string;
  @Column({ type: 'datetime', nullable: true }) expiresAt: Date | null;
  @Column({ type: 'datetime', nullable: true }) usedAt: Date | null;
  @CreateDateColumn() createdAt: Date;
}
