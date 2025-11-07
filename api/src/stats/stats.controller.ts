import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../entities/student.entity';
import { Teacher } from '../entities/teacher.entity';
import { ClassEntity } from '../entities/class.entity';
import { Enrollment } from '../entities/enrollment.entity';

@Controller('stats')
export class StatsController {
  constructor(
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(ClassEntity) private readonly classes: Repository<ClassEntity>,
    @InjectRepository(Enrollment) private readonly enrollments: Repository<Enrollment>,
  ) {}

  @Get()
  async getCounts() {
    const [studentsCount, teachersCount, classesCount] = await Promise.all([
      this.students.count(),
      this.teachers.count(),
      this.classes.count(),
    ]);
    return { students: studentsCount, teachers: teachersCount, classes: classesCount };
  }

  @Get('admissionsTrend')
  async admissionsTrend() {
    const now = new Date();
    const series: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
      const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
      const count = await this.students
        .createQueryBuilder('s')
        .where('s.createdAt >= :start AND s.createdAt < :end', { start, end })
        .getCount();
      const label = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
      series.push({ month: label, count });
    }
    return series;
  }

  @Get('enrollmentsTrend')
  async enrollmentsTrend() {
    const now = new Date();
    const series: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
      const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
      const count = await this.enrollments
        .createQueryBuilder('e')
        .where('e.createdAt >= :start AND e.createdAt < :end', { start, end })
        .getCount();
      const label = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
      series.push({ month: label, count });
    }
    return series;
  }
}
