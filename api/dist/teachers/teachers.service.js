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
exports.TeachersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const teacher_entity_1 = require("../entities/teacher.entity");
let TeachersService = class TeachersService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async create(dto) {
        const exists = await this.repo.findOne({ where: { email: dto.email } });
        if (exists)
            throw new common_1.BadRequestException('Email already exists');
        const t = this.repo.create(dto);
        return this.repo.save(t);
    }
    async findAll() {
        return this.repo.find({ order: { lastName: 'ASC', firstName: 'ASC' } });
    }
    async findOne(id) {
        const t = await this.repo.findOne({ where: { id } });
        if (!t)
            throw new common_1.NotFoundException('Teacher not found');
        return t;
    }
    async update(id, partial) {
        const t = await this.findOne(id);
        if (partial.email && partial.email !== t.email) {
            const exists = await this.repo.findOne({ where: { email: partial.email } });
            if (exists)
                throw new common_1.BadRequestException('Email already exists');
        }
        Object.assign(t, partial);
        return this.repo.save(t);
    }
    async remove(id) {
        const res = await this.repo.delete(id);
        if (!res.affected)
            throw new common_1.NotFoundException('Teacher not found');
    }
};
exports.TeachersService = TeachersService;
exports.TeachersService = TeachersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(teacher_entity_1.Teacher)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TeachersService);
//# sourceMappingURL=teachers.service.js.map