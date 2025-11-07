import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Response } from 'express';
import { Repository } from 'typeorm';
import PDFDocument = require('pdfkit');
import { BearerGuard } from '../auth/bearer.guard';
import { Teacher } from '../entities/teacher.entity';
import { ClassEntity } from '../entities/class.entity';
import { Subject } from '../entities/subject.entity';
import { TeachingAssignment } from '../teaching/teaching-assignment.entity';

@Controller('reports')
export class TeachingLoadReportController {
  constructor(
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(TeachingAssignment) private readonly assignments: Repository<TeachingAssignment>,
    @InjectRepository(ClassEntity) private readonly classes: Repository<ClassEntity>,
    @InjectRepository(Subject) private readonly subjects: Repository<Subject>,
  ) {}

  private async buildData(){
    const rows = await this.assignments.find({ relations: { teacher: true, klass: true, subject: true } });
    type RowItem = { className: string; subjectName: string; periods: number };
    type Row = { teacher: { id: string; name: string; email: string }; items: Array<RowItem>; total: number };
    const byTeacher = new Map<string, Row>();
    for (const r of rows){
      if (!r.teacher) continue;
      const key = r.teacher.id;
      const teacherName = `${(r.teacher as any).firstName || ''} ${(r.teacher as any).lastName || ''}`.trim();
      const entry: Row = byTeacher.get(key) || { teacher: { id: r.teacher.id, name: teacherName, email: (r.teacher as any).email || '' }, items: [] as RowItem[], total: 0 };
      const subjName = r.subject ? (r.subject.name || r.subject.code || '-') : '-';
      const periods = r.subject ? (Number((r.subject as any).teachingPeriods || 0) || 0) : 0;
      const className = r.klass ? r.klass.name : '-';
      entry.items.push({ className, subjectName: subjName, periods });
      entry.total += periods;
      byTeacher.set(key, entry);
    }
    // include teachers without assignments
    const allTeachers = await this.teachers.find();
    for (const t of allTeachers){
      if (!byTeacher.has(t.id)){
        const teacherName = `${(t as any).firstName || ''} ${(t as any).lastName || ''}`.trim();
        byTeacher.set(t.id, { teacher: { id: t.id, name: teacherName, email: (t as any).email || '' }, items: [], total: 0 });
      }
    }
    const data = Array.from(byTeacher.values()).sort((a,b)=> a.teacher.name.localeCompare(b.teacher.name));
    return data;
  }

  @UseGuards(BearerGuard)
  @Get('teaching-periods/json')
  async json(){
    return await this.buildData();
  }

  @UseGuards(BearerGuard)
  @Get('teaching-periods/csv')
  async csv(@Res() res: Response){
    const rows = await this.buildData();
    const header = ['Teacher Name','Email','Class','Subject','Periods','TotalPeriods'];
    const lines: string[] = [header.join(',')];
    for (const r of rows){
      if (r.items.length === 0){
        lines.push([r.teacher.name, r.teacher.email, '-', '-', '0', String(r.total)].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
      } else {
        for (const it of r.items){
          lines.push([r.teacher.name, r.teacher.email, it.className, it.subjectName, String(it.periods), String(r.total)].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
        }
      }
    }
    const csv = lines.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="teaching-periods.csv"');
    res.end(csv);
  }

  @UseGuards(BearerGuard)
  @Get('teaching-periods/pdf')
  async pdf(@Res() res: Response){
    const data = await this.buildData();
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const chunks: Buffer[] = [];
    (doc as any).on('data', (c: Buffer) => chunks.push(c));
    (doc as any).on('end', () => {
      const out = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="teaching-periods.pdf"');
      res.end(out);
    });
    (doc as any).on('error', () => { try { res.status(500).json({ message: 'Failed to generate PDF' }); } catch {} });

    doc.font('Helvetica-Bold').fontSize(16).text('Teaching Periods Report', { align: 'center' });
    doc.moveDown(0.5);

    const tableX = doc.page.margins.left;
    const tableW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const col = { teacher: 170, email: 160, klass: 120, subject: 140, periods: 60, total: 60 };

    const drawHeader = (y: number) => {
      doc.font('Helvetica-Bold').fontSize(10);
      let x = tableX;
      doc.text('Teacher', x, y, { width: col.teacher }); x += col.teacher;
      doc.text('Email', x, y, { width: col.email }); x += col.email;
      doc.text('Class', x, y, { width: col.klass }); x += col.klass;
      doc.text('Subject', x, y, { width: col.subject }); x += col.subject;
      doc.text('Periods', x, y, { width: col.periods, align: 'right' }); x += col.periods;
      doc.text('Total', x, y, { width: col.total, align: 'right' });
    };

    let y = doc.y + 10;
    drawHeader(y);
    y += 16;
    doc.font('Helvetica').fontSize(10);

    const lineH = 16;
    for (const r of data){
      if (y > doc.page.height - 60) { doc.addPage(); y = doc.page.margins.top; drawHeader(y); y += 16; }
      if (r.items.length === 0){
        let x = tableX;
        doc.text(r.teacher.name, x, y, { width: col.teacher }); x += col.teacher;
        doc.text(r.teacher.email || '-', x, y, { width: col.email }); x += col.email;
        doc.text('-', x, y, { width: col.klass }); x += col.klass;
        doc.text('-', x, y, { width: col.subject }); x += col.subject;
        doc.text('0', x, y, { width: col.periods, align: 'right' }); x += col.periods;
        doc.text(String(r.total), x, y, { width: col.total, align: 'right' });
        y += lineH;
      } else {
        for (const it of r.items){
          if (y > doc.page.height - 60) { doc.addPage(); y = doc.page.margins.top; drawHeader(y); y += 16; }
          let x = tableX;
          doc.text(r.teacher.name, x, y, { width: col.teacher }); x += col.teacher;
          doc.text(r.teacher.email || '-', x, y, { width: col.email }); x += col.email;
          doc.text(it.className, x, y, { width: col.klass }); x += col.klass;
          doc.text(it.subjectName, x, y, { width: col.subject }); x += col.subject;
          doc.text(String(it.periods), x, y, { width: col.periods, align: 'right' }); x += col.periods;
          doc.text(String(r.total), x, y, { width: col.total, align: 'right' });
          y += lineH;
        }
      }
    }

    try { doc.end(); } catch {}
  }
}
