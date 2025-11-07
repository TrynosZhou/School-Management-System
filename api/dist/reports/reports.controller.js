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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const student_entity_1 = require("../entities/student.entity");
const mark_entity_1 = require("../marks/mark.entity");
const PDFDocument = require("pdfkit");
const fs = __importStar(require("fs"));
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const path = __importStar(require("path"));
const pdf_lib_1 = require("pdf-lib");
const accounts_service_1 = require("../accounts/accounts.service");
const settings_entity_1 = require("../settings/settings.entity");
const report_remark_entity_1 = require("./report-remark.entity");
const attendance_entity_1 = require("../entities/attendance.entity");
const enrollment_entity_1 = require("../entities/enrollment.entity");
const parents_service_1 = require("../parents/parents.service");
const email_service_1 = require("../email/email.service");
const bearer_guard_1 = require("../auth/bearer.guard");
let ReportsController = class ReportsController {
    students;
    marks;
    settingsRepo;
    remarksRepo;
    attendanceRepo;
    enrollRepo;
    parentsSvc;
    email;
    accounts;
    constructor(students, marks, settingsRepo, remarksRepo, attendanceRepo, enrollRepo, parentsSvc, email, accounts) {
        this.students = students;
        this.marks = marks;
        this.settingsRepo = settingsRepo;
        this.remarksRepo = remarksRepo;
        this.attendanceRepo = attendanceRepo;
        this.enrollRepo = enrollRepo;
        this.parentsSvc = parentsSvc;
        this.email = email;
        this.accounts = accounts;
    }
    async fetchImageBuffer(url) {
        try {
            if (!url || typeof url !== 'string')
                return null;
            const u = url.trim();
            if (u.startsWith('data:')) {
                const comma = u.indexOf(',');
                if (comma >= 0) {
                    const meta = u.slice(5, comma);
                    const data = u.slice(comma + 1);
                    const isBase64 = /;base64/i.test(meta);
                    return Buffer.from(data, isBase64 ? 'base64' : 'utf8');
                }
            }
            else if (u.startsWith('http://') || u.startsWith('https://')) {
                const doReq = (uri, redirects = 0) => new Promise((resolve) => {
                    const mod = uri.startsWith('https') ? https : http;
                    const req = mod.get(uri, (resp) => {
                        const status = resp.statusCode || 0;
                        const loc = resp.headers.location;
                        if (status >= 300 && status < 400 && loc && redirects < 5) {
                            resp.resume();
                            doReq(loc, redirects + 1).then(resolve);
                            return;
                        }
                        if (status !== 200) {
                            resp.resume();
                            resolve(null);
                            return;
                        }
                        const bufs = [];
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
            }
            else if (!path.isAbsolute(u)) {
                filePath = path.resolve(process.cwd(), u);
            }
            const buf = await fs.promises.readFile(filePath);
            return buf;
        }
        catch {
            return null;
        }
    }
    async reportCard(req, studentIdParam, term, res) {
        let student = await this.students.findOne({ where: { id: studentIdParam } });
        if (!student) {
            student = await this.students.findOne({ where: { studentId: studentIdParam } });
        }
        if (!student) {
            res.status(404).json({ message: 'Student not found' });
            return;
        }
        const role = (req?.user?.role || '').toLowerCase();
        if (role === 'parent' || role === 'student') {
            if (role === 'parent') {
                const linked = await this.parentsSvc.isLinked(req.user.sub, student.id);
                if (!linked)
                    throw new common_1.ForbiddenException('You are not linked to this student');
            }
            try {
                const bal = await this.accounts.getStudentTermBalanceById(student.id, term);
                const balanceNum = Number(bal?.balance) || 0;
                console.log(`[DEBUG] Balance check - studentId: ${student.id}, term: ${term || 'current'}, balance: ${bal?.balance}, parsed: ${balanceNum}`);
                if (balanceNum > 0.01) {
                    console.log(`[DEBUG] ❌ Access DENIED due to outstanding balance: ${balanceNum}`);
                    throw new common_1.ForbiddenException('This report card is temporarily unavailable due to outstanding arrears. Please settle arrears to view.');
                }
                else {
                    console.log(`[DEBUG] ✅ Balance check passed: ${balanceNum}`);
                }
            }
            catch (err) {
                if (err instanceof common_1.ForbiddenException)
                    throw err;
                console.log(`[DEBUG] Balance check error (not blocking):`, err);
            }
            try {
                console.log(`[DEBUG] Parent access check - searching for remarks:`, { studentId: student.id, term: term || 'none' });
                const rem = await this.remarksRepo.findOne({ where: { studentId: student.id, ...(term ? { term: (0, typeorm_2.Like)(`%${term}%`) } : {}) } });
                if (!rem) {
                    console.log(`[DEBUG] ❌ NO REMARK RECORD FOUND for student ${student.id}, term: ${term || 'none'}`);
                    throw new common_1.ForbiddenException('This report card is not yet ready. Remarks are pending.');
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
                    if (!teacherOk)
                        reasons.push('teacher remark missing');
                    if (!principalOk)
                        reasons.push('principal remark missing');
                    if (!statusOk)
                        reasons.push(`status is '${rem.status}' not 'ready_for_pdf'`);
                    console.log(`[DEBUG] ❌ Access DENIED. Reasons:`, reasons.join(', '));
                    throw new common_1.ForbiddenException('This report card is not yet ready. Remarks are pending.');
                }
                console.log(`[DEBUG] ✅ Access GRANTED - all checks passed`);
            }
            catch (err) {
                if (err instanceof common_1.ForbiddenException)
                    throw err;
            }
        }
        const qAny = req?.query || {};
        const examTypeRaw = qAny?.examType;
        const examTypeParam = (typeof examTypeRaw === 'string' && examTypeRaw.trim().length > 0) ? examTypeRaw.trim() : undefined;
        const classIdRaw = qAny?.classId;
        const classIdParam = (typeof classIdRaw === 'string' && classIdRaw.trim().length > 0) ? classIdRaw.trim() : undefined;
        const where = { student: { id: student.id } };
        if (term)
            where.session = (0, typeorm_2.Like)(`%${term}%`);
        if (examTypeParam)
            where.examType = examTypeParam;
        if (classIdParam)
            where.klass = { id: classIdParam };
        let items = await this.marks.find({ where, order: { session: 'ASC' }, relations: { student: true, subject: true, klass: true } });
        if (!items || items.length === 0) {
            if (examTypeParam) {
                const w2 = { ...where };
                delete w2.examType;
                w2.examType = (0, typeorm_2.IsNull)();
                items = await this.marks.find({ where: w2, order: { session: 'ASC' }, relations: { student: true, subject: true, klass: true } });
            }
        }
        if (!items || items.length === 0) {
            if (term) {
                const w3 = { student: { id: student.id } };
                if (examTypeParam)
                    w3.examType = examTypeParam;
                if (classIdParam)
                    w3.klass = { id: classIdParam };
                items = await this.marks.find({ where: w3, order: { session: 'ASC' }, relations: { student: true, subject: true, klass: true } });
            }
        }
        if (items?.length) {
            items.sort((a, b) => {
                const ca = new Date(a.createdAt || 0).getTime();
                const cb = new Date(b.createdAt || 0).getTime();
                if (cb !== ca)
                    return cb - ca;
                const ia = (a.id || '').toString();
                const ib = (b.id || '').toString();
                return ib.localeCompare(ia);
            });
            const seen = new Set();
            const unique = [];
            for (const m of items) {
                const subjId = (m.subject?.id ?? 'null').toString();
                const key = `${subjId}|${m.session}|${m.examType ?? ''}`;
                if (seen.has(key))
                    continue;
                seen.add(key);
                unique.push(m);
            }
            items = unique;
        }
        const doc = new PDFDocument({ margin: 28 });
        const theme = {
            primary: '#1992d4',
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
        };
        const rawName = `${student.firstName} ${student.lastName}`;
        const safeBase = rawName.replace(/[\r\n\"]+/g, '').trim() || 'report-card';
        const filename = `${safeBase}.pdf`;
        const q = res.req.query || {};
        const forceDownload = q.download === '1' || q.download === 'true';
        const dispositionType = forceDownload ? 'attachment' : 'inline';
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        let savedRemarkVar = null;
        doc.on('end', () => {
            try {
                const pdf = Buffer.concat(chunks);
                res.setHeader('Content-Type', 'application/pdf');
                try {
                    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
                }
                catch { }
                const encoded = encodeURIComponent(filename);
                res.setHeader('Content-Disposition', `${dispositionType}; filename="${filename}"; filename*=UTF-8''${encoded}`);
                res.end(pdf);
            }
            catch {
                try {
                    res.status(500).json({ message: 'Report generation failed' });
                }
                catch { }
            }
        });
        doc.on('error', () => {
            try {
                res.status(500).json({ message: 'Report generation failed' });
            }
            catch { }
        });
        try {
            const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
            if (settings?.primaryColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(settings.primaryColor)) {
                theme.primary = settings.primaryColor;
            }
            const startY = 0;
            const bannerH = 60;
            doc.save();
            doc.rect(0, startY, doc.page.width, bannerH).fill('#0b3d91');
            doc.restore();
            try {
                const logoUrl = settings?.logoUrl || '';
                const buf = await this.fetchImageBuffer(logoUrl);
                if (buf) {
                    doc.image(buf, 16, startY + 8, { width: 130, height: bannerH - 16, fit: [130, bannerH - 16] });
                }
            }
            catch { }
            const schoolName = settings?.schoolName || process.env.SCHOOL_NAME || 'SchoolPro';
            const schoolAddress = settings?.schoolAddress || process.env.SCHOOL_ADDRESS || '';
            doc.font('Helvetica-Bold').fillColor('#ffffff').fontSize(14).text(schoolName, 0, startY + 6, {
                align: 'center', width: doc.page.width
            });
            if (schoolAddress) {
                doc.font('Helvetica').fillColor('#ffffff').fontSize(10).text(schoolAddress, 0, startY + 24, {
                    align: 'center', width: doc.page.width
                });
                doc.fillColor(theme.text);
            }
            doc.y = bannerH + 12;
            doc.moveDown(0.6);
            const sessionSet = new Set((items || []).map(i => String(i.session)).filter(Boolean));
            const uniqueSessions = Array.from(sessionSet.values()).sort();
            const displayTerm = term ? (uniqueSessions.length === 1 ? uniqueSessions[0] : term) : (uniqueSessions.length === 1 ? uniqueSessions[0] : 'All Terms');
            const currentYear = new Date().getFullYear();
            const termNum = /Term\s*(\d+)/i.exec(displayTerm || '')?.[1] || '';
            const titleText = examTypeParam
                ? `${examTypeParam}${termNum ? ' ' + termNum : ''}, ${currentYear} Report Card`
                : `${displayTerm}, ${currentYear} Report Card`;
            doc.font('Helvetica-Bold').fontSize(20).fillColor('#111827').text(titleText, { align: 'center' });
            doc.moveDown(0.2);
            const lineX = 40;
            const lineW = doc.page.width - 80;
            doc.save();
            doc.moveTo(lineX, doc.y).lineTo(lineX + lineW, doc.y).strokeColor(theme.primary).lineWidth(2).stroke();
            doc.restore();
            doc.moveDown(0.5);
            if (!items || items.length === 0) {
                doc.moveDown(1);
                doc.font('Helvetica').fontSize(12).fillColor('#374151').text('No marks found for the selected criteria.');
                doc.end();
                return;
            }
            const infoX = 40;
            const infoW = doc.page.width - 80;
            const infoY = doc.y + 4;
            const klassRef = items[0]?.klass;
            const klassId = klassRef?.id;
            const klassName = klassRef?.name || '-';
            const effectiveTerm = term || (items.length ? String(items[items.length - 1].session) : undefined);
            let classRank = null;
            let classCohortSize = 0;
            let formRank = null;
            let formCohortSize = 0;
            if (klassRef && klassId && effectiveTerm) {
                const cmWhere = { klass: { id: klassId }, session: (0, typeorm_2.Like)(`%${effectiveTerm}%`) };
                if (examTypeParam)
                    cmWhere.examType = examTypeParam;
                let classMarks = await this.marks.find({ where: cmWhere });
                if ((!classMarks || classMarks.length === 0) && examTypeParam) {
                    const cmWhere2 = { klass: { id: klassId }, session: (0, typeorm_2.Like)(`%${effectiveTerm}%`) };
                    classMarks = await this.marks.find({ where: cmWhere2 });
                }
                if (!classMarks || classMarks.length === 0) {
                    const cmWhere3 = { klass: { id: klassId } };
                    classMarks = await this.marks.find({ where: cmWhere3 });
                }
                const classStudentIds = Array.from(new Set(classMarks.map(m => m.student?.id).filter(Boolean)));
                classCohortSize = classStudentIds.length;
                const classAgg = new Map();
                classMarks.forEach(m => { const sid = m.student?.id; if (!sid)
                    return; const e = classAgg.get(sid) || { sum: 0, n: 0 }; e.sum += Number(m.score) || 0; e.n += 1; classAgg.set(sid, e); });
                const classAvgs = Array.from(classAgg.entries()).map(([sid, v]) => [sid, v.n ? v.sum / v.n : 0]).sort((a, b) => b[1] - a[1]);
                const idxC = classAvgs.findIndex(([sid]) => sid === student.id);
                if (idxC >= 0)
                    classRank = idxC + 1;
                const tmWhere = { session: (0, typeorm_2.Like)(`%${effectiveTerm}%`) };
                if (examTypeParam)
                    tmWhere.examType = examTypeParam;
                let termMarks = await this.marks.find({ where: tmWhere });
                if ((!termMarks || termMarks.length === 0) && examTypeParam) {
                    const tmWhere2 = { session: (0, typeorm_2.Like)(`%${effectiveTerm}%`) };
                    termMarks = await this.marks.find({ where: tmWhere2 });
                }
                if (!termMarks || termMarks.length === 0) {
                    termMarks = await this.marks.find();
                }
                const formMarks = termMarks.filter(m => { const k = m.klass; return k && k.gradeLevel === klassRef.gradeLevel && k.academicYear === klassRef.academicYear; });
                const formAgg = new Map();
                formMarks.forEach(m => { const sid = m.student?.id; if (!sid)
                    return; const e = formAgg.get(sid) || { sum: 0, n: 0 }; e.sum += Number(m.score) || 0; e.n += 1; formAgg.set(sid, e); });
                const formAvgs = Array.from(formAgg.entries()).map(([sid, v]) => [sid, v.n ? v.sum / v.n : 0]).sort((a, b) => b[1] - a[1]);
                formCohortSize = formAvgs.length;
                const idxF = formAvgs.findIndex(([sid]) => sid === student.id);
                if (idxF >= 0)
                    formRank = idxF + 1;
            }
            let attendanceStr = 'N/A';
            try {
                const attWhere = { student: { id: student.id } };
                if (effectiveTerm)
                    attWhere.term = effectiveTerm;
                const attendance = await this.attendanceRepo.find({ where: attWhere });
                const totalDays = attendance.length;
                const present = attendance.filter(a => a.present).length;
                if (totalDays > 0)
                    attendanceStr = `${present}/${totalDays} (${((present / totalDays) * 100).toFixed(1)}%)`;
            }
            catch { }
            doc.font('Helvetica').fillColor('#111827').fontSize(11);
            const idLabel = 'Student I.D:';
            const nameLabel = 'Name:';
            const classLabel = 'Class:';
            let x = infoX;
            doc.text(idLabel, x, infoY);
            x += doc.widthOfString(idLabel) + 6;
            doc.fillColor(theme.link).text(`${student.studentId || student.id}`, x, infoY);
            x += doc.widthOfString(`${student.studentId || student.id}`) + 20;
            doc.fillColor('#111827').text(nameLabel, x, infoY);
            x += doc.widthOfString(nameLabel) + 6;
            doc.fillColor('#111827').text(`${student.firstName} ${student.lastName}`, x, infoY);
            x += doc.widthOfString(`${student.firstName} ${student.lastName}`) + 20;
            doc.fillColor('#111827').text(classLabel, x, infoY);
            x += doc.widthOfString(classLabel) + 6;
            doc.fillColor(theme.link).text(klassName, x, infoY);
            x = infoX;
            const line2Y = infoY + 26;
            const classPosLabel = 'Class position:';
            doc.fillColor('#111827').text(classPosLabel, x, line2Y);
            x += doc.widthOfString(classPosLabel) + 6;
            const classPosVal = (classRank && classCohortSize) ? `${classRank}/${classCohortSize}` : '-';
            doc.fillColor(theme.link).text(classPosVal, x, line2Y);
            x += doc.widthOfString(classPosVal) + 20;
            const formPosLabel = 'Form position:';
            doc.fillColor('#111827').text(formPosLabel, x, line2Y);
            x += doc.widthOfString(formPosLabel) + 6;
            const formPosVal = (formRank && formCohortSize) ? `${formRank}/${formCohortSize}` : '-';
            doc.fillColor(theme.link).text(formPosVal, x, line2Y);
            const passCountTop = (items || []).filter(i => Number(i.score) >= 50).length;
            x += doc.widthOfString(formPosVal) + 20;
            const passedLabel = 'Subjects Passed:';
            doc.fillColor('#111827').text(passedLabel, x, line2Y);
            x += doc.widthOfString(passedLabel) + 6;
            const passedStr = String(passCountTop || 0);
            doc.fillColor(theme.link).text(passedStr, x, line2Y);
            x += doc.widthOfString(passedStr) + 20;
            const attLabel = 'Attendance:';
            doc.fillColor('#111827').text(attLabel, x, line2Y);
            x += doc.widthOfString(attLabel) + 6;
            doc.fillColor(theme.link).text(attendanceStr, x, line2Y);
            doc.fillColor('#111827');
            doc.moveDown(1.5);
            const tableX = doc.page.margins.left;
            const tableW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
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
            };
            let ty = doc.y + 6;
            doc.save();
            doc.rect(tableX, ty, tableW, 24).fill(theme.headerBg);
            doc.fillColor(theme.text).font('Helvetica-Bold').fontSize(10);
            let hx = tableX + 8;
            doc.text('#', hx, ty + 6, { width: colW.idx });
            hx += colW.idx;
            doc.text('Subject', hx, ty + 6, { width: colW.subject });
            hx += colW.subject;
            doc.text('Mark', hx, ty + 6, { width: colW.mark });
            hx += colW.mark;
            doc.text('Average', hx, ty + 6, { width: colW.mean });
            hx += colW.mean;
            doc.text('Position', hx, ty + 6, { width: colW.rank });
            hx += colW.rank;
            doc.text('Grade', hx, ty + 6, { width: colW.grade });
            hx += colW.grade;
            if (isForm5Or6) {
                doc.text('Points', hx, ty + 6, { width: colW.points });
                hx += colW.points;
            }
            doc.text('Comment', hx, ty + 6, { width: colW.comment });
            doc.lineWidth(0.8).strokeColor(theme.border).rect(tableX, ty, tableW, 24).stroke();
            ty += 24;
            doc.restore();
            doc.strokeColor('#000');
            const parseBands = (json) => {
                try {
                    if (!json)
                        return null;
                    const arr = JSON.parse(json);
                    if (!Array.isArray(arr) || !arr.length)
                        return null;
                    const out = [];
                    for (const it of arr) {
                        const g = (it?.grade || '').toString().trim();
                        let min = Number((it?.min ?? '').toString());
                        let max = Number((it?.max ?? '').toString());
                        if ((isNaN(min) || isNaN(max)) && typeof it?.range === 'string') {
                            const m = /(-?\d+(?:\.\d+)?)\s*[\-\u2013\u2014]\s*(-?\d+(?:\.\d+)?)/.exec(it.range);
                            if (m) {
                                min = parseFloat(m[1]);
                                max = parseFloat(m[2]);
                            }
                        }
                        if (!g || isNaN(min) || isNaN(max))
                            continue;
                        if (min > max) {
                            const t = min;
                            min = max;
                            max = t;
                        }
                        out.push({ grade: g, min, max });
                    }
                    out.sort((a, b) => b.min - a.min);
                    return out.length ? out : null;
                }
                catch {
                    return null;
                }
            };
            let gradingBands = parseBands(settings?.gradingBandsJson || null);
            if (gradingBands && gradingBands.length > 0) {
                const allInvalid = gradingBands.every(b => b.min === 0 && b.max === 0);
                if (allInvalid) {
                    console.log('[Report Card PDF] Settings bands are invalid (all zeros), using defaults');
                    gradingBands = null;
                }
                else {
                    console.log('[Report Card PDF] Using Settings bands:', JSON.stringify(gradingBands));
                }
            }
            if (!gradingBands || gradingBands.length === 0) {
                console.log('[Report Card PDF] Using hardcoded default bands');
                gradingBands = [
                    { grade: 'A*', min: 90, max: 100 },
                    { grade: 'A', min: 70, max: 89 },
                    { grade: 'B', min: 60, max: 69 },
                    { grade: 'C', min: 50, max: 59 },
                    { grade: 'D', min: 45, max: 49 },
                    { grade: 'E', min: 40, max: 44 },
                    { grade: 'U', min: 0, max: 39 },
                ];
            }
            const gradeFor = (scoreNum) => {
                if (gradingBands && gradingBands.length) {
                    for (const b of gradingBands) {
                        if (scoreNum >= b.min && scoreNum <= b.max) {
                            console.log(`[Report Card gradeFor] Score ${scoreNum} matched band ${b.grade} (${b.min}-${b.max})`);
                            return b.grade;
                        }
                    }
                    console.log(`[Report Card gradeFor] No band match for score ${scoreNum}`);
                    return '';
                }
                return '';
            };
            const pointsFor = (grade) => {
                const g = (grade || '').toUpperCase().trim();
                if (!g)
                    return '';
                if (g === 'A*' || g === 'A')
                    return 5;
                if (g === 'B')
                    return 4;
                if (g === 'C')
                    return 3;
                if (g === 'D')
                    return 2;
                if (g === 'E')
                    return 1;
                if (g === 'U')
                    return 0;
                return '';
            };
            const commentFor = (scoreNum) => {
                if (scoreNum >= 80)
                    return 'Excellent effort';
                if (scoreNum >= 70)
                    return 'Good work, keep it up';
                if (scoreNum >= 60)
                    return 'Fair, aim higher';
                if (scoreNum >= 50)
                    return 'Needs to improve';
                return 'Can do better than this';
            };
            const total = (items || []).reduce((a, it) => a + (Number(it.score) || 0), 0);
            const avg = (items && items.length) ? (total / items.length) : 0;
            const gpa = 0;
            const klassRef2 = items[0]?.klass;
            const klassId2 = klassRef2?.id;
            const subjectStatsByTerm = new Map();
            const buildSubjectStatsForTerm = async (termX) => {
                if (!klassRef2 || !klassId2 || !termX)
                    return new Map();
                const cached = subjectStatsByTerm.get(termX);
                if (cached)
                    return cached;
                const classWhere = { klass: { id: klassId2 }, session: (0, typeorm_2.Like)(`%${termX}%`) };
                if (examTypeParam)
                    classWhere.examType = examTypeParam;
                let classTermMarks = await this.marks.find({ where: classWhere });
                if ((!classTermMarks || classTermMarks.length === 0) && examTypeParam) {
                    const classWhere2 = { klass: { id: klassId2 }, session: (0, typeorm_2.Like)(`%${termX}%`) };
                    classTermMarks = await this.marks.find({ where: classWhere2 });
                }
                const bySubjectClass = new Map();
                classTermMarks.forEach(m => {
                    const sid = m.student?.id;
                    const sj = m.subject?.id;
                    if (!sid || !sj)
                        return;
                    const arr = bySubjectClass.get(sj) || [];
                    arr.push({ sid, score: Number(m.score) || 0 });
                    bySubjectClass.set(sj, arr);
                });
                const map = new Map();
                bySubjectClass.forEach((arr, subjId) => {
                    const mean = arr.length ? arr.reduce((a, b) => a + b.score, 0) / arr.length : 0;
                    const sorted = [...arr].sort((a, b) => b.score - a.score);
                    const idx = sorted.findIndex(x => x.sid === student.id);
                    const rank = idx >= 0 ? (idx + 1) : null;
                    map.set(subjId, { mean, rank, total: arr.length });
                });
                subjectStatsByTerm.set(termX, map);
                return map;
            };
            if (effectiveTerm) {
                await buildSubjectStatsForTerm(effectiveTerm);
            }
            for (let idx = 0; idx < items.length; idx++) {
                const m = items[idx];
                const subjObj = m.subject;
                const subj = subjObj ? `${subjObj.name}` : '-';
                const scoreNum = Number(m.score);
                const letter = gradeFor(scoreNum);
                const termForRow = term || String(m.session || '') || effectiveTerm || '';
                let stats;
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
                doc.text(String(idx + 1), cx, ty + 5, { width: colW.idx, align: 'left' });
                cx += colW.idx;
                doc.text(subj, cx, ty + 5, { width: colW.subject });
                cx += colW.subject;
                doc.fillColor(theme.link).text(String(scoreNum), cx, ty + 5, { width: colW.mark });
                cx += colW.mark;
                doc.fillColor(theme.text).text(`${mean ? mean.toFixed(0) : '-'}`, cx, ty + 5, { width: colW.mean });
                cx += colW.mean;
                doc.text(rank && denom ? `${rank}/${denom}` : '-', cx, ty + 5, { width: colW.rank });
                cx += colW.rank;
                doc.font('Helvetica-Bold').text(letter, cx, ty + 5, { width: colW.grade });
                cx += colW.grade;
                if (isForm5Or6) {
                    const pts = pointsFor(letter);
                    doc.text(pts !== '' ? String(pts) : '-', cx, ty + 5, { width: colW.points });
                    cx += colW.points;
                }
                doc.text(comment, cx, ty + 5, { width: colW.comment });
                ty += rowH2;
            }
            const avgRowH = 20;
            doc.save();
            if ((items.length % 2) === 0) {
                doc.rect(tableX, ty, tableW, avgRowH).fill(theme.stripe);
            }
            doc.lineWidth(0.6).strokeColor(theme.softBorder).rect(tableX, ty, tableW, avgRowH).stroke();
            doc.fillColor('#111827').font('Helvetica-Bold').fontSize(10);
            let ax = tableX + 8;
            ax += colW.idx;
            doc.text('Average Mark', ax, ty + 5, { width: colW.subject });
            ax += colW.subject;
            doc.fillColor(theme.link).text(`${avg.toFixed(0)}`, ax, ty + 5, { width: colW.mark });
            ty += avgRowH;
            doc.restore();
            const commentsStartY = ty + 24;
            const examTypeRaw2 = q?.examType;
            const examType = (typeof examTypeRaw2 === 'string' && examTypeRaw2.trim().length > 0) ? examTypeRaw2.trim() : undefined;
            const lookupTerm = term || effectiveTerm || undefined;
            let savedRemark = await this.remarksRepo.findOne({
                where: {
                    studentId: student.id,
                    ...(lookupTerm ? { term: (0, typeorm_2.Like)(`%${lookupTerm}%`) } : { term: (0, typeorm_2.IsNull)() }),
                    ...(examType ? { examType } : { examType: (0, typeorm_2.IsNull)() })
                }
            });
            if (!savedRemark && examType) {
                savedRemark = await this.remarksRepo.findOne({
                    where: {
                        studentId: student.id,
                        ...(lookupTerm ? { term: (0, typeorm_2.Like)(`%${lookupTerm}%`) } : { term: (0, typeorm_2.IsNull)() }),
                        examType: (0, typeorm_2.IsNull)(),
                    }
                });
            }
            if (!savedRemark && !examType && lookupTerm) {
                try {
                    const anyTermRecs = await this.remarksRepo.find({ where: { studentId: student.id, term: (0, typeorm_2.Like)(`%${lookupTerm}%`) }, order: { updatedAt: 'DESC', id: 'DESC' } });
                    const withText = anyTermRecs.find(r => (r.teacherRemark && String(r.teacherRemark).trim().length) || (r.principalRemark && String(r.principalRemark).trim().length));
                    if (withText)
                        savedRemark = withText;
                }
                catch { }
            }
            savedRemarkVar = savedRemark || null;
            const colGap = 36;
            const shrink = 20;
            const remarkColW = ((doc.page.width - 80 - colGap) / 2) - shrink;
            const leftX = 40;
            const rightX = leftX + remarkColW + colGap;
            const fieldH = 120;
            const yFromBottom = 120;
            const pageH = doc.page.height;
            let fieldTopY = pageH - (yFromBottom + fieldH);
            const moveDown = 56;
            fieldTopY = fieldTopY + moveDown;
            const fieldBottomY = fieldTopY + fieldH;
            const labelYOffset = -18;
            doc.fillColor('#111827').font('Helvetica-Bold').fontSize(12)
                .text('Form Teacher', leftX, fieldTopY + labelYOffset, { width: remarkColW });
            doc.fillColor('#111827').font('Helvetica-Bold').fontSize(12)
                .text("Head's Comment", rightX, fieldTopY + labelYOffset, { width: remarkColW });
            doc.lineWidth(1).strokeColor(theme.border)
                .roundedRect(leftX, fieldTopY, remarkColW, fieldH, 4).stroke();
            doc.lineWidth(1).strokeColor(theme.border)
                .roundedRect(rightX, fieldTopY, remarkColW, fieldH, 4).stroke();
            doc.save();
            doc.font('Helvetica').fontSize(9).fillColor('#111827');
            const pad = 6;
            const teacherText = (savedRemarkVar?.teacherRemark || '').toString();
            const principalText = (savedRemarkVar?.principalRemark || '').toString();
            doc.text(teacherText, leftX + pad, fieldTopY + pad, { width: remarkColW - pad * 2, height: fieldH - pad * 2 });
            doc.font('Helvetica-Bold').fontSize(9);
            doc.text(principalText, rightX + pad, fieldTopY + pad, { width: remarkColW - pad * 2, height: fieldH - pad * 2 });
            doc.restore();
            const sigLineW = 200;
            const sigY = fieldBottomY + 14;
            doc.lineWidth(0.8).strokeColor(theme.softBorder)
                .moveTo(leftX, sigY).lineTo(leftX + sigLineW, sigY).stroke();
            doc.lineWidth(0.8).strokeColor(theme.softBorder)
                .moveTo(rightX, sigY).lineTo(rightX + sigLineW, sigY).stroke();
            const teacherName = (savedRemarkVar?.teacherUpdatedByName || '').toString();
            const principalName = (savedRemarkVar?.principalUpdatedByName || '').toString();
            doc.fillColor('#6b7280').font('Helvetica').fontSize(10)
                .text('Signature — Form Teacher', leftX, sigY + 4, { width: sigLineW });
            if (teacherName)
                doc.fillColor('#6b7280').font('Helvetica').fontSize(9).text(teacherName, leftX, sigY + 18, { width: sigLineW });
            doc.fillColor('#6b7280').font('Helvetica').fontSize(10)
                .text('Signature — Head/Principal', rightX, sigY + 4, { width: sigLineW });
            if (principalName)
                doc.fillColor('#6b7280').font('Helvetica').fontSize(9).text(principalName, rightX, sigY + 18, { width: sigLineW });
            doc.end();
        }
        catch (err) {
            try {
                res.status(500).json({ message: 'Report generation failed' });
            }
            catch { }
            return;
        }
    }
    async reportCardViewer(studentIdParam, term, res) {
        let student = await this.students.findOne({ where: { id: studentIdParam } });
        if (!student)
            student = await this.students.findOne({ where: { studentId: studentIdParam } });
        const displayId = student?.studentId || student?.id || studentIdParam;
        const displayName = student ? `${student.firstName} ${student.lastName}` : 'Student';
        const basePdf = new URL(`${(process.env.WEB_BASE_URL || 'http://localhost:3000')}/api/reports/report-card/${studentIdParam}`);
        if (term)
            basePdf.searchParams.set('term', term);
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
          const base = ${JSON.stringify((process.env.WEB_BASE_URL || 'http://localhost:3000') + '/api/reports/report-card/')} + ${JSON.stringify(String(studentIdParam))};
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
    async studentIdCard(studentIdParam, res) {
        let student = await this.students.findOne({ where: { id: studentIdParam } });
        if (!student) {
            student = await this.students.findOne({ where: { studentId: studentIdParam } });
        }
        if (!student) {
            res.status(404).json({ message: 'Student not found' });
            return;
        }
        const enr = await this.enrollRepo.find({ where: { student: { id: student.id }, status: 'active' }, order: { createdAt: 'DESC' } });
        const klass = enr[0]?.classEntity;
        const classDisplay = klass ? `${klass.name}` : '-';
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
            createdAt: student.createdAt ? new Date(student.createdAt).toISOString() : null,
            updatedAt: student.updatedAt ? new Date(student.updatedAt).toISOString() : null,
        };
        const qrData = JSON.stringify(qrPayload);
        let qrBuf = null;
        try {
            const dataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 200 });
            const base64 = dataUrl.split(',')[1];
            qrBuf = Buffer.from(base64, 'base64');
        }
        catch { }
        const doc = new PDFDocument({ size: [320, 200], margin: 10 });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => {
            const pdf = Buffer.concat(chunks);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="student-id-${(student.studentId || student.id).replace(/\s+/g, '-')}.pdf"`);
            res.end(pdf);
        });
        doc.on('error', () => {
            try {
                res.status(500).json({ message: 'ID card generation failed' });
            }
            catch { }
        });
        doc.roundedRect(5, 5, doc.page.width - 10, doc.page.height - 10, 8).stroke('#cbd5e1');
        doc.fillColor('#111827');
        const bannerH2 = 28;
        doc.save();
        doc.rect(5, 5, doc.page.width - 10, bannerH2).fill('#0b3d91');
        doc.restore();
        doc.font('Helvetica-Bold').fontSize(13).fillColor('#ffffff').text('Student ID Card', 5, 10, { align: 'center', width: doc.page.width - 10 });
        try {
            const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
            const logoPath = settings?.logoUrl && !settings.logoUrl.startsWith('http')
                ? (path.isAbsolute(settings.logoUrl) ? settings.logoUrl : path.join(process.cwd(), settings.logoUrl))
                : (settings?.logoUrl && settings.logoUrl.startsWith('http') ? settings.logoUrl : null);
            const schoolName = settings?.schoolName || process.env.SCHOOL_NAME || 'SchoolPro';
            let lx = 12;
            const ly = 8;
            const lw = 20;
            const lh = 20;
            if (logoPath && typeof logoPath === 'string') {
                try {
                    doc.image(logoPath, lx, ly, { width: lw, height: lh, fit: [lw, lh] });
                }
                catch { }
            }
        }
        catch { }
        const leftX = 12;
        const topY = 40;
        const rightX = leftX + 100;
        const contentW = doc.page.width - rightX - 12;
        let y = topY;
        const photoCandidates = [];
        const assetsDir = path.join(process.cwd(), 'assets', 'photos');
        const sidForPhoto = (student.studentId || student.id).toString();
        ['jpg', 'jpeg', 'png', 'webp'].forEach(ext => {
            photoCandidates.push(path.join(assetsDir, `${sidForPhoto}.${ext}`));
            photoCandidates.push(path.join(assetsDir, `${student.id}.${ext}`));
        });
        let photoPath = null;
        try {
            for (const p of photoCandidates) {
                if (fs.existsSync(p)) {
                    photoPath = p;
                    break;
                }
            }
        }
        catch { }
        const photoW = 80, photoH = 100;
        if (photoPath) {
            const photoX = leftX;
            try {
                doc.image(photoPath, photoX, topY, { width: photoW, height: photoH, fit: [photoW, photoH] });
            }
            catch { }
        }
        const draw = (lab, val, big = false) => {
            const sLabelW = 70;
            const sValueW = Math.max(60, contentW - sLabelW - 6);
            doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text(lab + ' :', rightX, y, { width: sLabelW, ellipsis: true });
            doc.fillColor('#111827').font('Helvetica-Bold').fontSize(big ? 12 : 10)
                .text(val, rightX + sLabelW + 4, y - 2, { width: sValueW, ellipsis: true });
            y += big ? 16 : 13;
        };
        const fullName2 = `${student.firstName} ${student.lastName}`.trim();
        const sLabelW = 70;
        const sValueW = Math.max(60, contentW - sLabelW - 6);
        const darkBlue = '#0b3d91';
        doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('Name :', rightX, y, { width: sLabelW, ellipsis: true });
        doc.fillColor(darkBlue).font('Helvetica-Bold').fontSize(12)
            .text(fullName2, rightX + sLabelW + 4, y - 2, { width: sValueW, ellipsis: true });
        y += 16;
        doc.save();
        doc.strokeColor('#e5e7eb').lineWidth(0.6)
            .moveTo(rightX, y + 2).lineTo(rightX + sLabelW + sValueW + 4, y + 2).stroke();
        doc.restore();
        doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('Student ID :', rightX, y + 6, { width: sLabelW, ellipsis: true });
        doc.fillColor(darkBlue).font('Helvetica-Bold').fontSize(12)
            .text(`${student.studentId || student.id}`, rightX + sLabelW + 4, y + 4, { width: sValueW, ellipsis: true });
        y += 16 + 6;
        doc.save();
        doc.strokeColor('#e5e7eb').lineWidth(0.6)
            .moveTo(rightX, y + 2).lineTo(rightX + sLabelW + sValueW + 4, y + 2).stroke();
        doc.restore();
        doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('D.O.B :', rightX, y + 6, { width: sLabelW, ellipsis: true });
        doc.fillColor(darkBlue).font('Helvetica-Bold').fontSize(10)
            .text(student.dob ? String(student.dob) : '-', rightX + sLabelW + 4, y + 4, { width: sValueW, ellipsis: true });
        y += 16 + 6;
        doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('Class :', rightX, y + 6, { width: sLabelW, ellipsis: true });
        doc.fillColor(darkBlue).font('Helvetica-Bold').fontSize(10)
            .text(classDisplay, rightX + sLabelW + 4, y + 4, { width: sValueW, ellipsis: true });
        y += 16 + 6;
        doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('Address :', rightX, y + 6, { width: sLabelW, ellipsis: true });
        doc.fillColor(darkBlue).font('Helvetica-Bold').fontSize(10)
            .text(student.address || '-', rightX + sLabelW + 4, y + 4, { width: sValueW, ellipsis: true });
        y += 16 + 6;
        y += 6;
        doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('Year :', rightX, y + 6, { width: sLabelW, ellipsis: true });
        doc.fillColor(darkBlue).font('Helvetica-Bold').fontSize(10)
            .text(klass?.academicYear || '-', rightX + sLabelW + 4, y + 4, { width: sValueW, ellipsis: true });
        y += 16 + 6;
        try {
            if (qrBuf) {
                const qrSize = 44;
                const qrX = 18;
                const qrY = doc.page.height - qrSize - 24;
                try {
                    doc.image(qrBuf, qrX, qrY, { width: qrSize, height: qrSize, fit: [qrSize, qrSize] });
                }
                catch { }
            }
        }
        catch { }
        try {
            const pad = 6;
            const yLine = doc.page.height - pad;
            doc.save();
            doc.strokeColor('#0b3d91').lineWidth(2)
                .moveTo(pad, yLine)
                .lineTo(doc.page.width - pad, yLine)
                .stroke();
            doc.restore();
        }
        catch { }
        doc.end();
    }
    async honoursByGradeJson(gradeLevel, term, examType, academicYear, stream, res) {
        if (!gradeLevel || !term || !examType) {
            try {
                res?.status(400).json({ error: 'gradeLevel, term and examType are required' });
            }
            catch { }
            return;
        }
        const detectStream = (name) => {
            if (!name)
                return null;
            const m = /(Blue|White|Gold|Brown|Camel)/i.exec(name);
            return m ? (m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()) : null;
        };
        const exRaw = (examType ?? '').toString();
        const ex = exRaw.trim().length ? exRaw.trim() : undefined;
        let all = [];
        if (ex) {
            const w1 = { session: (0, typeorm_2.Like)(`%${term}%`), examType: ex };
            all = await this.marks.find({ where: w1 });
            if (!all.length) {
                const w2 = { session: (0, typeorm_2.Like)(`%${term}%`), examType: (0, typeorm_2.IsNull)() };
                all = await this.marks.find({ where: w2 });
            }
            if (!all.length) {
                const w3 = { session: (0, typeorm_2.Like)(`%${term}%`) };
                all = await this.marks.find({ where: w3 });
            }
        }
        else {
            const w = { session: (0, typeorm_2.Like)(`%${term}%`) };
            all = await this.marks.find({ where: w });
        }
        const cohort = all.filter(m => {
            const k = m.klass;
            if (!k)
                return false;
            const glK = (k.gradeLevel ?? '').toString().trim().toLowerCase();
            const glQ = (gradeLevel ?? '').toString().trim().toLowerCase();
            if (glK !== glQ)
                return false;
            if (academicYear) {
                const ayK = (k.academicYear ?? '').toString().trim().toLowerCase();
                const ayQ = (academicYear ?? '').toString().trim().toLowerCase();
                if (ayK !== ayQ)
                    return false;
            }
            if (stream) {
                const s = detectStream(k.name);
                if (!s || s.toLowerCase() !== stream.toLowerCase())
                    return false;
            }
            return true;
        });
        const agg = new Map();
        const gCounts = new Map();
        const gradeFor = (scoreNum) => {
            if (scoreNum >= 80)
                return 'A';
            if (scoreNum >= 70)
                return 'B';
            if (scoreNum >= 60)
                return 'C';
            if (scoreNum >= 50)
                return 'D';
            if (scoreNum >= 40)
                return 'E';
            return 'U';
        };
        cohort.forEach(m => {
            const st = m.student;
            if (!st?.id)
                return;
            const key = st.id;
            let rec = agg.get(key);
            if (!rec)
                rec = { name: `${st.firstName || ''} ${st.lastName || ''}`.trim(), studentId: st.studentId || st.id, sum: 0, n: 0 };
            const val = Number(m.score);
            if (!isNaN(val)) {
                rec.sum += val;
                rec.n += 1;
            }
            agg.set(key, rec);
            const g = gradeFor(val);
            const gc = gCounts.get(key) || { A: 0, B: 0, C: 0, D: 0, E: 0, U: 0 };
            gc[g] = gc[g] + 1;
            gCounts.set(key, gc);
        });
        const baseRows = Array.from(agg.entries())
            .filter(([, r]) => r.n > 0)
            .map(([id, r]) => {
            const c = gCounts.get(id) || { A: 0, B: 0, C: 0, D: 0, E: 0, U: 0 };
            return { id, name: r.name, studentId: r.studentId, total: r.sum, count: r.n, avg: r.sum / r.n, A: c.A, B: c.B, C: c.C, D: c.D, E: c.E, U: c.U };
        });
        const groupsOut = {};
        if (!stream) {
            const streamByStudent = new Map();
            cohort.forEach(m => {
                const st = m.student;
                const k = m.klass;
                if (!st?.id || !k)
                    return;
                const s = detectStream(k.name);
                if (!streamByStudent.has(st.id))
                    streamByStudent.set(st.id, s);
            });
            const buckets = new Map();
            baseRows.forEach(r => {
                const sid = r.id;
                const s = streamByStudent.get(sid) || null;
                const key = s ? `${gradeLevel} ${s}` : `${gradeLevel} — Unknown Stream`;
                const arr = buckets.get(key) || [];
                arr.push(r);
                buckets.set(key, arr);
            });
            buckets.forEach((arr, key) => {
                arr.sort((a, b) => b.avg - a.avg);
                groupsOut[key] = arr;
            });
        }
        else {
            const key = `${gradeLevel} ${stream}`;
            groupsOut[key] = baseRows.sort((a, b) => b.avg - a.avg);
        }
        let schoolName = 'SchoolPro';
        let schoolAddress = '';
        let logoUrlOut = '';
        try {
            const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
            if (settings?.schoolName)
                schoolName = settings.schoolName;
            if (settings?.schoolAddress)
                schoolAddress = settings.schoolAddress;
            const baseWeb = (process.env.WEB_BASE_URL || 'http://localhost:3000').toString().replace(/\/$/, '');
            const rawLogo = settings?.logoUrl;
            if (rawLogo && /^https?:\/\//i.test(rawLogo))
                logoUrlOut = rawLogo;
            else if (rawLogo && typeof rawLogo === 'string') {
                const p = rawLogo.startsWith('/') ? rawLogo.slice(1) : rawLogo;
                logoUrlOut = `${baseWeb}/${p}`;
            }
            else {
                logoUrlOut = `${baseWeb}/assets/logo.png`;
            }
        }
        catch { }
        try {
            res?.json({ term, examType, gradeLevel, academicYear: academicYear || null, stream: stream || null, schoolName, schoolAddress, logoUrl: logoUrlOut, groups: groupsOut });
        }
        catch { }
    }
    async honoursByGradeCsv(gradeLevel, term, examType, academicYear, stream, res) {
        const chunks = [];
        let statusSent = false;
        const fakeRes = { json: (data) => chunks.push(data), status: (_) => ({ json: (o) => { statusSent = true; chunks.push(o); } }) };
        await this.honoursByGradeJson(gradeLevel, term, examType, academicYear, stream, fakeRes);
        if (statusSent) {
            const obj = chunks[0];
            try {
                res?.status(400).json(obj);
            }
            catch { }
            return;
        }
        const data = chunks[0] || {};
        const schoolName = (data.schoolName || 'SchoolPro').toString();
        const schoolAddress = (data.schoolAddress || '').toString();
        const title = `Honours Roll — ${gradeLevel} — ${term}${academicYear ? ' — ' + academicYear : ''}`;
        const lines = [
            schoolName,
            schoolAddress ? schoolAddress : '',
            title,
            '',
            'Group,Rank,Student,Code,Average,Total'
        ];
        const groups = data.groups || {};
        Object.keys(groups).forEach(g => {
            (groups[g] || []).forEach((r, i) => lines.push([g, String(i + 1), r.name, r.studentId, (r.avg ?? 0).toFixed(1), (r.total ?? 0).toFixed(0), String(r.A || 0), String(r.B || 0), String(r.C || 0), String(r.D || 0), String(r.E || 0), String(r.U || 0)].join(',')));
        });
        const csv = lines.join('\n') + '\n';
        try {
            res?.setHeader('Content-Type', 'text/csv');
            res?.setHeader('Content-Disposition', `attachment; filename="honours-grade-${gradeLevel}-${term}${stream ? '-' + stream : ''}.csv"`);
            res?.send(csv);
        }
        catch { }
    }
    async parentReportCard(req, studentIdParam, term, res) {
        const role = (req.user?.role || '').toLowerCase();
        if (role !== 'parent')
            throw new common_1.ForbiddenException('Parents only');
        let student = await this.students.findOne({ where: { id: studentIdParam } });
        if (!student)
            student = await this.students.findOne({ where: { studentId: studentIdParam } });
        if (!student) {
            res.status(404).json({ message: 'Student not found' });
            return;
        }
        console.log('[DEBUG] Parent report card access - parentId:', req.user.sub, 'studentId:', student.id);
        const linked = await this.parentsSvc.isLinked(req.user.sub, student.id);
        console.log('[DEBUG] isLinked result:', linked);
        if (!linked)
            throw new common_1.ForbiddenException('You are not linked to this student');
        return this.reportCard(req, student.id, term, res);
    }
    async publish(body) {
        const term = body?.term;
        if (!term)
            return { ok: false, error: 'term is required' };
        const where = { session: (0, typeorm_2.Like)(`%${term}%`) };
        if (body.classId)
            where.klass = { id: body.classId };
        const marks = await this.marks.find({ where });
        let studentIds = Array.from(new Set(marks.map(m => m.student?.id).filter(Boolean)));
        if ((!studentIds.length) && body.classId) {
            try {
                const enrols = await this.enrollRepo.find({ where: { classEntity: { id: body.classId } }, relations: ['student'] });
                studentIds = Array.from(new Set(enrols.map(e => e?.student?.id).filter(Boolean)));
            }
            catch { }
        }
        if (!studentIds.length)
            return { ok: true, sent: 0, suppressed: 0, withheld: 0 };
        let withheld = 0;
        const eligibleByRemarks = [];
        for (const sid of studentIds) {
            try {
                const rem = await this.remarksRepo.findOne({ where: { studentId: sid, term: (0, typeorm_2.Like)(`%${term}%`) } });
                const teacherOk = !!(rem?.teacherRemark && rem.teacherRemark.toString().trim().length > 0);
                const principalOk = !!(rem?.principalRemark && rem.principalRemark.toString().trim().length > 0);
                const statusOk = (rem?.status || '').toString() === 'ready_for_pdf';
                if (teacherOk && principalOk && statusOk)
                    eligibleByRemarks.push(sid);
                else
                    withheld++;
            }
            catch {
                withheld++;
            }
        }
        let suppressed = 0;
        let finalIds = eligibleByRemarks;
        if (body?.suppressArrears) {
            const okIds = [];
            for (const sid of eligibleByRemarks) {
                try {
                    const bal = await this.accounts.getStudentBalanceById(sid);
                    if (Number(bal?.balance) > 0) {
                        suppressed++;
                    }
                    else {
                        okIds.push(sid);
                    }
                }
                catch {
                    okIds.push(sid);
                }
            }
            finalIds = okIds;
        }
        if (!finalIds.length)
            return { ok: true, sent: 0, suppressed, withheld };
        const emails = await this.parentsSvc.parentEmailsForStudents(finalIds);
        if (!emails.length)
            return { ok: true, sent: 0, suppressed, withheld };
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
    async marksheetPdf(classId, term, res) {
        if (!classId || !term) {
            res.status(400).json({ message: 'classId and term are required' });
            return;
        }
        const classMarks = await this.marks.find({ where: { klass: { id: classId }, session: term } });
        const subjects = [];
        const subjMap = new Map();
        classMarks.forEach(m => {
            const s = m.subject;
            if (!s?.id)
                return;
            if (!subjMap.has(s.id))
                subjMap.set(s.id, { id: s.id, code: s.code || s.name || 'SUBJ', name: s.name || s.code || s.id });
        });
        subjMap.forEach(v => subjects.push(v));
        subjects.sort((a, b) => (a.code || a.name).localeCompare(b.code || b.name));
        const enr = await this.enrollRepo.find({ where: { classEntity: { id: classId } } });
        const studentIds = new Set(enr.map(e => e?.student?.id).filter(Boolean));
        classMarks.forEach(m => { const sid = m.student?.id; if (sid)
            studentIds.add(sid); });
        const students = [];
        for (const sid of Array.from(studentIds)) {
            const st = await this.students.findOne({ where: { id: sid } });
            if (st)
                students.push({ id: st.id, studentId: st.studentId || st.id, name: `${st.firstName} ${st.lastName}` });
        }
        students.sort((a, b) => a.name.localeCompare(b.name));
        const map = new Map();
        students.forEach(s => map.set(s.id, new Map()));
        classMarks.forEach(m => {
            const sid = m.student?.id;
            const subId = m.subject?.id;
            if (!sid || !subId)
                return;
            const row = map.get(sid);
            if (!row)
                return;
            if (!row.has(subId))
                row.set(subId, String(m.score));
        });
        const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
        const doc = new PDFDocument({ margin: 24, layout: 'landscape' });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => {
            const pdf = Buffer.concat(chunks);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="marksheet-${classId}-${term}.pdf"`);
            res.end(pdf);
        });
        doc.on('error', () => { try {
            res.status(500).json({ message: 'Export failed' });
        }
        catch { } });
        const theme = { text: '#111827', muted: '#6b7280', border: '#e5e7eb', headerBg: '#f3f4f6' };
        const schoolName = settings?.schoolName || 'SchoolPro';
        doc.font('Helvetica-Bold').fontSize(16).fillColor(theme.text).text(`${schoolName} — Mark Sheet`, { align: 'center' });
        doc.moveDown(0.2);
        doc.font('Helvetica').fontSize(11).fillColor(theme.muted).text(`Class: ${classId}   Term: ${term}`, { align: 'center' });
        doc.moveDown(0.6);
        const x = doc.page.margins.left;
        const y0 = doc.y;
        const tableW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const colNameW = 140;
        const colCodeW = 110;
        const remaining = tableW - colNameW - colCodeW;
        const colSubW = Math.max(60, Math.floor(remaining / Math.max(1, subjects.length + 3)));
        doc.save();
        doc.rect(x, y0, tableW, 22).fill(theme.headerBg);
        doc.restore();
        let cx = x + 6;
        const cy = y0 + 6;
        doc.font('Helvetica-Bold').fontSize(10).fillColor(theme.text).text('Student ID', cx, cy, { width: colCodeW });
        cx += colCodeW;
        doc.text('Full Name', cx, cy, { width: colNameW });
        cx += colNameW;
        for (const s of subjects) {
            doc.text(s.code || s.name, cx, cy, { width: colSubW });
            cx += colSubW;
        }
        doc.text('Total', cx, cy, { width: colSubW });
        cx += colSubW;
        doc.text('Average', cx, cy, { width: colSubW });
        cx += colSubW;
        doc.text('Passed', cx, cy, { width: colSubW });
        doc.moveTo(x, y0).lineTo(x + tableW, y0).strokeColor(theme.border).stroke();
        let ty = y0 + 22;
        students.forEach((s, idx) => {
            const rowH = 18;
            if (idx % 2 === 0) {
                doc.save();
                doc.rect(x, ty, tableW, rowH).fill('#fafafa');
                doc.restore();
            }
            doc.lineWidth(0.5).strokeColor(theme.border).rect(x, ty, tableW, rowH).stroke();
            let cx2 = x + 6;
            const cy2 = ty + 4;
            let total = 0;
            let count = 0;
            let passed = 0;
            const sidDisplay = s.studentId || s.code || s.id || '';
            doc.font('Helvetica').fillColor(theme.text).fontSize(9).text(String(sidDisplay), cx2, cy2, { width: colCodeW });
            cx2 += colCodeW;
            doc.text(s.name, cx2, cy2, { width: colNameW });
            cx2 += colNameW;
            const row = map.get(s.id);
            for (const subj of subjects) {
                const v = row.get(subj.id);
                const num = v != null ? Number(v) : NaN;
                if (!isNaN(num)) {
                    total += num;
                    count += 1;
                    if (num >= 50)
                        passed += 1;
                }
                doc.text(v != null ? String(v) : '-', cx2, cy2, { width: colSubW });
                cx2 += colSubW;
            }
            doc.text(total ? total.toFixed(0) : '-', cx2, cy2, { width: colSubW });
            cx2 += colSubW;
            const avg = count ? (total / count) : NaN;
            doc.text(!isNaN(avg) ? avg.toFixed(1) : '-', cx2, cy2, { width: colSubW });
            cx2 += colSubW;
            doc.text(count ? String(passed) : '-', cx2, cy2, { width: colSubW });
            ty += rowH;
            if (ty > doc.page.height - doc.page.margins.bottom - 30) {
                doc.addPage({ layout: 'landscape' });
                ty = doc.page.margins.top;
            }
        });
        doc.end();
    }
    async marksheetCsv(classId, term, res) {
        if (!classId || !term) {
            res.status(400).json({ message: 'classId and term are required' });
            return;
        }
        const classMarks = await this.marks.find({ where: { klass: { id: classId }, session: term } });
        const subjMap = new Map();
        classMarks.forEach(m => { const s = m.subject; if (s?.id && !subjMap.has(s.id))
            subjMap.set(s.id, { id: s.id, code: s.code || s.name || 'SUBJ', name: s.name || s.code || s.id }); });
        const subjects = Array.from(subjMap.values()).sort((a, b) => (a.code || a.name).localeCompare(b.code || b.name));
        const enr = await this.enrollRepo.find({ where: { classEntity: { id: classId } } });
        const studentIds = new Set(enr.map(e => e?.student?.id).filter(Boolean));
        classMarks.forEach(m => { const sid = m.student?.id; if (sid)
            studentIds.add(sid); });
        const students = [];
        for (const sid of Array.from(studentIds)) {
            const st = await this.students.findOne({ where: { id: sid } });
            if (st)
                students.push({ id: st.id, studentId: st.studentId || st.id, name: `${st.firstName} ${st.lastName}` });
        }
        students.sort((a, b) => a.name.localeCompare(b.name));
        const map = new Map();
        students.forEach(s => map.set(s.id, new Map()));
        classMarks.forEach(m => { const sid = m.student?.id; const subId = m.subject?.id; if (sid && subId) {
            const row = map.get(sid);
            if (!row.has(subId))
                row.set(subId, String(m.score));
        } });
        const header = ['Student', 'Student ID', ...subjects.map(s => s.code || s.name), 'Total', 'Average', 'Passed'];
        const lines = [header.join(',')];
        students.forEach(s => {
            const row = map.get(s.id);
            let total = 0;
            let count = 0;
            let passed = 0;
            const vals = [];
            subjects.forEach(sub => { const v = row.get(sub.id); if (v != null && v !== '') {
                const n = Number(v);
                if (!isNaN(n)) {
                    total += n;
                    count++;
                    if (n >= 50)
                        passed++;
                }
            } vals.push(v ?? ''); });
            const avg = count ? (total / count).toFixed(1) : '';
            lines.push([s.name.replace(/,/g, ' '), s.studentId, ...vals, total ? total.toFixed(0) : '', avg, count ? String(passed) : ''].join(','));
        });
        const csv = lines.join('\n') + '\n';
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="marksheet-${classId}-${term}.csv"`);
        res.send(csv);
    }
    async marksheetJson(classId, term) {
        if (!classId || !term)
            return { error: 'classId and term are required' };
        const classMarks = await this.marks.find({ where: { klass: { id: classId }, session: term } });
        const subjMap = new Map();
        classMarks.forEach(m => { const s = m.subject; if (s?.id && !subjMap.has(s.id))
            subjMap.set(s.id, { id: s.id, code: s.code || s.name || 'SUBJ', name: s.name || s.code || s.id }); });
        const subjects = Array.from(subjMap.values()).sort((a, b) => (a.code || a.name).localeCompare(b.code || b.name));
        const enr = await this.enrollRepo.find({ where: { classEntity: { id: classId } } });
        const studentIds = new Set(enr.map(e => e?.student?.id).filter(Boolean));
        classMarks.forEach(m => { const sid = m.student?.id; if (sid)
            studentIds.add(sid); });
        const students = [];
        for (const sid of Array.from(studentIds)) {
            const st = await this.students.findOne({ where: { id: sid } });
            if (st)
                students.push({ id: st.id, code: st.studentId || st.id, name: `${st.firstName} ${st.lastName}` });
        }
        students.sort((a, b) => a.name.localeCompare(b.name));
        const scores = {};
        const passed = {};
        students.forEach(s => scores[s.id] = {});
        classMarks.forEach(m => { const sid = m.student?.id; const subId = m.subject?.id; if (sid && subId && scores[sid] && scores[sid][subId] == null)
            scores[sid][subId] = String(m.score); });
        students.forEach(s => {
            let cnt = 0;
            const row = scores[s.id] || {};
            Object.keys(row).forEach(k => { const n = Number(row[k]); if (!isNaN(n) && n >= 50)
                cnt++; });
            passed[s.id] = cnt;
        });
        return { classId, term, subjects, students, scores, passed, passMark: 50 };
    }
    async honoursJson(classId, term, topNStr, res) {
        if (!classId || !term) {
            res.status(400).json({ error: 'classId and term are required' });
            return;
        }
        const topN = topNStr ? Math.max(1, Number(topNStr) || 0) : 0;
        const classMarks = await this.marks.find({ where: { klass: { id: classId }, session: term } });
        const agg = new Map();
        const gCounts = new Map();
        const gradeFor = (scoreNum) => {
            if (scoreNum >= 80)
                return 'A';
            if (scoreNum >= 70)
                return 'B';
            if (scoreNum >= 60)
                return 'C';
            if (scoreNum >= 50)
                return 'D';
            if (scoreNum >= 40)
                return 'E';
            return 'U';
        };
        classMarks.forEach(m => {
            const st = m.student;
            if (!st?.id)
                return;
            const key = st.id;
            let rec = agg.get(key);
            if (!rec) {
                rec = { name: `${st.firstName || ''} ${st.lastName || ''}`.trim(), code: st.studentId || st.id, sum: 0, n: 0 };
                agg.set(key, rec);
            }
            const val = Number(m.score);
            if (!isNaN(val)) {
                rec.sum += val;
                rec.n += 1;
            }
            const g = gradeFor(val);
            const gc = gCounts.get(key) || { A: 0, B: 0, C: 0, D: 0, E: 0, U: 0 };
            gc[g] = gc[g] + 1;
            gCounts.set(key, gc);
        });
        const rows = Array.from(agg.entries())
            .filter(([, r]) => r.n > 0)
            .map(([id, r]) => {
            const c = gCounts.get(id) || { A: 0, B: 0, C: 0, D: 0, E: 0, U: 0 };
            return { id, name: r.name, studentId: r.code, total: r.sum, count: r.n, avg: r.sum / r.n, A: c.A, B: c.B, C: c.C, D: c.D, E: c.E, U: c.U };
        });
        rows.sort((a, b) => b.avg - a.avg);
        const limited = topN > 0 ? rows.slice(0, topN) : rows;
        const klass = classMarks[0]?.klass;
        const groupKey = klass?.name || 'Class';
        const grouped = { [groupKey]: limited };
        res.json({ classId, term, groups: grouped });
    }
    async honoursCsv(classId, term, topNStr, res) {
        const chunks = [];
        let statusSent = false;
        const fakeRes = { json: (data) => chunks.push(data), status: (_) => ({ json: (o) => { statusSent = true; chunks.push(o); } }) };
        await this.honoursJson(classId, term, topNStr, fakeRes);
        if (statusSent) {
            const obj = chunks[0];
            res.status(400).json(obj);
            return;
        }
        const data = chunks[0] || {};
        const lines = ['Group,Rank,Student,Student ID,Average,Total,As,Bs,Cs,Ds,Es,Us'];
        const groups = data.groups || {};
        Object.keys(groups).forEach(g => {
            (groups[g] || []).forEach((r, i) => lines.push([g, String(i + 1), r.name, r.studentId, (r.avg ?? 0).toFixed(1), (r.total ?? 0).toFixed(0), String(r.A || 0), String(r.B || 0), String(r.C || 0), String(r.D || 0), String(r.E || 0), String(r.U || 0)].join(',')));
        });
        const csv = lines.join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="honours-roll-${classId}-${term}.csv"`);
        res.end(csv);
    }
    async honoursPdf(classId, term, topNStr, res) {
        if (!classId || !term) {
            res.status(400).json({ message: 'classId and term are required' });
            return;
        }
        const chunks = [];
        const fakeRes = { json: (data) => chunks.push(data), status: (_) => ({ json: (o) => chunks.push(o) }) };
        await this.honoursJson(classId, term, topNStr, fakeRes);
        const data = chunks[0] || {};
        const groups = data.groups || {};
        const doc = new PDFDocument({ margin: 28 });
        const out = [];
        doc.on('data', (c) => out.push(c));
        doc.on('end', () => {
            const pdf = Buffer.concat(out);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="honours-roll-${classId}-${term}.pdf"`);
            res.end(pdf);
        });
        try {
            const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
            const bannerH = 60;
            const startY = 0;
            doc.save();
            doc.rect(0, startY, doc.page.width, bannerH).fill('#0b3d91');
            doc.restore();
            try {
                const buf = await this.fetchImageBuffer(settings?.logoUrl || '');
                if (buf)
                    doc.image(buf, 16, startY + 8, { width: 130, height: bannerH - 16, fit: [130, bannerH - 16] });
            }
            catch { }
            const schoolName = settings?.schoolName || 'SchoolPro';
            const schoolAddress = settings?.schoolAddress || '';
            doc.font('Helvetica-Bold').fillColor('#ffffff').fontSize(14).text(schoolName, 0, startY + 6, { align: 'center', width: doc.page.width });
            if (schoolAddress)
                doc.font('Helvetica').fillColor('#ffffff').fontSize(10).text(schoolAddress, 0, startY + 24, { align: 'center', width: doc.page.width });
            doc.y = bannerH + 12;
        }
        catch { }
        doc.font('Helvetica-Bold').fillColor('#111827').fontSize(18).text('Honours Roll', { align: 'center' });
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(11).text(`Class: ${classId}   Term: ${term}`, { align: 'center' });
        doc.moveDown(0.6);
        Object.keys(groups).forEach(group => {
            const rows = groups[group] || [];
            doc.font('Helvetica-Bold').fontSize(13).text(group);
            const tableX = doc.page.margins.left;
            const colW = { idx: 26, name: 200, code: 110, avg: 60, total: 60, g: 36 };
            let y = doc.y + 4;
            const rowH = 20;
            const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
            doc.save();
            doc.rect(tableX, y, w, rowH).fill('#f3f4f6');
            doc.restore();
            doc.font('Helvetica-Bold').fontSize(10);
            let x = tableX + 8;
            doc.text('Position', x, y + 6, { width: colW.idx });
            x += colW.idx;
            doc.text('Student', x, y + 6, { width: colW.name });
            x += colW.name;
            doc.text('Student ID', x, y + 6, { width: colW.code });
            x += colW.code;
            doc.text('Avg', x, y + 6, { width: colW.avg });
            x += colW.avg;
            doc.text('Total', x, y + 6, { width: colW.total });
            x += colW.total;
            ;
            ['A', 'B', 'C', 'D', 'E', 'U'].forEach(lbl => { doc.text(lbl, x, y + 6, { width: colW.g }); x += colW.g; });
            y += rowH;
            rows.forEach((r, i) => {
                doc.font('Helvetica').fontSize(10);
                let cx = tableX + 8;
                doc.text(String(i + 1), cx, y + 6, { width: colW.idx });
                cx += colW.idx;
                doc.text(r.name, cx, y + 6, { width: colW.name });
                cx += colW.name;
                doc.text(r.studentId || r.code, cx, y + 6, { width: colW.code });
                cx += colW.code;
                doc.text((r.avg ?? 0).toFixed(1), cx, y + 6, { width: colW.avg });
                cx += colW.avg;
                doc.text((r.total ?? 0).toFixed(0), cx, y + 6, { width: colW.total });
                cx += colW.total;
                ;
                ['A', 'B', 'C', 'D', 'E', 'U'].forEach(lbl => { const v = r[lbl] ?? 0; doc.text(String(v), cx, y + 6, { width: colW.g }); cx += colW.g; });
                y += rowH;
            });
            doc.moveDown(1);
        });
        doc.end();
    }
    async debugRemarks(studentId) {
        console.log('🔍 Debug: Fetching ALL remarks for student:', studentId);
        const all = await this.remarksRepo.find({ where: { studentId }, order: { updatedAt: 'DESC' } });
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
    async getRemarks(studentId, term, examType) {
        console.log('📖 getRemarks called:', { studentId, term, examType });
        if (!studentId)
            return {};
        let rec = null;
        if (term) {
            const candidates = await this.remarksRepo.find({
                where: {
                    studentId,
                    term: (0, typeorm_2.Like)(`%${term}%`),
                    ...(examType ? { examType } : { examType: (0, typeorm_2.IsNull)() })
                },
                order: { updatedAt: 'DESC' }
            });
            console.log('🔍 Found', candidates.length, 'candidate(s) using LIKE for term:', term);
            if (candidates.length > 0) {
                rec = candidates[0];
                console.log('📊 Selected record:', { id: rec.id, term: rec.term, examType: rec.examType, hasTeacher: !!rec.teacherRemark, hasPrincipal: !!rec.principalRemark, status: rec.status });
            }
        }
        else {
            const where = { studentId, term: (0, typeorm_2.IsNull)(), ...(examType ? { examType } : { examType: (0, typeorm_2.IsNull)() }) };
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
    async saveRemarks(body) {
        console.log('📝 saveRemarks called with body:', JSON.stringify(body, null, 2));
        if (!body?.studentId) {
            console.error('❌ No studentId provided');
            return { ok: false, error: 'studentId required' };
        }
        const term = body.term;
        const examType = body.examType;
        let rec = null;
        if (term) {
            const candidates = await this.remarksRepo.find({
                where: {
                    studentId: body.studentId,
                    term: (0, typeorm_2.Like)(`%${term}%`),
                    ...(examType ? { examType } : { examType: (0, typeorm_2.IsNull)() })
                }
            });
            if (candidates.length > 0) {
                rec = candidates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
                console.log('✏️ Found existing record using LIKE:', rec.id, '| term:', rec.term);
            }
        }
        else {
            const where = { studentId: body.studentId, term: (0, typeorm_2.IsNull)(), ...(examType ? { examType } : { examType: (0, typeorm_2.IsNull)() }) };
            rec = await this.remarksRepo.findOne({ where });
            if (rec)
                console.log('✏️ Found existing record (no term):', rec.id);
        }
        if (!rec) {
            console.log('📄 No existing record found, creating new one');
            rec = this.remarksRepo.create({
                studentId: body.studentId,
                term: term ?? null,
                examType: examType ?? null
            });
        }
        rec.term = term ?? rec.term ?? null;
        rec.examType = examType ?? rec.examType ?? null;
        rec.teacherRemark = body.teacherRemark ?? rec.teacherRemark ?? null;
        rec.principalRemark = body.principalRemark ?? rec.principalRemark ?? null;
        const teacherOk = !!(rec.teacherRemark && rec.teacherRemark.toString().trim().length > 0);
        const principalOk = !!(rec.principalRemark && rec.principalRemark.toString().trim().length > 0);
        if (teacherOk && principalOk) {
            rec.status = 'ready_for_pdf';
            console.log('✅ Both remarks present - setting status to ready_for_pdf');
        }
        else {
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
        const saved = await this.remarksRepo.save(rec);
        console.log('✅ Remark saved successfully with id:', saved.id, 'status:', saved.status);
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
    async tuitionReceiptPdf(body, res) {
        const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
        const schoolName = settings?.schoolName || process.env.SCHOOL_NAME || 'SchoolPro';
        const schoolAddress = settings?.schoolAddress || process.env.SCHOOL_ADDRESS || '';
        const logoPath = (settings?.logoUrl && !settings.logoUrl.startsWith('http'))
            ? (path.isAbsolute(settings.logoUrl) ? settings.logoUrl : path.join(process.cwd(), settings.logoUrl))
            : path.join(process.cwd(), 'assets', 'logo.png');
        const items = Array.isArray(body?.items) ? body.items : [];
        if (!items.length) {
            res.status(400).json({ message: 'items are required' });
            return;
        }
        const doc = new PDFDocument({ margin: 28 });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => {
            const pdf = Buffer.concat(chunks);
            const filename = `tuition-receipt-${(body?.receiptNo || 'receipt').replace(/\s+/g, '-')}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            res.end(pdf);
        });
        doc.on('error', () => { try {
            res.status(500).json({ message: 'Receipt generation failed' });
        }
        catch { } });
        const theme = {
            bannerBg: '#fff7cc',
            text: '#111827',
            muted: '#6b7280',
            border: '#e5e7eb',
            header: '#0b3d91',
        };
        doc.font('Helvetica-Bold').fontSize(18).fillColor(theme.header).text('Tuition Fee Receipt', { align: 'center' });
        doc.moveDown(0.6);
        const x0 = doc.page.margins.left;
        const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const bannerH = 80;
        const y0 = doc.y;
        doc.save();
        doc.rect(x0, y0, w, bannerH).fill(theme.bannerBg);
        doc.restore();
        try {
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, x0 + 10, y0 + 10, { width: 60, height: 60, fit: [60, 60] });
            }
        }
        catch { }
        const pad = 16;
        const colGap = 24;
        const colW = Math.floor((w - 60 - pad - colGap * 2) / 3);
        const col1X = x0 + 80;
        const col2X = col1X + colW + colGap;
        const col3X = col2X + colW + colGap;
        const lineY = y0 + 12;
        doc.font('Helvetica').fontSize(9).fillColor(theme.muted).text('Student', col1X, lineY);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(theme.text).text(body?.studentName || '-', col1X, lineY + 12, { width: colW });
        const addr = [body?.address].filter(Boolean).join('\n');
        if (addr) {
            doc.font('Helvetica').fontSize(9).fillColor(theme.text).text(addr, col1X, lineY + 28, { width: colW });
        }
        doc.font('Helvetica').fontSize(9).fillColor(theme.muted).text('Issued By', col2X, lineY);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(theme.text).text(schoolName, col2X, lineY + 12, { width: colW });
        if (schoolAddress)
            doc.font('Helvetica').fontSize(9).fillColor(theme.text).text(schoolAddress, col2X, lineY + 28, { width: colW });
        const meta = [
            ['Receipt No.', body?.receiptNo || '-'],
            ['Date', body?.date || new Date().toISOString().slice(0, 10)],
            ['Payment Method', body?.paymentMethod || '-'],
            ['Issued By', body?.issuedBy || '-'],
            ['Contact', body?.phone || '-'],
        ];
        let my = lineY;
        doc.font('Helvetica-Bold').fontSize(10).fillColor(theme.text).text('Receipt Details', col3X, my, { width: colW });
        my += 14;
        meta.forEach(([k, v]) => {
            doc.font('Helvetica').fontSize(9).fillColor(theme.muted).text(k, col3X, my, { width: colW / 2 });
            doc.font('Helvetica').fontSize(9).fillColor(theme.text).text(String(v), col3X + colW / 2 + 6, my, { width: colW / 2 - 6 });
            my += 14;
        });
        doc.y = y0 + bannerH + 14;
        const tableX = x0;
        const tableW = w;
        const col = { desc: Math.max(160, Math.floor(tableW * 0.38)), qty: 70, unit: 90, sub: 90, tax: 70, total: 90 };
        const headerH = 22;
        let ty = doc.y;
        doc.save();
        doc.rect(tableX, ty, tableW, headerH).fill('#f3f4f6');
        doc.restore();
        doc.font('Helvetica-Bold').fontSize(10).fillColor(theme.text);
        let hx = tableX + 8;
        doc.text('Description', hx, ty + 6, { width: col.desc });
        hx += col.desc;
        doc.text('Quantity', hx, ty + 6, { width: col.qty });
        hx += col.qty;
        doc.text('Unit Price', hx, ty + 6, { width: col.unit });
        hx += col.unit;
        doc.text('Subtotal', hx, ty + 6, { width: col.sub });
        hx += col.sub;
        doc.text('Tax', hx, ty + 6, { width: col.tax });
        hx += col.tax;
        doc.text('Total', hx, ty + 6, { width: col.total });
        doc.lineWidth(0.8).strokeColor(theme.border).rect(tableX, ty, tableW, headerH).stroke();
        ty += headerH;
        let grandSub = 0, grandTax = 0, grandTotal = 0;
        items.forEach((it, idx) => {
            const qty = Math.max(0, Number(it.quantity ?? 1));
            const unit = Math.max(0, Number(it.unitPrice ?? 0));
            const taxRate = Math.max(0, Number(it.taxRate ?? 0));
            const sub = qty * unit;
            const tax = sub * taxRate;
            const tot = sub + tax;
            grandSub += sub;
            grandTax += tax;
            grandTotal += tot;
            const rh = 20;
            if (idx % 2 === 0) {
                doc.save();
                doc.rect(tableX, ty, tableW, rh).fill('#fbfdff');
                doc.restore();
            }
            doc.lineWidth(0.5).strokeColor(theme.border).rect(tableX, ty, tableW, rh).stroke();
            let cx = tableX + 8;
            const cy = ty + 5;
            doc.font('Helvetica').fontSize(10).fillColor(theme.text).text(it.description || '-', cx, cy, { width: col.desc });
            cx += col.desc;
            doc.text(qty ? String(qty) : '-', cx, cy, { width: col.qty });
            cx += col.qty;
            doc.text(unit ? unit.toFixed(2) : '-', cx, cy, { width: col.unit });
            cx += col.unit;
            doc.text(sub ? sub.toFixed(2) : '-', cx, cy, { width: col.sub });
            cx += col.sub;
            doc.text(tax ? tax.toFixed(2) : '-', cx, cy, { width: col.tax });
            cx += col.tax;
            doc.text(tot ? tot.toFixed(2) : '-', cx, cy, { width: col.total });
            ty += rh;
        });
        const sumW = 260;
        const sumH = 24;
        const sumX = x0 + w - sumW;
        let sy = ty + 6;
        const lines = [
            ['Subtotal', grandSub.toFixed(2)],
            ['Tax', grandTax.toFixed(2)],
            ['Total', grandTotal.toFixed(2)],
        ];
        lines.forEach(([k, v], i) => {
            doc.save();
            if (i === lines.length - 1) {
                doc.rect(sumX, sy, sumW, sumH).fill('#eef6ff');
            }
            doc.restore();
            doc.lineWidth(0.8).strokeColor(theme.border).rect(sumX, sy, sumW, sumH).stroke();
            doc.font('Helvetica').fontSize(10).fillColor(theme.muted).text(k, sumX + 10, sy + 6, { width: sumW / 2 - 12 });
            doc.font('Helvetica-Bold').fontSize(11).fillColor(theme.text).text(v, sumX + sumW / 2, sy + 5, { width: sumW / 2 - 12, align: 'right' });
            sy += sumH;
        });
        doc.moveDown(1);
        doc.font('Helvetica').fontSize(9).fillColor(theme.muted)
            .text('Thank you. This receipt is computer-generated and does not require a signature.', x0, sy + 12, { width: w, align: 'center' });
        doc.end();
    }
    async publishReports(body, res) {
        try {
            const classId = (body?.classId || '').toString();
            const term = (body?.term || '').toString();
            const examType = body?.examType ? (body.examType || '').toString() : undefined;
            if (!classId || !term) {
                res.status(400).json({ ok: false, error: 'classId and term are required' });
                return;
            }
            const enrolls = await this.enrollRepo.find({ where: { classEntity: { id: classId } }, relations: ['student'] });
            const students = enrolls.map(e => e.student).filter(Boolean);
            const merged = await pdf_lib_1.PDFDocument.create();
            const base = process.env.WEB_BASE_URL || 'http://localhost:3000';
            const emailJobs = [];
            let pagesAdded = 0;
            const fetchBuf = (urlStr) => new Promise((resolve, reject) => {
                try {
                    const u = new URL(urlStr);
                    const lib = u.protocol === 'https:' ? https : http;
                    const req = lib.request(urlStr, { method: 'GET' }, (resp) => {
                        const chunks = [];
                        resp.on('data', (c) => chunks.push(c));
                        resp.on('end', () => {
                            if (resp.statusCode && resp.statusCode >= 200 && resp.statusCode < 300)
                                resolve(Buffer.concat(chunks));
                            else
                                reject(new Error(`HTTP ${resp.statusCode}`));
                        });
                    });
                    req.on('error', reject);
                    req.end();
                }
                catch (e) {
                    reject(e);
                }
            });
            for (const s of students) {
                try {
                    const sid = (s.studentId || s.id);
                    const u = new URL(`${base}/api/reports/report-card/${encodeURIComponent(sid)}`);
                    u.searchParams.set('term', term);
                    if (examType)
                        u.searchParams.set('examType', examType);
                    const pdfBuf = await fetchBuf(u.toString());
                    const src = await pdf_lib_1.PDFDocument.load(pdfBuf, { updateMetadata: false });
                    const pages = await merged.copyPages(src, src.getPageIndices());
                    pages.forEach((p) => merged.addPage(p));
                    pagesAdded += pages.length;
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
                    }
                    catch { }
                }
                catch { }
            }
            if (pagesAdded === 0) {
                try {
                    res.status(400).json({ ok: false, error: 'No students or no report pages generated for the selected class and term.' });
                }
                catch { }
                return;
            }
            const out = await merged.save();
            const fn = `published-reports-${classId}-${term}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fn}"`);
            res.end(Buffer.from(out));
            try {
                setImmediate(() => { Promise.allSettled(emailJobs).catch(() => { }); });
            }
            catch { }
        }
        catch (e) {
            try {
                res.status(500).json({ ok: false, error: 'Failed to publish reports' });
            }
            catch { }
        }
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('report-card/:studentId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('studentId')),
    __param(2, (0, common_1.Query)('term')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "reportCard", null);
__decorate([
    (0, common_1.Get)('report-card/:studentId/view'),
    __param(0, (0, common_1.Param)('studentId')),
    __param(1, (0, common_1.Query)('term')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "reportCardViewer", null);
__decorate([
    (0, common_1.Get)('student-id-card/:studentId'),
    __param(0, (0, common_1.Param)('studentId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "studentIdCard", null);
__decorate([
    (0, common_1.Get)('honours-roll/grade/json'),
    __param(0, (0, common_1.Query)('gradeLevel')),
    __param(1, (0, common_1.Query)('term')),
    __param(2, (0, common_1.Query)('examType')),
    __param(3, (0, common_1.Query)('academicYear')),
    __param(4, (0, common_1.Query)('stream')),
    __param(5, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "honoursByGradeJson", null);
__decorate([
    (0, common_1.Get)('honours-roll/grade/csv'),
    __param(0, (0, common_1.Query)('gradeLevel')),
    __param(1, (0, common_1.Query)('term')),
    __param(2, (0, common_1.Query)('examType')),
    __param(3, (0, common_1.Query)('academicYear')),
    __param(4, (0, common_1.Query)('stream')),
    __param(5, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "honoursByGradeCsv", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('parent/report-card/:studentId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('studentId')),
    __param(2, (0, common_1.Query)('term')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "parentReportCard", null);
__decorate([
    (0, common_1.Put)('publish'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "publish", null);
__decorate([
    (0, common_1.Get)('marksheet/pdf'),
    __param(0, (0, common_1.Query)('classId')),
    __param(1, (0, common_1.Query)('term')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "marksheetPdf", null);
__decorate([
    (0, common_1.Get)('marksheet/csv'),
    __param(0, (0, common_1.Query)('classId')),
    __param(1, (0, common_1.Query)('term')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "marksheetCsv", null);
__decorate([
    (0, common_1.Get)('marksheet/json'),
    __param(0, (0, common_1.Query)('classId')),
    __param(1, (0, common_1.Query)('term')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "marksheetJson", null);
__decorate([
    (0, common_1.Get)('honours-roll/json'),
    __param(0, (0, common_1.Query)('classId')),
    __param(1, (0, common_1.Query)('term')),
    __param(2, (0, common_1.Query)('topN')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "honoursJson", null);
__decorate([
    (0, common_1.Get)('honours-roll/csv'),
    __param(0, (0, common_1.Query)('classId')),
    __param(1, (0, common_1.Query)('term')),
    __param(2, (0, common_1.Query)('topN')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "honoursCsv", null);
__decorate([
    (0, common_1.Get)('honours-roll/pdf'),
    __param(0, (0, common_1.Query)('classId')),
    __param(1, (0, common_1.Query)('term')),
    __param(2, (0, common_1.Query)('topN')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "honoursPdf", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('remarks/debug/:studentId'),
    __param(0, (0, common_1.Param)('studentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "debugRemarks", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('remarks'),
    __param(0, (0, common_1.Query)('studentId')),
    __param(1, (0, common_1.Query)('term')),
    __param(2, (0, common_1.Query)('examType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getRemarks", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Put)('remarks'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "saveRemarks", null);
__decorate([
    (0, common_1.Post)('tuition-receipt/pdf'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "tuitionReceiptPdf", null);
__decorate([
    (0, common_1.Post)('publish'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "publishReports", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.Controller)('reports'),
    __param(0, (0, typeorm_1.InjectRepository)(student_entity_1.Student)),
    __param(1, (0, typeorm_1.InjectRepository)(mark_entity_1.Mark)),
    __param(2, (0, typeorm_1.InjectRepository)(settings_entity_1.Settings)),
    __param(3, (0, typeorm_1.InjectRepository)(report_remark_entity_1.ReportRemark)),
    __param(4, (0, typeorm_1.InjectRepository)(attendance_entity_1.Attendance)),
    __param(5, (0, typeorm_1.InjectRepository)(enrollment_entity_1.Enrollment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        parents_service_1.ParentsService,
        email_service_1.EmailService,
        accounts_service_1.AccountsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map