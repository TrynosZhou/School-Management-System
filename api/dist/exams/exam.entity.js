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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExamEntity = void 0;
const typeorm_1 = require("typeorm");
const class_entity_1 = require("../entities/class.entity");
const subject_entity_1 = require("../entities/subject.entity");
const teacher_entity_1 = require("../entities/teacher.entity");
let ExamEntity = class ExamEntity {
    id;
    name;
    term;
    academicYear;
    subject;
    classEntity;
    dateTime;
    venue;
    invigilator1;
    invigilator2;
    status;
    notes;
    finalizedAt;
};
exports.ExamEntity = ExamEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ExamEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], ExamEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], ExamEntity.prototype, "term", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], ExamEntity.prototype, "academicYear", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => subject_entity_1.Subject, { nullable: true, eager: true }),
    __metadata("design:type", Object)
], ExamEntity.prototype, "subject", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => class_entity_1.ClassEntity, { nullable: true, eager: true }),
    __metadata("design:type", Object)
], ExamEntity.prototype, "classEntity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], ExamEntity.prototype, "dateTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 120, nullable: true }),
    __metadata("design:type", Object)
], ExamEntity.prototype, "venue", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => teacher_entity_1.Teacher, { nullable: true, eager: true }),
    __metadata("design:type", Object)
], ExamEntity.prototype, "invigilator1", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => teacher_entity_1.Teacher, { nullable: true, eager: true }),
    __metadata("design:type", Object)
], ExamEntity.prototype, "invigilator2", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'scheduled' }),
    __metadata("design:type", String)
], ExamEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], ExamEntity.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], ExamEntity.prototype, "finalizedAt", void 0);
exports.ExamEntity = ExamEntity = __decorate([
    (0, typeorm_1.Entity)({ name: 'exams' })
], ExamEntity);
//# sourceMappingURL=exam.entity.js.map