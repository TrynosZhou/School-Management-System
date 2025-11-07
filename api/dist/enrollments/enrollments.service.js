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
exports.EnrollmentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const enrollment_entity_1 = require("../entities/enrollment.entity");
const student_entity_1 = require("../entities/student.entity");
const class_entity_1 = require("../entities/class.entity");
let EnrollmentsService = class EnrollmentsService {
    enrollRepo;
    studentRepo;
    classRepo;
    constructor(enrollRepo, studentRepo, classRepo) {
        this.enrollRepo = enrollRepo;
        this.studentRepo = studentRepo;
        this.classRepo = classRepo;
    }
    async create(dto) {
        const student = await this.studentRepo.findOne({ where: { id: dto.studentId } });
        if (!student)
            throw new common_1.NotFoundException('Student not found');
        const cls = await this.classRepo.findOne({ where: { id: dto.classId } });
        if (!cls)
            throw new common_1.NotFoundException('Class not found');
        const exists = await this.enrollRepo.findOne({ where: { student: { id: student.id }, classEntity: { id: cls.id } } });
        if (exists)
            throw new common_1.BadRequestException('Student already enrolled in this class');
        const active = await this.enrollRepo.findOne({ where: { student: { id: student.id }, status: 'active' }, relations: ['classEntity'] });
        if (active) {
            const name = (active.classEntity && active.classEntity.name) || 'another class';
            throw new common_1.BadRequestException(`Student already has an active enrollment in ${name}. End/withdraw that enrollment before enrolling in a new class.`);
        }
        const enrollment = this.enrollRepo.create({
            student,
            classEntity: cls,
            startDate: dto.startDate ?? null,
            status: dto.status ?? 'active',
        });
        return this.enrollRepo.save(enrollment);
    }
    async listByStudent(studentId) {
        return this.enrollRepo.find({ where: { student: { id: studentId } }, relations: ['student', 'classEntity'] });
    }
    async listByClass(classId) {
        return this.enrollRepo.find({ where: { classEntity: { id: classId } }, relations: ['student', 'classEntity'] });
    }
    async listRecent(limit = 5) {
        return this.enrollRepo.find({
            order: { createdAt: 'DESC' },
            take: Math.min(Math.max(limit, 1), 20),
            relations: ['student', 'classEntity'],
        });
    }
    async remove(id) {
        const res = await this.enrollRepo.delete(id);
        if (!res.affected)
            throw new common_1.NotFoundException('Enrollment not found');
    }
};
exports.EnrollmentsService = EnrollmentsService;
exports.EnrollmentsService = EnrollmentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(enrollment_entity_1.Enrollment)),
    __param(1, (0, typeorm_1.InjectRepository)(student_entity_1.Student)),
    __param(2, (0, typeorm_1.InjectRepository)(class_entity_1.ClassEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], EnrollmentsService);
//# sourceMappingURL=enrollments.service.js.map