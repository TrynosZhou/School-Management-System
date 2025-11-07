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
exports.SubjectsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const subject_entity_1 = require("../entities/subject.entity");
let SubjectsService = class SubjectsService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async create(dto) {
        const code = (dto.code ?? '').trim();
        const name = (dto.name ?? '').trim();
        const periodsRaw = dto.teachingPeriods;
        const teachingPeriods = periodsRaw === undefined || periodsRaw === null ? 0 : Number(periodsRaw);
        if (!code || !name)
            throw new common_1.BadRequestException('Code and name are required');
        if (code.length > 50)
            throw new common_1.BadRequestException('Code must be at most 50 characters');
        if (name.length > 150)
            throw new common_1.BadRequestException('Name must be at most 150 characters');
        if (!Number.isFinite(teachingPeriods) || teachingPeriods < 0 || teachingPeriods > 60)
            throw new common_1.BadRequestException('Teaching periods must be between 0 and 60');
        const exists = await this.repo.findOne({ where: { code } });
        if (exists)
            throw new common_1.BadRequestException('Code already exists');
        const s = this.repo.create({ code, name, teachingPeriods });
        try {
            return await this.repo.save(s);
        }
        catch (err) {
            const msg = String(err?.message || '').toLowerCase();
            if (err?.code === '23505' || err?.errno === 19 || msg.includes('unique') || msg.includes('constraint')) {
                throw new common_1.BadRequestException('Code already exists');
            }
            throw err;
        }
    }
    async findAll() {
        return this.repo.find({ order: { code: 'ASC' } });
    }
    async findOne(id) {
        const s = await this.repo.findOne({ where: { id } });
        if (!s)
            throw new common_1.NotFoundException('Subject not found');
        return s;
    }
    async update(id, partial) {
        const s = await this.findOne(id);
        const next = {};
        if (partial.code !== undefined) {
            const code = String(partial.code).trim();
            if (!code)
                throw new common_1.BadRequestException('Code is required');
            if (code.length > 50)
                throw new common_1.BadRequestException('Code must be at most 50 characters');
            if (code !== s.code) {
                const exists = await this.repo.findOne({ where: { code } });
                if (exists)
                    throw new common_1.BadRequestException('Code already exists');
            }
            next.code = code;
        }
        if (partial.name !== undefined) {
            const name = String(partial.name).trim();
            if (!name)
                throw new common_1.BadRequestException('Name is required');
            if (name.length > 150)
                throw new common_1.BadRequestException('Name must be at most 150 characters');
            next.name = name;
        }
        if (partial.teachingPeriods !== undefined) {
            const n = Number(partial.teachingPeriods);
            if (!Number.isFinite(n) || n < 0 || n > 60)
                throw new common_1.BadRequestException('Teaching periods must be between 0 and 60');
            next.teachingPeriods = Math.floor(n);
        }
        Object.assign(s, next);
        try {
            return await this.repo.save(s);
        }
        catch (err) {
            const msg = String(err?.message || '').toLowerCase();
            if (err?.code === '23505' || err?.errno === 19 || msg.includes('unique') || msg.includes('constraint')) {
                throw new common_1.BadRequestException('Code already exists');
            }
            throw err;
        }
    }
    async remove(id) {
        const res = await this.repo.delete(id);
        if (!res.affected)
            throw new common_1.NotFoundException('Subject not found');
    }
};
exports.SubjectsService = SubjectsService;
exports.SubjectsService = SubjectsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(subject_entity_1.Subject)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SubjectsService);
//# sourceMappingURL=subjects.service.js.map