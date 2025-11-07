import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, Res } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { BearerGuard } from '../auth/bearer.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { Response } from 'express';
import PDFDocument = require('pdfkit');
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from '../settings/settings.entity';
import { AccountSettings } from '../accounts/account-settings.entity';
import { Student } from '../entities/student.entity';
import * as fs from 'fs';
import * as path from 'path';
import { FeeInvoice } from './fee-invoice.entity';
import { Enrollment } from '../entities/enrollment.entity';

@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly svc: AccountsService,
    @InjectRepository(Settings) private readonly settingsRepo: Repository<Settings>,
    @InjectRepository(AccountSettings) private readonly accSettingsRepo: Repository<AccountSettings>,
    @InjectRepository(Student) private readonly studentsRepo: Repository<Student>,
    @InjectRepository(FeeInvoice) private readonly invoicesRepo: Repository<FeeInvoice>,
    @InjectRepository(Enrollment) private readonly enrollmentsRepo: Repository<Enrollment>,
  ) {}

  // Admin: settings
  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Get('settings')
  getSettings() { return this.svc.getSettings(); }

  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Patch('settings')
  updateSettings(@Body() body: any) { return this.svc.updateSettings(body); }

  // Admin: bulk invoices
  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Post('bulkInvoices')
  bulk(@Body() body: { term?: string; academicYear?: string; amount?: string; description?: string }) {
    return this.svc.bulkGenerateInvoices(body?.term, body?.academicYear, body?.amount, body?.description);
  }

  // Admin: balances listing
  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Get('balances')
  listBalances() { return this.svc.listBalances(); }

  // Admin/Teacher: transport users listing
  @UseGuards(BearerGuard)
  @Get('transport-users')
  async transportUsers() {
    // Find invoices whose description contains 'transport'
    const rows = await this.invoicesRepo.createQueryBuilder('inv')
      .leftJoinAndSelect('inv.student', 'student')
      .where("LOWER(inv.description) LIKE :kw", { kw: '%transport%' })
      .getMany();
    const seen = new Set<string>();
    const users: Array<{ id: string; studentId?: string | null; firstName: string; lastName: string; contactNumber?: string | null; gender?: string | null; className?: string | null }>=[];
    for (const r of rows) {
      const s = r.student as any;
      if (!s?.id || seen.has(s.id)) continue;
      seen.add(s.id);
      users.push({ id: s.id, studentId: s.studentId || null, firstName: s.firstName, lastName: s.lastName, contactNumber: s.contactNumber || null, gender: s.gender || null, className: null });
    }
    // Also include students explicitly marked as taking transport (preference)
    try {
      const extra = await this.studentsRepo.createQueryBuilder('st').where('st.takesTransport = :t', { t: true }).getMany();
      for (const s of extra) {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          users.push({ id: s.id, studentId: (s as any).studentId || null, firstName: (s as any).firstName, lastName: (s as any).lastName, contactNumber: (s as any).contactNumber || null, gender: (s as any).gender || null, className: null });
        }
      }
    } catch {}
    // Attach current class (latest active enrollment) in batch; fallback to latest any-status if none
    try {
      const ids = Array.from(seen);
      if (ids.length) {
        const enrActive = await this.enrollmentsRepo.createQueryBuilder('e')
          .leftJoinAndSelect('e.classEntity', 'c')
          .leftJoinAndSelect('e.student', 's')
          .where('e.status = :st', { st: 'active' })
          .andWhere('s.id IN (:...ids)', { ids })
          .orderBy('e.createdAt', 'DESC')
          .getMany();
        const map = new Map<string, string>();
        for (const e of enrActive) {
          const sid = (e as any).student?.id;
          if (sid && !map.has(sid)) map.set(sid, `${e.classEntity?.name || ''}${e.classEntity?.academicYear ? ' (' + e.classEntity.academicYear + ')' : ''}`);
        }
        // Fallback: latest enrollment any status
        const needFallback = ids.filter(id => !map.has(id));
        if (needFallback.length) {
          const enrAny = await this.enrollmentsRepo.createQueryBuilder('e')
            .leftJoinAndSelect('e.classEntity', 'c')
            .leftJoinAndSelect('e.student', 's')
            .andWhere('s.id IN (:...ids)', { ids: needFallback })
            .orderBy('e.createdAt', 'DESC')
            .getMany();
          for (const e of enrAny) {
            const sid = (e as any).student?.id;
            if (sid && !map.has(sid)) map.set(sid, `${e.classEntity?.name || ''}${e.classEntity?.academicYear ? ' (' + e.classEntity.academicYear + ')' : ''}`);
          }
        }
        users.forEach(u => { u.className = map.get(u.id) || null; });
      }
    } catch {}
    // Sort by last name then first
    users.sort((a,b) => (a.lastName||'').localeCompare(b.lastName||'') || (a.firstName||'').localeCompare(b.firstName||''));
    return users;
  }

  // Admin: balances CSV export
  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Get('balances.csv')
  async balancesCsv(@Query('download') download = '1', @Res() res: Response) {
    const csv = await this.svc.exportBalancesCsv();
    res.setHeader('Content-Type', 'text/csv');
    if (download !== '0') res.setHeader('Content-Disposition', 'attachment; filename="balances.csv"');
    res.send(csv);
  }

  // Admin: term-end and year-end updates
  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Post('termEnd')
  termEnd(@Body() body: { term?: string }) { return this.svc.termEndUpdate(body?.term); }

  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Post('yearEnd')
  yearEnd(@Body() body: { academicYear?: string }) { return this.svc.yearEndUpdate(body?.academicYear); }

  // Admin: record payment
  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Post('payment')
  recordPayment(@Body() body: { studentIdOrCode: string; amount: string; note?: string; receiptNumber?: string; method?: string; reference?: string; receivedAt?: string; term?: string; academicYear?: string }) {
    const { studentIdOrCode, amount, note, receiptNumber, method, reference, receivedAt, term, academicYear } = body;
    return this.svc.recordPayment(studentIdOrCode, amount, note, { receiptNumber, method, reference, receivedAt, term, academicYear });
  }

  // Admin: reconcile invoice statuses for a student (fix unpaid invoices when balance is 0)
  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Post('reconcile/:studentIdOrCode')
  reconcileInvoices(@Param('studentIdOrCode') studentIdOrCode: string, @Body() body?: { term?: string }) {
    return this.svc.reconcileInvoices(studentIdOrCode, body?.term);
  }

  // Admin: normalize invoices for a term/year
  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Post('normalize')
  normalize(@Body() body: { term: string; academicYear: string }) {
    return this.svc.normalizeInvoicesForTermYear(body.term, body.academicYear);
  }

  // Admin: bulk invoices by class
  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Post('bulkInvoices/byClass')
  bulkByClass(@Body() body: { classId: string; term?: string; academicYear?: string; amount?: string; description?: string }) {
    return this.svc.bulkGenerateInvoicesByClass(body.classId, body.term, body.academicYear, body.amount, body.description);
  }

  // Authenticated: fetch balance by student id or studentId code
  @UseGuards(BearerGuard)
  @Get('student/:idOrCode/balance')
  getBalance(@Param('idOrCode') idOrCode: string) { return this.svc.getStudentBalanceById(idOrCode); }

  // Authenticated: fetch term-specific balance by student id or studentId code
  @UseGuards(BearerGuard)
  @Get('student/:idOrCode/balance/term/:term')
  async getTermBalance(@Param('idOrCode') idOrCode: string, @Param('term') term: string) {
    return this.svc.getStudentTermBalanceById(idOrCode, term);
  }

  // Public: parents/students can view using student code (human id) without auth
  @Get('public/balance/:studentId')
  publicBalance(@Param('studentId') studentId: string) { return this.svc.getStudentBalanceById(studentId); }

  // Statement/Invoice PDF for a student (public by code or auth by id)
  @Get('invoice/:idOrCode')
  async invoicePdf(@Param('idOrCode') idOrCode: string, @Res() res: Response) {
    const data = await this.svc.getStudentBalanceById(idOrCode);
    const accSettings = await this.accSettingsRepo.findOne({ where: { id: 'global' } });
    const fallbackAY = accSettings?.academicYear || '-';
    // Compute fee breakdown from invoices by description
    // Avoid double-counting: if an aggregated invoice still includes DH/Transport/Desk,
    // subtract those per term/year when computing tuition.
    const groups = new Map<string, { aggregated: number; dh: number; transport: number; desk: number; other: number }>();
    let dhTotal = 0, transportTotal = 0, deskTotal = 0, tuitionOther = 0;
    for (const i of data.invoices as any[]) {
      const descRaw = (i.description || '').toString();
      const desc = descRaw.toLowerCase();
      const key = `${i.term || ''}|${i.academicYear || fallbackAY || ''}`;
      if (!groups.has(key)) groups.set(key, { aggregated: 0, dh: 0, transport: 0, desk: 0, other: 0 });
      const g = groups.get(key)!;
      const amt = Number(i.amount) || 0;
      if (desc.includes('dining hall')) { g.dh += amt; dhTotal += amt; }
      else if (desc.includes('transport')) { g.transport += amt; transportTotal += amt; }
      else if (desc.includes('desk')) { g.desk += amt; deskTotal += amt; }
      else if (desc.includes('aggregated')) { g.aggregated += amt; }
      else { g.other += amt; tuitionOther += amt; }
    }
    // Tuition should come from settings: Day Fee Amount (day scholars) or Boarder Fee Amount (boarders)
    const sampleInv: any = (data.invoices as any[])[0] || null;
    const studentModel: any = sampleInv?.student || null; // eager loaded on FeeInvoice
    const isBoarder = (studentModel?.boardingStatus === 'boarder');
    const isDay = (studentModel?.boardingStatus === 'day');
    const isStaff = !!(studentModel?.isStaffChild);
    const wantsTransport = !!(studentModel?.takesTransport);
    const wantsMeals = !!(studentModel?.takesMeals);
    const baseFee = isBoarder
      ? (parseFloat(String((accSettings as any)?.boarderFeeAmount || '0')) || 0)
      : (parseFloat(String((accSettings as any)?.dayFeeAmount || '0')) || 0);
    // Count distinct term groups present to know how many times to include base
    let termsCount = 0;
    for (const _g of groups.values()) termsCount++;
    // If invoices are aggregated and no component rows exist, infer DH/Transport from settings and preferences
    try {
      const dhFee = parseFloat(String(((accSettings as any)?.dhFee) || '0')) || 0;
      const transportFee = parseFloat(String(((accSettings as any)?.transportFee) || '0')) || 0;
      if (isDay && !isStaff) {
        if (dhTotal === 0 && wantsMeals && dhFee > 0) dhTotal = dhFee * termsCount;
        if (transportTotal === 0 && wantsTransport && transportFee > 0) transportTotal = transportFee * termsCount;
      }
    } catch {}
    const tuitionTotal = isStaff ? 0 : (baseFee * termsCount); // staff children pay zero tuition
    const sums = { tuition: tuitionTotal, dh: dhTotal, transport: transportTotal, desk: deskTotal };
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    // Build a robust full-name for filename
    let rawName = (data.student.name || '').toString().trim();
    if (!rawName) {
      try {
        const studentEntity = await this.studentsRepo.findOne({ where: [{ id: idOrCode } as any, { studentId: idOrCode } as any] });
        if (studentEntity) rawName = `${studentEntity.firstName || ''} ${studentEntity.lastName || ''}`.trim();
      } catch {}
    }
    const safeName = (rawName || '').replace(/\s+/g, '_').replace(/[^A-Za-z0-9_\-\.]/g, '');
    const filename = `statement-${safeName || data.student.code}.pdf`;
    const encoded = encodeURIComponent(filename);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`);
    doc.pipe(res);
    // Use the default first page; avoid manual addPage to prevent blanks

    // Branding and theme
    const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
    const theme = {
      primary: (settings?.primaryColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(settings.primaryColor)) ? settings.primaryColor : '#1d4ed8',
      text: '#111827',
      muted: '#6b7280',
      border: '#cbd5e1',
      softBorder: '#e5e7eb',
      headerBg: '#f1f5f9',
      stripe: '#fafafa',
    } as const;

    // Helpers for footer and watermark
    const drawWatermark = () => { /* disabled */ };

    // Header with logo and school details
    const startY = doc.y;
    const logoPath = (settings?.logoUrl && !settings.logoUrl.startsWith('http'))
      ? (path.isAbsolute(settings.logoUrl) ? settings.logoUrl : path.join(process.cwd(), settings.logoUrl))
      : path.join(process.cwd(), 'assets', 'logo.png');
    try { if (fs.existsSync(logoPath)) doc.image(logoPath, 40, startY, { width: 50 }); } catch {}
    const schoolName = settings?.schoolName || 'SchoolPro';
    const schoolAddress = settings?.schoolAddress || '';
    doc.font('Helvetica-Bold').fillColor(theme.text).fontSize(16).text(schoolName, 0, startY, { align: 'center' });
    if (schoolAddress) doc.font('Helvetica').fontSize(10).fillColor(theme.muted).text(schoolAddress, { align: 'center' });
    // Title bar
    doc.moveDown(0.4);
    const tY = doc.y; const tX = 40; const tW = doc.page.width - 80;
    doc.save();
    doc.rect(tX, tY, tW, 24).fill(theme.primary);
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(14).text('Fees Statement', tX + 12, tY + 5);
    doc.restore();
    doc.moveDown(1.0);

    // Student info and balance panel
    const panelX = 40; const panelW = doc.page.width - 80; const labelW = 120; const valueW = panelW - labelW; const rowH = 18;
    const rows: Array<[string, string]> = [
      ['Student', data.student.name],
      ['Code', data.student.code],
      ['Balance', data.balance.toFixed(2)],
    ];
    const panelY = doc.y; const panelH = rows.length * rowH + 10;
    doc.save();
    doc.lineWidth(0.8).strokeColor(theme.border).roundedRect(panelX, panelY, panelW, panelH, 6).stroke();
    let ry = panelY + 6;
    rows.forEach(([k, v]) => {
      doc.moveTo(panelX + 1, ry + rowH - 2).lineTo(panelX + panelW - 1, ry + rowH - 2).strokeColor(theme.softBorder).stroke();
      doc.fillColor(theme.muted).font('Helvetica').fontSize(10).text(k, panelX + 10, ry + 3, { width: labelW - 14 });
      doc.fillColor(theme.text).font('Helvetica').fontSize(11).text(v, panelX + labelW + 6, ry + 2, { width: valueW - 12 });
      ry += rowH;
    });
    doc.restore();
    doc.moveDown(0.6);

    // Invoices table (Academic Year column removed)
    doc.font('Helvetica-Bold').fillColor(theme.text).fontSize(12).text('Invoices');
    const tableX = 40; const tableW = doc.page.width - 80;
    const colsInv = { date: 110, term: 90, description: tableW - (110 + 90 + 80 + 80), amount: 80, status: 80 } as const;
    let ty = doc.y + 6;
    const bottomLimit = doc.page.height - 60; // ensure we don't overflow to a second page
    doc.save();
    doc.rect(tableX, ty, tableW, 22).fill(theme.headerBg);
    doc.fillColor(theme.text).font('Helvetica-Bold').fontSize(11);
    doc.text('Date', tableX + 8, ty + 5, { width: colsInv.date });
    doc.text('Term', tableX + 8 + colsInv.date, ty + 5, { width: colsInv.term });
    doc.text('Description', tableX + 8 + colsInv.date + colsInv.term, ty + 5, { width: colsInv.description });
    doc.text('Amount', tableX + 8 + colsInv.date + colsInv.term + colsInv.description, ty + 5, { width: colsInv.amount });
    doc.text('Status', tableX + 8 + colsInv.date + colsInv.term + colsInv.description + colsInv.amount, ty + 5, { width: colsInv.status });
    doc.lineWidth(0.8).strokeColor(theme.border).rect(tableX, ty, tableW, 22).stroke();
    ty += 22; doc.restore();
    let invoicesTotal = 0; // raw sum (kept for reference but not displayed)
    for (let idx = 0; idx < data.invoices.length; idx++) {
      const i: any = data.invoices[idx];
      const rowH2 = 20;
      if (ty + rowH2 > bottomLimit) {
        doc.fillColor(theme.muted).font('Helvetica-Oblique').fontSize(9).text('… more invoices omitted', tableX + 8, ty + 2);
        ty += rowH2;
        break;
      }
      doc.save();
      if (idx % 2 === 0) doc.rect(tableX, ty, tableW, rowH2).fill(theme.stripe);
      doc.lineWidth(0.6).strokeColor(theme.softBorder).rect(tableX, ty, tableW, rowH2).stroke();
      doc.fillColor(theme.text).font('Helvetica').fontSize(10);
      let cx = tableX + 8;
      doc.text(new Date(i.createdAt).toLocaleDateString(), cx, ty + 4, { width: colsInv.date }); cx += colsInv.date;
      doc.text(i.term || '-', cx, ty + 4, { width: colsInv.term }); cx += colsInv.term;
      doc.text(i.description || '-', cx, ty + 4, { width: colsInv.description }); cx += colsInv.description;
      const amt = Number(i.amount) || 0; invoicesTotal += amt;
      doc.text(amt.toFixed(2), cx, ty + 4, { width: colsInv.amount }); cx += colsInv.amount;
      doc.text(i.status || '-', cx, ty + 4, { width: colsInv.status });
      doc.restore(); ty += rowH2;
    }
    // Invoices total row
    doc.save();
    // Compute normalized total: base-only (aggregated minus DH/Transport/Desk, not below 0) + separate components + other
    let normalizedTotal = 0;
    for (const g of groups.values()) {
      const baseOnly = Math.max(0, (g.aggregated || 0) - (g.dh || 0) - (g.transport || 0) - (g.desk || 0));
      normalizedTotal += baseOnly + (g.dh || 0) + (g.transport || 0) + (g.desk || 0) + (g.other || 0);
    }
    doc.font('Helvetica-Bold').fillColor(theme.text).text('Total', tableX + 8 + colsInv.date + colsInv.term + colsInv.description, ty + 4, { width: colsInv.amount });
    doc.text(normalizedTotal.toFixed(2), tableX + 8 + colsInv.date + colsInv.term + colsInv.description, ty + 4, { width: colsInv.amount, align: 'right' });
    doc.restore();

    // Fees breakdown panel (ensure space remains)
    doc.moveDown(0.6);
    if (doc.y + 100 < bottomLimit) {
      doc.font('Helvetica-Bold').fillColor(theme.text).fontSize(12).text('Fees Breakdown');
    const bx = 40; const bw = doc.page.width - 80; const rowH3 = 20; let by = doc.y + 6;
    const rows3: Array<[string,string]> = [
      ['Tuition', sums.tuition.toFixed(2)],
      ['Dining Hall (DH)', sums.dh.toFixed(2)],
      ['Transport', sums.transport.toFixed(2)],
      ['Desk fee', sums.desk.toFixed(2)],
      ['Grand Total', (sums.tuition + sums.dh + sums.transport + sums.desk).toFixed(2)],
    ];
    for (let idx = 0; idx < rows3.length; idx++) {
      const r = rows3[idx];
      if (by + rowH3 > bottomLimit) { doc.fillColor(theme.muted).font('Helvetica-Oblique').fontSize(9).text('… breakdown truncated', bx + 8, by + 2); break; }
      const even = idx % 2 === 0; doc.save(); if (even) doc.rect(bx, by, bw, rowH3).fill(theme.stripe); doc.restore();
      doc.save();
      doc.lineWidth(0.6).strokeColor(theme.softBorder).rect(bx, by, bw, rowH3).stroke();
      doc.fillColor(theme.muted).font('Helvetica').fontSize(10).text(r[0], bx + 10, by + 4, { width: bw/2 - 20 });
      doc.fillColor(theme.text).font('Helvetica-Bold').fontSize(11).text(r[1], bx + bw/2, by + 3, { width: bw/2 - 20, align: 'right' });
      doc.restore(); by += rowH3;
    }
    }

    // Closing balance (carry forward) summary
    doc.moveDown(0.6);
    if (doc.y + 40 < bottomLimit) {
      const px = 40; const pw = doc.page.width - 80; const ph = 34; const py = doc.y;
      doc.save();
      doc.lineWidth(0.8).strokeColor(theme.border).roundedRect(px, py, pw, ph, 6).stroke();
      doc.fillColor(theme.muted).font('Helvetica').fontSize(10).text('Closing balance to carry forward', px + 12, py + 8, { width: pw/2 });
      doc.fillColor(theme.text).font('Helvetica-Bold').fontSize(12).text((data.balance).toFixed(2), px + pw/2, py + 6, { width: pw/2 - 12, align: 'right' });
      doc.restore();
    }

    // Transactions table
    doc.moveDown(0.6);
    if (doc.y + 60 < bottomLimit) {
    doc.font('Helvetica-Bold').fillColor(theme.text).fontSize(12).text('Transactions');
    const colsTx = { date: 120, type: 60, term: 60, year: 90, note: 150, amount: 85 };
    ty = doc.y + 6;
    doc.save();
    doc.rect(tableX, ty, tableW, 22).fill(theme.headerBg);
    doc.fillColor(theme.text).font('Helvetica-Bold').fontSize(11);
    doc.text('Date', tableX + 8, ty + 5, { width: colsTx.date - 8 });
    doc.text('Type', tableX + colsTx.date, ty + 5, { width: colsTx.type - 4 });
    doc.text('Term', tableX + colsTx.date + colsTx.type, ty + 5, { width: colsTx.term - 4 });
    doc.text('Year', tableX + colsTx.date + colsTx.type + colsTx.term, ty + 5, { width: colsTx.year - 4 });
    doc.text('Note', tableX + colsTx.date + colsTx.type + colsTx.term + colsTx.year, ty + 5, { width: colsTx.note - 4 });
    doc.text('Amount', tableX + colsTx.date + colsTx.type + colsTx.term + colsTx.year + colsTx.note, ty + 5, { width: colsTx.amount - 4, align: 'right' });
    doc.lineWidth(0.8).strokeColor(theme.border).rect(tableX, ty, tableW, 22).stroke();
    ty += 22; doc.restore();
    let paymentsTotal = 0;
    for (let idx = 0; idx < data.transactions.length; idx++) {
      const t: any = data.transactions[idx];
      const rowH2 = 20;
      if (ty + rowH2 > bottomLimit) {
        doc.fillColor(theme.muted).font('Helvetica-Oblique').fontSize(9).text('… more transactions omitted', tableX + 8, ty + 2);
        ty += rowH2; break;
      }
      doc.save();
      if (idx % 2 === 0) doc.rect(tableX, ty, tableW, rowH2).fill(theme.stripe);
      doc.lineWidth(0.6).strokeColor(theme.softBorder).rect(tableX, ty, tableW, rowH2).stroke();
      doc.fillColor(theme.text).font('Helvetica').fontSize(10);
      // Date column
      doc.text(new Date(t.createdAt).toLocaleString(), tableX + 8, ty + 4, { width: colsTx.date - 10, ellipsis: true });
      // Type column
      doc.text(t.type, tableX + colsTx.date, ty + 4, { width: colsTx.type - 6, ellipsis: true });
      // Term column
      doc.text(t.term || '-', tableX + colsTx.date + colsTx.type, ty + 4, { width: colsTx.term - 6, ellipsis: true });
      // Year column
      const tay = t.academicYear || fallbackAY || '-';
      doc.text(tay, tableX + colsTx.date + colsTx.type + colsTx.term, ty + 4, { width: colsTx.year - 6, ellipsis: true });
      // Note column
      doc.text(t.note || '-', tableX + colsTx.date + colsTx.type + colsTx.term + colsTx.year, ty + 4, { width: colsTx.note - 6, ellipsis: true });
      // Amount column (right-aligned)
      const txAmt = Number(t.amount) || 0; if (t.type === 'payment') paymentsTotal += (0 - txAmt); // amounts stored negative
      doc.text(txAmt.toFixed(2), tableX + colsTx.date + colsTx.type + colsTx.term + colsTx.year + colsTx.note, ty + 4, { width: colsTx.amount - 6, align: 'right' });
      doc.restore(); ty += rowH2;
    }
    // Transactions totals row (payments sum as positive)
    doc.save();
    doc.font('Helvetica-Bold').fillColor(theme.text);
    // Position "Payments total" label in the Note column
    doc.text('Payments total', tableX + colsTx.date + colsTx.type + colsTx.term + colsTx.year, ty + 4, { width: colsTx.note - 6, align: 'right' });
    // Position the amount value in the Amount column
    doc.text(paymentsTotal.toFixed(2), tableX + colsTx.date + colsTx.type + colsTx.term + colsTx.year + colsTx.note, ty + 4, { width: colsTx.amount - 6, align: 'right' });
    doc.restore();

    }
    doc.end();
  }

  // Admin: recent payments
  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Get('payments/recent')
  recent(@Query('limit') limit = 20, @Query('from') from?: string, @Query('to') to?: string, @Query('method') method?: string) {
    const n = typeof limit === 'string' ? parseInt(limit, 10) : (limit as number);
    return this.svc.recentPayments(isNaN(n) ? 20 : n, { from, to, method });
  }

  // Admin: receipt PDF by transaction id
  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Get('receipt/:txId')
  async receipt(@Param('txId') txId: string, @Res() res: Response) {
    const t = await this.svc.getTransaction(txId);
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    // Build filename with student's full name for easy identification
    const sForName: any = (t as any).student;
    const rawNameR = `${sForName?.firstName || ''} ${sForName?.lastName || ''}`.trim() || (sForName?.name || '');
    const safeNameR = (rawNameR || '').replace(/\s+/g, '_').replace(/[^A-Za-z0-9_\-\.]/g, '');
    const fallbackIdR = (sForName?.studentId || sForName?.id || (t.receiptNumber || t.id));
    const filename = `receipt-${safeNameR || fallbackIdR}.pdf`;
    const encoded = encodeURIComponent(filename);
    try { res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition'); } catch {}
    res.setHeader('Content-Disposition', `inline; filename="${filename}"; filename*=UTF-8''${encoded}`);
    doc.pipe(res);
    // Theme
    const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
    const primary = settings?.primaryColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(settings.primaryColor)
      ? settings.primaryColor : '#1d4ed8';
    // Header with logo and school
    const startY = doc.y;
    const logoPath = (settings?.logoUrl && !settings.logoUrl.startsWith('http'))
      ? (path.isAbsolute(settings.logoUrl) ? settings.logoUrl : path.join(process.cwd(), settings.logoUrl))
      : path.join(process.cwd(), 'assets', 'logo.png');
    try { if (fs.existsSync(logoPath)) { doc.image(logoPath, 40, startY, { width: 50 }); } } catch {}
    const schoolName = settings?.schoolName || 'SchoolPro';
    const schoolAddress = settings?.schoolAddress || '';
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(16).text(schoolName, 0, startY, { align: 'center' });
    if (schoolAddress) doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text(schoolAddress, { align: 'center' });
    // Title bar
    doc.moveDown(0.4);
    const tY = doc.y; const tX = 40; const tW = doc.page.width - 80;
    doc.save();
    doc.rect(tX, tY, tW, 24).fill(primary);
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(14).text('Payment Receipt', tX + 12, tY + 5);
    doc.restore();
    doc.moveDown(1.0);
    // Details grid (with bordered panel and subtle row separators)
    doc.font('Helvetica').fillColor('#111827').fontSize(11);
    const s = (t as any).student;
    const pairs: Array<[string,string]> = [
      ['Receipt #', t.receiptNumber || '-'],
      ['Method', t.method || '-'],
      ['Reference', t.reference || '-'],
      ['Received at', t.receivedAt || '-'],
      ['Amount Paid', Number(t.amount).toFixed(2)],
      ['Student', `${s?.firstName || ''} ${s?.lastName || ''}`.trim()],
      ['Student Code', s?.studentId || s?.id || '-'],
    ];
    // Panel and grid
    const text = '#111827', muted = '#6b7280', border = '#cbd5e1', soft = '#e5e7eb';
    const panelX = 40; const panelW = doc.page.width - 80; const rowH = 20;
    const rowsPerCol = Math.ceil(pairs.length/2);
    const panelY = doc.y - 2; const panelH = rowsPerCol * rowH + 14;
    doc.save();
    doc.lineWidth(0.8).strokeColor(border).roundedRect(panelX, panelY, panelW, panelH, 6).stroke();
    doc.restore();
    // Two-column layout inside panel
    const leftX = 40; const rightX = 320; let y = panelY + 6;
    pairs.forEach((p, idx) => {
      const [k, v] = p; const x = idx < rowsPerCol ? leftX : rightX;
      if (idx === rowsPerCol) y = panelY + 6; // reset y at top of right column
      // row separator across the panel for each row index
      const localRow = idx % rowsPerCol;
      if (localRow > 0) {
        const sepY = panelY + 6 + localRow * rowH - 2;
        doc.save();
        doc.lineWidth(0.6).strokeColor(soft).moveTo(panelX + 1, sepY).lineTo(panelX + panelW - 1, sepY).stroke();
        doc.restore();
      }
      doc.fillColor(muted).text(k + ':', x, y);
      doc.fillColor(text).text(v, x + 90, y);
      y += rowH;
    });
    if (t.note) { doc.moveDown(0.8); doc.fillColor('#6b7280').text('Note:'); doc.fillColor('#111827').text(t.note); }
    // Footer
    doc.moveDown(1.0); doc.fillColor('#6b7280').fontSize(10).text('Thank you for your payment.', { align: 'center' });
    doc.end();
  }
}
