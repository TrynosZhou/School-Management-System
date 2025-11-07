import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Teacher } from '../entities/teacher.entity';

export interface CreateTeacherDto {
  firstName: string;
  lastName: string;
  email: string;
  subjectTaught?: string | null;
  dateOfBirth?: string | null;
  startDate?: string | null;
  qualifications?: string | null;
  anyOtherQualification?: string | null;
  contactNumber?: string | null;
  physicalAddress?: string | null;
  nextOfKin?: string | null;
  gender?: string | null;
  anyOtherRole?: string | null;
}

@Injectable()
export class TeachersService {
  constructor(
    @InjectRepository(Teacher)
    private readonly repo: Repository<Teacher>,
  ) {}

  async create(dto: CreateTeacherDto) {
    const exists = await this.repo.findOne({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('Email already exists');
    const t = this.repo.create(dto);
    return this.repo.save(t);
  }

  async findAll() {
    return this.repo.find({ order: { lastName: 'ASC', firstName: 'ASC' } });
  }

  async findOne(id: string) {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Teacher not found');
    return t;
  }

  async update(id: string, partial: Partial<CreateTeacherDto>) {
    const t = await this.findOne(id);
    if (partial.email && partial.email !== t.email) {
      const exists = await this.repo.findOne({ where: { email: partial.email } });
      if (exists) throw new BadRequestException('Email already exists');
    }
    Object.assign(t, partial);
    return this.repo.save(t);
  }

  async remove(id: string) {
    const res = await this.repo.delete(id);
    if (!res.affected) throw new NotFoundException('Teacher not found');
  }
}
