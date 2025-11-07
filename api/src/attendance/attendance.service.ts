import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Attendance } from '../entities/attendance.entity';
import { Student } from '../entities/student.entity';
import { ClassEntity } from '../entities/class.entity';

export interface RecordAttendanceDto {
  studentId: string;
  classId?: string;
  date: string; // YYYY-MM-DD
  term?: string;
  present: boolean;
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance) private readonly repo: Repository<Attendance>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(ClassEntity) private readonly classes: Repository<ClassEntity>,
  ) {}

  async record(dto: RecordAttendanceDto) {
    const student = await this.students.findOne({ where: { id: dto.studentId } });
    if (!student) throw new NotFoundException('Student not found');
    const klass = dto.classId ? await this.classes.findOne({ where: { id: dto.classId } }) : null;
    const existing = await this.repo.findOne({ where: { student: { id: student.id }, date: dto.date } as any });
    const rec = existing || this.repo.create({ student, date: dto.date });
    rec.present = !!dto.present;
    rec.term = dto.term ?? rec.term ?? null;
    rec.klass = klass ?? rec.klass ?? null;
    return this.repo.save(rec);
  }

  async list(studentId?: string, term?: string, fromDate?: string, toDate?: string) {
    const where: any = {};
    if (studentId) where.student = { id: studentId };
    if (term) where.term = term;
    if (fromDate && toDate) where.date = Between(fromDate, toDate);
    return this.repo.find({ where, order: { date: 'ASC' } });
  }

  async summary(studentId: string, term?: string, fromDate?: string, toDate?: string) {
    const list = await this.list(studentId, term, fromDate, toDate);
    const total = list.length;
    const present = list.filter(x => x.present).length;
    return { total, present };
  }

  async presentCount(date: string) {
    return this.repo.count({ where: { date, present: true } as any });
  }
}
