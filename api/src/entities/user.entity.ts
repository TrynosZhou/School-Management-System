import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 190 })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 50, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  role?: string; // admin | teacher | student | parent (to be refactored to RBAC tables later)

  @Column({ type: 'varchar', length: 190, nullable: true })
  fullName?: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  contactNumber?: string | null;

  // JSON array of module keys the user is entitled to access
  @Column({ type: 'text', nullable: true })
  modulesJson?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
