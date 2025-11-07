"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HrService = void 0;
const common_1 = require("@nestjs/common");
const PDFDocument = require("pdfkit");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const settings_entity_1 = require("../settings/settings.entity");
const employee_entity_1 = require("../entities/employee.entity");
let HrService = class HrService {
    settingsRepo;
    empRepo;
    constructor(settingsRepo, empRepo) {
        this.settingsRepo = settingsRepo;
        this.empRepo = empRepo;
    }
    departments = [
        { id: 'dep-admin', name: 'Administration' },
        { id: 'dep-acad', name: 'Academics' },
        { id: 'dep-acc', name: 'Accounts' },
        { id: 'dep-hr', name: 'Human Resource' },
    ];
    employees = [];
    listDepartments() { return this.departments; }
    async listEmployees() {
        const rows = await this.empRepo.find({ order: { lastName: 'ASC', firstName: 'ASC' } });
        return rows.map(r => ({ ...r, salary: Number(r.salary || 0) }));
    }
    createDepartment(name) {
        const trimmed = (name || '').trim();
        if (!trimmed)
            return { ok: false };
        const exists = this.departments.find(d => d.name.toLowerCase() === trimmed.toLowerCase());
        if (exists)
            return exists;
        const dep = { id: this.randId(), name: trimmed };
        this.departments.push(dep);
        return dep;
    }
    async genEmployeeCode() {
        let code = '';
        do {
            const n = Math.floor(1000000 + Math.random() * 9000000);
            code = `JE${n}`;
        } while (await this.empRepo.findOne({ where: { employeeId: code } }));
        return code;
    }
    async createEmployee(payload) {
        let allowedGrades = [];
        try {
            const s = await this.settingsRepo.findOne({ where: { id: 'global' } });
            if (s?.employeeGradesJson) {
                const arr = JSON.parse(s.employeeGradesJson);
                if (Array.isArray(arr))
                    allowedGrades = arr.map((x) => String(x));
            }
        }
        catch { }
        if (allowedGrades.length > 0) {
            const g = (payload.grade || '').toString();
            if (!g || !allowedGrades.includes(g)) {
                throw new (require('@nestjs/common').BadRequestException)('Invalid grade. Select a grade from Settings.');
            }
        }
        const id = this.randId();
        const employeeId = await this.genEmployeeCode();
        const emp = { id, employeeId, ...payload, salary: Number(payload.salary || 0) };
        await this.empRepo.save(this.empRepo.create(emp));
        const saved = await this.empRepo.findOne({ where: { id } });
        return saved;
    }
    async updateEmployee(id, body) {
        const current = await this.empRepo.findOne({ where: { id } });
        if (!current) {
            throw new (require('@nestjs/common').NotFoundException)('Employee not found');
        }
        if (body && Object.prototype.hasOwnProperty.call(body, 'grade')) {
            let allowedGrades = [];
            try {
                const s = await this.settingsRepo.findOne({ where: { id: 'global' } });
                if (s?.employeeGradesJson) {
                    const arr = JSON.parse(s.employeeGradesJson);
                    if (Array.isArray(arr))
                        allowedGrades = arr.map((x) => String(x));
                }
            }
            catch { }
            if (allowedGrades.length > 0) {
                const g = (body.grade || '').toString();
                if (!g || !allowedGrades.includes(g)) {
                    throw new (require('@nestjs/common').BadRequestException)('Invalid grade. Select a grade from Settings.');
                }
            }
        }
        const updated = {
            ...current,
            ...body,
            salary: body && Object.prototype.hasOwnProperty.call(body, 'salary') ? Number(body.salary || 0) : current.salary,
        };
        await this.empRepo.save(updated);
        return await this.empRepo.findOne({ where: { id } });
    }
    async deleteEmployee(id) {
        const res = await this.empRepo.delete(id);
        if ((res.affected || 0) === 0) {
            throw new (require('@nestjs/common').NotFoundException)('Employee not found');
        }
        return { ok: true, id };
    }
    async processPayroll(rows) {
        const today = new Date().toLocaleDateString();
        const processed = (rows || []).map((r) => {
            const basic = Number(r.basic || 0);
            const allowances = Number(r.allowances || 0);
            const deductions = Number(r.deductions || 0);
            const taxPayable = Number(r.taxPayable || 0);
            const loanPayable = Number(r.loanPayable || 0);
            const otherDeductions = Number(r.otherDeductions || 0);
            const gross = basic + allowances;
            const totalDeductions = deductions + taxPayable + loanPayable + otherDeductions;
            const net = gross - totalDeductions;
            const date = r.date || today;
            return { ...r, basic, allowances, deductions, taxPayable, loanPayable, otherDeductions, gross, net, date };
        });
        const payslips = [];
        for (const r of processed) {
            const p = await this.generatePayslip(r);
            payslips.push(p);
        }
        return { ok: true, rows: processed, payslips };
    }
    async generatePayslip(row) {
        const emp = row.employeeId ? await this.empRepo.findOne({ where: { employeeId: row.employeeId } }) : undefined;
        const employeeId = emp?.employeeId || row.employeeId || 'UNKNOWN';
        const name = emp ? `${emp.firstName} ${emp.lastName}` : (row.staffName || 'UNKNOWN');
        const doc = new PDFDocument({ size: 'A4', margin: 48 });
        const chunks = [];
        const stream = doc;
        stream.on('data', (c) => chunks.push(c));
        const done = new Promise((resolve) => {
            stream.on('end', () => {
                const buf = Buffer.concat(chunks);
                resolve(buf.toString('base64'));
            });
        });
        let schoolName = 'SchoolPro';
        let schoolAddress = '';
        let logoUrl = null;
        try {
            const s = await this.settingsRepo.findOne({ where: { id: 'global' } });
            if (s) {
                if (s.schoolName)
                    schoolName = s.schoolName;
                if (s.schoolAddress)
                    schoolAddress = s.schoolAddress;
                if (s.logoUrl)
                    logoUrl = s.logoUrl;
            }
        }
        catch { }
        const pageW = doc.page.width, pageH = doc.page.height;
        const margin = 48;
        doc.rect(margin - 10, margin - 20, pageW - (margin * 2) + 20, pageH - (margin * 2) + 40).stroke('#1f2937');
        if (logoUrl) {
            try {
                const buf = await this.fetchImageBuffer(logoUrl);
                if (buf)
                    doc.image(buf, margin - 4, margin - 14, { width: 48, height: 48, fit: [48, 48] });
            }
            catch { }
        }
        doc.fontSize(16).font('Helvetica-Bold').text(schoolName, { align: 'center' });
        doc.moveDown(0.2);
        if (schoolAddress)
            doc.fontSize(10).font('Helvetica').fillColor('#374151').text(schoolAddress, { align: 'center' });
        doc.moveDown(0.4);
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(12).text(`Pay Slip for the period of ${row.month || '-'}`, { align: 'center' });
        const leftX = margin, rightX = pageW / 2 + 10, y0 = margin + 60;
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
        cursorY = y0;
        rightInfo.forEach(line => { doc.text(line, rightX, cursorY); cursorY += 14; });
        const tableTop = y0 + 70;
        const colW = (pageW - margin * 2) / 2;
        const earnX = margin, dedX = margin + colW;
        const headerH = 20, rowH = 18;
        doc.rect(earnX, tableTop, colW, headerH).fill('#0b53a5');
        doc.rect(dedX, tableTop, colW, headerH).fill('#0b53a5');
        doc.fillColor('#ffffff').font('Helvetica-Bold').text('Earnings', earnX + 8, tableTop + 4);
        doc.text('Deductions', dedX + 8, tableTop + 4);
        const earnings = [
            ['Basic Salary', Number(row.basic || 0)],
            ['Allowances', Number(row.allowances || 0)],
        ];
        const deductions = [
            ['Deductions', Number(row.deductions || 0)],
            ['Tax Payable', Number(row.taxPayable || 0)],
            ['Loan Payable', Number(row.loanPayable || 0)],
            ['Other Deductions', Number(row.otherDeductions || 0)],
        ];
        const maxRows = Math.max(earnings.length, deductions.length);
        doc.font('Helvetica').fillColor('#000');
        for (let i = 0; i < maxRows; i++) {
            const y = tableTop + headerH + i * rowH;
            doc.rect(earnX, y, colW, rowH).stroke('#e5e7eb');
            const er = earnings[i];
            if (er) {
                doc.text(er[0], earnX + 8, y + 4);
                const amt = er[1].toFixed(2);
                const tw = doc.widthOfString(amt);
                doc.text(amt, earnX + colW - tw - 8, y + 4);
            }
            doc.rect(dedX, y, colW, rowH).stroke('#e5e7eb');
            const dr = deductions[i];
            if (dr) {
                doc.text(dr[0], dedX + 8, y + 4);
                const amt = dr[1].toFixed(2);
                const tw = doc.widthOfString(amt);
                doc.text(amt, dedX + colW - tw - 8, y + 4);
            }
        }
        const gross = Number(row.gross || (Number(row.basic || 0) + Number(row.allowances || 0)));
        const totalDeductions = Number(row.deductions || 0) + Number(row.taxPayable || 0) + Number(row.loanPayable || 0) + Number(row.otherDeductions || 0);
        const net = Number(row.net ?? (gross - totalDeductions));
        const totalsY = tableTop + headerH + maxRows * rowH;
        doc.rect(earnX, totalsY, colW, rowH).fill('#f3f4f6');
        doc.rect(dedX, totalsY, colW, rowH).fill('#f3f4f6');
        doc.fillColor('#111827').font('Helvetica-Bold').text('Total Earnings', earnX + 8, totalsY + 4);
        let amt = gross.toFixed(2);
        let tw = doc.widthOfString(amt);
        doc.text(amt, earnX + colW - tw - 8, totalsY + 4);
        doc.text('Total Deductions', dedX + 8, totalsY + 4);
        amt = totalDeductions.toFixed(2);
        tw = doc.widthOfString(amt);
        doc.text(amt, dedX + colW - tw - 8, totalsY + 4);
        const netY = totalsY + rowH + 10;
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text(`Net Pay (Payable): ${net.toFixed(2)}`, margin, netY);
        const footY = netY + 40;
        doc.moveTo(margin, footY).lineTo(margin + (pageW / 2 - margin - 20), footY).stroke('#9ca3af');
        doc.moveTo(pageW / 2 + 20, footY).lineTo(pageW - margin, footY).stroke('#9ca3af');
        doc.fontSize(10).font('Helvetica').fillColor('#374151')
            .text("Employer's Signature", margin, footY + 4)
            .text("Employee's Signature", pageW / 2 + 20, footY + 4);
        doc.end();
        const b64 = await done;
        const filename = `payslip-${employeeId}-${(row.month || '').replace(/\\/g, '_') || new Date().toISOString().slice(0, 7)}.pdf`;
        return { employeeId, filename, pdfBase64: b64 };
    }
    computeLeaveDays(startDate) {
        try {
            const start = new Date(startDate);
            const now = new Date();
            const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
            const days = Math.max(0, months) * 1.5;
            return days;
        }
        catch {
            return 0;
        }
    }
    async fetchImageBuffer(urlStr) {
        try {
            if (!urlStr)
                return null;
            if (urlStr.startsWith('data:image')) {
                const base64 = urlStr.split(',')[1] || '';
                return Buffer.from(base64, 'base64');
            }
            const isFileUrl = urlStr.startsWith('file:');
            const isHttp = urlStr.startsWith('http://') || urlStr.startsWith('https://');
            if (!isHttp) {
                const fs = require('fs');
                if (isFileUrl) {
                    const parsed = require('url').fileURLToPath(urlStr);
                    return await fs.promises.readFile(parsed);
                }
                return await fs.promises.readFile(urlStr);
            }
            const { URL } = require('url');
            const parsed = new URL(urlStr);
            const mod = parsed.protocol === 'https:' ? require('https') : require('http');
            return await new Promise((resolve) => {
                const req = mod.get(parsed, (res) => {
                    if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                        this.fetchImageBuffer(res.headers.location).then(resolve).catch(() => resolve(null));
                        return;
                    }
                    if (res.statusCode !== 200) {
                        resolve(null);
                        return;
                    }
                    const chunks = [];
                    res.on('data', (c) => chunks.push(c));
                    res.on('end', () => resolve(Buffer.concat(chunks)));
                });
                req.on('error', () => resolve(null));
            });
        }
        catch {
            return null;
        }
    }
    randId() {
        const arr = new Uint8Array(12);
        try {
            global.crypto.getRandomValues(arr);
        }
        catch {
            for (let i = 0; i < arr.length; i++)
                arr[i] = Math.floor(Math.random() * 256);
        }
        return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    }
};
exports.HrService = HrService;
exports.HrService = HrService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(settings_entity_1.Settings)),
    __param(1, (0, typeorm_1.InjectRepository)(employee_entity_1.EmployeeEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], HrService);
//# sourceMappingURL=hr.service.js.map