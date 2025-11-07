import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from '../entities/enrollment.entity';
import { Student } from '../entities/student.entity';
import { ClassEntity } from '../entities/class.entity';

export interface CreateEnrollmentDto {
  studentId: string;
  classId: string;
  startDate?: string | null;
  status?: 'active' | 'completed' | 'withdrawn';
}

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment) private readonly enrollRepo: Repository<Enrollment>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(ClassEntity) private readonly classRepo: Repository<ClassEntity>,
  ) {}

  async create(dto: CreateEnrollmentDto) {
    const student = await this.studentRepo.findOne({ where: { id: dto.studentId } });
    if (!student) throw new NotFoundException('Student not found');
    const cls = await this.classRepo.findOne({ where: { id: dto.classId } });
    if (!cls) throw new NotFoundException('Class not found');

    const exists = await this.enrollRepo.findOne({ where: { student: { id: student.id }, classEntity: { id: cls.id } } });
    if (exists) throw new BadRequestException('Student already enrolled in this class');

    // Enforce: a student must be enrolled in only one class at a time (active)
    const active = await this.enrollRepo.findOne({ where: { student: { id: student.id }, status: 'active' } as any, relations: ['classEntity'] });
    if (active) {
      const name = (active.classEntity && (active.classEntity as any).name) || 'another class';
      throw new BadRequestException(`Student already has an active enrollment in ${name}. End/withdraw that enrollment before enrolling in a new class.`);
    }

    const enrollment = this.enrollRepo.create({
      student,
      classEntity: cls,
      startDate: dto.startDate ?? null,
      status: dto.status ?? 'active',
    });
    return this.enrollRepo.save(enrollment);
  }

  async listByStudent(studentId: string) {
    return this.enrollRepo.find({ where: { student: { id: studentId } }, relations: ['student', 'classEntity'] });
  }

  async listByClass(classId: string) {
    return this.enrollRepo.find({ where: { classEntity: { id: classId } }, relations: ['student', 'classEntity'] });
  }

  async listRecent(limit = 5) {
    return this.enrollRepo.find({
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 20),
      relations: ['student', 'classEntity'],
    });
  }

  async remove(id: string) {
    const res = await this.enrollRepo.delete(id);
    if (!res.affected) throw new NotFoundException('Enrollment not found');
  }
}
