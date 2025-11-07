import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'teachers' })
export class Teacher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 190 })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subjectTaught?: string | null;

  @Column({ type: 'date', nullable: true })
  dateOfBirth?: string | null;

  @Column({ type: 'date', nullable: true })
  startDate?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  qualifications?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  anyOtherQualification?: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  contactNumber?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  physicalAddress?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  nextOfKin?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  gender?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  anyOtherRole?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
