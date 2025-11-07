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
exports.TeachingAssignment = void 0;
const typeorm_1 = require("typeorm");
const teacher_entity_1 = require("../entities/teacher.entity");
const class_entity_1 = require("../entities/class.entity");
const subject_entity_1 = require("../entities/subject.entity");
let TeachingAssignment = class TeachingAssignment {
    id;
    teacher;
    klass;
    subject;
    status;
    createdAt;
    updatedAt;
};
exports.TeachingAssignment = TeachingAssignment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TeachingAssignment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => teacher_entity_1.Teacher, { eager: true, onDelete: 'CASCADE' }),
    __metadata("design:type", teacher_entity_1.Teacher)
], TeachingAssignment.prototype, "teacher", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => class_entity_1.ClassEntity, { eager: true, onDelete: 'CASCADE' }),
    __metadata("design:type", class_entity_1.ClassEntity)
], TeachingAssignment.prototype, "klass", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => subject_entity_1.Subject, { eager: true, onDelete: 'SET NULL', nullable: true }),
    __metadata("design:type", Object)
], TeachingAssignment.prototype, "subject", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'active' }),
    __metadata("design:type", String)
], TeachingAssignment.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TeachingAssignment.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], TeachingAssignment.prototype, "updatedAt", void 0);
exports.TeachingAssignment = TeachingAssignment = __decorate([
    (0, typeorm_1.Unique)('UQ_teacher_class_subject', ['teacher', 'klass', 'subject']),
    (0, typeorm_1.Unique)('UQ_class_subject', ['klass', 'subject']),
    (0, typeorm_1.Entity)({ name: 'teaching_assignments' })
], TeachingAssignment);
//# sourceMappingURL=teaching-assignment.entity.js.map