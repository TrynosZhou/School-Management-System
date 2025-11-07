import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Enrollment } from './enrollment.entity';
import { Teacher } from './teacher.entity';

@Entity({ name: 'classes' })
export class ClassEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  gradeLevel: string;

  @Column({ type: 'varchar', length: 20 })
  academicYear: string; // e.g., 2025-2026

  @OneToMany(() => Enrollment, (e: Enrollment) => e.classEntity)
  enrollments: Enrollment[];

  @ManyToOne(() => Teacher, { eager: true, nullable: true, onDelete: 'SET NULL' })
  classTeacher?: Teacher | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
