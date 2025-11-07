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
exports.ClassEntity = void 0;
const typeorm_1 = require("typeorm");
const enrollment_entity_1 = require("./enrollment.entity");
const teacher_entity_1 = require("./teacher.entity");
let ClassEntity = class ClassEntity {
    id;
    name;
    gradeLevel;
    academicYear;
    enrollments;
    classTeacher;
    createdAt;
    updatedAt;
};
exports.ClassEntity = ClassEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ClassEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 150 }),
    __metadata("design:type", String)
], ClassEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], ClassEntity.prototype, "gradeLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], ClassEntity.prototype, "academicYear", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => enrollment_entity_1.Enrollment, (e) => e.classEntity),
    __metadata("design:type", Array)
], ClassEntity.prototype, "enrollments", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => teacher_entity_1.Teacher, { eager: true, nullable: true, onDelete: 'SET NULL' }),
    __metadata("design:type", Object)
], ClassEntity.prototype, "classTeacher", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ClassEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ClassEntity.prototype, "updatedAt", void 0);
exports.ClassEntity = ClassEntity = __decorate([
    (0, typeorm_1.Entity)({ name: 'classes' })
], ClassEntity);
//# sourceMappingURL=class.entity.js.map