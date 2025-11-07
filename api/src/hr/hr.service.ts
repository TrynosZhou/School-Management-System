import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from '../settings/settings.entity';
import { EmployeeEntity } from '../entities/employee.entity';

type Gender = 'Male' | 'Female';

export interface Department { id: string; name: string; }
export interface Employee {
  id: string; // uuid-like local id
  employeeId: string; // JE + 7 digits
  firstName: string;
  lastName: string;
  gender: Gender;
  dob?: string;
  phone?: string;
  startDate?: string;
  address?: string;
  qualification?: string;
  salary: number;
  grade?: string;
  departmentId?: string;
}

@Injectable()
export class HrService {
  constructor(
    @InjectRepository(Settings) private readonly settingsRepo: Repository<Settings>,
    @InjectRepository(EmployeeEntity) private readonly empRepo: Repository<EmployeeEntity>,
  ) {}
  private departments: Department[] = [
    { id: 'dep-admin', name: 'Administration' },
    { id: 'dep-acad', name: 'Academics' },
    { id: 'dep-acc', name: 'Accounts' },
    { id: 'dep-hr', name: 'Human Resource' },
  ];
  private employees: Employee[] = []; // legacy; no longer used for persistence

  listDepartments(){ return this.departments; }
  async listEmployees(){
    const rows = await this.empRepo.find({ order: { lastName: 'ASC' as any, firstName: 'ASC' as any } });
    return rows.map(r => ({ ...r, salary: Number(r.salary || 0) }));
  }

  createDepartment(name: string){
    const trimmed = (name || '').trim();
    if (!trimmed) return { ok: false } as any;
    // avoid duplicates by name
    const exists = this.departments.find(d => d.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) return exists;
    const dep: Department = { id: this.randId(), name: trimmed };
    this.departments.push(dep);
    return dep;
  }

  private async genEmployeeCode(): Promise<string> {
    let code = '';
    do {
      const n = Math.floor(1000000 + Math.random() * 9000000);
      code = `JE${n}`;
    } while (await this.empRepo.findOne({ where: { employeeId: code } as any }));
    return code;
  }

  async createEmployee(payload: Omit<Employee, 'id'|'employeeId'>){
    // Validate grade against settings if configured
    let allowedGrades: string[] = [];
    try {
      const s = await this.settingsRepo.findOne({ where: { id: 'global' } });
      if (s?.employeeGradesJson) {
        const arr = JSON.parse(s.employeeGradesJson);
        if (Array.isArray(arr)) allowedGrades = arr.map((x:any)=> String(x));
      }
    } catch {}

    if (allowedGrades.length > 0) {
      const g = (payload.grade || '').toString();
      if (!g || !allowedGrades.includes(g)) {
        throw new (require('@nestjs/common').BadRequestException)(
          'Invalid grade. Select a grade from Settings.'
        );
      }
    }

    const id = this.randId();
    const employeeId = await this.genEmployeeCode();
    const emp: Partial<EmployeeEntity> = { id, employeeId, ...payload, salary: Number(payload.salary||0) } as any;
    await this.empRepo.save(this.empRepo.create(emp));
    const saved = await this.empRepo.findOne({ where: { id } });
    return saved as any;
  }

  async updateEmployee(id: string, body: any){
    const current = await this.empRepo.findOne({ where: { id } });
    if (!current) {
      throw new (require('@nestjs/common').NotFoundException)('Employee not found');
    }

    // If grade present, validate against settings
    if (body && Object.prototype.hasOwnProperty.call(body, 'grade')) {
      let allowedGrades: string[] = [];
      try {
        const s = await this.settingsRepo.findOne({ where: { id: 'global' } });
        if (s?.employeeGradesJson) {
          const arr = JSON.parse(s.employeeGradesJson);
          if (Array.isArray(arr)) allowedGrades = arr.map((x:any)=> String(x));
        }
      } catch {}
      if (allowedGrades.length > 0) {
        const g = (body.grade || '').toString();
        if (!g || !allowedGrades.includes(g)) {
          throw new (require('@nestjs/common').BadRequestException)('Invalid grade. Select a grade from Settings.');
        }
      }
    }

    const updated: Partial<EmployeeEntity> = {
      ...current,
      ...body,
      salary: body && Object.prototype.hasOwnProperty.call(body, 'salary') ? Number(body.salary||0) as any : (current as any).salary,
    } as any;
    await this.empRepo.save(updated as EmployeeEntity);
    return await this.empRepo.findOne({ where: { id } }) as any;
  }

  async deleteEmployee(id: string){
    const res = await this.empRepo.delete(id);
    if ((res.affected || 0) === 0) {
      throw new (require('@nestjs/common').NotFoundException)('Employee not found');
    }
    return { ok: true, id } as any;
  }

  async processPayroll(rows: Array<{ employeeId?: string; staffName?: string; basic:number; allowances:number; deductions:number; taxPayable?: number; loanPayable?: number; otherDeductions?: number; month?: string; date?: string }>) {
    const today = new Date().toLocaleDateString();
    const processed = (rows||[]).map((r:any) => {
      const basic = Number(r.basic||0);
      const allowances = Number(r.allowances||0);
      const deductions = Number(r.deductions||0);
      const taxPayable = Number(r.taxPayable||0);
      const loanPayable = Number(r.loanPayable||0);
      const otherDeductions = Number(r.otherDeductions||0);
      const gross = basic + allowances;
      const totalDeductions = deductions + taxPayable + loanPayable + otherDeductions;
      const net = gross - totalDeductions;
      const date = r.date || today;
      return { ...r, basic, allowances, deductions, taxPayable, loanPayable, otherDeductions, gross, net, date };
    });
    const payslips: any[] = [];
    for (const r of processed) {
      // generate payslips in sequence to ensure ordered, one-after-another production
      const p = await this.generatePayslip(r as any);
      payslips.push(p);
    }
    return { ok: true, rows: processed, payslips };
  }

  private async generatePayslip(row: { employeeId?: string; staffName?: string; basic:number; allowances:number; deductions:number; taxPayable?: number; loanPayable?: number; otherDeductions?: number; gross?: number; net:number; month?: string; date?: string }){
    const emp = row.employeeId ? await this.empRepo.findOne({ where: { employeeId: row.employeeId } as any }) : undefined;
    const employeeId = emp?.employeeId || row.employeeId || 'UNKNOWN';
    const name = emp ? `${emp.firstName} ${emp.lastName}` : (row.staffName || 'UNKNOWN');
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    const stream = doc as any;
    stream.on('data', (c:Buffer)=>chunks.push(c));
    const done = new Promise<string>((resolve)=>{
      stream.on('end', ()=>{
        const buf = Buffer.concat(chunks);
        resolve(buf.toString('base64'));
      });
    });

    // Load settings for header (school name, address, logo)
    let schoolName = 'SchoolPro';
    let schoolAddress = '';
    let logoUrl: string | null = null;
    try {
      const s = await this.settingsRepo.findOne({ where: { id: 'global' } as any });
      if (s) {
        if ((s as any).schoolName) schoolName = (s as any).schoolName;
        if ((s as any).schoolAddress) schoolAddress = (s as any).schoolAddress;
        if ((s as any).logoUrl) logoUrl = (s as any).logoUrl;
      }
    } catch {}

    // Header - Organization
    const pageW = doc.page.width, pageH = doc.page.height;
    const margin = 48;
    doc.rect(margin-10, margin-20, pageW - (margin*2) + 20, pageH - (margin*2) + 40).stroke('#1f2937');
    // Logo (top-left)
    if (logoUrl) {
      try {
        const buf = await this.fetchImageBuffer(logoUrl);
        if (buf) doc.image(buf, margin - 4, margin - 14, { width: 48, height: 48, fit: [48,48] });
      } catch {}
    }
    doc.fontSize(16).font('Helvetica-Bold').text(schoolName, { align: 'center' });
    doc.moveDown(0.2);
    if (schoolAddress) doc.fontSize(10).font('Helvetica').fillColor('#374151').text(schoolAddress, { align: 'center' });
    doc.moveDown(0.4);
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(12).text(`Pay Slip for the period of ${row.month || '-'}`, { align: 'center' });

    // Employee info blocks (two columns)
    const leftX = margin, rightX = pageW/2 + 10, y0 = margin + 60;
    doc.font('Helvetica').fontSize(10);
    const leaveDays = emp?.startDate ? this.computeLeaveDays(emp.startDate) : 0;
    const leftInfo = [
      `Employee Id: ${employeeId}`,
      `Employee Name: ${name}`,
      `Date of Joining: ${emp?.startDate ? new Date(emp.startDate).toLocaleDateString() : '-'}`,
      `Leave Days Accrued: ${leaveDays.toFixed(1)}`,
    ];
    const rightInfo = [
      `Date: ${row.date || new Date().toLocaleDateString()}`,
      `Designation: ${emp?.grade || '-'}`,
      `Department: ${emp?.departmentId || '-'}`,
    ];
    let cursorY = y0;
    leftInfo.forEach(line => { doc.text(line, leftX, cursorY); cursorY += 14; });
    cursorY = y0; rightInfo.forEach(line => { doc.text(line, rightX, cursorY); cursorY += 14; });

    // Earnings vs Deductions table
    const tableTop = y0 + 70;
    const colW = (pageW - margin*2) / 2;
    const earnX = margin, dedX = margin + colW;
    const headerH = 20, rowH = 18;
    // headers (blue background with white text)
    doc.rect(earnX, tableTop, colW, headerH).fill('#0b53a5');
    doc.rect(dedX, tableTop, colW, headerH).fill('#0b53a5');
    doc.fillColor('#ffffff').font('Helvetica-Bold').text('Earnings', earnX + 8, tableTop + 4);
    doc.text('Deductions', dedX + 8, tableTop + 4);
    // prepare rows
    const earnings: Array<[string, number]> = [
      ['Basic Salary', Number(row.basic||0)],
      ['Allowances', Number(row.allowances||0)],
    ];
    const deductions: Array<[string, number]> = [
      ['Deductions', Number(row.deductions||0)],
      ['Tax Payable', Number(row.taxPayable||0)],
      ['Loan Payable', Number(row.loanPayable||0)],
      ['Other Deductions', Number(row.otherDeductions||0)],
    ];
    const maxRows = Math.max(earnings.length, deductions.length);
    doc.font('Helvetica').fillColor('#000');
    for (let i=0;i<maxRows;i++){
      const y = tableTop + headerH + i*rowH;
      // earnings cell
      doc.rect(earnX, y, colW, rowH).stroke('#e5e7eb');
      const er = earnings[i];
      if (er){
        doc.text(er[0], earnX + 8, y + 4);
        const amt = er[1].toFixed(2);
        const tw = doc.widthOfString(amt);
        doc.text(amt, earnX + colW - tw - 8, y + 4);
      }
      // deductions cell
      doc.rect(dedX, y, colW, rowH).stroke('#e5e7eb');
      const dr = deductions[i];
      if (dr){
        doc.text(dr[0], dedX + 8, y + 4);
        const amt = dr[1].toFixed(2);
        const tw = doc.widthOfString(amt);
        doc.text(amt, dedX + colW - tw - 8, y + 4);
      }
    }
    // Totals row
    const gross = Number((row as any).gross || (Number(row.basic||0)+Number(row.allowances||0)));
    const totalDeductions = Number(row.deductions||0) + Number(row.taxPayable||0) + Number(row.loanPayable||0) + Number(row.otherDeductions||0);
    const net = Number(row.net ?? (gross - totalDeductions));
    const totalsY = tableTop + headerH + maxRows*rowH;
    doc.rect(earnX, totalsY, colW, rowH).fill('#f3f4f6');
    doc.rect(dedX, totalsY, colW, rowH).fill('#f3f4f6');
    doc.fillColor('#111827').font('Helvetica-Bold').text('Total Earnings', earnX + 8, totalsY + 4);
    let amt = gross.toFixed(2); let tw = doc.widthOfString(amt);
    doc.text(amt, earnX + colW - tw - 8, totalsY + 4);
    doc.text('Total Deductions', dedX + 8, totalsY + 4);
    amt = totalDeductions.toFixed(2); tw = doc.widthOfString(amt);
    doc.text(amt, dedX + colW - tw - 8, totalsY + 4);

    // Net pay and footer
    const netY = totalsY + rowH + 10;
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text(`Net Pay (Payable): ${net.toFixed(2)}`, margin, netY);
    const footY = netY + 40;
    doc.moveTo(margin, footY).lineTo(margin + (pageW/2 - margin - 20), footY).stroke('#9ca3af');
    doc.moveTo(pageW/2 + 20, footY).lineTo(pageW - margin, footY).stroke('#9ca3af');
    doc.fontSize(10).font('Helvetica').fillColor('#374151')
      .text("Employer's Signature", margin, footY + 4)
      .text("Employee's Signature", pageW/2 + 20, footY + 4);

    doc.end();
    const b64 = await done;
    const filename = `payslip-${employeeId}-${(row.month || '').replace(/\\/g,'_') || new Date().toISOString().slice(0,7)}.pdf`;
    return { employeeId, filename, pdfBase64: b64 };
  }

  private computeLeaveDays(startDate: string){
    try{
      const start = new Date(startDate);
      const now = new Date();
      const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      const days = Math.max(0, months) * 1.5;
      return days;
  }catch{ return 0; }
  }

  private async fetchImageBuffer(urlStr: string): Promise<Buffer | null> {
    try {
      if (!urlStr) return null;
      // Data URL
      if (urlStr.startsWith('data:image')) {
        const base64 = urlStr.split(',')[1] || '';
        return Buffer.from(base64, 'base64');
      }
      // File URL or local path
      const isFileUrl = urlStr.startsWith('file:');
      const isHttp = urlStr.startsWith('http://') || urlStr.startsWith('https://');
      if (!isHttp) {
        // treat as local filesystem path
        const fs = require('fs');
        if (isFileUrl) {
          const parsed = require('url').fileURLToPath(urlStr);
          return await fs.promises.readFile(parsed);
        }
        return await fs.promises.readFile(urlStr);
      }
      // HTTP(S) fetch using native modules
      const { URL } = require('url');
      const parsed = new URL(urlStr);
      const mod = parsed.protocol === 'https:' ? require('https') : require('http');
      return await new Promise<Buffer | null>((resolve) => {
        const req = mod.get(parsed, (res: any) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            // follow simple redirect
            this.fetchImageBuffer(res.headers.location).then(resolve).catch(() => resolve(null));
            return;
          }
          if (res.statusCode !== 200) { resolve(null); return; }
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        });
        req.on('error', () => resolve(null));
      });
    } catch { return null; }
  }

  private randId(){
    const arr = new Uint8Array(12);
    try { (global as any).crypto.getRandomValues(arr); } catch { for (let i=0;i<arr.length;i++) arr[i] = Math.floor(Math.random()*256); }
    return Array.from(arr).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
}
