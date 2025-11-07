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
exports.FeeInvoice = void 0;
const typeorm_1 = require("typeorm");
const student_entity_1 = require("../entities/student.entity");
let FeeInvoice = class FeeInvoice {
    id;
    student;
    term;
    academicYear;
    amount;
    description;
    status;
    createdAt;
};
exports.FeeInvoice = FeeInvoice;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], FeeInvoice.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => student_entity_1.Student, { eager: true, onDelete: 'CASCADE' }),
    __metadata("design:type", student_entity_1.Student)
], FeeInvoice.prototype, "student", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], FeeInvoice.prototype, "term", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 15 }),
    __metadata("design:type", String)
], FeeInvoice.prototype, "academicYear", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", String)
], FeeInvoice.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], FeeInvoice.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'unpaid' }),
    __metadata("design:type", String)
], FeeInvoice.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], FeeInvoice.prototype, "createdAt", void 0);
exports.FeeInvoice = FeeInvoice = __decorate([
    (0, typeorm_1.Entity)({ name: 'fee_invoices' })
], FeeInvoice);
//# sourceMappingURL=fee-invoice.entity.js.map