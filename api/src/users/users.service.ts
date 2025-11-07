import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

export interface CreateUserInput {
  email: string;
  password: string;
  role?: string;
  fullName?: string | null;
  contactNumber?: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    const existing = await this.repo.findOne({ where: { email: input.email } });
    if (existing) {
      throw new BadRequestException('Email already in use');
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = this.repo.create({ email: input.email, passwordHash, role: input.role || 'student', fullName: input.fullName ?? null, contactNumber: input.contactNumber ?? null });
    try {
      return await this.repo.save(user);
    } catch (e: any) {
      // Handle MySQL duplicate key just in case of race condition
      if (e?.code === 'ER_DUP_ENTRY') {
        throw new BadRequestException('Email already in use');
      }
      throw e;
    }
  }

  async list(): Promise<User[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } as any });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async resetPasswordByEmail(email: string, newPassword: string): Promise<{ success: true }>{
    const user = await this.findByEmail(email);
    if (!user) throw new BadRequestException('User not found');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    await this.repo.save(user);
    return { success: true };
  }

  async update(id: string, partial: Partial<Pick<User, 'fullName' | 'contactNumber' | 'role' | 'status'>>): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new BadRequestException('User not found');
    if (partial.role) user.role = partial.role;
    if (partial.fullName !== undefined) user.fullName = partial.fullName;
    if (partial.contactNumber !== undefined) user.contactNumber = partial.contactNumber;
    if (partial.status) user.status = partial.status as any;
    return this.repo.save(user);
  }

  async remove(id: string): Promise<void> {
    const res = await this.repo.delete(id);
    if (!res.affected) throw new BadRequestException('User not found');
  }
}
