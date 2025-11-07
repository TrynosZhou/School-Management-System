import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExamEntity } from './exam.entity';

@Injectable()
export class ExamsService {
  constructor(@InjectRepository(ExamEntity) private readonly exams: Repository<ExamEntity>) {}

  async list(filters?: { classId?: string; subjectId?: string; from?: string; to?: string; q?: string }) {
    const qb = this.exams.createQueryBuilder('e')
      .leftJoinAndSelect('e.subject', 'subject')
      .leftJoinAndSelect('e.classEntity', 'classEntity')
      .leftJoinAndSelect('e.invigilator1', 'inv1')
      .leftJoinAndSelect('e.invigilator2', 'inv2')
      .orderBy('e.dateTime', 'ASC');
    if (filters?.classId) qb.andWhere('classEntity.id = :cid', { cid: filters.classId });
    if (filters?.subjectId) qb.andWhere('subject.id = :sid', { sid: filters.subjectId });
    if (filters?.from) qb.andWhere('(e.dateTime IS NULL OR e.dateTime >= :f)', { f: filters.from });
    if (filters?.to) qb.andWhere('(e.dateTime IS NULL OR e.dateTime <= :t)', { t: filters.to });
    if (filters?.q) qb.andWhere('(LOWER(e.name) LIKE :q OR LOWER(e.venue) LIKE :q)', { q: `%${filters.q.toLowerCase()}%` });
    return qb.getMany();
  }

  async create(body: { name: string; term?: string; academicYear?: string; subjectId?: string; classId?: string; date?: string; time?: string; venue?: string; invigilator1Id?: string; invigilator2Id?: string; status?: string; notes?: string }) {
    const name = (body.name || '').trim();
    if (!name) throw new BadRequestException('name is required');
    const e = this.exams.create({
      name,
      term: body.term || null,
      academicYear: body.academicYear || null,
      venue: body.venue || null,
      status: (body.status as any) || 'scheduled',
      notes: body.notes || null,
    });
    if (body.date || body.time) {
      const dt = new Date(`${body.date || ''} ${body.time || '00:00'}`.trim());
      if (!isNaN(dt.getTime())) (e as any).dateTime = dt;
    }
    if (body.subjectId) (e as any).subject = { id: body.subjectId } as any;
    if (body.classId) (e as any).classEntity = { id: body.classId } as any;
    if (body.invigilator1Id) (e as any).invigilator1 = { id: body.invigilator1Id } as any;
    if (body.invigilator2Id) (e as any).invigilator2 = { id: body.invigilator2Id } as any;
    return this.exams.save(e);
  }

  async exportCsv(filters?: { classId?: string; subjectId?: string; from?: string; to?: string; q?: string }): Promise<string> {
    const rows = await this.list(filters);
    const header = 'Name,Term,AcademicYear,Class,Subject,Date,Time,Venue,Status,Invigilator1,Invigilator2\n';
    const body = rows.map(r => {
      const date = r.dateTime ? new Date(r.dateTime) : null;
      const d = date ? date.toISOString().slice(0,10) : '';
      const t = date ? date.toTimeString().slice(0,5) : '';
      const inv1 = (r as any).invigilator1?.lastName ? `${(r as any).invigilator1.firstName} ${(r as any).invigilator1.lastName}` : '';
      const inv2 = (r as any).invigilator2?.lastName ? `${(r as any).invigilator2.firstName} ${(r as any).invigilator2.lastName}` : '';
      return [r.name, r.term || '', r.academicYear || '', (r as any).classEntity?.name || '', (r as any).subject?.name || '', d, t, r.venue || '', r.status || '', inv1, inv2]
        .map(v => {
          const s = (v ?? '').toString();
          return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g,'""')}"` : s;
        }).join(',');
    }).join('\n');
    return header + body + '\n';
  }

  async finalize(id: string) {
    const exam = await this.exams.findOne({ where: { id } as any });
    if (!exam) throw new BadRequestException('Exam not found');
    (exam as any).status = 'completed';
    (exam as any).finalizedAt = new Date();
    return this.exams.save(exam);
  }
}
