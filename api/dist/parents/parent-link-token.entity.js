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
exports.ParentLinkToken = void 0;
const typeorm_1 = require("typeorm");
const student_entity_1 = require("../entities/student.entity");
let ParentLinkToken = class ParentLinkToken {
    id;
    student;
    code;
    expiresAt;
    usedAt;
    createdAt;
};
exports.ParentLinkToken = ParentLinkToken;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ParentLinkToken.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => student_entity_1.Student, { nullable: false }),
    __metadata("design:type", student_entity_1.Student)
], ParentLinkToken.prototype, "student", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ParentLinkToken.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], ParentLinkToken.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], ParentLinkToken.prototype, "usedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ParentLinkToken.prototype, "createdAt", void 0);
exports.ParentLinkToken = ParentLinkToken = __decorate([
    (0, typeorm_1.Entity)({ name: 'parent_link_tokens' }),
    (0, typeorm_1.Index)(['code'], { unique: true })
], ParentLinkToken);
//# sourceMappingURL=parent-link-token.entity.js.map