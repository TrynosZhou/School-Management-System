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
exports.AttendanceService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const attendance_entity_1 = require("../entities/attendance.entity");
const student_entity_1 = require("../entities/student.entity");
const class_entity_1 = require("../entities/class.entity");
let AttendanceService = class AttendanceService {
    repo;
    students;
    classes;
    constructor(repo, students, classes) {
        this.repo = repo;
        this.students = students;
        this.classes = classes;
    }
    async record(dto) {
        const student = await this.students.findOne({ where: { id: dto.studentId } });
        if (!student)
            throw new common_1.NotFoundException('Student not found');
        const klass = dto.classId ? await this.classes.findOne({ where: { id: dto.classId } }) : null;
        const existing = await this.repo.findOne({ where: { student: { id: student.id }, date: dto.date } });
        const rec = existing || this.repo.create({ student, date: dto.date });
        rec.present = !!dto.present;
        rec.term = dto.term ?? rec.term ?? null;
        rec.klass = klass ?? rec.klass ?? null;
        return this.repo.save(rec);
    }
    async list(studentId, term, fromDate, toDate) {
        const where = {};
        if (studentId)
            where.student = { id: studentId };
        if (term)
            where.term = term;
        if (fromDate && toDate)
            where.date = (0, typeorm_2.Between)(fromDate, toDate);
        return this.repo.find({ where, order: { date: 'ASC' } });
    }
    async summary(studentId, term, fromDate, toDate) {
        const list = await this.list(studentId, term, fromDate, toDate);
        const total = list.length;
        const present = list.filter(x => x.present).length;
        return { total, present };
    }
    async presentCount(date) {
        return this.repo.count({ where: { date, present: true } });
    }
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(attendance_entity_1.Attendance)),
    __param(1, (0, typeorm_1.InjectRepository)(student_entity_1.Student)),
    __param(2, (0, typeorm_1.InjectRepository)(class_entity_1.ClassEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map