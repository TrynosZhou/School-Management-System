"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountsController = void 0;
const common_1 = require("@nestjs/common");
const accounts_service_1 = require("./accounts.service");
const bearer_guard_1 = require("../auth/bearer.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const PDFDocument = require("pdfkit");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const settings_entity_1 = require("../settings/settings.entity");
const account_settings_entity_1 = require("../accounts/account-settings.entity");
const student_entity_1 = require("../entities/student.entity");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fee_invoice_entity_1 = require("./fee-invoice.entity");
const enrollment_entity_1 = require("../entities/enrollment.entity");
let AccountsController = class AccountsController {
    svc;
    settingsRepo;
    accSettingsRepo;
    studentsRepo;
    invoicesRepo;
    enrollmentsRepo;
    constructor(svc, settingsRepo, accSettingsRepo, studentsRepo, invoicesRepo, enrollmentsRepo) {
        this.svc = svc;
        this.settingsRepo = settingsRepo;
        this.accSettingsRepo = accSettingsRepo;
        this.studentsRepo = studentsRepo;
        this.invoicesRepo = invoicesRepo;
        this.enrollmentsRepo = enrollmentsRepo;
    }
    getSettings() { return this.svc.getSettings(); }
    updateSettings(body) { return this.svc.updateSettings(body); }
    bulk(body) {
        return this.svc.bulkGenerateInvoices(body?.term, body?.academicYear, body?.amount, body?.description);
    }
    listBalances() { return this.svc.listBalances(); }
    async transportUsers() {
        const rows = await this.invoicesRepo.createQueryBuilder('inv')
            .leftJoinAndSelect('inv.student', 'student')
            .where("LOWER(inv.description) LIKE :kw", { kw: '%transport%' })
            .getMany();
        const seen = new Set();
        const users = [];
        for (const r of rows) {
            const s = r.student;
            if (!s?.id || seen.has(s.id))
                continue;
            seen.add(s.id);
            users.push({ id: s.id, studentId: s.studentId || null, firstName: s.firstName, lastName: s.lastName, contactNumber: s.contactNumber || null, gender: s.gender || null, className: null });
        }
        try {
            const extra = await this.studentsRepo.createQueryBuilder('st').where('st.takesTransport = :t', { t: true }).getMany();
            for (const s of extra) {
                if (!seen.has(s.id)) {
                    seen.add(s.id);
                    users.push({ id: s.id, studentId: s.studentId || null, firstName: s.firstName, lastName: s.lastName, contactNumber: s.contactNumber || null, gender: s.gender || null, className: null });
                }
            }
        }
        catch { }
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
                const map = new Map();
                for (const e of enrActive) {
                    const sid = e.student?.id;
                    if (sid && !map.has(sid))
                        map.set(sid, `${e.classEntity?.name || ''}${e.classEntity?.academicYear ? ' (' + e.classEntity.academicYear + ')' : ''}`);
                }
                const needFallback = ids.filter(id => !map.has(id));
                if (needFallback.length) {
                    const enrAny = await this.enrollmentsRepo.createQueryBuilder('e')
                        .leftJoinAndSelect('e.classEntity', 'c')
                        .leftJoinAndSelect('e.student', 's')
                        .andWhere('s.id IN (:...ids)', { ids: needFallback })
                        .orderBy('e.createdAt', 'DESC')
                        .getMany();
                    for (const e of enrAny) {
                        const sid = e.student?.id;
                        if (sid && !map.has(sid))
                            map.set(sid, `${e.classEntity?.name || ''}${e.classEntity?.academicYear ? ' (' + e.classEntity.academicYear + ')' : ''}`);
                    }
                }
                users.forEach(u => { u.className = map.get(u.id) || null; });
            }
        }
        catch { }
        users.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '') || (a.firstName || '').localeCompare(b.firstName || ''));
        return users;
    }
    async balancesCsv(download = '1', res) {
        const csv = await this.svc.exportBalancesCsv();
        res.setHeader('Content-Type', 'text/csv');
        if (download !== '0')
            res.setHeader('Content-Disposition', 'attachment; filename="balances.csv"');
        res.send(csv);
    }
    termEnd(body) { return this.svc.termEndUpdate(body?.term); }
    yearEnd(body) { return this.svc.yearEndUpdate(body?.academicYear); }
    recordPayment(body) {
        const { studentIdOrCode, amount, note, receiptNumber, method, reference, receivedAt, term, academicYear } = body;
        return this.svc.recordPayment(studentIdOrCode, amount, note, { receiptNumber, method, reference, receivedAt, term, academicYear });
    }
    reconcileInvoices(studentIdOrCode, body) {
        return this.svc.reconcileInvoices(studentIdOrCode, body?.term);
    }
    normalize(body) {
        return this.svc.normalizeInvoicesForTermYear(body.term, body.academicYear);
    }
    bulkByClass(body) {
        return this.svc.bulkGenerateInvoicesByClass(body.classId, body.term, body.academicYear, body.amount, body.description);
    }
    getBalance(idOrCode) { return this.svc.getStudentBalanceById(idOrCode); }
    async getTermBalance(idOrCode, term) {
        return this.svc.getStudentTermBalanceById(idOrCode, term);
    }
    publicBalance(studentId) { return this.svc.getStudentBalanceById(studentId); }
    async invoicePdf(idOrCode, res) {
        const data = await this.svc.getStudentBalanceById(idOrCode);
        const accSettings = await this.accSettingsRepo.findOne({ where: { id: 'global' } });
        const fallbackAY = accSettings?.academicYear || '-';
        const groups = new Map();
        let dhTotal = 0, transportTotal = 0, deskTotal = 0, tuitionOther = 0;
        for (const i of data.invoices) {
            const descRaw = (i.description || '').toString();
            const desc = descRaw.toLowerCase();
            const key = `${i.term || ''}|${i.academicYear || fallbackAY || ''}`;
            if (!groups.has(key))
                groups.set(key, { aggregated: 0, dh: 0, transport: 0, desk: 0, other: 0 });
            const g = groups.get(key);
            const amt = Number(i.amount) || 0;
            if (desc.includes('dining hall')) {
                g.dh += amt;
                dhTotal += amt;
            }
            else if (desc.includes('transport')) {
                g.transport += amt;
                transportTotal += amt;
            }
            else if (desc.includes('desk')) {
                g.desk += amt;
                deskTotal += amt;
            }
            else if (desc.includes('aggregated')) {
                g.aggregated += amt;
            }
            else {
                g.other += amt;
                tuitionOther += amt;
            }
        }
        const sampleInv = data.invoices[0] || null;
        const studentModel = sampleInv?.student || null;
        const isBoarder = (studentModel?.boardingStatus === 'boarder');
        const isDay = (studentModel?.boardingStatus === 'day');
        const isStaff = !!(studentModel?.isStaffChild);
        const wantsTransport = !!(studentModel?.takesTransport);
        const wantsMeals = !!(studentModel?.takesMeals);
        const baseFee = isBoarder
            ? (parseFloat(String(accSettings?.boarderFeeAmount || '0')) || 0)
            : (parseFloat(String(accSettings?.dayFeeAmount || '0')) || 0);
        let termsCount = 0;
        for (const _g of groups.values())
            termsCount++;
        try {
            const dhFee = parseFloat(String((accSettings?.dhFee) || '0')) || 0;
            const transportFee = parseFloat(String((accSettings?.transportFee) || '0')) || 0;
            if (isDay && !isStaff) {
                if (dhTotal === 0 && wantsMeals && dhFee > 0)
                    dhTotal = dhFee * termsCount;
                if (transportTotal === 0 && wantsTransport && transportFee > 0)
                    transportTotal = transportFee * termsCount;
            }
        }
        catch { }
        const tuitionTotal = isStaff ? 0 : (baseFee * termsCount);
        const sums = { tuition: tuitionTotal, dh: dhTotal, transport: transportTotal, desk: deskTotal };
        const doc = new PDFDocument({ margin: 40 });
        res.setHeader('Content-Type', 'application/pdf');
        let rawName = (data.student.name || '').toString().trim();
        if (!rawName) {
            try {
                const studentEntity = await this.studentsRepo.findOne({ where: [{ id: idOrCode }, { studentId: idOrCode }] });
                if (studentEntity)
                    rawName = `${studentEntity.firstName || ''} ${studentEntity.lastName || ''}`.trim();
            }
            catch { }
        }
        const safeName = (rawName || '').replace(/\s+/g, '_').replace(/[^A-Za-z0-9_\-\.]/g, '');
        const filename = `statement-${safeName || data.student.code}.pdf`;
        const encoded = encodeURIComponent(filename);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`);
        doc.pipe(res);
        const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
        const theme = {
            primary: (settings?.primaryColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(settings.primaryColor)) ? settings.primaryColor : '#1d4ed8',
            text: '#111827',
            muted: '#6b7280',
            border: '#cbd5e1',
            softBorder: '#e5e7eb',
            headerBg: '#f1f5f9',
            stripe: '#fafafa',
        };
        const drawWatermark = () => { };
        const startY = doc.y;
        const logoPath = (settings?.logoUrl && !settings.logoUrl.startsWith('http'))
            ? (path.isAbsolute(settings.logoUrl) ? settings.logoUrl : path.join(process.cwd(), settings.logoUrl))
            : path.join(process.cwd(), 'assets', 'logo.png');
        try {
            if (fs.existsSync(logoPath))
                doc.image(logoPath, 40, startY, { width: 50 });
        }
        catch { }
        const schoolName = settings?.schoolName || 'SchoolPro';
        const schoolAddress = settings?.schoolAddress || '';
        doc.font('Helvetica-Bold').fillColor(theme.text).fontSize(16).text(schoolName, 0, startY, { align: 'center' });
        if (schoolAddress)
            doc.font('Helvetica').fontSize(10).fillColor(theme.muted).text(schoolAddress, { align: 'center' });
        doc.moveDown(0.4);
        const tY = doc.y;
        const tX = 40;
        const tW = doc.page.width - 80;
        doc.save();
        doc.rect(tX, tY, tW, 24).fill(theme.primary);
        doc.fillColor('#fff').font('Helvetica-Bold').fontSize(14).text('Fees Statement', tX + 12, tY + 5);
        doc.restore();
        doc.moveDown(1.0);
        const panelX = 40;
        const panelW = doc.page.width - 80;
        const labelW = 120;
        const valueW = panelW - labelW;
        const rowH = 18;
        const rows = [
            ['Student', data.student.name],
            ['Code', data.student.code],
            ['Balance', data.balance.toFixed(2)],
        ];
        const panelY = doc.y;
        const panelH = rows.length * rowH + 10;
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
        doc.font('Helvetica-Bold').fillColor(theme.text).fontSize(12).text('Invoices');
        const tableX = 40;
        const tableW = doc.page.width - 80;
        const colsInv = { date: 110, term: 90, description: tableW - (110 + 90 + 80 + 80), amount: 80, status: 80 };
        let ty = doc.y + 6;
        const bottomLimit = doc.page.height - 60;
        doc.save();
        doc.rect(tableX, ty, tableW, 22).fill(theme.headerBg);
        doc.fillColor(theme.text).font('Helvetica-Bold').fontSize(11);
        doc.text('Date', tableX + 8, ty + 5, { width: colsInv.date });
        doc.text('Term', tableX + 8 + colsInv.date, ty + 5, { width: colsInv.term });
        doc.text('Description', tableX + 8 + colsInv.date + colsInv.term, ty + 5, { width: colsInv.description });
        doc.text('Amount', tableX + 8 + colsInv.date + colsInv.term + colsInv.description, ty + 5, { width: colsInv.amount });
        doc.text('Status', tableX + 8 + colsInv.date + colsInv.term + colsInv.description + colsInv.amount, ty + 5, { width: colsInv.status });
        doc.lineWidth(0.8).strokeColor(theme.border).rect(tableX, ty, tableW, 22).stroke();
        ty += 22;
        doc.restore();
        let invoicesTotal = 0;
        for (let idx = 0; idx < data.invoices.length; idx++) {
            const i = data.invoices[idx];
            const rowH2 = 20;
            if (ty + rowH2 > bottomLimit) {
                doc.fillColor(theme.muted).font('Helvetica-Oblique').fontSize(9).text('… more invoices omitted', tableX + 8, ty + 2);
                ty += rowH2;
                break;
            }
            doc.save();
            if (idx % 2 === 0)
                doc.rect(tableX, ty, tableW, rowH2).fill(theme.stripe);
            doc.lineWidth(0.6).strokeColor(theme.softBorder).rect(tableX, ty, tableW, rowH2).stroke();
            doc.fillColor(theme.text).font('Helvetica').fontSize(10);
            let cx = tableX + 8;
            doc.text(new Date(i.createdAt).toLocaleDateString(), cx, ty + 4, { width: colsInv.date });
            cx += colsInv.date;
            doc.text(i.term || '-', cx, ty + 4, { width: colsInv.term });
            cx += colsInv.term;
            doc.text(i.description || '-', cx, ty + 4, { width: colsInv.description });
            cx += colsInv.description;
            const amt = Number(i.amount) || 0;
            invoicesTotal += amt;
            doc.text(amt.toFixed(2), cx, ty + 4, { width: colsInv.amount });
            cx += colsInv.amount;
            doc.text(i.status || '-', cx, ty + 4, { width: colsInv.status });
            doc.restore();
            ty += rowH2;
        }
        doc.save();
        let normalizedTotal = 0;
        for (const g of groups.values()) {
            const baseOnly = Math.max(0, (g.aggregated || 0) - (g.dh || 0) - (g.transport || 0) - (g.desk || 0));
            normalizedTotal += baseOnly + (g.dh || 0) + (g.transport || 0) + (g.desk || 0) + (g.other || 0);
        }
        doc.font('Helvetica-Bold').fillColor(theme.text).text('Total', tableX + 8 + colsInv.date + colsInv.term + colsInv.description, ty + 4, { width: colsInv.amount });
        doc.text(normalizedTotal.toFixed(2), tableX + 8 + colsInv.date + colsInv.term + colsInv.description, ty + 4, { width: colsInv.amount, align: 'right' });
        doc.restore();
        doc.moveDown(0.6);
        if (doc.y + 100 < bottomLimit) {
            doc.font('Helvetica-Bold').fillColor(theme.text).fontSize(12).text('Fees Breakdown');
            const bx = 40;
            const bw = doc.page.width - 80;
            const rowH3 = 20;
            let by = doc.y + 6;
            const rows3 = [
                ['Tuition', sums.tuition.toFixed(2)],
                ['Dining Hall (DH)', sums.dh.toFixed(2)],
                ['Transport', sums.transport.toFixed(2)],
                ['Desk fee', sums.desk.toFixed(2)],
                ['Grand Total', (sums.tuition + sums.dh + sums.transport + sums.desk).toFixed(2)],
            ];
            for (let idx = 0; idx < rows3.length; idx++) {
                const r = rows3[idx];
                if (by + rowH3 > bottomLimit) {
                    doc.fillColor(theme.muted).font('Helvetica-Oblique').fontSize(9).text('… breakdown truncated', bx + 8, by + 2);
                    break;
                }
                const even = idx % 2 === 0;
                doc.save();
                if (even)
                    doc.rect(bx, by, bw, rowH3).fill(theme.stripe);
                doc.restore();
                doc.save();
                doc.lineWidth(0.6).strokeColor(theme.softBorder).rect(bx, by, bw, rowH3).stroke();
                doc.fillColor(theme.muted).font('Helvetica').fontSize(10).text(r[0], bx + 10, by + 4, { width: bw / 2 - 20 });
                doc.fillColor(theme.text).font('Helvetica-Bold').fontSize(11).text(r[1], bx + bw / 2, by + 3, { width: bw / 2 - 20, align: 'right' });
                doc.restore();
                by += rowH3;
            }
        }
        doc.moveDown(0.6);
        if (doc.y + 40 < bottomLimit) {
            const px = 40;
            const pw = doc.page.width - 80;
            const ph = 34;
            const py = doc.y;
            doc.save();
            doc.lineWidth(0.8).strokeColor(theme.border).roundedRect(px, py, pw, ph, 6).stroke();
            doc.fillColor(theme.muted).font('Helvetica').fontSize(10).text('Closing balance to carry forward', px + 12, py + 8, { width: pw / 2 });
            doc.fillColor(theme.text).font('Helvetica-Bold').fontSize(12).text((data.balance).toFixed(2), px + pw / 2, py + 6, { width: pw / 2 - 12, align: 'right' });
            doc.restore();
        }
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
            ty += 22;
            doc.restore();
            let paymentsTotal = 0;
            for (let idx = 0; idx < data.transactions.length; idx++) {
                const t = data.transactions[idx];
                const rowH2 = 20;
                if (ty + rowH2 > bottomLimit) {
                    doc.fillColor(theme.muted).font('Helvetica-Oblique').fontSize(9).text('… more transactions omitted', tableX + 8, ty + 2);
                    ty += rowH2;
                    break;
                }
                doc.save();
                if (idx % 2 === 0)
                    doc.rect(tableX, ty, tableW, rowH2).fill(theme.stripe);
                doc.lineWidth(0.6).strokeColor(theme.softBorder).rect(tableX, ty, tableW, rowH2).stroke();
                doc.fillColor(theme.text).font('Helvetica').fontSize(10);
                doc.text(new Date(t.createdAt).toLocaleString(), tableX + 8, ty + 4, { width: colsTx.date - 10, ellipsis: true });
                doc.text(t.type, tableX + colsTx.date, ty + 4, { width: colsTx.type - 6, ellipsis: true });
                doc.text(t.term || '-', tableX + colsTx.date + colsTx.type, ty + 4, { width: colsTx.term - 6, ellipsis: true });
                const tay = t.academicYear || fallbackAY || '-';
                doc.text(tay, tableX + colsTx.date + colsTx.type + colsTx.term, ty + 4, { width: colsTx.year - 6, ellipsis: true });
                doc.text(t.note || '-', tableX + colsTx.date + colsTx.type + colsTx.term + colsTx.year, ty + 4, { width: colsTx.note - 6, ellipsis: true });
                const txAmt = Number(t.amount) || 0;
                if (t.type === 'payment')
                    paymentsTotal += (0 - txAmt);
                doc.text(txAmt.toFixed(2), tableX + colsTx.date + colsTx.type + colsTx.term + colsTx.year + colsTx.note, ty + 4, { width: colsTx.amount - 6, align: 'right' });
                doc.restore();
                ty += rowH2;
            }
            doc.save();
            doc.font('Helvetica-Bold').fillColor(theme.text);
            doc.text('Payments total', tableX + colsTx.date + colsTx.type + colsTx.term + colsTx.year, ty + 4, { width: colsTx.note - 6, align: 'right' });
            doc.text(paymentsTotal.toFixed(2), tableX + colsTx.date + colsTx.type + colsTx.term + colsTx.year + colsTx.note, ty + 4, { width: colsTx.amount - 6, align: 'right' });
            doc.restore();
        }
        doc.end();
    }
    recent(limit = 20, from, to, method) {
        const n = typeof limit === 'string' ? parseInt(limit, 10) : limit;
        return this.svc.recentPayments(isNaN(n) ? 20 : n, { from, to, method });
    }
    async receipt(txId, res) {
        const t = await this.svc.getTransaction(txId);
        const doc = new PDFDocument({ margin: 40 });
        res.setHeader('Content-Type', 'application/pdf');
        const sForName = t.student;
        const rawNameR = `${sForName?.firstName || ''} ${sForName?.lastName || ''}`.trim() || (sForName?.name || '');
        const safeNameR = (rawNameR || '').replace(/\s+/g, '_').replace(/[^A-Za-z0-9_\-\.]/g, '');
        const fallbackIdR = (sForName?.studentId || sForName?.id || (t.receiptNumber || t.id));
        const filename = `receipt-${safeNameR || fallbackIdR}.pdf`;
        const encoded = encodeURIComponent(filename);
        try {
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        }
        catch { }
        res.setHeader('Content-Disposition', `inline; filename="${filename}"; filename*=UTF-8''${encoded}`);
        doc.pipe(res);
        const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
        const primary = settings?.primaryColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(settings.primaryColor)
            ? settings.primaryColor : '#1d4ed8';
        const startY = doc.y;
        const logoPath = (settings?.logoUrl && !settings.logoUrl.startsWith('http'))
            ? (path.isAbsolute(settings.logoUrl) ? settings.logoUrl : path.join(process.cwd(), settings.logoUrl))
            : path.join(process.cwd(), 'assets', 'logo.png');
        try {
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 40, startY, { width: 50 });
            }
        }
        catch { }
        const schoolName = settings?.schoolName || 'SchoolPro';
        const schoolAddress = settings?.schoolAddress || '';
        doc.fillColor('#111827').font('Helvetica-Bold').fontSize(16).text(schoolName, 0, startY, { align: 'center' });
        if (schoolAddress)
            doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text(schoolAddress, { align: 'center' });
        doc.moveDown(0.4);
        const tY = doc.y;
        const tX = 40;
        const tW = doc.page.width - 80;
        doc.save();
        doc.rect(tX, tY, tW, 24).fill(primary);
        doc.fillColor('#fff').font('Helvetica-Bold').fontSize(14).text('Payment Receipt', tX + 12, tY + 5);
        doc.restore();
        doc.moveDown(1.0);
        doc.font('Helvetica').fillColor('#111827').fontSize(11);
        const s = t.student;
        const pairs = [
            ['Receipt #', t.receiptNumber || '-'],
            ['Method', t.method || '-'],
            ['Reference', t.reference || '-'],
            ['Received at', t.receivedAt || '-'],
            ['Amount Paid', Number(t.amount).toFixed(2)],
            ['Student', `${s?.firstName || ''} ${s?.lastName || ''}`.trim()],
            ['Student Code', s?.studentId || s?.id || '-'],
        ];
        const text = '#111827', muted = '#6b7280', border = '#cbd5e1', soft = '#e5e7eb';
        const panelX = 40;
        const panelW = doc.page.width - 80;
        const rowH = 20;
        const rowsPerCol = Math.ceil(pairs.length / 2);
        const panelY = doc.y - 2;
        const panelH = rowsPerCol * rowH + 14;
        doc.save();
        doc.lineWidth(0.8).strokeColor(border).roundedRect(panelX, panelY, panelW, panelH, 6).stroke();
        doc.restore();
        const leftX = 40;
        const rightX = 320;
        let y = panelY + 6;
        pairs.forEach((p, idx) => {
            const [k, v] = p;
            const x = idx < rowsPerCol ? leftX : rightX;
            if (idx === rowsPerCol)
                y = panelY + 6;
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
        if (t.note) {
            doc.moveDown(0.8);
            doc.fillColor('#6b7280').text('Note:');
            doc.fillColor('#111827').text(t.note);
        }
        doc.moveDown(1.0);
        doc.fillColor('#6b7280').fontSize(10).text('Thank you for your payment.', { align: 'center' });
        doc.end();
    }
};
exports.AccountsController = AccountsController;
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('settings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AccountsController.prototype, "getSettings", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Patch)('settings'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountsController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Post)('bulkInvoices'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountsController.prototype, "bulk", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('balances'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AccountsController.prototype, "listBalances", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('transport-users'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AccountsController.prototype, "transportUsers", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('balances.csv'),
    __param(0, (0, common_1.Query)('download')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AccountsController.prototype, "balancesCsv", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Post)('termEnd'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountsController.prototype, "termEnd", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Post)('yearEnd'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountsController.prototype, "yearEnd", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Post)('payment'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountsController.prototype, "recordPayment", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Post)('reconcile/:studentIdOrCode'),
    __param(0, (0, common_1.Param)('studentIdOrCode')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AccountsController.prototype, "reconcileInvoices", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Post)('normalize'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountsController.prototype, "normalize", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Post)('bulkInvoices/byClass'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountsController.prototype, "bulkByClass", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('student/:idOrCode/balance'),
    __param(0, (0, common_1.Param)('idOrCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountsController.prototype, "getBalance", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('student/:idOrCode/balance/term/:term'),
    __param(0, (0, common_1.Param)('idOrCode')),
    __param(1, (0, common_1.Param)('term')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AccountsController.prototype, "getTermBalance", null);
__decorate([
    (0, common_1.Get)('public/balance/:studentId'),
    __param(0, (0, common_1.Param)('studentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountsController.prototype, "publicBalance", null);
__decorate([
    (0, common_1.Get)('invoice/:idOrCode'),
    __param(0, (0, common_1.Param)('idOrCode')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AccountsController.prototype, "invoicePdf", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('payments/recent'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('method')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], AccountsController.prototype, "recent", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('receipt/:txId'),
    __param(0, (0, common_1.Param)('txId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AccountsController.prototype, "receipt", null);
exports.AccountsController = AccountsController = __decorate([
    (0, common_1.Controller)('accounts'),
    __param(1, (0, typeorm_1.InjectRepository)(settings_entity_1.Settings)),
    __param(2, (0, typeorm_1.InjectRepository)(account_settings_entity_1.AccountSettings)),
    __param(3, (0, typeorm_1.InjectRepository)(student_entity_1.Student)),
    __param(4, (0, typeorm_1.InjectRepository)(fee_invoice_entity_1.FeeInvoice)),
    __param(5, (0, typeorm_1.InjectRepository)(enrollment_entity_1.Enrollment)),
    __metadata("design:paramtypes", [accounts_service_1.AccountsService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AccountsController);
//# sourceMappingURL=accounts.controller.js.map