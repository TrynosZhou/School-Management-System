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
exports.TeachingLoadReportController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const PDFDocument = require("pdfkit");
const bearer_guard_1 = require("../auth/bearer.guard");
const teacher_entity_1 = require("../entities/teacher.entity");
const class_entity_1 = require("../entities/class.entity");
const subject_entity_1 = require("../entities/subject.entity");
const teaching_assignment_entity_1 = require("../teaching/teaching-assignment.entity");
let TeachingLoadReportController = class TeachingLoadReportController {
    teachers;
    assignments;
    classes;
    subjects;
    constructor(teachers, assignments, classes, subjects) {
        this.teachers = teachers;
        this.assignments = assignments;
        this.classes = classes;
        this.subjects = subjects;
    }
    async buildData() {
        const rows = await this.assignments.find({ relations: { teacher: true, klass: true, subject: true } });
        const byTeacher = new Map();
        for (const r of rows) {
            if (!r.teacher)
                continue;
            const key = r.teacher.id;
            const teacherName = `${r.teacher.firstName || ''} ${r.teacher.lastName || ''}`.trim();
            const entry = byTeacher.get(key) || { teacher: { id: r.teacher.id, name: teacherName, email: r.teacher.email || '' }, items: [], total: 0 };
            const subjName = r.subject ? (r.subject.name || r.subject.code || '-') : '-';
            const periods = r.subject ? (Number(r.subject.teachingPeriods || 0) || 0) : 0;
            const className = r.klass ? r.klass.name : '-';
            entry.items.push({ className, subjectName: subjName, periods });
            entry.total += periods;
            byTeacher.set(key, entry);
        }
        const allTeachers = await this.teachers.find();
        for (const t of allTeachers) {
            if (!byTeacher.has(t.id)) {
                const teacherName = `${t.firstName || ''} ${t.lastName || ''}`.trim();
                byTeacher.set(t.id, { teacher: { id: t.id, name: teacherName, email: t.email || '' }, items: [], total: 0 });
            }
        }
        const data = Array.from(byTeacher.values()).sort((a, b) => a.teacher.name.localeCompare(b.teacher.name));
        return data;
    }
    async json() {
        return await this.buildData();
    }
    async csv(res) {
        const rows = await this.buildData();
        const header = ['Teacher Name', 'Email', 'Class', 'Subject', 'Periods', 'TotalPeriods'];
        const lines = [header.join(',')];
        for (const r of rows) {
            if (r.items.length === 0) {
                lines.push([r.teacher.name, r.teacher.email, '-', '-', '0', String(r.total)].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
            }
            else {
                for (const it of r.items) {
                    lines.push([r.teacher.name, r.teacher.email, it.className, it.subjectName, String(it.periods), String(r.total)].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
                }
            }
        }
        const csv = lines.join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="teaching-periods.csv"');
        res.end(csv);
    }
    async pdf(res) {
        const data = await this.buildData();
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => {
            const out = Buffer.concat(chunks);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename="teaching-periods.pdf"');
            res.end(out);
        });
        doc.on('error', () => { try {
            res.status(500).json({ message: 'Failed to generate PDF' });
        }
        catch { } });
        doc.font('Helvetica-Bold').fontSize(16).text('Teaching Periods Report', { align: 'center' });
        doc.moveDown(0.5);
        const tableX = doc.page.margins.left;
        const tableW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const col = { teacher: 170, email: 160, klass: 120, subject: 140, periods: 60, total: 60 };
        const drawHeader = (y) => {
            doc.font('Helvetica-Bold').fontSize(10);
            let x = tableX;
            doc.text('Teacher', x, y, { width: col.teacher });
            x += col.teacher;
            doc.text('Email', x, y, { width: col.email });
            x += col.email;
            doc.text('Class', x, y, { width: col.klass });
            x += col.klass;
            doc.text('Subject', x, y, { width: col.subject });
            x += col.subject;
            doc.text('Periods', x, y, { width: col.periods, align: 'right' });
            x += col.periods;
            doc.text('Total', x, y, { width: col.total, align: 'right' });
        };
        let y = doc.y + 10;
        drawHeader(y);
        y += 16;
        doc.font('Helvetica').fontSize(10);
        const lineH = 16;
        for (const r of data) {
            if (y > doc.page.height - 60) {
                doc.addPage();
                y = doc.page.margins.top;
                drawHeader(y);
                y += 16;
            }
            if (r.items.length === 0) {
                let x = tableX;
                doc.text(r.teacher.name, x, y, { width: col.teacher });
                x += col.teacher;
                doc.text(r.teacher.email || '-', x, y, { width: col.email });
                x += col.email;
                doc.text('-', x, y, { width: col.klass });
                x += col.klass;
                doc.text('-', x, y, { width: col.subject });
                x += col.subject;
                doc.text('0', x, y, { width: col.periods, align: 'right' });
                x += col.periods;
                doc.text(String(r.total), x, y, { width: col.total, align: 'right' });
                y += lineH;
            }
            else {
                for (const it of r.items) {
                    if (y > doc.page.height - 60) {
                        doc.addPage();
                        y = doc.page.margins.top;
                        drawHeader(y);
                        y += 16;
                    }
                    let x = tableX;
                    doc.text(r.teacher.name, x, y, { width: col.teacher });
                    x += col.teacher;
                    doc.text(r.teacher.email || '-', x, y, { width: col.email });
                    x += col.email;
                    doc.text(it.className, x, y, { width: col.klass });
                    x += col.klass;
                    doc.text(it.subjectName, x, y, { width: col.subject });
                    x += col.subject;
                    doc.text(String(it.periods), x, y, { width: col.periods, align: 'right' });
                    x += col.periods;
                    doc.text(String(r.total), x, y, { width: col.total, align: 'right' });
                    y += lineH;
                }
            }
        }
        try {
            doc.end();
        }
        catch { }
    }
};
exports.TeachingLoadReportController = TeachingLoadReportController;
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('teaching-periods/json'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TeachingLoadReportController.prototype, "json", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('teaching-periods/csv'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TeachingLoadReportController.prototype, "csv", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('teaching-periods/pdf'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TeachingLoadReportController.prototype, "pdf", null);
exports.TeachingLoadReportController = TeachingLoadReportController = __decorate([
    (0, common_1.Controller)('reports'),
    __param(0, (0, typeorm_1.InjectRepository)(teacher_entity_1.Teacher)),
    __param(1, (0, typeorm_1.InjectRepository)(teaching_assignment_entity_1.TeachingAssignment)),
    __param(2, (0, typeorm_1.InjectRepository)(class_entity_1.ClassEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(subject_entity_1.Subject)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], TeachingLoadReportController);
//# sourceMappingURL=teaching-load-report.controller.js.map