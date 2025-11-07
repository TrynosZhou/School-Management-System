import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Enrollment } from './enrollment.entity';

@Entity({ name: 'students' })
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 190, nullable: true })
  email?: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20, nullable: true })
  studentId?: string | null; // e.g., JHS0000001

  @Column({ type: 'varchar', length: 10, default: 'day' })
  boardingStatus: 'day' | 'boarder';

  @Column({ type: 'boolean', default: false })
  isStaffChild: boolean;

  @Column({ type: 'boolean', default: false })
  takesMeals: boolean;

  @Column({ type: 'boolean', default: false })
  takesTransport: boolean;

  @ManyToOne(() => User, { nullable: true })
  user?: User | null;

  // Parent account who owns/links this student (one parent to many students)
  @ManyToOne(() => User, { nullable: true })
  parent?: User | null;

  @OneToMany(() => Enrollment, (e) => e.student)
  enrollments: Enrollment[];

  @Column({ type: 'date', nullable: true })
  dob?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nationality?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  religion?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  nextOfKin?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  gender?: string | null; // male | female | other

  @Column({ type: 'varchar', length: 30, nullable: true })
  contactNumber?: string | null;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
