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
exports.Mark = void 0;
const typeorm_1 = require("typeorm");
const student_entity_1 = require("../entities/student.entity");
const class_entity_1 = require("../entities/class.entity");
const subject_entity_1 = require("../entities/subject.entity");
let Mark = class Mark {
    id;
    student;
    klass;
    subject;
    session;
    examType;
    score;
    comment;
    grade;
    createdAt;
    updatedAt;
};
exports.Mark = Mark;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Mark.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => student_entity_1.Student, { eager: true, onDelete: 'CASCADE' }),
    __metadata("design:type", student_entity_1.Student)
], Mark.prototype, "student", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => class_entity_1.ClassEntity, { eager: true, onDelete: 'CASCADE' }),
    __metadata("design:type", class_entity_1.ClassEntity)
], Mark.prototype, "klass", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => subject_entity_1.Subject, { eager: true, onDelete: 'SET NULL', nullable: true }),
    __metadata("design:type", Object)
], Mark.prototype, "subject", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], Mark.prototype, "session", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], Mark.prototype, "examType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", String)
], Mark.prototype, "score", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], Mark.prototype, "comment", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 16, nullable: true }),
    __metadata("design:type", Object)
], Mark.prototype, "grade", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Mark.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Mark.prototype, "updatedAt", void 0);
exports.Mark = Mark = __decorate([
    (0, typeorm_1.Entity)({ name: 'marks' })
], Mark);
//# sourceMappingURL=mark.entity.js.map