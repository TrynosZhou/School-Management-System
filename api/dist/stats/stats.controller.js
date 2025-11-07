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
exports.StatsController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const student_entity_1 = require("../entities/student.entity");
const teacher_entity_1 = require("../entities/teacher.entity");
const class_entity_1 = require("../entities/class.entity");
const enrollment_entity_1 = require("../entities/enrollment.entity");
let StatsController = class StatsController {
    students;
    teachers;
    classes;
    enrollments;
    constructor(students, teachers, classes, enrollments) {
        this.students = students;
        this.teachers = teachers;
        this.classes = classes;
        this.enrollments = enrollments;
    }
    async getCounts() {
        const [studentsCount, teachersCount, classesCount] = await Promise.all([
            this.students.count(),
            this.teachers.count(),
            this.classes.count(),
        ]);
        return { students: studentsCount, teachers: teachersCount, classes: classesCount };
    }
    async admissionsTrend() {
        const now = new Date();
        const series = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
            const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
            const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
            const count = await this.students
                .createQueryBuilder('s')
                .where('s.createdAt >= :start AND s.createdAt < :end', { start, end })
                .getCount();
            const label = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
            series.push({ month: label, count });
        }
        return series;
    }
    async enrollmentsTrend() {
        const now = new Date();
        const series = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
            const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
            const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
            const count = await this.enrollments
                .createQueryBuilder('e')
                .where('e.createdAt >= :start AND e.createdAt < :end', { start, end })
                .getCount();
            const label = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
            series.push({ month: label, count });
        }
        return series;
    }
};
exports.StatsController = StatsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StatsController.prototype, "getCounts", null);
__decorate([
    (0, common_1.Get)('admissionsTrend'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StatsController.prototype, "admissionsTrend", null);
__decorate([
    (0, common_1.Get)('enrollmentsTrend'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StatsController.prototype, "enrollmentsTrend", null);
exports.StatsController = StatsController = __decorate([
    (0, common_1.Controller)('stats'),
    __param(0, (0, typeorm_1.InjectRepository)(student_entity_1.Student)),
    __param(1, (0, typeorm_1.InjectRepository)(teacher_entity_1.Teacher)),
    __param(2, (0, typeorm_1.InjectRepository)(class_entity_1.ClassEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(enrollment_entity_1.Enrollment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], StatsController);
//# sourceMappingURL=stats.controller.js.map