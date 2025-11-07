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
exports.AttendanceController = void 0;
const common_1 = require("@nestjs/common");
const attendance_service_1 = require("./attendance.service");
const bearer_guard_1 = require("../auth/bearer.guard");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const class_entity_1 = require("../entities/class.entity");
let AttendanceController = class AttendanceController {
    svc;
    classesRepo;
    constructor(svc, classesRepo) {
        this.svc = svc;
        this.classesRepo = classesRepo;
    }
    async record(body, req) {
        const user = (req?.user || {});
        if (user.role === 'admin') {
            return this.svc.record(body);
        }
        if (!body.classId)
            throw new common_1.ForbiddenException('classId is required');
        const klass = await this.classesRepo.findOne({ where: { id: body.classId } });
        if (!klass)
            throw new common_1.NotFoundException('Class not found');
        const teacherEmail = klass.classTeacher?.email;
        if (!teacherEmail || !user.email || teacherEmail.toLowerCase() !== user.email.toLowerCase()) {
            throw new common_1.ForbiddenException('Only the class teacher or an admin can record attendance for this class');
        }
        return this.svc.record(body);
    }
    list(studentId, term, from, to) {
        return this.svc.list(studentId, term, from, to);
    }
    summary(studentId, term, from, to) {
        return this.svc.summary(studentId, term, from, to);
    }
    presentCount(date) {
        return this.svc.presentCount(date);
    }
};
exports.AttendanceController = AttendanceController;
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Post)('record'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "record", null);
__decorate([
    (0, common_1.Get)('list'),
    __param(0, (0, common_1.Query)('studentId')),
    __param(1, (0, common_1.Query)('term')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('summary'),
    __param(0, (0, common_1.Query)('studentId')),
    __param(1, (0, common_1.Query)('term')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "summary", null);
__decorate([
    (0, common_1.Get)('present-count'),
    __param(0, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "presentCount", null);
exports.AttendanceController = AttendanceController = __decorate([
    (0, common_1.Controller)('attendance'),
    __param(1, (0, typeorm_1.InjectRepository)(class_entity_1.ClassEntity)),
    __metadata("design:paramtypes", [attendance_service_1.AttendanceService,
        typeorm_2.Repository])
], AttendanceController);
//# sourceMappingURL=attendance.controller.js.map