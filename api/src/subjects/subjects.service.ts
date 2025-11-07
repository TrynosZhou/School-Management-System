import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from '../entities/subject.entity';

export interface CreateSubjectDto {
  code: string;
  name: string;
  teachingPeriods?: number;
}

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly repo: Repository<Subject>,
  ) {}

  async create(dto: CreateSubjectDto) {
    const code = (dto.code ?? '').trim();
    const name = (dto.name ?? '').trim();
    const periodsRaw = dto.teachingPeriods;
    const teachingPeriods = periodsRaw === undefined || periodsRaw === null ? 0 : Number(periodsRaw);
    if (!code || !name) throw new BadRequestException('Code and name are required');
    if (code.length > 50) throw new BadRequestException('Code must be at most 50 characters');
    if (name.length > 150) throw new BadRequestException('Name must be at most 150 characters');
    if (!Number.isFinite(teachingPeriods) || teachingPeriods < 0 || teachingPeriods > 60) throw new BadRequestException('Teaching periods must be between 0 and 60');

    const exists = await this.repo.findOne({ where: { code } });
    if (exists) throw new BadRequestException('Code already exists');
    const s = this.repo.create({ code, name, teachingPeriods });
    try {
      return await this.repo.save(s);
    } catch (err: any) {
      // Handle DB unique constraints gracefully across common drivers
      const msg = String(err?.message || '').toLowerCase();
      if (err?.code === '23505' || err?.errno === 19 || msg.includes('unique') || msg.includes('constraint')) {
        throw new BadRequestException('Code already exists');
      }
      throw err;
    }
  }

  async findAll() {
    return this.repo.find({ order: { code: 'ASC' } });
  }

  async findOne(id: string) {
    const s = await this.repo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Subject not found');
    return s;
  }

  async update(id: string, partial: Partial<CreateSubjectDto>) {
    const s = await this.findOne(id);
    const next: Partial<Subject> = {};

    if (partial.code !== undefined) {
      const code = String(partial.code).trim();
      if (!code) throw new BadRequestException('Code is required');
      if (code.length > 50) throw new BadRequestException('Code must be at most 50 characters');
      if (code !== s.code) {
        const exists = await this.repo.findOne({ where: { code } });
        if (exists) throw new BadRequestException('Code already exists');
      }
      next.code = code;
    }

    if (partial.name !== undefined) {
      const name = String(partial.name).trim();
      if (!name) throw new BadRequestException('Name is required');
      if (name.length > 150) throw new BadRequestException('Name must be at most 150 characters');
      next.name = name;
    }

    if (partial.teachingPeriods !== undefined) {
      const n = Number(partial.teachingPeriods);
      if (!Number.isFinite(n) || n < 0 || n > 60) throw new BadRequestException('Teaching periods must be between 0 and 60');
      next.teachingPeriods = Math.floor(n);
    }

    Object.assign(s, next);
    try {
      return await this.repo.save(s);
    } catch (err: any) {
      const msg = String(err?.message || '').toLowerCase();
      if (err?.code === '23505' || err?.errno === 19 || msg.includes('unique') || msg.includes('constraint')) {
        throw new BadRequestException('Code already exists');
      }
      throw err;
    }
  }

  async remove(id: string) {
    const res = await this.repo.delete(id);
    if (!res.affected) throw new NotFoundException('Subject not found');
  }
}
