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
exports.TeachingController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const teaching_assignment_entity_1 = require("./teaching-assignment.entity");
const teacher_entity_1 = require("../entities/teacher.entity");
const class_entity_1 = require("../entities/class.entity");
const subject_entity_1 = require("../entities/subject.entity");
const bearer_guard_1 = require("../auth/bearer.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const class_validator_1 = require("class-validator");
class CreateAssignmentDto {
    teacherId;
    classId;
    subjectId;
    status;
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateAssignmentDto.prototype, "teacherId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateAssignmentDto.prototype, "classId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", Object)
], CreateAssignmentDto.prototype, "subjectId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['active', 'inactive']),
    __metadata("design:type", String)
], CreateAssignmentDto.prototype, "status", void 0);
let TeachingController = class TeachingController {
    assignments;
    teachers;
    classes;
    subjects;
    constructor(assignments, teachers, classes, subjects) {
        this.assignments = assignments;
        this.teachers = teachers;
        this.classes = classes;
        this.subjects = subjects;
    }
    async assign(dto) {
        const teacher = await this.teachers.findOne({ where: { id: dto.teacherId } });
        const klass = await this.classes.findOne({ where: { id: dto.classId } });
        const subject = dto.subjectId ? await this.subjects.findOne({ where: { id: dto.subjectId } }) : null;
        if (!teacher || !klass)
            return { success: false, message: 'Teacher or class not found' };
        if (subject) {
            const existing = await this.assignments.findOne({ where: { klass: { id: klass.id }, subject: { id: subject.id } } });
            if (existing && existing.teacher?.id !== teacher.id) {
                return { success: false, message: 'This class already has a teacher assigned for this subject' };
            }
        }
        let entity = await this.assignments.findOne({ where: { teacher: { id: teacher.id }, klass: { id: klass.id }, subject: subject ? { id: subject.id } : null } });
        if (!entity) {
            entity = this.assignments.create({ teacher, klass, subject: subject || null, status: dto.status });
        }
        else {
            entity.status = dto.status;
        }
        await this.assignments.save(entity);
        return { success: true, id: entity.id };
    }
    listForClass(classId) {
        return this.assignments.find({ where: { klass: { id: classId } } });
    }
    listForTeacher(teacherId) {
        return this.assignments.find({ where: { teacher: { id: teacherId } } });
    }
    async listClassesForTeacher(teacherId) {
        const rows = await this.assignments.find({ where: { teacher: { id: teacherId }, status: 'active' } });
        const ids = Array.from(new Set(rows.map(r => r.klass?.id).filter(Boolean)));
        return ids;
    }
    async unassign(body) {
        const teacherId = body?.teacherId;
        const classId = body?.classId;
        if (!teacherId || !classId)
            return { success: false, message: 'teacherId and classId are required' };
        const found = await this.assignments.find({ where: { teacher: { id: teacherId }, klass: { id: classId } } });
        if (!(found && found.length))
            return { success: true, removed: 0 };
        await this.assignments.remove(found);
        return { success: true, removed: found.length };
    }
    async unassignOne(body) {
        const { teacherId, classId, subjectId } = body || {};
        if (!teacherId || !classId || !subjectId)
            return { success: false, message: 'teacherId, classId and subjectId are required' };
        const found = await this.assignments.find({ where: { teacher: { id: teacherId }, klass: { id: classId }, subject: { id: subjectId } } });
        if (!(found && found.length))
            return { success: true, removed: 0 };
        await this.assignments.remove(found);
        return { success: true, removed: found.length };
    }
    async listMine(req) {
        const role = req.user?.role;
        const email = req.user?.email;
        if (!email)
            throw new common_1.ForbiddenException('Unauthorized');
        if (role === 'admin')
            return [];
        const teacher = await this.teachers.findOne({ where: { email } });
        if (!teacher)
            throw new common_1.ForbiddenException('Teacher profile not found');
        return this.assignments.find({ where: { teacher: { id: teacher.id }, status: 'active' } });
    }
    async ensureCurrentTeacher(req) {
        const email = req.user?.email;
        const role = String(req.user?.role || '').toLowerCase();
        if (!email)
            throw new common_1.ForbiddenException('Unauthorized');
        if (role !== 'teacher' && role !== 'admin')
            throw new common_1.ForbiddenException('Only teacher/admin');
        let teacher = await this.teachers.findOne({ where: { email } });
        if (!teacher) {
            const local = email.split('@')[0] || 'Teacher';
            const [firstName, ...rest] = local.replace(/[^a-zA-Z]/g, ' ').split(' ').filter(Boolean);
            const lastName = rest.join(' ') || 'Account';
            teacher = this.teachers.create({ email, firstName: firstName || 'Teacher', lastName: lastName || 'Account' });
            teacher = await this.teachers.save(teacher);
        }
        return teacher;
    }
};
exports.TeachingController = TeachingController;
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'teacher'),
    (0, common_1.Post)('assign'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateAssignmentDto]),
    __metadata("design:returntype", Promise)
], TeachingController.prototype, "assign", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('class/:classId'),
    __param(0, (0, common_1.Param)('classId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TeachingController.prototype, "listForClass", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('teacher/:teacherId'),
    __param(0, (0, common_1.Param)('teacherId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TeachingController.prototype, "listForTeacher", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('teacher/:teacherId/classes'),
    __param(0, (0, common_1.Param)('teacherId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TeachingController.prototype, "listClassesForTeacher", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'teacher'),
    (0, common_1.Delete)('assign'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TeachingController.prototype, "unassign", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'teacher'),
    (0, common_1.Delete)('assign/one'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TeachingController.prototype, "unassignOne", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('my-assignments'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TeachingController.prototype, "listMine", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Post)('ensure-current-teacher'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TeachingController.prototype, "ensureCurrentTeacher", null);
exports.TeachingController = TeachingController = __decorate([
    (0, common_1.Controller)('teaching'),
    __param(0, (0, typeorm_1.InjectRepository)(teaching_assignment_entity_1.TeachingAssignment)),
    __param(1, (0, typeorm_1.InjectRepository)(teacher_entity_1.Teacher)),
    __param(2, (0, typeorm_1.InjectRepository)(class_entity_1.ClassEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(subject_entity_1.Subject)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], TeachingController);
//# sourceMappingURL=teaching.controller.js.map