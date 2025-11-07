import { Body, Controller, Get, Param, Put, Query, Res, UseGuards, Req, ForbiddenException, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Like, Repository } from 'typeorm';
import { Student } from '../entities/student.entity';
import { Mark } from '../marks/mark.entity';
import type { Response } from 'express';
import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import { PDFDocument as PdfLibDocument, StandardFonts, PDFName, PDFBool } from 'pdf-lib';
import { XMLParser } from 'fast-xml-parser';
import { AccountsService } from '../accounts/accounts.service';
import { Settings } from '../settings/settings.entity';
import { ReportRemark } from './report-remark.entity';
import { Attendance } from '../entities/attendance.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { ParentsService } from '../parents/parents.service';
import { EmailService } from '../email/email.service';
import { BearerGuard } from '../auth/bearer.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import * as Docx from 'docx';
import * as mammoth from 'mammoth';

@Controller('reports')
export class ReportsController {
  constructor(
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(Mark) private readonly marks: Repository<Mark>,
    @InjectRepository(Settings) private readonly settingsRepo: Repository<Settings>,
    @InjectRepository(ReportRemark) private readonly remarksRepo: Repository<ReportRemark>,
    @InjectRepository(Attendance) private readonly attendanceRepo: Repository<Attendance>,
    @InjectRepository(Enrollment) private readonly enrollRepo: Repository<Enrollment>,
    private readonly parentsSvc: ParentsService,
    private readonly email: EmailService,
    private readonly accounts: AccountsService,
  ) {}

  private async fetchImageBuffer(url: string): Promise<Buffer | null> {
    try {
      if (!url || typeof url !== 'string') return null;
      const u = url.trim();
      if (u.startsWith('data:')) {
        const comma = u.indexOf(',');
        if (comma >= 0) {
          const meta = u.slice(5, comma);
          const data = u.slice(comma + 1);
          const isBase64 = /;base64/i.test(meta);
          return Buffer.from(data, isBase64 ? 'base64' : 'utf8');
        }
      } else if (u.startsWith('http://') || u.startsWith('https://')) {
        const doReq = (uri: string, redirects = 0): Promise<Buffer | null> => new Promise((resolve) => {
          const mod = uri.startsWith('https') ? https : http;
          const req = mod.get(uri, (resp) => {
            const status = resp.statusCode || 0;
            const loc = resp.headers.location as string | undefined;
            if (status >= 300 && status < 400 && loc && redirects < 5) {
              resp.resume();
              doReq(loc, redirects + 1).then(resolve);
              return;
            }
            if (status !== 200) { resp.resume(); resolve(null); return; }
            const bufs: Buffer[] = [];
            resp.on('data', (c) => bufs.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
            resp.on('end', () => resolve(Buffer.concat(bufs)));
            resp.on('error', () => resolve(null));
          });
          req.on('error', () => resolve(null));
        });
        return await doReq(u);
      }
      let filePath = u;
      if (u.startsWith('file://')) {
        filePath = u.replace(/^file:\/\//i, '');
      } else if (!path.isAbsolute(u)) {
        filePath = path.resolve(process.cwd(), u);
      }
      const buf = await fs.promises.readFile(filePath);
      return buf;
    } catch {
      return null;
    }
  }

  @UseGuards(BearerGuard)
  @Get('report-card/:studentId')
  async reportCard(@Req() req: any, @Param('studentId') studentIdParam: string, @Query('term') term: string | undefined, @Res() res: Response) {
    // Accept either UUID or human StudentID (e.g., JHS0000001)
    let student = await this.students.findOne({ where: { id: studentIdParam } });
    if (!student) {
      student = await this.students.findOne({ where: { studentId: studentIdParam } as any });
    }
  /*
  @Get('report-card/:studentId/view')
  async reportCardViewer(
    @Param('studentId') studentIdParam: string,
    @Query('term') term: string | undefined,
    @Res() res: Response,
  ) {
    // Resolve either UUID or human StudentID to display a nice title
    let student = await this.students.findOne({ where: { id: studentIdParam } });
    if (!student) student = await this.students.findOne({ where: { studentId: studentIdParam } as any });
    const displayId = student?.studentId || student?.id || studentIdParam;
    const displayName = student ? `${student.firstName} ${student.lastName}` : 'Student';
    const basePdf = new URL(`${(process.env.WEB_BASE_URL || 'http://localhost:3000')}/api/reports/report-card/${studentIdParam}`);
    if (term) basePdf.searchParams.set('term', term);
    const basePdfUrl = basePdf.toString();
    const html = `<!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Report Card — ${displayName} (${displayId})</title>
        <style>
          body{font-family:system-ui,Segoe UI,Arial,sans-serif;background:#f8fafc;margin:0}
          .wrap{max-width:1100px;margin:16px auto;padding:0 12px}
          .bar{display:flex;gap:8px;margin:8px 0}
          .bar button{padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer}
          .status{margin-left:8px;color:#6b7280;font-size:12px}
          iframe{width:100%;height:1100px;border:0;background:#fff}
        </style>
      </head>
      <body>
        <div class="wrap">
          <h2 style="margin:0 0 10px">${displayName} <span style="color:#6b7280;font-weight:500">(${displayId})</span></h2>
          <div style="margin-bottom:8px;color:#6b7280">Term: ${term || 'All'}</div>
          <div class="bar">
            <button id="preview">Preview</button>
            <button id="download">Download</button>
            <span id="status" class="status"></span>
          </div>
          <iframe id="frame" src="${basePdfUrl}"></iframe>
        </div>
        <script>
          const base = ${JSON.stringify(basePdfUrl)};
          const term = ${JSON.stringify(term || '')};
          const f = document.getElementById('frame');
          const urlWith = ()=>{
            const u = new URL(base);
            if (term) u.searchParams.set('term', term);
            return u.toString();
          };
          document.getElementById('preview').onclick = ()=>{
            f.src = urlWith();
          };
          document.getElementById('download').onclick = ()=>{
            const u = new URL(urlWith());
            u.searchParams.set('download','1');
            window.open(u.toString(), '_blank');
          };
        </script>
      </body>
      </html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  */
    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }
    // If the authenticated user is a parent, ensure they are linked to this student
    const role = (req?.user?.role || '').toLowerCase();
    if (role === 'parent' || role === 'student') {
      if (role === 'parent') {
        const linked = await this.parentsSvc.isLinked(req.user.sub, student.id);
        if (!linked) throw new ForbiddenException('You are not linked to this student');
      }
      try {
        const bal = await this.accounts.getStudentTermBalanceById(student.id, term);
        const balanceNum = Number(bal?.balance) || 0;
        console.log(`[DEBUG] Balance check - studentId: ${student.id}, term: ${term || 'current'}, balance: ${bal?.balance}, parsed: ${balanceNum}`);
        // Only deny access if balance is meaningfully greater than zero (use 0.01 threshold to avoid floating point issues)
        if (balanceNum > 0.01) {
          console.log(`[DEBUG] ❌ Access DENIED due to outstanding balance: ${balanceNum}`);
          throw new ForbiddenException('This report card is temporarily unavailable due to outstanding arrears. Please settle arrears to view.');
        } else {
          console.log(`[DEBUG] ✅ Balance check passed: ${balanceNum}`);
        }
      } catch (err) {
        if (err instanceof ForbiddenException) throw err;
        // If balance check fails for other reasons, log but don't block access
        console.log(`[DEBUG] Balance check error (not blocking):`, err);
      }
      // Enforce remarks readiness for parents (both teacher and principal remarks must be present)
      try {
        console.log(`[DEBUG] Parent access check - searching for remarks:`, { studentId: student.id, term: term || 'none' });
        const rem = await this.remarksRepo.findOne({ where: { studentId: student.id, ...(term ? { term: Like(`%${term}%`) } : {} as any) } as any });
        
        if (!rem) {
          console.log(`[DEBUG] ❌ NO REMARK RECORD FOUND for student ${student.id}, term: ${term || 'none'}`);
          throw new ForbiddenException('This report card is not yet ready. Remarks are pending.');
        }
        
        const teacherOk = !!(rem?.teacherRemark && rem.teacherRemark.toString().trim().length > 0);
        const principalOk = !!(rem?.principalRemark && rem.principalRemark.toString().trim().length > 0);
        const statusOk = (rem?.status || '').toString() === 'ready_for_pdf';
        
        console.log(`[DEBUG] Remarks check result:`, {
          studentId: student.id,
          term: term || 'current',
          foundRecordId: rem.id,
          recordTerm: rem.term,
          recordExamType: rem.examType,
          teacherOk,
          principalOk,
          statusOk,
          status: rem.status || 'none',
          teacherRemarkLength: rem.teacherRemark?.length || 0,
          principalRemarkLength: rem.principalRemark?.length || 0
        });
        
        if (!(teacherOk && principalOk && statusOk)) {
          const reasons = [];
          if (!teacherOk) reasons.push('teacher remark missing');
          if (!principalOk) reasons.push('principal remark missing');
          if (!statusOk) reasons.push(`status is '${rem.status}' not 'ready_for_pdf'`);
          console.log(`[DEBUG] ❌ Access DENIED. Reasons:`, reasons.join(', '));
          throw new ForbiddenException('This report card is not yet ready. Remarks are pending.');
        }
        
        console.log(`[DEBUG] ✅ Access GRANTED - all checks passed`);
      } catch (err) {
        if (err instanceof ForbiddenException) throw err;
      }
    }
    // Normalize examType and classId from query
    const qAny = (req?.query as any) || {};
    const examTypeRaw = qAny?.examType as any;
    const examTypeParam = (typeof examTypeRaw === 'string' && examTypeRaw.trim().length > 0) ? examTypeRaw.trim() : undefined;
    const classIdRaw = qAny?.classId as any;
    const classIdParam = (typeof classIdRaw === 'string' && classIdRaw.trim().length > 0) ? classIdRaw.trim() : undefined;
    const where: any = { student: { id: student.id } };
    if (term) where.session = Like(`%${term}%`);
    if (examTypeParam) where.examType = examTypeParam;
    if (classIdParam) where.klass = { id: classIdParam } as any;
    let items = await this.marks.find({ where, order: { session: 'ASC' }, relations: { student: true, subject: true, klass: true } });
    // Fallbacks: relax filters progressively to find any marks for this student
    if (!items || items.length === 0) {
      // 1) If examType was provided, retry without it (null rows)
      if (examTypeParam) {
        const w2: any = { ...where };
        delete w2.examType;
        w2.examType = IsNull() as any;
        items = await this.marks.find({ where: w2, order: { session: 'ASC' }, relations: { student: true, subject: true, klass: true } });
      }
    }
    if (!items || items.length === 0) {
      // 2) If term was provided, retry without session filter (any term)
      if (term) {
        const w3: any = { student: { id: student.id } };
        if (examTypeParam) w3.examType = examTypeParam;
        if (classIdParam) w3.klass = { id: classIdParam } as any;
        items = await this.marks.find({ where: w3, order: { session: 'ASC' }, relations: { student: true, subject: true, klass: true } });
      }
    }
    // Deduplicate: keep only one mark per subject per session (latest by createdAt, then by id)
    if (items?.length) {
      // Sort newest first
      (items as any[]).sort((a, b) => {
        const ca = new Date((a as any).createdAt || 0).getTime();
        const cb = new Date((b as any).createdAt || 0).getTime();
        if (cb !== ca) return cb - ca;
        const ia = ((a as any).id || '').toString();
        const ib = ((b as any).id || '').toString();
        return ib.localeCompare(ia);
      });
      const seen = new Set<string>();
      const unique: any[] = [];
      for (const m of items as any[]) {
        const subjId = (m.subject?.id ?? 'null').toString();
        const key = `${subjId}|${m.session}|${(m as any).examType ?? ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(m);
      }
      items = unique;
    }
    // Create PDF with theme (smaller margin to help keep to one page)
    const doc = new PDFDocument({ margin: 28 });
    const theme = {
      primary: '#1992d4', // teal/blue accent similar to sample
      secondary: '#06b6d4',
      text: '#111827',
      muted: '#6b7280',
      border: '#cbd5e1',
      softBorder: '#e5e7eb',
      panelBg: '#f8fafc',
      headerBg: '#eef6ff',
      stripe: '#fbfdff',
      success: '#166534',
      danger: '#b91c1c',
      link: '#0891b2',
    } as const;
    const rawName = `${student.firstName} ${student.lastName}`;
    const safeBase = rawName.replace(/[\r\n\"]+/g, '').trim() || 'report-card';
    const filename = `${safeBase}.pdf`;
    const q = (res.req.query as any) || {};
    const forceDownload = q.download === '1' || q.download === 'true';
    const dispositionType = forceDownload ? 'attachment' : 'inline';
    // buffer the PDF; we'll post-process to add interactive text fields
    const chunks: Buffer[] = [];
    (doc as any).on('data', (c: Buffer) => chunks.push(c));
    let savedRemarkVar: ReportRemark | null = null;
    (doc as any).on('end', () => {
      try {
        const pdf = Buffer.concat(chunks);
        res.setHeader('Content-Type', 'application/pdf');
        // Expose filename header to browsers (CORS)
        try { res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition'); } catch {}
        const encoded = encodeURIComponent(filename);
        res.setHeader('Content-Disposition', `${dispositionType}; filename="${filename}"; filename*=UTF-8''${encoded}`);
        res.end(pdf);
      } catch {
        try { res.status(500).json({ message: 'Report generation failed' }); } catch {}
      }
    });
    (doc as any).on('error', () => {
      try { res.status(500).json({ message: 'Report generation failed' }); } catch {}
    });

    try {
    // Header with optional logo and school details (banner style)
    const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
    if (settings?.primaryColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(settings.primaryColor)) {
      (theme as any).primary = settings.primaryColor;
    }
    const startY = 0; // draw banner at very top
    // Banner with logo and school address (load logo from settings.logoUrl reliably)
    const bannerH = 60;
    doc.save();
    // Dark blue banner background (full width)
    doc.rect(0, startY, doc.page.width, bannerH).fill('#0b3d91');
    doc.restore();
    try {
      const logoUrl = settings?.logoUrl || '';
      const buf = await this.fetchImageBuffer(logoUrl);
      if (buf) {
        doc.image(buf, 16, startY + 8, { width: 130, height: bannerH - 16, fit: [130, bannerH - 16] as any });
      }
    } catch {}
    const schoolName = settings?.schoolName || process.env.SCHOOL_NAME || 'SchoolPro';
    const schoolAddress = settings?.schoolAddress || process.env.SCHOOL_ADDRESS || '';
    // School name label inside banner
    doc.font('Helvetica-Bold').fillColor('#ffffff').fontSize(14).text(schoolName, 0, startY + 6, {
      align: 'center', width: doc.page.width
    });
    // Address below name inside banner (if provided)
    if (schoolAddress) {
      doc.font('Helvetica').fillColor('#ffffff').fontSize(10).text(schoolAddress, 0, startY + 24, {
        align: 'center', width: doc.page.width
      });
      doc.fillColor(theme.text);
    }
    // Start content after banner
    doc.y = bannerH + 12;
    // Title, centered, showing the current term selected (or inferred)
    doc.moveDown(0.6);
    const sessionSet = new Set<string>((items || []).map(i => String(i.session)).filter(Boolean));
    const uniqueSessions = Array.from(sessionSet.values()).sort();
    const displayTerm = term ? (uniqueSessions.length === 1 ? uniqueSessions[0] : term) : (uniqueSessions.length === 1 ? uniqueSessions[0] : 'All Terms');
    const currentYear = new Date().getFullYear();
    // Match sample: "Mid Term 3, 2025 Report Card" (examType + term number + year)
    const termNum = /Term\s*(\d+)/i.exec(displayTerm || '')?.[1] || '';
    const titleText = examTypeParam
      ? `${examTypeParam}${termNum ? ' ' + termNum : ''}, ${currentYear} Report Card`
      : `${displayTerm}, ${currentYear} Report Card`;
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#111827').text(titleText, { align: 'center' });
    doc.moveDown(0.2);
    // thin accent line
    const lineX = 40; const lineW = doc.page.width - 80;
    doc.save();
    doc.moveTo(lineX, doc.y).lineTo(lineX + lineW, doc.y).strokeColor(theme.primary).lineWidth(2).stroke();
    doc.restore();
    doc.moveDown(0.5);

    // If no marks at all, render a simple page and exit early
    if (!items || items.length === 0) {
      doc.moveDown(1);
      doc.font('Helvetica').fontSize(12).fillColor('#374151').text('No marks found for the selected criteria.');
      doc.end();
      return;
    }

    // Student info row with Class and Positions
    const infoX = 40; const infoW = doc.page.width - 80;
    const infoY = doc.y + 4;
    const klassRef = (items[0] as any)?.klass as any | undefined;
    const klassId = (klassRef?.id as string | undefined);
    const klassName = klassRef?.name || '-';
    // Determine an effective term for stats if none was provided: use latest session from student's marks
    const effectiveTerm = term || (items.length ? String(items[items.length - 1].session) : undefined);
    // Pre-compute positions so we can place them next to Class on this row
    let classRank: number | null = null; let classCohortSize = 0;
    let formRank: number | null = null; let formCohortSize = 0;
    if (klassRef && klassId && effectiveTerm) {
      const cmWhere: any = { klass: { id: klassId }, session: Like(`%${effectiveTerm}%`) };
      if (examTypeParam) cmWhere.examType = examTypeParam;
      let classMarks = await this.marks.find({ where: cmWhere as any });
      // Fallbacks: remove examType, then session, to ensure cohort aggregation works
      if ((!classMarks || classMarks.length === 0) && examTypeParam) {
        const cmWhere2: any = { klass: { id: klassId }, session: Like(`%${effectiveTerm}%`) };
        classMarks = await this.marks.find({ where: cmWhere2 as any });
      }
      if (!classMarks || classMarks.length === 0) {
        const cmWhere3: any = { klass: { id: klassId } };
        classMarks = await this.marks.find({ where: cmWhere3 as any });
      }
      const classStudentIds = Array.from(new Set(classMarks.map(m => (m as any).student?.id).filter(Boolean)));
      classCohortSize = classStudentIds.length;
      const classAgg = new Map<string, { sum:number; n:number }>();
      classMarks.forEach(m => { const sid = (m as any).student?.id as string; if (!sid) return; const e = classAgg.get(sid) || { sum:0, n:0 }; e.sum += Number(m.score)||0; e.n += 1; classAgg.set(sid,e); });
      const classAvgs = Array.from(classAgg.entries()).map(([sid,v]) => [sid, v.n ? v.sum/v.n : 0] as [string, number]).sort((a,b)=>b[1]-a[1]);
      const idxC = classAvgs.findIndex(([sid]) => sid === student.id); if (idxC >= 0) classRank = idxC + 1;
      const tmWhere: any = { session: Like(`%${effectiveTerm}%`) };
      if (examTypeParam) tmWhere.examType = examTypeParam;
      let termMarks = await this.marks.find({ where: tmWhere as any });
      if ((!termMarks || termMarks.length === 0) && examTypeParam) {
        const tmWhere2: any = { session: Like(`%${effectiveTerm}%`) };
        termMarks = await this.marks.find({ where: tmWhere2 as any });
      }
      if (!termMarks || termMarks.length === 0) {
        termMarks = await this.marks.find();
      }
      const formMarks = termMarks.filter(m => { const k = (m as any).klass; return k && k.gradeLevel === klassRef.gradeLevel && k.academicYear === klassRef.academicYear; });
      const formAgg = new Map<string, { sum:number; n:number }>();
      formMarks.forEach(m => { const sid = (m as any).student?.id as string; if (!sid) return; const e = formAgg.get(sid) || { sum:0, n:0 }; e.sum += Number(m.score)||0; e.n += 1; formAgg.set(sid,e); });
      const formAvgs = Array.from(formAgg.entries()).map(([sid,v]) => [sid, v.n ? v.sum/v.n : 0] as [string, number]).sort((a,b)=>b[1]-a[1]);
      formCohortSize = formAvgs.length; const idxF = formAvgs.findIndex(([sid]) => sid === student.id); if (idxF >= 0) formRank = idxF + 1;
    }
    // Attendance (moved to header row)
    let attendanceStr = 'N/A';
    try {
      const attWhere: any = { student: { id: student.id } };
      if (effectiveTerm) attWhere.term = effectiveTerm;
      const attendance = await this.attendanceRepo.find({ where: attWhere });
      const totalDays = attendance.length;
      const present = attendance.filter(a => a.present).length;
      if (totalDays > 0) attendanceStr = `${present}/${totalDays} (${((present/totalDays)*100).toFixed(1)}%)`;
    } catch {}
    doc.font('Helvetica').fillColor('#111827').fontSize(11);
    const idLabel = 'Student I.D:'; const nameLabel = 'Name:'; const classLabel = 'Class:';
    let x = infoX;
    doc.text(idLabel, x, infoY); x += doc.widthOfString(idLabel) + 6;
    doc.fillColor(theme.link).text(`${student.studentId || student.id}`, x, infoY); x += doc.widthOfString(`${student.studentId || student.id}`) + 20;
    doc.fillColor('#111827').text(nameLabel, x, infoY); x += doc.widthOfString(nameLabel) + 6;
    doc.fillColor('#111827').text(`${student.firstName} ${student.lastName}`, x, infoY);
    x += doc.widthOfString(`${student.firstName} ${student.lastName}`) + 20;
    // Place Class on the same line as Name
    doc.fillColor('#111827').text(classLabel, x, infoY); x += doc.widthOfString(classLabel) + 6;
    doc.fillColor(theme.link).text(klassName, x, infoY);
    // Move to next line for positions and other stats
    x = infoX;
    const line2Y = infoY + 26;
    // Class Position and Form Position
    const classPosLabel = 'Class position:';
    doc.fillColor('#111827').text(classPosLabel, x, line2Y); x += doc.widthOfString(classPosLabel) + 6;
    const classPosVal = (classRank && classCohortSize) ? `${classRank}/${classCohortSize}` : '-';
    doc.fillColor(theme.link).text(classPosVal, x, line2Y); x += doc.widthOfString(classPosVal) + 20;
    const formPosLabel = 'Form position:';
    doc.fillColor('#111827').text(formPosLabel, x, line2Y); x += doc.widthOfString(formPosLabel) + 6;
    const formPosVal = (formRank && formCohortSize) ? `${formRank}/${formCohortSize}` : '-';
    doc.fillColor(theme.link).text(formPosVal, x, line2Y);
    // Subjects Passed (to match sample's header line)
    const passCountTop = (items || []).filter(i => Number((i as any).score) >= 50).length;
    x += doc.widthOfString(formPosVal) + 20;
    const passedLabel = 'Subjects Passed:';
    doc.fillColor('#111827').text(passedLabel, x, line2Y); x += doc.widthOfString(passedLabel) + 6;
    const passedStr = String(passCountTop || 0);
    doc.fillColor(theme.link).text(passedStr, x, line2Y); x += doc.widthOfString(passedStr) + 20;
    // Attendance after Subjects Passed on same row
    const attLabel = 'Attendance:';
    doc.fillColor('#111827').text(attLabel, x, line2Y); x += doc.widthOfString(attLabel) + 6;
    doc.fillColor(theme.link).text(attendanceStr, x, line2Y);
    doc.fillColor('#111827');
    doc.moveDown(1.5);

    // Removed grading bands to keep report concise.

    // Subjects table (header shading + grid)
    const tableX = doc.page.margins.left; // align to page margin
    const tableW = doc.page.width - doc.page.margins.left - doc.page.margins.right; // stretch to fit
    // Reduce subject column further and widen comments
    const isForm5Or6 = !!(klassRef?.gradeLevel && /form\s*(5|6)/i.test(String(klassRef.gradeLevel)));
    const colW = {
      idx: 24,
      subject: 130,
      mark: 60,
      mean: 60,
      points: isForm5Or6 ? 50 : 0,
      rank: 60,
      grade: 50,
      comment: Math.max(140, tableW - (24 + 130 + 60 + 60 + (isForm5Or6 ? 50 : 0) + 60 + 50) - 8)
    } as const;
    let ty = doc.y + 6;
    // header background
    doc.save();
    doc.rect(tableX, ty, tableW, 24).fill(theme.headerBg);
    doc.fillColor(theme.text).font('Helvetica-Bold').fontSize(10);
    let hx = tableX + 8;
    doc.text('#', hx, ty + 6, { width: colW.idx }); hx += colW.idx;
    doc.text('Subject', hx, ty + 6, { width: colW.subject }); hx += colW.subject;
    doc.text('Mark', hx, ty + 6, { width: colW.mark }); hx += colW.mark;
    doc.text('Average', hx, ty + 6, { width: colW.mean }); hx += colW.mean;
    doc.text('Position', hx, ty + 6, { width: colW.rank }); hx += colW.rank;
    doc.text('Grade', hx, ty + 6, { width: colW.grade }); hx += colW.grade;
    if (isForm5Or6) { doc.text('Points', hx, ty + 6, { width: colW.points }); hx += colW.points; }
    doc.text('Comment', hx, ty + 6, { width: colW.comment });
    // header border
    doc.lineWidth(0.8).strokeColor(theme.border).rect(tableX, ty, tableW, 24).stroke();
    ty += 24;
    doc.restore();

    // Rows and per-subject stats
    doc.strokeColor('#000');
    // Parse grading bands from Settings if provided; supports [{"grade":"A","range":"80 - 100"}, ...] or [{"grade":"A","min":80,"max":100}, ...]
    type Band = { grade: string; min: number; max: number };
    const parseBands = (json?: string | null): Band[] | null => {
      try {
        if (!json) return null;
        const arr = JSON.parse(json);
        if (!Array.isArray(arr) || !arr.length) return null;
        const out: Band[] = [];
        for (const it of arr) {
          const g = (it?.grade || '').toString().trim();
          let min = Number((it?.min ?? '').toString());
          let max = Number((it?.max ?? '').toString());
          if ((isNaN(min) || isNaN(max)) && typeof it?.range === 'string') {
            // Accept hyphen -, en dash \u2013, or em dash \u2014 between numbers
            const m = /(-?\d+(?:\.\d+)?)\s*[\-\u2013\u2014]\s*(-?\d+(?:\.\d+)?)/.exec(it.range);
            if (m) { min = parseFloat(m[1]); max = parseFloat(m[2]); }
          }
          if (!g || isNaN(min) || isNaN(max)) continue;
          if (min > max) { const t = min; min = max; max = t; }
          out.push({ grade: g, min, max });
        }
        // Sort by min desc so highest bands first
        out.sort((a,b) => b.min - a.min);
        return out.length ? out : null;
      } catch { return null; }
    };
    let gradingBands = parseBands(settings?.gradingBandsJson || null);
    // Validate bands: if all bands have min=0 and max=0, they're invalid
    if (gradingBands && gradingBands.length > 0) {
      const allInvalid = gradingBands.every(b => b.min === 0 && b.max === 0);
      if (allInvalid) {
        console.log('[Report Card PDF] Settings bands are invalid (all zeros), using defaults');
        gradingBands = null;
      } else {
        console.log('[Report Card PDF] Using Settings bands:', JSON.stringify(gradingBands));
      }
    }
    if (!gradingBands || gradingBands.length === 0) {
      console.log('[Report Card PDF] Using hardcoded default bands');
      gradingBands = [
        { grade: 'A*', min: 90, max: 100 },
        { grade: 'A',  min: 70, max: 89 },
        { grade: 'B',  min: 60, max: 69 },
        { grade: 'C',  min: 50, max: 59 },
        { grade: 'D',  min: 45, max: 49 },
        { grade: 'E',  min: 40, max: 44 },
        { grade: 'U',  min: 0,  max: 39 },
      ];
    }
    const gradeFor = (scoreNum: number) => {
      if (gradingBands && gradingBands.length) {
        // Exact band match
        for (const b of gradingBands) {
          if (scoreNum >= b.min && scoreNum <= b.max) {
            console.log(`[Report Card gradeFor] Score ${scoreNum} matched band ${b.grade} (${b.min}-${b.max})`);
            return b.grade;
          }
        }
        // No exact match - return empty instead of guessing
        console.log(`[Report Card gradeFor] No band match for score ${scoreNum}`);
        return '';
      }
      return '';
    };
    const pointsFor = (grade: string): number | '' => {
      const g = (grade || '').toUpperCase().trim();
      if (!g) return '';
      if (g === 'A*' || g === 'A') return 5;
      if (g === 'B') return 4;
      if (g === 'C') return 3;
      if (g === 'D') return 2;
      if (g === 'E') return 1;
      if (g === 'U') return 0;
      return '';
    };
    const commentFor = (scoreNum: number) => {
      if (scoreNum >= 80) return 'Excellent effort';
      if (scoreNum >= 70) return 'Good work, keep it up';
      if (scoreNum >= 60) return 'Fair, aim higher';
      if (scoreNum >= 50) return 'Needs to improve';
      return 'Can do better than this';
    };
    const total = (items || []).reduce((a, it) => a + (Number((it as any).score) || 0), 0);
    const avg = (items && items.length) ? (total / items.length) : 0;
    const gpa = 0;

    // Build per-subject stats per term (Mean = class average for that term, Position = class rank for that term)
    const klassRef2 = (items[0] as any)?.klass as any | undefined;
    const klassId2 = klassRef2?.id as string | undefined;
    const subjectStatsByTerm = new Map<string, Map<string, { mean: number; rank: number | null; total: number }>>();
    const buildSubjectStatsForTerm = async (termX: string) => {
      if (!klassRef2 || !klassId2 || !termX) return new Map<string, { mean: number; rank: number | null; total: number }>();
      const cached = subjectStatsByTerm.get(termX);
      if (cached) return cached;
      const classWhere: any = { klass: { id: klassId2 }, session: Like(`%${termX}%`) };
      if (examTypeParam) classWhere.examType = examTypeParam;
      let classTermMarks = await this.marks.find({ where: classWhere as any });
      // Fallbacks if examType filtering yields no data
      if ((!classTermMarks || classTermMarks.length === 0) && examTypeParam) {
        const classWhere2: any = { klass: { id: klassId2 }, session: Like(`%${termX}%`) };
        classTermMarks = await this.marks.find({ where: classWhere2 as any });
      }
      const bySubjectClass = new Map<string, Array<{ sid: string; score: number }>>();
      classTermMarks.forEach(m => {
        const sid = (m as any).student?.id as string | undefined;
        const sj = (m as any).subject?.id as string | undefined;
        if (!sid || !sj) return;
        const arr = bySubjectClass.get(sj) || [];
        arr.push({ sid, score: Number(m.score) || 0 });
        bySubjectClass.set(sj, arr);
      });
      const map = new Map<string, { mean: number; rank: number | null; total: number }>();
      bySubjectClass.forEach((arr, subjId) => {
        const mean = arr.length ? arr.reduce((a,b)=> a + b.score, 0) / arr.length : 0;
        const sorted = [...arr].sort((a,b)=> b.score - a.score);
        const idx = sorted.findIndex(x => x.sid === student.id);
        const rank = idx >= 0 ? (idx + 1) : null;
        map.set(subjId, { mean, rank, total: arr.length });
      });
      subjectStatsByTerm.set(termX, map);
      return map;
    };
    // Pre-build for effectiveTerm so initial rows resolve quickly
    if (effectiveTerm) { await buildSubjectStatsForTerm(effectiveTerm); }

    for (let idx = 0; idx < items.length; idx++) {
      const m = items[idx];
      const subjObj = (m as any).subject;
      const subj = subjObj ? `${subjObj.name}` : '-';
      const scoreNum = Number(m.score);
      const letter = gradeFor(scoreNum);
      // Determine term for this row: if a specific term is selected, use it; otherwise use the row's session
      const termForRow = term || String((m as any).session || '') || effectiveTerm || '';
      let stats: { mean: number; rank: number | null; total: number } | undefined;
      if (subjObj && termForRow) {
        const map = await buildSubjectStatsForTerm(termForRow);
        stats = map.get(subjObj.id);
      }
      const mean = stats?.mean ?? 0;
      const rank = stats?.rank ?? null;
      const denom = stats?.total ?? null;
      const comment = (m.comment && String(m.comment).trim().length)
        ? String(m.comment)
        : commentFor(scoreNum);
      const rowH2 = 20;
      doc.save();
      if ((idx % 2) === 0) {
        doc.rect(tableX, ty, tableW, rowH2).fill(theme.stripe);
      }
      doc.lineWidth(0.6).strokeColor(theme.softBorder).rect(tableX, ty, tableW, rowH2).stroke();
      doc.fillColor(theme.text).font('Helvetica').fontSize(10);
      let cx = tableX + 8;
      doc.text(String(idx + 1), cx, ty + 5, { width: colW.idx, align: 'left' }); cx += colW.idx;
      doc.text(subj, cx, ty + 5, { width: colW.subject }); cx += colW.subject;
      doc.fillColor(theme.link).text(String(scoreNum), cx, ty + 5, { width: colW.mark }); cx += colW.mark;
      doc.fillColor(theme.text).text(`${mean ? mean.toFixed(0) : '-'}`, cx, ty + 5, { width: colW.mean }); cx += colW.mean;
      doc.text(rank && denom ? `${rank}/${denom}` : '-', cx, ty + 5, { width: colW.rank }); cx += colW.rank;
      doc.font('Helvetica-Bold').text(letter, cx, ty + 5, { width: colW.grade }); cx += colW.grade;
      if (isForm5Or6) {
        const pts = pointsFor(letter);
        doc.text(pts !== '' ? String(pts) : '-', cx, ty + 5, { width: colW.points }); cx += colW.points;
      }
      doc.text(comment, cx, ty + 5, { width: colW.comment });
      ty += rowH2;
    }
    // Average Mark row (matches sample footer row in table)
    const avgRowH = 20;
    doc.save();
    if ((items.length % 2) === 0) {
      doc.rect(tableX, ty, tableW, avgRowH).fill(theme.stripe);
    }
    doc.lineWidth(0.6).strokeColor(theme.softBorder).rect(tableX, ty, tableW, avgRowH).stroke();
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(10);
    let ax = tableX + 8;
    // label under Subject column span
    ax += colW.idx; // skip #
    doc.text('Average Mark', ax, ty + 5, { width: colW.subject });
    ax += colW.subject;
    doc.fillColor(theme.link).text(`${avg.toFixed(0)}`, ax, ty + 5, { width: colW.mark });
    // leave remaining columns blank
    ty += avgRowH;
    doc.restore();
    // No summary table: start remarks a bit below the table
    const commentsStartY = ty + 24;

    // Load saved remarks and render them near footer with signature lines
    // Normalize for remarks lookup as well
    const examTypeRaw2 = q?.examType as any;
    const examType = (typeof examTypeRaw2 === 'string' && examTypeRaw2.trim().length > 0) ? examTypeRaw2.trim() : undefined;
    // If term is not explicitly provided, fall back to effectiveTerm so parents see latest remarks
    const lookupTerm = term || effectiveTerm || undefined;
    let savedRemark = await this.remarksRepo.findOne({
      where: {
        studentId: student.id,
        ...(lookupTerm ? { term: Like(`%${lookupTerm}%`) } : { term: IsNull() }),
        ...(examType ? { examType } : { examType: IsNull() })
      }
    });
    // Fallback: if examType-specific record not found, try term-only record
    if (!savedRemark && examType) {
      savedRemark = await this.remarksRepo.findOne({
        where: {
          studentId: student.id,
          ...(lookupTerm ? { term: Like(`%${lookupTerm}%`) } : { term: IsNull() }),
          examType: IsNull(),
        }
      });
    }
    // Additional fallback: when no examType is provided, search any examType for the term and pick the latest non-empty
    if (!savedRemark && !examType && lookupTerm) {
      try {
        const anyTermRecs = await this.remarksRepo.find({ where: { studentId: student.id, term: Like(`%${lookupTerm}%`) } as any, order: { updatedAt: 'DESC', id: 'DESC' } as any });
        const withText = anyTermRecs.find(r => (r.teacherRemark && String(r.teacherRemark).trim().length) || (r.principalRemark && String(r.principalRemark).trim().length));
        if (withText) savedRemark = withText as any;
      } catch {}
    }
    savedRemarkVar = savedRemark || null;

    // Align labels to the interactive fields (added in pdf-lib post-process)
    // Use same geometry as in the on('end') handler: fieldH and yFromBottom
    const colGap = 36; // keep in sync with pdf-lib placement
    const shrink = 20;
    const remarkColW = ((doc.page.width - 80 - colGap) / 2) - shrink;
    const leftX = 40;
    const rightX = leftX + remarkColW + colGap;
    const fieldH = 120; // must match pdf-lib field height
    const yFromBottom = 120; // must match pdf-lib placement from bottom (to field bottom)
    // Convert to PDFKit Y (top-left origin). Field top Y:
    const pageH = doc.page.height;
    let fieldTopY = pageH - (yFromBottom + fieldH);
    const moveDown = 56; // ~4 lines
    fieldTopY = fieldTopY + moveDown;
    const fieldBottomY = fieldTopY + fieldH;

    // Labels directly above the text areas
    const labelYOffset =  -18; // just above field top
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(12)
      .text('Form Teacher', leftX, fieldTopY + labelYOffset, { width: remarkColW });
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(12)
      .text("Head's Comment", rightX, fieldTopY + labelYOffset, { width: remarkColW });

    // Visible boxes showing the text area regions (aid visibility across viewers)
    doc.lineWidth(1).strokeColor(theme.border)
      .roundedRect(leftX, fieldTopY, remarkColW, fieldH, 4).stroke();
    doc.lineWidth(1).strokeColor(theme.border)
      .roundedRect(rightX, fieldTopY, remarkColW, fieldH, 4).stroke();

    // Stamp the saved remarks so they are visible even if the viewer blocks typing
    doc.save();
    // TeacherRemarks: non-serif readable font, size 9pt
    doc.font('Helvetica').fontSize(9).fillColor('#111827');
    const pad = 6;
    const teacherText = (savedRemarkVar?.teacherRemark || '').toString();
    const principalText = (savedRemarkVar?.principalRemark || '').toString();
    // Clamp text to avoid overflow
    doc.text(teacherText, leftX + pad, fieldTopY + pad, { width: remarkColW - pad*2, height: fieldH - pad*2 });
    // PrincipalRemarks: bold for emphasis, size 9pt
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text(principalText, rightX + pad, fieldTopY + pad, { width: remarkColW - pad*2, height: fieldH - pad*2 });
    doc.restore();

    // Signature lines directly below each field
    const sigLineW = 200;
    const sigY = fieldBottomY + 14;
    doc.lineWidth(0.8).strokeColor(theme.softBorder)
      .moveTo(leftX, sigY).lineTo(leftX + sigLineW, sigY).stroke();
    doc.lineWidth(0.8).strokeColor(theme.softBorder)
      .moveTo(rightX, sigY).lineTo(rightX + sigLineW, sigY).stroke();
    // Map names: last updater names near signature lines
    const teacherName = (savedRemarkVar?.teacherUpdatedByName || '').toString();
    const principalName = (savedRemarkVar?.principalUpdatedByName || '').toString();
    doc.fillColor('#6b7280').font('Helvetica').fontSize(10)
      .text('Signature — Form Teacher', leftX, sigY + 4, { width: sigLineW });
    if (teacherName) doc.fillColor('#6b7280').font('Helvetica').fontSize(9).text(teacherName, leftX, sigY + 18, { width: sigLineW });
    doc.fillColor('#6b7280').font('Helvetica').fontSize(10)
      .text('Signature — Head/Principal', rightX, sigY + 4, { width: sigLineW });
    if (principalName) doc.fillColor('#6b7280').font('Helvetica').fontSize(9).text(principalName, rightX, sigY + 18, { width: sigLineW });

    doc.end();
    } catch (err) {
      try { res.status(500).json({ message: 'Report generation failed' }); } catch {}
      return;
    }
  }

  @Get('report-card/:studentId/view')
  async reportCardViewer(
    @Param('studentId') studentIdParam: string,
    @Query('term') term: string | undefined,
    @Res() res: Response,
  ) {
    // Resolve either UUID or human StudentID to display a nice title
    let student = await this.students.findOne({ where: { id: studentIdParam } });
    if (!student) student = await this.students.findOne({ where: { studentId: studentIdParam } as any });
    const displayId = student?.studentId || student?.id || studentIdParam;
    const displayName = student ? `${student.firstName} ${student.lastName}` : 'Student';
    const basePdf = new URL(`${(process.env.WEB_BASE_URL || 'http://localhost:3000')}/api/reports/report-card/${studentIdParam}`);
    if (term) basePdf.searchParams.set('term', term);
    const basePdfUrl = basePdf.toString();
    const html = `<!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Report Card — ${displayName} (${displayId})</title>
        <style>
          body{font-family:system-ui,Segoe UI,Arial,sans-serif;background:#f8fafc;margin:0}
          .wrap{max-width:1100px;margin:16px auto;padding:0 12px}
          .controls{display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin-bottom:10px}
          .controls .col{display:grid;gap:6px}
          .controls label{font-weight:600}
          .controls textarea{width:100%;min-height:160px;padding:10px;border:1px solid #e5e7eb;border-radius:8px}
          .bar{display:flex;gap:8px;margin:8px 0}
          .bar button{padding:8px 12px;border:1px solid #0b53a5;border-radius:8px;background:#0b53a5;color:#fff;font-weight:700;cursor:pointer}
          .status{margin-left:8px;color:#6b7280;font-size:12px}
          iframe{width:100%;height:1100px;border:0;background:#fff}
          @media(max-width:840px){.controls{grid-template-columns:1fr}}
        </style>
      </head>
      <body>
        <div class="wrap">
          <h2 style="margin:0 0 10px">${displayName} <span style="color:#6b7280;font-weight:500">(${displayId})</span></h2>
          <div style="margin-bottom:8px;color:#6b7280">Term: ${term || 'All'}</div>
          <div class="controls">
            <div class="col">
              <label for="teacherRemark">Teacher's Remark</label>
              <textarea id="teacherRemark" placeholder="Enter teacher's remark"></textarea>
            </div>
            <div class="col">
              <label for="principalRemark">Head/Principal's Remark</label>
              <textarea id="principalRemark" placeholder="Enter principal's remark"></textarea>
            </div>
          </div>
          <div class="bar">
            <button id="save">Save</button>
            <button id="preview">Preview</button>
            <button id="download">Download</button>
            <button id="prev">Previous</button>
            <button id="next">Next</button>
            <span id="status" class="status"></span>
          </div>
          <iframe id="frame" src="${basePdfUrl}"></iframe>
        </div>
        <script>
          const base = ${JSON.stringify((process.env.WEB_BASE_URL || 'http://localhost:3000') + '/api/reports/report-card/') } + ${JSON.stringify(String(studentIdParam))};
          const term = ${JSON.stringify(term || '')};
          const studentInternalId = ${JSON.stringify((student?.id || ''))};
          const f = document.getElementById('frame');
          const urlWith = ()=>{
            const u = new URL(base);
            if (term) u.searchParams.set('term', term);
            return u.toString();
          };
          const statusEl = document.getElementById('status');
          const teacherEl = document.getElementById('teacherRemark');
          const principalEl = document.getElementById('principalRemark');
          const seq = (()=>{ try { const s = sessionStorage.getItem('report_seq'); return s ? JSON.parse(s).ids || [] : []; } catch { return []; } })();
          const currentId = ${JSON.stringify(String(studentIdParam))};
          const idx = seq.indexOf(currentId);
          function setStatus(t){ statusEl.textContent = t || ''; }
          function authHeaders(){ const t = localStorage.getItem('access_token'); return t ? { 'Authorization': 'Bearer ' + t, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }; }
          async function loadRemarks(){
            try {
              const u = new URL(${JSON.stringify((process.env.WEB_BASE_URL || 'http://localhost:3000') + '/api/reports/remarks')});
              u.searchParams.set('studentId', studentInternalId || currentId);
              if (term) u.searchParams.set('term', term);
              const r = await fetch(u.toString(), { headers: authHeaders() });
              if (!r.ok) return;
              const data = await r.json();
              teacherEl.value = (data?.teacherRemark || '');
              principalEl.value = (data?.principalRemark || '');
            } catch {}
          }
          async function saveRemarks(){
            setStatus('Saving...');
            try {
              const body = { studentId: studentInternalId || currentId, term: term || undefined, teacherRemark: teacherEl.value || undefined, principalRemark: principalEl.value || undefined };
              const r = await fetch(${JSON.stringify((process.env.WEB_BASE_URL || 'http://localhost:3000') + '/api/reports/remarks')}, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) });
              if (!r.ok) { const j = await r.json().catch(()=>({})); setStatus(j?.error || 'Failed to save'); return false; }
              setStatus('Saved');
              return true;
            } catch (e) { setStatus('Failed to save'); return false; }
          }
          document.getElementById('save').onclick = async ()=>{
            const ok = await saveRemarks();
            if (ok) { f.src = urlWith(); }
          };
          document.getElementById('preview').onclick = ()=>{
            f.src = urlWith();
          };
          document.getElementById('download').onclick = ()=>{
            (async ()=>{
              const ok = await saveRemarks();
              const u = new URL(urlWith());
              u.searchParams.set('download','1');
              window.open(u.toString(), '_blank');
            })();
          };
          document.getElementById('prev').onclick = async ()=>{
            if (idx > 0) {
              await saveRemarks();
              const prevId = seq[idx-1];
              const u = new URL(window.location.origin + '/reports/report-card/' + encodeURIComponent(prevId) + '/view');
              if (term) u.searchParams.set('term', term);
              window.location.assign(u.toString());
            }
          };
          document.getElementById('next').onclick = async ()=>{
            if (idx >= 0 && idx < seq.length - 1) {
              await saveRemarks();
              const nextId = seq[idx+1];
              const u = new URL(window.location.origin + '/reports/report-card/' + encodeURIComponent(nextId) + '/view');
              if (term) u.searchParams.set('term', term);
              window.location.assign(u.toString());
            }
          };
          loadRemarks();
        </script>
      </body>
      </html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get('student-id-card/:studentId')
  async studentIdCard(@Param('studentId') studentIdParam: string, @Res() res: Response) {
    // Resolve by UUID or human StudentID
    let student = await this.students.findOne({ where: { id: studentIdParam } });
    if (!student) {
      student = await this.students.findOne({ where: { studentId: studentIdParam } as any });
    }
    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }
    // Determine latest active class
    const enr = await this.enrollRepo.find({ where: { student: { id: student.id } as any, status: 'active' } as any, order: { createdAt: 'DESC' } });
    const klass = enr[0]?.classEntity;
    const classDisplay = klass ? `${klass.name}` : '-';

    // Build QR code with JSON payload including ALL available student details
    const QRCode = require('qrcode');
    const qrPayload = {
      id: student.id,
      studentId: student.studentId ?? null,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email ?? null,
      boardingStatus: student.boardingStatus,
      dob: student.dob ?? null,
      nationality: student.nationality ?? null,
      religion: student.religion ?? null,
      address: student.address ?? null,
      nextOfKin: student.nextOfKin ?? null,
      gender: student.gender ?? null,
      contactNumber: student.contactNumber ?? null,
      class: klass?.name || null,
      academicYear: klass?.academicYear || null,
      createdAt: (student as any).createdAt ? new Date((student as any).createdAt).toISOString() : null,
      updatedAt: (student as any).updatedAt ? new Date((student as any).updatedAt).toISOString() : null,
    } as const;
    const qrData = JSON.stringify(qrPayload);
    let qrBuf: Buffer | null = null;
    try {
      const dataUrl: string = await QRCode.toDataURL(qrData, { margin: 1, width: 200 });
      const base64 = dataUrl.split(',')[1];
      qrBuf = Buffer.from(base64, 'base64');
    } catch {}

    // Create compact ID card PDF
    const doc = new PDFDocument({ size: [320, 200], margin: 10 });
    const chunks: Buffer[] = [];
    (doc as any).on('data', (c: Buffer) => chunks.push(c));
    (doc as any).on('end', () => {
      const pdf = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="student-id-${(student.studentId || student.id).replace(/\s+/g,'-')}.pdf"`);
      res.end(pdf);
    });
    (doc as any).on('error', () => {
      try { res.status(500).json({ message: 'ID card generation failed' }); } catch {}
    });

    // Card frame and header
    doc.roundedRect(5, 5, doc.page.width - 10, doc.page.height - 10, 8).stroke('#cbd5e1');
    doc.fillColor('#111827');
    // Header banner with title
    const bannerH2 = 28;
    doc.save();
    doc.rect(5, 5, doc.page.width - 10, bannerH2).fill('#0b3d91');
    doc.restore();
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#ffffff').text('Student ID Card', 5, 10, { align: 'center', width: doc.page.width - 10 });
    // Logo at left within banner and school name text similar to sample
    try {
      const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
      const logoPath = settings?.logoUrl && !settings.logoUrl.startsWith('http')
        ? (path.isAbsolute(settings.logoUrl) ? settings.logoUrl : path.join(process.cwd(), settings.logoUrl))
        : (settings?.logoUrl && settings.logoUrl.startsWith('http') ? settings.logoUrl : null);
      const schoolName = settings?.schoolName || process.env.SCHOOL_NAME || 'SchoolPro';
      let lx = 12; const ly = 8; const lw = 20; const lh = 20;
      if (logoPath && typeof logoPath === 'string') {
        try { doc.image(logoPath, lx, ly, { width: lw, height: lh, fit: [lw, lh] as any }); } catch {}
      }
      // Remove school name text on banner per request
    } catch {}

    // Layout: Photo at left, details at right
    const leftX = 12; const topY = 40;
    // QR is omitted in the new design
    const rightX = leftX + 100;
    const contentW = doc.page.width - rightX - 12;
    let y = topY;
    // Try to load a passport photo on the right side (70x90)
    const photoCandidates: string[] = [];
    const assetsDir = path.join(process.cwd(), 'assets', 'photos');
    const sidForPhoto = (student.studentId || student.id).toString();
    ['jpg','jpeg','png','webp'].forEach(ext => {
      photoCandidates.push(path.join(assetsDir, `${sidForPhoto}.${ext}`));
      photoCandidates.push(path.join(assetsDir, `${student.id}.${ext}`));
    });
    let photoPath: string | null = null;
    try {
      for (const p of photoCandidates) { if (fs.existsSync(p)) { photoPath = p; break; } }
    } catch {}
    const photoW = 80, photoH = 100;
    if (photoPath) {
      const photoX = leftX; // place photo on the left
      try { doc.image(photoPath, photoX, topY, { width: photoW, height: photoH, fit: [photoW, photoH] as any }); } catch {}
      // Keep space under photo clean (no text) to match requested layout
    }
    const draw = (lab: string, val: string, big = false) => {
      // Two-column label:value with colon (bold black for both)
      const sLabelW = 70;
      const sValueW = Math.max(60, contentW - sLabelW - 6);
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text(lab + ' :', rightX, y, { width: sLabelW, ellipsis: true });
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(big ? 12 : 10)
        .text(val, rightX + sLabelW + 4, y - 2, { width: sValueW, ellipsis: true });
      y += big ? 16 : 13;
    };
    // Right-side labeled fields like sample
    const fullName2 = `${student.firstName} ${student.lastName}`.trim();
    // Dark blue values with subtle dividers
    const sLabelW = 70; const sValueW = Math.max(60, contentW - sLabelW - 6);
    const darkBlue = '#0b3d91';
    // Name
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('Name :', rightX, y, { width: sLabelW, ellipsis: true });
    doc.fillColor(darkBlue).font('Helvetica-Bold').fontSize(12)
      .text(fullName2, rightX + sLabelW + 4, y - 2, { width: sValueW, ellipsis: true });
    y += 16;
    doc.save(); doc.strokeColor('#e5e7eb').lineWidth(0.6)
      .moveTo(rightX, y + 2).lineTo(rightX + sLabelW + sValueW + 4, y + 2).stroke(); doc.restore();
    // Student ID
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('Student ID :', rightX, y + 6, { width: sLabelW, ellipsis: true });
    doc.fillColor(darkBlue).font('Helvetica-Bold').fontSize(12)
      .text(`${student.studentId || student.id}`, rightX + sLabelW + 4, y + 4, { width: sValueW, ellipsis: true });
    y += 16 + 6;
    doc.save(); doc.strokeColor('#e5e7eb').lineWidth(0.6)
      .moveTo(rightX, y + 2).lineTo(rightX + sLabelW + sValueW + 4, y + 2).stroke(); doc.restore();
    // Continue other fields with dark blue values and Address after Class
    // D.O.B (dark blue)
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('D.O.B :', rightX, y + 6, { width: sLabelW, ellipsis: true });
    doc.fillColor(darkBlue).font('Helvetica-Bold').fontSize(10)
      .text(student.dob ? String(student.dob) : '-', rightX + sLabelW + 4, y + 4, { width: sValueW, ellipsis: true });
    y += 16 + 6;
    // Class (dark blue)
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('Class :', rightX, y + 6, { width: sLabelW, ellipsis: true });
    doc.fillColor(darkBlue).font('Helvetica-Bold').fontSize(10)
      .text(classDisplay, rightX + sLabelW + 4, y + 4, { width: sValueW, ellipsis: true });
    y += 16 + 6;
    // Address (dark blue), placed after Class
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('Address :', rightX, y + 6, { width: sLabelW, ellipsis: true });
    doc.fillColor(darkBlue).font('Helvetica-Bold').fontSize(10)
      .text(student.address || '-', rightX + sLabelW + 4, y + 4, { width: sValueW, ellipsis: true });
    // Year: two lines after Address, aligned like other labels (label/value columns)
    y += 16 + 6; // advance one line after Address
    y += 6;      // second line spacing
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('Year :', rightX, y + 6, { width: sLabelW, ellipsis: true });
    doc.fillColor(darkBlue).font('Helvetica-Bold').fontSize(10)
      .text(klass?.academicYear || '-', rightX + sLabelW + 4, y + 4, { width: sValueW, ellipsis: true });
    y += 16 + 6;

    // QR code at bottom-left storing student data (smaller and nudged right)
    try {
      if (qrBuf) {
        const qrSize = 44;
        const qrX = 18;
        const qrY = doc.page.height - qrSize - 24;
        try { doc.image(qrBuf, qrX, qrY, { width: qrSize, height: qrSize, fit: [qrSize, qrSize] as any }); } catch {}
      }
    } catch {}

    // Year footer removed per request; year is now shown near details

    // Dark blue footer line (non-overlapping)
    try {
      const pad = 6; // padding from edges and bottom to avoid overlap
      const yLine = doc.page.height - pad;
      doc.save();
      doc.strokeColor('#0b3d91').lineWidth(2)
        .moveTo(pad, yLine)
        .lineTo(doc.page.width - pad, yLine)
        .stroke();
      doc.restore();
    } catch {}

    doc.end();
  }

  // Honours Roll by Grade (+ optional Stream) — JSON
  // Required: gradeLevel, term, examType
  // Optional: academicYear, stream (e.g., Blue, White, Gold, Brown, Camel)
  // If stream is omitted, rank all students in the grade (all streams)
  @Get('honours-roll/grade/json')
  async honoursByGradeJson(
    @Query('gradeLevel') gradeLevel: string,
    @Query('term') term: string,
    @Query('examType') examType: string,
    @Query('academicYear') academicYear?: string,
    @Query('stream') stream?: string,
    @Res() res?: Response,
  ) {
    if (!gradeLevel || !term || !examType) {
      try { res?.status(400).json({ error: 'gradeLevel, term and examType are required' }); } catch {}
      return;
    }
    const detectStream = (name: string | null | undefined): string | null => {
      if (!name) return null;
      const m = /(Blue|White|Gold|Brown|Camel)/i.exec(name);
      return m ? (m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()) : null;
    };

    // Normalize examType (empty string treated as undefined)
    const exRaw = (examType ?? '').toString();
    const ex = exRaw.trim().length ? exRaw.trim() : undefined;
    // Load all marks for the term (contains match) with resilient examType handling
    let all: Mark[] = [] as any;
    if (ex) {
      // 1) Exact examType
      const w1: any = { session: Like(`%${term}%`), examType: ex };
      all = await this.marks.find({ where: w1 });
      // 2) If none, try NULL examType rows
      if (!all.length) {
        const w2: any = { session: Like(`%${term}%`), examType: IsNull() as any };
        all = await this.marks.find({ where: w2 });
      }
      // 3) If still none, ignore examType
      if (!all.length) {
        const w3: any = { session: Like(`%${term}%`) };
        all = await this.marks.find({ where: w3 });
      }
    } else {
      // No examType provided: match any
      const w: any = { session: Like(`%${term}%`) };
      all = await this.marks.find({ where: w });
    }

    // Filter to selected grade (and academicYear if provided), and optional stream
    const cohort = all.filter(m => {
      const k = (m as any).klass as any; if (!k) return false;
      const glK = (k.gradeLevel ?? '').toString().trim().toLowerCase();
      const glQ = (gradeLevel ?? '').toString().trim().toLowerCase();
      if (glK !== glQ) return false;
      if (academicYear) {
        const ayK = (k.academicYear ?? '').toString().trim().toLowerCase();
        const ayQ = (academicYear ?? '').toString().trim().toLowerCase();
        if (ayK !== ayQ) return false;
      }
      if (stream) {
        const s = detectStream(k.name);
        if (!s || s.toLowerCase() !== stream.toLowerCase()) return false;
      }
      return true;
    });

    // Aggregate per student average across subjects and grade counts
    const agg = new Map<string, { name: string; studentId: string; sum: number; n: number }>();
    const gCounts = new Map<string, { A: number; B: number; C: number; D: number; E: number; U: number }>();
    const gradeFor = (scoreNum: number) => {
      if (scoreNum >= 80) return 'A';
      if (scoreNum >= 70) return 'B';
      if (scoreNum >= 60) return 'C';
      if (scoreNum >= 50) return 'D';
      if (scoreNum >= 40) return 'E';
      return 'U';
    };
    cohort.forEach(m => {
      const st = (m as any).student; if (!st?.id) return;
      const key = st.id as string;
      let rec = agg.get(key);
      if (!rec) rec = { name: `${st.firstName || ''} ${st.lastName || ''}`.trim(), studentId: st.studentId || st.id, sum: 0, n: 0 };
      const val = Number(m.score); if (!isNaN(val)) { rec.sum += val; rec.n += 1; }
      agg.set(key, rec);
      const g = gradeFor(val);
      const gc = gCounts.get(key) || { A:0, B:0, C:0, D:0, E:0, U:0 };
      (gc as any)[g] = (gc as any)[g] + 1;
      gCounts.set(key, gc);
    });

    const baseRows = Array.from(agg.entries())
      .filter(([, r]) => r.n > 0)
      .map(([id, r]) => {
        const c = gCounts.get(id) || { A:0, B:0, C:0, D:0, E:0, U:0 };
        return { id, name: r.name, studentId: r.studentId, total: r.sum, count: r.n, avg: r.sum / r.n, A: c.A, B: c.B, C: c.C, D: c.D, E: c.E, U: c.U };
      });

    // Group by stream when stream param is not specified
    const groupsOut: Record<string, any[]> = {};
    if (!stream) {
      // Build map of studentId -> stream from cohort
      const streamByStudent = new Map<string, string | null>();
      cohort.forEach(m => {
        const st = (m as any).student; const k = (m as any).klass as any; if (!st?.id || !k) return;
        const s = detectStream(k.name);
        if (!streamByStudent.has(st.id)) streamByStudent.set(st.id, s);
      });
      const buckets = new Map<string, any[]>();
      baseRows.forEach(r => {
        const sid = r.id; const s = streamByStudent.get(sid) || null;
        const key = s ? `${gradeLevel} ${s}` : `${gradeLevel} — Unknown Stream`;
        const arr = buckets.get(key) || [];
        arr.push(r);
        buckets.set(key, arr);
      });
      // Sort each bucket by avg desc and assign
      buckets.forEach((arr, key) => {
        arr.sort((a, b) => b.avg - a.avg);
        groupsOut[key] = arr;
      });
    } else {
      const key = `${gradeLevel} ${stream}`;
      groupsOut[key] = baseRows.sort((a, b) => b.avg - a.avg);
    }

    // Load settings for school name/address
    let schoolName = 'SchoolPro'; let schoolAddress = ''; let logoUrlOut = '';
    try {
      const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
      if (settings?.schoolName) schoolName = settings.schoolName;
      if (settings?.schoolAddress) schoolAddress = settings.schoolAddress;
      const baseWeb = (process.env.WEB_BASE_URL || 'http://localhost:3000').toString().replace(/\/$/, '');
      const rawLogo = (settings as any)?.logoUrl as string | undefined;
      if (rawLogo && /^https?:\/\//i.test(rawLogo)) logoUrlOut = rawLogo;
      else if (rawLogo && typeof rawLogo === 'string') {
        const p = rawLogo.startsWith('/') ? rawLogo.slice(1) : rawLogo;
        logoUrlOut = `${baseWeb}/${p}`;
      } else {
        logoUrlOut = `${baseWeb}/assets/logo.png`;
      }
    } catch {}

    try {
      res?.json({ term, examType, gradeLevel, academicYear: academicYear || null, stream: stream || null, schoolName, schoolAddress, logoUrl: logoUrlOut, groups: groupsOut });
    } catch {}
  }

  // Honours Roll by Grade (+ optional Stream) — CSV
  @Get('honours-roll/grade/csv')
  async honoursByGradeCsv(
    @Query('gradeLevel') gradeLevel: string,
    @Query('term') term: string,
    @Query('examType') examType: string,
    @Query('academicYear') academicYear?: string,
    @Query('stream') stream?: string,
    @Res() res?: Response,
  ) {
    const chunks: any[] = []; let statusSent = false;
    const fakeRes: any = { json: (data: any) => chunks.push(data), status: (_: number) => ({ json: (o: any) => { statusSent = true; chunks.push(o); } }) };
    await this.honoursByGradeJson(gradeLevel, term, examType, academicYear, stream, fakeRes as any);
    if (statusSent) { const obj = chunks[0]; try { res?.status(400).json(obj); } catch {} return; }
    const data = chunks[0] || {};
    const schoolName = (data.schoolName || 'SchoolPro').toString();
    const schoolAddress = (data.schoolAddress || '').toString();
    const title = `Honours Roll — ${gradeLevel} — ${term}${academicYear ? ' — ' + academicYear : ''}`;
    const lines: string[] = [
      schoolName,
      schoolAddress ? schoolAddress : '',
      title,
      '' ,
      'Group,Rank,Student,Code,Average,Total'
    ];
    const groups: Record<string, Array<{ name:string; studentId:string; avg:number; total:number; A:number; B:number; C:number; D:number; E:number; U:number }>> = data.groups || {};
    Object.keys(groups).forEach(g => {
      (groups[g] || []).forEach((r, i) => lines.push([g, String(i+1), r.name, r.studentId, (r.avg ?? 0).toFixed(1), (r.total ?? 0).toFixed(0), String(r.A||0), String(r.B||0), String(r.C||0), String(r.D||0), String(r.E||0), String(r.U||0)].join(',')));
    });
    const csv = lines.join('\n') + '\n';
    try {
      res?.setHeader('Content-Type', 'text/csv');
      res?.setHeader('Content-Disposition', `attachment; filename="honours-grade-${gradeLevel}-${term}${stream ? '-' + stream : ''}.csv"`);
      res?.send(csv);
    } catch {}
  }

  // Parent-protected access. Validates that the authenticated parent is linked to the student.
  @UseGuards(BearerGuard)
  @Get('parent/report-card/:studentId')
  async parentReportCard(@Req() req: any, @Param('studentId') studentIdParam: string, @Query('term') term: string | undefined, @Res() res: Response) {
    const role = (req.user?.role || '').toLowerCase();
    if (role !== 'parent') throw new ForbiddenException('Parents only');
    // Resolve to student UUID if provided as human code
    let student = await this.students.findOne({ where: { id: studentIdParam } });
    if (!student) student = await this.students.findOne({ where: { studentId: studentIdParam } as any });
    if (!student) { res.status(404).json({ message: 'Student not found' }); return; }
    console.log('[DEBUG] Parent report card access - parentId:', req.user.sub, 'studentId:', student.id);
    const linked = await this.parentsSvc.isLinked(req.user.sub, student.id);
    console.log('[DEBUG] isLinked result:', linked);
    if (!linked) throw new ForbiddenException('You are not linked to this student');
    // Delegate to normal report generator
    return this.reportCard(req, student.id, term, res);
  }

  // Admin-triggered publish: notify parents that results are available
  @Put('publish')
  async publish(@Body() body: { term: string; classId?: string; suppressArrears?: boolean }) {
    const term = body?.term;
    if (!term) return { ok: false, error: 'term is required' };
    // Determine affected students (use partial match to account for sessions like "2025 Term 1")
    const where: any = { session: Like(`%${term}%`) };
    if (body.classId) where.klass = { id: body.classId } as any;
    const marks = await this.marks.find({ where });
    let studentIds = Array.from(new Set(marks.map(m => (m as any).student?.id).filter(Boolean)));
    // Fallback: if no marks found for the provided term, but a classId was specified, notify parents of all currently enrolled students in that class
    if ((!studentIds.length) && body.classId) {
      try {
        const enrols = await this.enrollRepo.find({ where: { classEntity: { id: body.classId } } as any, relations: ['student'] });
        studentIds = Array.from(new Set(enrols.map(e => (e as any)?.student?.id).filter(Boolean)));
      } catch {}
    }
    if (!studentIds.length) return { ok: true, sent: 0, suppressed: 0, withheld: 0 };
    // Enforce remarks completeness: require teacher & principal remarks and status 'ready_for_pdf'
    let withheld = 0;
    const eligibleByRemarks: string[] = [];
    for (const sid of studentIds) {
      try {
        const rem = await this.remarksRepo.findOne({ where: { studentId: sid, term: Like(`%${term}%`) } as any });
        const teacherOk = !!(rem?.teacherRemark && rem.teacherRemark.toString().trim().length > 0);
        const principalOk = !!(rem?.principalRemark && rem.principalRemark.toString().trim().length > 0);
        const statusOk = (rem?.status || '').toString() === 'ready_for_pdf';
        if (teacherOk && principalOk && statusOk) eligibleByRemarks.push(sid); else withheld++;
      } catch { withheld++; }
    }
    // Apply arrears suppression if requested
    let suppressed = 0;
    let finalIds: string[] = eligibleByRemarks;
    if (body?.suppressArrears) {
      const okIds: string[] = [];
      for (const sid of eligibleByRemarks) {
        try {
          const bal = await this.accounts.getStudentBalanceById(sid);
          if (Number(bal?.balance) > 0) { suppressed++; } else { okIds.push(sid); }
        } catch { okIds.push(sid); }
      }
      finalIds = okIds;
    }
    if (!finalIds.length) return { ok: true, sent: 0, suppressed, withheld };
    const emails = await this.parentsSvc.parentEmailsForStudents(finalIds);
    if (!emails.length) return { ok: true, sent: 0, suppressed, withheld };
    // When requested, compute how many will be suppressed on the Parent Portal due to arrears
    const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
    const schoolName = settings?.schoolName || process.env.SCHOOL_NAME || 'SchoolPro';
    const subject = `${schoolName}: Results published for ${term}`;
    const html = `<p>Dear Parent/Guardian,</p>
      <p>Results for <strong>${term}</strong> have been published.</p>
      <p>Please log in to the Parent Portal to view your ward's report card.</p>
      <p><a href="http://localhost:4200/parent/login">Open Parent Portal</a></p>
      <p>Regards,<br/>${schoolName}</p>`;
    await this.email.send(emails, subject, html);
    return { ok: true, sent: emails.length, suppressed, withheld };
  }

  // Marksheet export: PDF (landscape)
  @Get('marksheet/pdf')
  async marksheetPdf(@Query('classId') classId: string, @Query('term') term: string, @Res() res: Response) {
    if (!classId || !term) { res.status(400).json({ message: 'classId and term are required' }); return; }
    // Gather subjects written in this class for the term
    const classMarks = await this.marks.find({ where: { klass: { id: classId } as any, session: term } as any });
    const subjects: Array<{ id: string; code: string; name: string }> = [];
    const subjMap = new Map<string, { id: string; code: string; name: string }>();
    classMarks.forEach(m => {
      const s = (m as any).subject; if (!s?.id) return;
      if (!subjMap.has(s.id)) subjMap.set(s.id, { id: s.id, code: s.code || s.name || 'SUBJ', name: s.name || s.code || s.id });
    });
    subjMap.forEach(v => subjects.push(v));
    subjects.sort((a,b)=> (a.code||a.name).localeCompare(b.code||b.name));
    // Students: include actively enrolled + anyone who has marks
    const enr = await this.enrollRepo.find({ where: { classEntity: { id: classId } as any } as any });
    const studentIds = new Set<string>(enr.map(e => (e as any)?.student?.id).filter(Boolean) as string[]);
    classMarks.forEach(m => { const sid = (m as any).student?.id; if (sid) studentIds.add(sid); });
    const students: Array<{ id: string; studentId: string; name: string }> = [];
    for (const sid of Array.from(studentIds)) {
      const st = await this.students.findOne({ where: { id: sid } });
      if (st) students.push({ id: st.id, studentId: st.studentId || st.id, name: `${st.firstName} ${st.lastName}` });
    }
    students.sort((a,b)=> a.name.localeCompare(b.name));
    // Build score map (keep first occurrence which is effectively latest given dedupe earlier at UI)
    const map = new Map<string, Map<string, string>>(); // studentId -> subjId -> score
    students.forEach(s => map.set(s.id, new Map<string, string>()));
    classMarks.forEach(m => {
      const sid = (m as any).student?.id as string | undefined;
      const subId = (m as any).subject?.id as string | undefined;
      if (!sid || !subId) return;
      const row = map.get(sid); if (!row) return;
      if (!row.has(subId)) row.set(subId, String(m.score));
    });
    // Render PDF
    const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
    const doc = new PDFDocument({ margin: 24, layout: 'landscape' as any });
    const chunks: Buffer[] = [];
    (doc as any).on('data', (c: Buffer) => chunks.push(c));
    (doc as any).on('end', () => {
      const pdf = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="marksheet-${classId}-${term}.pdf"`);
      res.end(pdf);
    });
    (doc as any).on('error', () => { try { res.status(500).json({ message: 'Export failed' }); } catch {} });
    const theme = { text: '#111827', muted: '#6b7280', border: '#e5e7eb', headerBg: '#f3f4f6' } as const;
    // Header
    const schoolName = settings?.schoolName || 'SchoolPro';
    doc.font('Helvetica-Bold').fontSize(16).fillColor(theme.text).text(`${schoolName} — Mark Sheet`, { align: 'center' });
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(11).fillColor(theme.muted).text(`Class: ${classId}   Term: ${term}`, { align: 'center' });
    doc.moveDown(0.6);
    // Table header
    const x = doc.page.margins.left; const y0 = doc.y; const tableW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colNameW = 140; const colCodeW = 110; const remaining = tableW - colNameW - colCodeW; const colSubW = Math.max(60, Math.floor(remaining / Math.max(1, subjects.length + 3)));
    doc.save(); doc.rect(x, y0, tableW, 22).fill(theme.headerBg); doc.restore();
    let cx = x + 6; const cy = y0 + 6;
    // Student ID first, then Full Name
    doc.font('Helvetica-Bold').fontSize(10).fillColor(theme.text).text('Student ID', cx, cy, { width: colCodeW }); cx += colCodeW;
    doc.text('Full Name', cx, cy, { width: colNameW }); cx += colNameW;
    for (const s of subjects) { doc.text(s.code || s.name, cx, cy, { width: colSubW }); cx += colSubW; }
    doc.text('Total', cx, cy, { width: colSubW }); cx += colSubW;
    doc.text('Average', cx, cy, { width: colSubW }); cx += colSubW;
    doc.text('Passed', cx, cy, { width: colSubW });
    doc.moveTo(x, y0).lineTo(x + tableW, y0).strokeColor(theme.border).stroke();
    let ty = y0 + 22;
    // Rows
    students.forEach((s, idx) => {
      const rowH = 18;
      if (idx % 2 === 0) { doc.save(); doc.rect(x, ty, tableW, rowH).fill('#fafafa'); doc.restore(); }
      doc.lineWidth(0.5).strokeColor(theme.border).rect(x, ty, tableW, rowH).stroke();
      let cx2 = x + 6; const cy2 = ty + 4; let total = 0; let count = 0; let passed = 0;
      const sidDisplay = (s as any).studentId || (s as any).code || (s as any).id || '';
      // Student ID first, then Full Name
      doc.font('Helvetica').fillColor(theme.text).fontSize(9).text(String(sidDisplay), cx2, cy2, { width: colCodeW }); cx2 += colCodeW;
      doc.text(s.name, cx2, cy2, { width: colNameW }); cx2 += colNameW;
      const row = map.get(s.id)!;
      for (const subj of subjects) {
        const v = row.get(subj.id); const num = v != null ? Number(v) : NaN;
        if (!isNaN(num)) { total += num; count += 1; if (num >= 50) passed += 1; }
        doc.text(v != null ? String(v) : '-', cx2, cy2, { width: colSubW }); cx2 += colSubW;
      }
      doc.text(total ? total.toFixed(0) : '-', cx2, cy2, { width: colSubW }); cx2 += colSubW;
      const avg = count ? (total / count) : NaN;
      doc.text(!isNaN(avg) ? avg.toFixed(1) : '-', cx2, cy2, { width: colSubW }); cx2 += colSubW;
      doc.text(count ? String(passed) : '-', cx2, cy2, { width: colSubW });
      ty += rowH;
      if (ty > doc.page.height - doc.page.margins.bottom - 30) { doc.addPage({ layout: 'landscape' as any }); ty = doc.page.margins.top; }
    });
    doc.end();
  }

  // Marksheet export: CSV (Excel friendly)
  @Get('marksheet/csv')
  async marksheetCsv(@Query('classId') classId: string, @Query('term') term: string, @Res() res: Response) {
    if (!classId || !term) { res.status(400).json({ message: 'classId and term are required' }); return; }
    const classMarks = await this.marks.find({ where: { klass: { id: classId } as any, session: term } as any });
    const subjMap = new Map<string, { id: string; code: string; name: string }>();
    classMarks.forEach(m => { const s = (m as any).subject; if (s?.id && !subjMap.has(s.id)) subjMap.set(s.id, { id: s.id, code: s.code || s.name || 'SUBJ', name: s.name || s.code || s.id }); });
    const subjects = Array.from(subjMap.values()).sort((a,b)=> (a.code||a.name).localeCompare(b.code||b.name));
    const enr = await this.enrollRepo.find({ where: { classEntity: { id: classId } as any } as any });
    const studentIds = new Set<string>(enr.map(e => (e as any)?.student?.id).filter(Boolean) as string[]);
    classMarks.forEach(m => { const sid = (m as any).student?.id; if (sid) studentIds.add(sid); });
    const students: Array<{ id: string; studentId: string; name: string }> = [];
    for (const sid of Array.from(studentIds)) {
      const st = await this.students.findOne({ where: { id: sid } });
      if (st) students.push({ id: st.id, studentId: st.studentId || st.id, name: `${st.firstName} ${st.lastName}` });
    }
    students.sort((a,b)=> a.name.localeCompare(b.name));
    const map = new Map<string, Map<string, string>>(); students.forEach(s => map.set(s.id, new Map<string, string>()));
    classMarks.forEach(m => { const sid = (m as any).student?.id; const subId = (m as any).subject?.id; if (sid && subId) { const row = map.get(sid)!; if (!row.has(subId)) row.set(subId, String(m.score)); } });
    // CSV
    const header = ['Student', 'Student ID', ...subjects.map(s => s.code || s.name), 'Total', 'Average', 'Passed'];
    const lines: string[] = [header.join(',')];
    students.forEach(s => {
      const row = map.get(s.id)!; let total = 0; let count = 0; let passed = 0; const vals: string[] = [];
      subjects.forEach(sub => { const v = row.get(sub.id); if (v != null && v !== '') { const n = Number(v); if (!isNaN(n)) { total += n; count++; if (n >= 50) passed++; } } vals.push(v ?? ''); });
      const avg = count ? (total / count).toFixed(1) : '';
      lines.push([s.name.replace(/,/g,' '), s.studentId, ...vals, total ? total.toFixed(0) : '', avg, count ? String(passed) : ''].join(','));
    });
    const csv = lines.join('\n') + '\n';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="marksheet-${classId}-${term}.csv"`);
    res.send(csv);
  }

  // Marksheet data: JSON for preview (subjects, students, scores)
  @Get('marksheet/json')
  async marksheetJson(@Query('classId') classId: string, @Query('term') term: string) {
    if (!classId || !term) return { error: 'classId and term are required' };
    const classMarks = await this.marks.find({ where: { klass: { id: classId } as any, session: term } as any });
    const subjMap = new Map<string, { id: string; code: string; name: string }>();
    classMarks.forEach(m => { const s = (m as any).subject; if (s?.id && !subjMap.has(s.id)) subjMap.set(s.id, { id: s.id, code: s.code || s.name || 'SUBJ', name: s.name || s.code || s.id }); });
    const subjects = Array.from(subjMap.values()).sort((a,b)=> (a.code||a.name).localeCompare(b.code||b.name));
    const enr = await this.enrollRepo.find({ where: { classEntity: { id: classId } as any } as any });
    const studentIds = new Set<string>(enr.map(e => (e as any)?.student?.id).filter(Boolean) as string[]);
    classMarks.forEach(m => { const sid = (m as any).student?.id; if (sid) studentIds.add(sid); });
    const students: Array<{ id: string; code: string; name: string }> = [];
    for (const sid of Array.from(studentIds)) {
      const st = await this.students.findOne({ where: { id: sid } });
      if (st) students.push({ id: st.id, code: st.studentId || st.id, name: `${st.firstName} ${st.lastName}` });
    }
    students.sort((a,b)=> a.name.localeCompare(b.name));
    const scores: Record<string, Record<string, string>> = {};
    const passed: Record<string, number> = {};
    students.forEach(s => scores[s.id] = {});
    classMarks.forEach(m => { const sid = (m as any).student?.id; const subId = (m as any).subject?.id; if (sid && subId && scores[sid] && scores[sid][subId] == null) scores[sid][subId] = String(m.score); });
    // compute passed counts per student (>=50)
    students.forEach(s => {
      let cnt = 0; const row = scores[s.id] || {};
      Object.keys(row).forEach(k => { const n = Number(row[k]); if (!isNaN(n) && n >= 50) cnt++; });
      passed[s.id] = cnt;
    });
    return { classId, term, subjects, students, scores, passed, passMark: 50 };
  }

  // Honours Roll: JSON (top N by average for a class and term)
  @Get('honours-roll/json')
  async honoursJson(@Query('classId') classId: string, @Query('term') term: string, @Query('topN') topNStr: string | undefined, @Res() res: Response) {
    if (!classId || !term) { res.status(400).json({ error: 'classId and term are required' }); return; }
    const topN = topNStr ? Math.max(1, Number(topNStr) || 0) : 0;
    const classMarks = await this.marks.find({ where: { klass: { id: classId } as any, session: term } as any });
    // Aggregate per student
    const agg = new Map<string, { name: string; code: string; sum: number; n: number }>();
    const gCounts = new Map<string, { A: number; B: number; C: number; D: number; E: number; U: number }>();
    const gradeFor = (scoreNum: number) => {
      if (scoreNum >= 80) return 'A';
      if (scoreNum >= 70) return 'B';
      if (scoreNum >= 60) return 'C';
      if (scoreNum >= 50) return 'D';
      if (scoreNum >= 40) return 'E';
      return 'U';
    };
    classMarks.forEach(m => {
      const st = (m as any).student; if (!st?.id) return;
      const key = st.id as string;
      let rec = agg.get(key);
      if (!rec) { rec = { name: `${st.firstName || ''} ${st.lastName || ''}`.trim(), code: st.studentId || st.id, sum: 0, n: 0 }; agg.set(key, rec); }
      const val = Number(m.score); if (!isNaN(val)) { rec.sum += val; rec.n += 1; }
      const g = gradeFor(val);
      const gc = gCounts.get(key) || { A:0, B:0, C:0, D:0, E:0, U:0 };
      (gc as any)[g] = (gc as any)[g] + 1;
      gCounts.set(key, gc);
    });
    const rows = Array.from(agg.entries())
      .filter(([,r]) => r.n > 0)
      .map(([id, r]) => {
        const c = gCounts.get(id) || { A:0, B:0, C:0, D:0, E:0, U:0 };
        return { id, name: r.name, studentId: r.code, total: r.sum, count: r.n, avg: r.sum / r.n, A: c.A, B: c.B, C: c.C, D: c.D, E: c.E, U: c.U };
      });
    rows.sort((a,b) => b.avg - a.avg);
    const limited = topN > 0 ? rows.slice(0, topN) : rows;
    // Group label = class name
    const klass = (classMarks[0] as any)?.klass;
    const groupKey = klass?.name || 'Class';
    const grouped: Record<string, typeof limited> = { [groupKey]: limited };
    res.json({ classId, term, groups: grouped });
  }

  // Honours Roll: CSV (Excel-friendly)
  @Get('honours-roll/csv')
  async honoursCsv(@Query('classId') classId: string, @Query('term') term: string, @Query('topN') topNStr: string | undefined, @Res() res: Response) {
    const chunks: any[] = []; let statusSent = false;
    const fakeRes: any = { json: (data: any) => chunks.push(data), status: (_: number) => ({ json: (o: any) => { statusSent = true; chunks.push(o); } }) };
    await this.honoursJson(classId, term, topNStr, fakeRes as any);
    if (statusSent) { const obj = chunks[0]; res.status(400).json(obj); return; }
    const data = chunks[0] || {};
    const lines: string[] = ['Group,Rank,Student,Student ID,Average,Total,As,Bs,Cs,Ds,Es,Us'];
    const groups: Record<string, Array<{ name:string; studentId:string; avg:number; total:number; A:number; B:number; C:number; D:number; E:number; U:number }>> = data.groups || {};
    Object.keys(groups).forEach(g => {
      (groups[g] || []).forEach((r, i) => lines.push([g, String(i+1), r.name, r.studentId, (r.avg ?? 0).toFixed(1), (r.total ?? 0).toFixed(0), String(r.A||0), String(r.B||0), String(r.C||0), String(r.D||0), String(r.E||0), String(r.U||0)].join(',')));
    });
    const csv = lines.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="honours-roll-${classId}-${term}.csv"`);
    res.end(csv);
  }

  // Honours Roll: PDF
  @Get('honours-roll/pdf')
  async honoursPdf(@Query('classId') classId: string, @Query('term') term: string, @Query('topN') topNStr: string | undefined, @Res() res: Response) {
    if (!classId || !term) { res.status(400).json({ message: 'classId and term are required' }); return; }
    const chunks: any[] = []; const fakeRes: any = { json: (data: any) => chunks.push(data), status: (_: number) => ({ json: (o: any) => chunks.push(o) }) };
    await this.honoursJson(classId, term, topNStr, fakeRes as any);
    const data = chunks[0] || {};
    const groups: Record<string, Array<{ name:string; code:string; avg:number; total:number }>> = data.groups || {};

    const doc = new PDFDocument({ margin: 28 });
    const out: Buffer[] = [];
    (doc as any).on('data', (c: Buffer) => out.push(c));
    (doc as any).on('end', () => {
      const pdf = Buffer.concat(out);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="honours-roll-${classId}-${term}.pdf"`);
      res.end(pdf);
    });
    // Header banner with logo and school details
    try {
      const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
      const bannerH = 60; const startY = 0;
      doc.save();
      doc.rect(0, startY, doc.page.width, bannerH).fill('#0b3d91');
      doc.restore();
      try {
        const buf = await this.fetchImageBuffer(settings?.logoUrl || '');
        if (buf) doc.image(buf, 16, startY + 8, { width: 130, height: bannerH - 16, fit: [130, bannerH - 16] as any });
      } catch {}
      const schoolName = settings?.schoolName || 'SchoolPro';
      const schoolAddress = settings?.schoolAddress || '';
      doc.font('Helvetica-Bold').fillColor('#ffffff').fontSize(14).text(schoolName, 0, startY + 6, { align: 'center', width: doc.page.width });
      if (schoolAddress) doc.font('Helvetica').fillColor('#ffffff').fontSize(10).text(schoolAddress, 0, startY + 24, { align: 'center', width: doc.page.width });
      doc.y = bannerH + 12;
    } catch {}
    doc.font('Helvetica-Bold').fillColor('#111827').fontSize(18).text('Honours Roll', { align: 'center' });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(11).text(`Class: ${classId}   Term: ${term}`, { align: 'center' });
    doc.moveDown(0.6);
    Object.keys(groups).forEach(group => {
      const rows = groups[group] || [];
      doc.font('Helvetica-Bold').fontSize(13).text(group);
      const tableX = doc.page.margins.left; const colW = { idx: 26, name: 200, code: 110, avg: 60, total: 60, g: 36 } as const;
      let y = doc.y + 4; const rowH = 20; const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      doc.save(); doc.rect(tableX, y, w, rowH).fill('#f3f4f6'); doc.restore();
      doc.font('Helvetica-Bold').fontSize(10);
      let x = tableX + 8;
      doc.text('Position', x, y + 6, { width: colW.idx }); x += colW.idx;
      doc.text('Student', x, y + 6, { width: colW.name }); x += colW.name;
      doc.text('Student ID', x, y + 6, { width: colW.code }); x += colW.code;
      doc.text('Avg', x, y + 6, { width: colW.avg }); x += colW.avg;
      doc.text('Total', x, y + 6, { width: colW.total }); x += colW.total;
      // Grade counts
      ;['A','B','C','D','E','U'].forEach(lbl => { doc.text(lbl, x, y + 6, { width: colW.g }); x += colW.g; });
      y += rowH;
      rows.forEach((r, i) => {
        doc.font('Helvetica').fontSize(10);
        let cx = tableX + 8;
        doc.text(String(i+1), cx, y + 6, { width: colW.idx }); cx += colW.idx;
        doc.text(r.name, cx, y + 6, { width: colW.name }); cx += colW.name;
        doc.text((r as any).studentId || (r as any).code, cx, y + 6, { width: colW.code }); cx += colW.code;
        doc.text((r.avg ?? 0).toFixed(1), cx, y + 6, { width: colW.avg }); cx += colW.avg;
        doc.text((r.total ?? 0).toFixed(0), cx, y + 6, { width: colW.total }); cx += colW.total;
        ;['A','B','C','D','E','U'].forEach(lbl => { const v = (r as any)[lbl] ?? 0; doc.text(String(v), cx, y + 6, { width: colW.g }); cx += colW.g; });
        y += rowH;
      });
      doc.moveDown(1);
    });
    doc.end();
  }

  @UseGuards(BearerGuard)
  @Get('remarks/debug/:studentId')
  async debugRemarks(@Param('studentId') studentId: string) {
    console.log('🔍 Debug: Fetching ALL remarks for student:', studentId);
    const all = await this.remarksRepo.find({ where: { studentId }, order: { updatedAt: 'DESC' as any } });
    console.log('📊 Found', all.length, 'record(s)');
    return all.map(r => ({
      id: r.id,
      term: r.term,
      examType: r.examType,
      teacherRemark: r.teacherRemark?.substring(0, 50) + '...',
      principalRemark: r.principalRemark?.substring(0, 50) + '...',
      status: r.status,
      updatedAt: r.updatedAt
    }));
  }

  @UseGuards(BearerGuard)
  @Get('remarks')
  async getRemarks(@Query('studentId') studentId: string, @Query('term') term?: string, @Query('examType') examType?: string) {
    console.log('📖 getRemarks called:', { studentId, term, examType });
    if (!studentId) return {};
    
    let rec: ReportRemark | null = null;
    
    if (term) {
      // Use LIKE to match term (same as PDF generation and parent check)
      const candidates = await this.remarksRepo.find({ 
        where: { 
          studentId, 
          term: Like(`%${term}%`),
          ...(examType ? { examType } : { examType: IsNull() })
        } as any,
        order: { updatedAt: 'DESC' as any }
      });
      console.log('🔍 Found', candidates.length, 'candidate(s) using LIKE for term:', term);
      if (candidates.length > 0) {
        rec = candidates[0]; // Pick most recent
        console.log('📊 Selected record:', { id: rec.id, term: rec.term, examType: rec.examType, hasTeacher: !!rec.teacherRemark, hasPrincipal: !!rec.principalRemark, status: rec.status });
      }
    } else {
      // No term provided, use IsNull
      const where: any = { studentId, term: IsNull(), ...(examType ? { examType } : { examType: IsNull() }) };
      rec = await this.remarksRepo.findOne({ where });
      console.log('🔍 Query for NULL term, found:', rec ? 'YES' : 'NO');
      if (rec) {
        console.log('📊 Found record:', { id: rec.id, term: rec.term, examType: rec.examType, hasTeacher: !!rec.teacherRemark, hasPrincipal: !!rec.principalRemark, status: rec.status });
      }
    }
    
    if (!rec) {
      console.log('📊 NOT FOUND');
    }
    
    return rec || {};
  }

  @UseGuards(BearerGuard)
  @Put('remarks')
  async saveRemarks(@Body() body: { studentId: string; term?: string; examType?: string; teacherRemark?: string; principalRemark?: string }) {
    console.log('📝 saveRemarks called with body:', JSON.stringify(body, null, 2));
    if (!body?.studentId) {
      console.error('❌ No studentId provided');
      return { ok: false, error: 'studentId required' };
    }
    
    const term = body.term;
    const examType = body.examType;
    
    // Try to find existing record using LIKE for term (same as PDF generation and parent check)
    let rec: ReportRemark | null = null;
    if (term) {
      // Use LIKE to match term (same as PDF generation)
      const candidates = await this.remarksRepo.find({ 
        where: { 
          studentId: body.studentId, 
          term: Like(`%${term}%`),
          ...(examType ? { examType } : { examType: IsNull() })
        } as any
      });
      // Pick the most recent match
      if (candidates.length > 0) {
        rec = candidates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
        console.log('✏️ Found existing record using LIKE:', rec.id, '| term:', rec.term);
      }
    } else {
      // No term provided, use IsNull
      const where: any = { studentId: body.studentId, term: IsNull(), ...(examType ? { examType } : { examType: IsNull() }) };
      rec = await this.remarksRepo.findOne({ where });
      if (rec) console.log('✏️ Found existing record (no term):', rec.id);
    }
    
    if (!rec) {
      console.log('📄 No existing record found, creating new one');
      rec = this.remarksRepo.create({ 
        studentId: body.studentId, 
        term: term ?? null, 
        examType: examType ?? null 
      });
    }
    
    // Update remark fields
    rec.term = term ?? rec.term ?? null;
    rec.examType = examType ?? rec.examType ?? null;
    rec.teacherRemark = body.teacherRemark ?? rec.teacherRemark ?? null;
    rec.principalRemark = body.principalRemark ?? rec.principalRemark ?? null;
    
    // Auto-set status to 'ready_for_pdf' if both remarks are present
    const teacherOk = !!(rec.teacherRemark && rec.teacherRemark.toString().trim().length > 0);
    const principalOk = !!(rec.principalRemark && rec.principalRemark.toString().trim().length > 0);
    if (teacherOk && principalOk) {
      rec.status = 'ready_for_pdf';
      console.log('✅ Both remarks present - setting status to ready_for_pdf');
    } else {
      rec.status = 'draft';
      console.log('⚠️ Incomplete remarks - setting status to draft');
    }
    
    console.log('💾 Saving remark record:', { 
      id: rec.id, 
      studentId: rec.studentId,
      term: rec.term,
      examType: rec.examType,
      status: rec.status,
      teacherRemark: rec.teacherRemark?.substring(0, 50), 
      principalRemark: rec.principalRemark?.substring(0, 50) 
    });
    
    // Save and verify
    const saved = await this.remarksRepo.save(rec);
    console.log('✅ Remark saved successfully with id:', saved.id, 'status:', saved.status);
    
    // Verify it was saved by reading it back
    const verify = await this.remarksRepo.findOne({ where: { id: saved.id } });
    if (!verify) {
      console.error('❌ VERIFICATION FAILED: Record not found after save!');
      return { ok: false, error: 'Save verification failed' };
    }
    
    console.log('✅ VERIFIED: Record exists in database:', {
      id: verify.id,
      term: verify.term,
      status: verify.status,
      hasTeacher: !!verify.teacherRemark,
      hasPrincipal: !!verify.principalRemark
    });
    
    return { ok: true, id: saved.id, status: saved.status };
  }

  // Tuition Fee Receipt: PDF
  // Accepts JSON payload describing the receipt and returns a styled PDF similar to the provided template
  // Example body:
  // {
  //   "studentId": "JHS00001", "studentName": "John Doe", "address": "Street, City",
  //   "receiptNo": "RCPT-2025-001", "date": "2025-10-09", "paymentMethod": "Cash",
  //   "issuedBy": "Bursar Name", "phone": "000-000-0000",
  //   "items": [ { "description": "Tuition - Term 1", "quantity": 1, "unitPrice": 500, "taxRate": 0 } ]
  // }
  @Post('tuition-receipt/pdf')
  async tuitionReceiptPdf(
    @Body() body: {
      studentId?: string;
      studentName?: string;
      address?: string;
      receiptNo?: string;
      date?: string;
      paymentMethod?: string;
      issuedBy?: string;
      phone?: string;
      items?: Array<{ description: string; quantity?: number; unitPrice?: number; taxRate?: number }>;
    },
    @Res() res: Response,
  ) {
    const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
    const schoolName = settings?.schoolName || process.env.SCHOOL_NAME || 'SchoolPro';
    const schoolAddress = settings?.schoolAddress || process.env.SCHOOL_ADDRESS || '';
    const logoPath = (settings?.logoUrl && !settings.logoUrl.startsWith('http'))
      ? (path.isAbsolute(settings.logoUrl) ? settings.logoUrl : path.join(process.cwd(), settings.logoUrl))
      : path.join(process.cwd(), 'assets', 'logo.png');

    // Validate minimal payload
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) { res.status(400).json({ message: 'items are required' }); return; }

    const doc = new PDFDocument({ margin: 28 });
    const chunks: Buffer[] = [];
    (doc as any).on('data', (c: Buffer) => chunks.push(c));
    (doc as any).on('end', () => {
      const pdf = Buffer.concat(chunks);
      const filename = `tuition-receipt-${(body?.receiptNo || 'receipt').replace(/\s+/g,'-')}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.end(pdf);
    });
    (doc as any).on('error', () => { try { res.status(500).json({ message: 'Receipt generation failed' }); } catch {} });

    // Theme/colors inspired by the sample
    const theme = {
      bannerBg: '#fff7cc', // light yellow
      text: '#111827',
      muted: '#6b7280',
      border: '#e5e7eb',
      header: '#0b3d91',
    } as const;

    // Title
    doc.font('Helvetica-Bold').fontSize(18).fillColor(theme.header).text('Tuition Fee Receipt', { align: 'center' });
    doc.moveDown(0.6);

    // Top banner with logo and three-column info blocks
    const x0 = doc.page.margins.left;
    const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const bannerH = 80;
    const y0 = doc.y;
    doc.save();
    doc.rect(x0, y0, w, bannerH).fill(theme.bannerBg);
    doc.restore();
    // Logo
    try { if (fs.existsSync(logoPath)) { doc.image(logoPath, x0 + 10, y0 + 10, { width: 60, height: 60, fit: [60,60] as any }); } } catch {}

    // Column widths
    const pad = 16; const colGap = 24;
    const colW = Math.floor((w - 60 - pad - colGap*2) / 3); // minus logo space
    const col1X = x0 + 80; // after logo space
    const col2X = col1X + colW + colGap;
    const col3X = col2X + colW + colGap;
    const lineY = y0 + 12;

    // Left column: student/contact
    doc.font('Helvetica').fontSize(9).fillColor(theme.muted).text('Student', col1X, lineY);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(theme.text).text(body?.studentName || '-', col1X, lineY + 12, { width: colW });
    const addr = [body?.address].filter(Boolean).join('\n');
    if (addr) {
      doc.font('Helvetica').fontSize(9).fillColor(theme.text).text(addr, col1X, lineY + 28, { width: colW });
    }

    // Middle column: school/company info
    doc.font('Helvetica').fontSize(9).fillColor(theme.muted).text('Issued By', col2X, lineY);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(theme.text).text(schoolName, col2X, lineY + 12, { width: colW });
    if (schoolAddress) doc.font('Helvetica').fontSize(9).fillColor(theme.text).text(schoolAddress, col2X, lineY + 28, { width: colW });

    // Right column: receipt meta
    const meta = [
      ['Receipt No.', body?.receiptNo || '-'],
      ['Date', body?.date || new Date().toISOString().slice(0,10)],
      ['Payment Method', body?.paymentMethod || '-'],
      ['Issued By', body?.issuedBy || '-'],
      ['Contact', body?.phone || '-'],
    ] as const;
    let my = lineY;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(theme.text).text('Receipt Details', col3X, my, { width: colW }); my += 14;
    meta.forEach(([k,v]) => {
      doc.font('Helvetica').fontSize(9).fillColor(theme.muted).text(k, col3X, my, { width: colW/2 });
      doc.font('Helvetica').fontSize(9).fillColor(theme.text).text(String(v), col3X + colW/2 + 6, my, { width: colW/2 - 6 });
      my += 14;
    });

    doc.y = y0 + bannerH + 14;

    // Items table
    const tableX = x0; const tableW = w;
    const col = { desc: Math.max(160, Math.floor(tableW * 0.38)), qty: 70, unit: 90, sub: 90, tax: 70, total: 90 } as const;
    const headerH = 22; let ty = doc.y;
    doc.save(); doc.rect(tableX, ty, tableW, headerH).fill('#f3f4f6'); doc.restore();
    doc.font('Helvetica-Bold').fontSize(10).fillColor(theme.text);
    let hx = tableX + 8;
    doc.text('Description', hx, ty + 6, { width: col.desc }); hx += col.desc;
    doc.text('Quantity', hx, ty + 6, { width: col.qty }); hx += col.qty;
    doc.text('Unit Price', hx, ty + 6, { width: col.unit }); hx += col.unit;
    doc.text('Subtotal', hx, ty + 6, { width: col.sub }); hx += col.sub;
    doc.text('Tax', hx, ty + 6, { width: col.tax }); hx += col.tax;
    doc.text('Total', hx, ty + 6, { width: col.total });
    doc.lineWidth(0.8).strokeColor(theme.border).rect(tableX, ty, tableW, headerH).stroke();
    ty += headerH;

    // Rows
    let grandSub = 0, grandTax = 0, grandTotal = 0;
    items.forEach((it, idx) => {
      const qty = Math.max(0, Number(it.quantity ?? 1));
      const unit = Math.max(0, Number(it.unitPrice ?? 0));
      const taxRate = Math.max(0, Number(it.taxRate ?? 0));
      const sub = qty * unit;
      const tax = sub * taxRate;
      const tot = sub + tax;
      grandSub += sub; grandTax += tax; grandTotal += tot;
      const rh = 20;
      if (idx % 2 === 0) { doc.save(); doc.rect(tableX, ty, tableW, rh).fill('#fbfdff'); doc.restore(); }
      doc.lineWidth(0.5).strokeColor(theme.border).rect(tableX, ty, tableW, rh).stroke();
      let cx = tableX + 8; const cy = ty + 5;
      doc.font('Helvetica').fontSize(10).fillColor(theme.text).text(it.description || '-', cx, cy, { width: col.desc }); cx += col.desc;
      doc.text(qty ? String(qty) : '-', cx, cy, { width: col.qty }); cx += col.qty;
      doc.text(unit ? unit.toFixed(2) : '-', cx, cy, { width: col.unit }); cx += col.unit;
      doc.text(sub ? sub.toFixed(2) : '-', cx, cy, { width: col.sub }); cx += col.sub;
      doc.text(tax ? tax.toFixed(2) : '-', cx, cy, { width: col.tax }); cx += col.tax;
      doc.text(tot ? tot.toFixed(2) : '-', cx, cy, { width: col.total });
      ty += rh;
    });

    // Totals summary at bottom-right
    const sumW = 260; const sumH = 24; const sumX = x0 + w - sumW; let sy = ty + 6;
    const lines: Array<[string, string]> = [
      ['Subtotal', grandSub.toFixed(2)],
      ['Tax', grandTax.toFixed(2)],
      ['Total', grandTotal.toFixed(2)],
    ];
    lines.forEach(([k,v], i) => {
      doc.save(); if (i === lines.length - 1) { doc.rect(sumX, sy, sumW, sumH).fill('#eef6ff'); } doc.restore();
      doc.lineWidth(0.8).strokeColor(theme.border).rect(sumX, sy, sumW, sumH).stroke();
      doc.font('Helvetica').fontSize(10).fillColor(theme.muted).text(k, sumX + 10, sy + 6, { width: sumW/2 - 12 });
      doc.font('Helvetica-Bold').fontSize(11).fillColor(theme.text).text(v, sumX + sumW/2, sy + 5, { width: sumW/2 - 12, align: 'right' });
      sy += sumH;
    });

    // Footer note
    doc.moveDown(1);
    doc.font('Helvetica').fontSize(9).fillColor(theme.muted)
      .text('Thank you. This receipt is computer-generated and does not require a signature.', x0, sy + 12, { width: w, align: 'center' });

    doc.end();
  }

  @Post('publish')
  async publishReports(
    @Body() body: { classId: string; term: string; examType?: string },
    @Res() res: Response,
  ) {
    try {
      const classId = (body?.classId || '').toString();
      const term = (body?.term || '').toString();
      const examType = body?.examType ? (body.examType || '').toString() : undefined;
      if (!classId || !term) {
        res.status(400).json({ ok: false, error: 'classId and term are required' });
        return;
      }
      const enrolls = await this.enrollRepo.find({ where: { classEntity: { id: classId } } as any, relations: ['student'] });
      const students: Student[] = enrolls.map(e => (e as any).student).filter(Boolean);
      const merged = await PdfLibDocument.create();
      const base = process.env.WEB_BASE_URL || 'http://localhost:3000';
      const emailJobs: Array<Promise<any>> = [];
      let pagesAdded = 0;
      const fetchBuf = (urlStr: string) => new Promise<Buffer>((resolve, reject) => {
        try {
          const u = new URL(urlStr);
          const lib = u.protocol === 'https:' ? https : http;
          const req = lib.request(urlStr, { method: 'GET' }, (resp) => {
            const chunks: Buffer[] = [];
            resp.on('data', (c: Buffer) => chunks.push(c));
            resp.on('end', () => {
              if (resp.statusCode && resp.statusCode >= 200 && resp.statusCode < 300) resolve(Buffer.concat(chunks));
              else reject(new Error(`HTTP ${resp.statusCode}`));
            });
          });
          req.on('error', reject);
          req.end();
        } catch (e) { reject(e as any); }
      });
      for (const s of students) {
        try {
          const sid = (s.studentId || s.id) as string;
          const u = new URL(`${base}/api/reports/report-card/${encodeURIComponent(sid)}`);
          u.searchParams.set('term', term);
          if (examType) u.searchParams.set('examType', examType);
          const pdfBuf = await fetchBuf(u.toString());
          const src = await PdfLibDocument.load(pdfBuf, { updateMetadata: false });
          const pages = await merged.copyPages(src, src.getPageIndices());
          pages.forEach((p: any) => merged.addPage(p));
          pagesAdded += pages.length;
          // Queue email to linked parents with this student's report attached
          try {
            const emails = await this.parentsSvc.parentEmailsForStudents([s.id]);
            if (emails && emails.length) {
              const filename = `${s.firstName} ${s.lastName}.pdf`;
              const subject = `Report Card — ${s.firstName} ${s.lastName}${term ? ' — ' + term : ''}`;
              const html = `<p>Dear Parent/Guardian,</p>
                <p>Please find attached the report card for <strong>${s.firstName} ${s.lastName}</strong>${term ? ` (<em>${term}</em>)` : ''}.</p>
                ${examType ? `<p>Exam Type: <strong>${examType}</strong></p>` : ''}
                <p>Regards,<br/>School Administration</p>`;
              emailJobs.push(this.email.sendWithAttachments(emails, subject, html, [{ filename, content: pdfBuf, contentType: 'application/pdf' }]));
            }
          } catch {}
        } catch {}
      }
      if (pagesAdded === 0) {
        try { res.status(400).json({ ok: false, error: 'No students or no report pages generated for the selected class and term.' }); } catch {}
        return;
      }
      const out = await merged.save();
      const fn = `published-reports-${classId}-${term}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fn}"`);
      res.end(Buffer.from(out));
      // fire-and-forget email sending
      try { setImmediate(() => { Promise.allSettled(emailJobs).catch(() => {}); }); } catch {}
    } catch (e) {
      try { res.status(500).json({ ok: false, error: 'Failed to publish reports' }); } catch {}
    }
  }

}
