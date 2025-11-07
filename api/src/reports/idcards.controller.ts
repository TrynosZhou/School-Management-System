import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../entities/student.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { Settings } from '../settings/settings.entity';
import { AccountSettings } from '../accounts/account-settings.entity';
import PDFDocument = require('pdfkit');
import { PDFDocument as PdfLibDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { BearerGuard } from '../auth/bearer.guard';

@Controller('reports')
export class IdCardsController {
  constructor(
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(Enrollment) private readonly enrollRepo: Repository<Enrollment>,
    @InjectRepository(Settings) private readonly settingsRepo: Repository<Settings>,
    @InjectRepository(AccountSettings) private readonly accountSettingsRepo: Repository<AccountSettings>,
  ) {}

  @UseGuards(BearerGuard)
  @Get('student-id-cards/by-class')
  async byClass(@Query('classId') classId: string, @Res() res: Response) {
    if (!classId) { res.status(400).json({ message: 'classId is required' }); return; }
    const enrolls = await this.enrollRepo.find({ where: { classEntity: { id: classId } as any, status: 'active' } as any, relations: { student: true } });
    const students: Student[] = Array.from(new Map((enrolls || []).map(e => [e.student.id, e.student])).values())
      .sort((a, b) => {
        const aid = (a.studentId || a.id).toString(); const bid = (b.studentId || b.id).toString();
        const idCmp = aid.localeCompare(bid, undefined, { numeric: true, sensitivity: 'base' } as any);
        if (idCmp !== 0) return idCmp; return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
      });

    const buildCard = async (s: Student): Promise<Buffer> => {
      return await new Promise<Buffer>(async (resolve) => {
        const d = new PDFDocument({ size: [320, 200], margin: 10 });
        const chunks: Buffer[] = [];
        (d as any).on('data', (c: Buffer) => chunks.push(c));
        (d as any).on('end', () => resolve(Buffer.concat(chunks)));
        try {
          const enr = await this.enrollRepo.find({ where: { student: { id: s.id } as any, status: 'active' } as any, order: { createdAt: 'DESC' } });
          const klass = enr[0]?.classEntity;
          const classDisplay = klass ? `${klass.name}` : '-';
          d.roundedRect(5, 5, d.page.width - 10, d.page.height - 10, 8).stroke('#cbd5e1');
          const bannerH2 = 28; d.save(); d.rect(5, 5, d.page.width - 10, bannerH2).fill('#0b3d91'); d.restore();
          d.font('Helvetica-Bold').fontSize(13).fillColor('#ffffff').text('Student ID Card', 5, 10, { align: 'center', width: d.page.width - 10 });
          try { const settings = await this.settingsRepo.findOne({ where: { id: 'global' } }); const logoPath = settings?.logoUrl && !settings.logoUrl.startsWith('http') ? (path.isAbsolute(settings.logoUrl) ? settings.logoUrl : path.join(process.cwd(), settings.logoUrl)) : (settings?.logoUrl && settings.logoUrl.startsWith('http') ? settings.logoUrl : null); if (logoPath) { try { d.image(logoPath, 12, 8, { width: 20, height: 20, fit: [20, 20] as any }); } catch {} } } catch {}
          const leftX = 12; const topY = 40; const photoW = 80, photoH = 100;
          const assetsDir = path.join(process.cwd(), 'assets', 'photos');
          const sidForPhoto = (s.studentId || s.id).toString();
          const candidates = ['jpg','jpeg','png','webp'].flatMap(ext => [path.join(assetsDir, `${sidForPhoto}.${ext}`), path.join(assetsDir, `${s.id}.${ext}`)]);
          let photoPath: string | null = null; try { for (const p of candidates) { if (fs.existsSync(p)) { photoPath = p; break; } } } catch {}
          if (photoPath) { try { d.image(photoPath, leftX, topY, { width: photoW, height: photoH, fit: [photoW, photoH] as any }); } catch {} }
          const rightX = leftX + 100; const contentW = d.page.width - rightX - 12; let y = topY; const sLabelW = 70; const sValueW = Math.max(60, contentW - sLabelW - 6); const darkBlue = '#0b3d91';
          const fullName = `${s.firstName} ${s.lastName}`.trim();
          // Label
          d.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('Name :', rightX, y, { width: sLabelW, ellipsis: true });
          // Dynamically reduce font size for long names to fit within sValueW
          let nameFontSize = 12;
          while (nameFontSize > 8) {
            d.font('Helvetica-Bold').fontSize(nameFontSize);
            const w = d.widthOfString(fullName);
            if (w <= sValueW) break;
            nameFontSize -= 1;
          }
          d.fillColor(darkBlue).font('Helvetica-Bold').fontSize(nameFontSize).text(fullName, rightX + sLabelW + 4, y - 2, { width: sValueW, ellipsis: true });
          y += 22; d.save(); d.strokeColor('#e5e7eb').lineWidth(0.6).moveTo(rightX, y).lineTo(rightX + sLabelW + sValueW + 4, y).stroke(); d.restore();
          d.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('Student ID :', rightX, y + 6, { width: sLabelW, ellipsis: true }); d.fillColor(darkBlue).font('Helvetica-Bold').fontSize(10).text(`${s.studentId || s.id}`, rightX + sLabelW + 4, y + 4, { width: sValueW, ellipsis: true }); y += 22; d.save(); d.strokeColor('#e5e7eb').lineWidth(0.6).moveTo(rightX, y).lineTo(rightX + sLabelW + sValueW + 4, y).stroke(); d.restore();
          d.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('D.O.B :', rightX, y + 6, { width: sLabelW, ellipsis: true }); d.fillColor(darkBlue).font('Helvetica-Bold').fontSize(10).text(s.dob ? String(s.dob) : '-', rightX + sLabelW + 4, y + 4, { width: sValueW, ellipsis: true }); y += 22;
          d.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('Class :', rightX, y + 6, { width: sLabelW, ellipsis: true }); d.fillColor(darkBlue).font('Helvetica-Bold').fontSize(10).text(classDisplay, rightX + sLabelW + 4, y + 4, { width: sValueW, ellipsis: true }); y += 22;
          d.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('Address :', rightX, y + 6, { width: sLabelW, ellipsis: true }); d.fillColor(darkBlue).font('Helvetica-Bold').fontSize(10).text(s.address || '-', rightX + sLabelW + 4, y + 4, { width: sValueW, ellipsis: true }); y += 28;
          d.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('Year :', rightX, y + 6, { width: sLabelW, ellipsis: true });
          const fallbackYear = (await this.accountSettingsRepo.findOne({ where: { id: 'global' } }))?.academicYear || String(new Date().getFullYear());
          d.fillColor(darkBlue).font('Helvetica-Bold').fontSize(10).text(klass?.academicYear || fallbackYear, rightX + sLabelW + 4, y + 4, { width: sValueW, ellipsis: true });
        } catch {}
        try { d.end(); } catch {}
      });
    };

    const merged = await PdfLibDocument.create();
    for (const s of students) {
      try {
        const buf = await buildCard(s);
        const src = await PdfLibDocument.load(buf);
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      } catch {}
    }
    const out = await merged.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="student-ids-by-class.pdf"');
    res.end(Buffer.from(out));
  }
}
