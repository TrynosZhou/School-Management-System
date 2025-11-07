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
exports.ExamsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const exam_entity_1 = require("./exam.entity");
let ExamsService = class ExamsService {
    exams;
    constructor(exams) {
        this.exams = exams;
    }
    async list(filters) {
        const qb = this.exams.createQueryBuilder('e')
            .leftJoinAndSelect('e.subject', 'subject')
            .leftJoinAndSelect('e.classEntity', 'classEntity')
            .leftJoinAndSelect('e.invigilator1', 'inv1')
            .leftJoinAndSelect('e.invigilator2', 'inv2')
            .orderBy('e.dateTime', 'ASC');
        if (filters?.classId)
            qb.andWhere('classEntity.id = :cid', { cid: filters.classId });
        if (filters?.subjectId)
            qb.andWhere('subject.id = :sid', { sid: filters.subjectId });
        if (filters?.from)
            qb.andWhere('(e.dateTime IS NULL OR e.dateTime >= :f)', { f: filters.from });
        if (filters?.to)
            qb.andWhere('(e.dateTime IS NULL OR e.dateTime <= :t)', { t: filters.to });
        if (filters?.q)
            qb.andWhere('(LOWER(e.name) LIKE :q OR LOWER(e.venue) LIKE :q)', { q: `%${filters.q.toLowerCase()}%` });
        return qb.getMany();
    }
    async create(body) {
        const name = (body.name || '').trim();
        if (!name)
            throw new common_1.BadRequestException('name is required');
        const e = this.exams.create({
            name,
            term: body.term || null,
            academicYear: body.academicYear || null,
            venue: body.venue || null,
            status: body.status || 'scheduled',
            notes: body.notes || null,
        });
        if (body.date || body.time) {
            const dt = new Date(`${body.date || ''} ${body.time || '00:00'}`.trim());
            if (!isNaN(dt.getTime()))
                e.dateTime = dt;
        }
        if (body.subjectId)
            e.subject = { id: body.subjectId };
        if (body.classId)
            e.classEntity = { id: body.classId };
        if (body.invigilator1Id)
            e.invigilator1 = { id: body.invigilator1Id };
        if (body.invigilator2Id)
            e.invigilator2 = { id: body.invigilator2Id };
        return this.exams.save(e);
    }
    async exportCsv(filters) {
        const rows = await this.list(filters);
        const header = 'Name,Term,AcademicYear,Class,Subject,Date,Time,Venue,Status,Invigilator1,Invigilator2\n';
        const body = rows.map(r => {
            const date = r.dateTime ? new Date(r.dateTime) : null;
            const d = date ? date.toISOString().slice(0, 10) : '';
            const t = date ? date.toTimeString().slice(0, 5) : '';
            const inv1 = r.invigilator1?.lastName ? `${r.invigilator1.firstName} ${r.invigilator1.lastName}` : '';
            const inv2 = r.invigilator2?.lastName ? `${r.invigilator2.firstName} ${r.invigilator2.lastName}` : '';
            return [r.name, r.term || '', r.academicYear || '', r.classEntity?.name || '', r.subject?.name || '', d, t, r.venue || '', r.status || '', inv1, inv2]
                .map(v => {
                const s = (v ?? '').toString();
                return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
            }).join(',');
        }).join('\n');
        return header + body + '\n';
    }
    async finalize(id) {
        const exam = await this.exams.findOne({ where: { id } });
        if (!exam)
            throw new common_1.BadRequestException('Exam not found');
        exam.status = 'completed';
        exam.finalizedAt = new Date();
        return this.exams.save(exam);
    }
};
exports.ExamsService = ExamsService;
exports.ExamsService = ExamsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(exam_entity_1.ExamEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ExamsService);
//# sourceMappingURL=exams.service.js.map