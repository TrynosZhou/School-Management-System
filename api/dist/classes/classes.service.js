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
exports.ClassesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const class_entity_1 = require("../entities/class.entity");
const teacher_entity_1 = require("../entities/teacher.entity");
const settings_entity_1 = require("../settings/settings.entity");
let ClassesService = class ClassesService {
    repo;
    teachers;
    settingsRepo;
    constructor(repo, teachers, settingsRepo) {
        this.repo = repo;
        this.teachers = teachers;
        this.settingsRepo = settingsRepo;
    }
    async create(dto) {
        if (!dto.academicYear) {
            const s = await this.settingsRepo.findOne({ where: { id: 'global' } });
            dto.academicYear = (s?.academicYear || '').toString();
            if (!dto.academicYear)
                throw new common_1.BadRequestException('Academic year not set in Settings');
        }
        const exists = await this.repo.findOne({ where: { name: dto.name, academicYear: dto.academicYear } });
        if (exists)
            throw new common_1.BadRequestException('Class already exists for this academic year');
        const c = this.repo.create({ name: dto.name, gradeLevel: dto.gradeLevel, academicYear: dto.academicYear });
        if (dto.teacherId) {
            const t = await this.teachers.findOne({ where: { id: dto.teacherId } });
            if (!t)
                throw new common_1.BadRequestException('Teacher not found');
            const already = await this.repo.findOne({ where: { classTeacher: { id: dto.teacherId } } });
            if (already)
                throw new common_1.BadRequestException('This teacher is already assigned as a class teacher to another class');
            c.classTeacher = t;
        }
        return this.repo.save(c);
    }
    async findAll() {
        return this.repo.find({ order: { academicYear: 'DESC', name: 'ASC' } });
    }
    async findOne(id) {
        const c = await this.repo.findOne({ where: { id } });
        if (!c)
            throw new common_1.NotFoundException('Class not found');
        return c;
    }
    async update(id, partial) {
        const c = await this.findOne(id);
        if (partial.name !== undefined)
            c.name = partial.name;
        if (partial.gradeLevel !== undefined)
            c.gradeLevel = partial.gradeLevel;
        if (partial.academicYear !== undefined)
            c.academicYear = partial.academicYear;
        if (partial.teacherId !== undefined) {
            if (!partial.teacherId) {
                c.classTeacher = null;
            }
            else {
                const t = await this.teachers.findOne({ where: { id: partial.teacherId } });
                if (!t)
                    throw new common_1.BadRequestException('Teacher not found');
                const other = await this.repo.findOne({ where: { classTeacher: { id: partial.teacherId } } });
                if (other && other.id !== c.id)
                    throw new common_1.BadRequestException('This teacher is already assigned as a class teacher to another class');
                c.classTeacher = t;
            }
        }
        return this.repo.save(c);
    }
    async remove(id) {
        const res = await this.repo.delete(id);
        if (!res.affected)
            throw new common_1.NotFoundException('Class not found');
    }
    async promoteClasses() {
        const all = await this.repo.find();
        let promoted = 0;
        let graduated = 0;
        const toCreate = [];
        for (const c of all) {
            const current = this.parseForm(c.gradeLevel) ?? this.parseForm(c.name);
            if (current === null) {
                continue;
            }
            if (current >= 6) {
                const exists = await this.repo.findOne({ where: { name: 'Graduated Class', academicYear: c.academicYear } });
                if (!exists) {
                    const grad = this.repo.create({ name: 'Graduated Class', gradeLevel: 'Graduated Class', academicYear: c.academicYear });
                    toCreate.push(grad);
                }
                graduated++;
            }
            else {
                const nxt = this.nextForm(`Form ${current}`);
                if (nxt === null)
                    continue;
                const stream = this.detectStream(c.name);
                const newName = stream ? `${nxt} ${stream}` : `${nxt}`;
                const newGrade = `Form ${nxt}`;
                const exists = await this.repo.findOne({ where: { name: newName, academicYear: c.academicYear } });
                if (!exists) {
                    const nc = this.repo.create({ name: newName, gradeLevel: newGrade, academicYear: c.academicYear });
                    toCreate.push(nc);
                    promoted++;
                }
            }
        }
        if (toCreate.length) {
            await this.repo.save(toCreate);
        }
        return { success: true, promoted, graduated };
    }
    parseForm(level) {
        if (!level)
            return null;
        const m = /form\s*(\d+)/i.exec(level);
        if (!m)
            return null;
        const n = parseInt(m[1], 10);
        return isNaN(n) ? null : n;
    }
    nextForm(level) {
        const n = this.parseForm(level);
        if (n === null)
            return null;
        if (n >= 6)
            return 6;
        if (n < 1)
            return 1;
        return n + 1;
    }
    async normalizeNames(defaultStream = 'Blue') {
        const all = await this.repo.find();
        let updated = 0;
        const allowed = ['Blue', 'White', 'Gold'];
        const toSave = [];
        for (const c of all) {
            const n = this.parseForm(c.gradeLevel) ?? this.parseForm(c.name);
            if (!n)
                continue;
            const detected = this.detectStream(c.name);
            const stream = (detected && allowed.includes(detected)) ? detected : defaultStream;
            const wantedName = `${n} ${stream}`;
            const wantedGrade = `Form ${n}`;
            if (c.name !== wantedName || c.gradeLevel !== wantedGrade) {
                c.name = wantedName;
                c.gradeLevel = wantedGrade;
                toSave.push(c);
                updated++;
            }
        }
        if (toSave.length)
            await this.repo.save(toSave);
        return { success: true, updated };
    }
    detectStream(name) {
        if (!name)
            return null;
        const m = /(Blue|White|Gold)/i.exec(name);
        return m ? (m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()) : null;
    }
    async ensureClasses(year, items) {
        if (!year || !items?.length)
            return { success: true, created: 0, existing: 0 };
        let created = 0, existing = 0;
        for (const it of items) {
            let name = '';
            let gradeLevel = '';
            if (it.type === 'form') {
                const f = it;
                const n = Math.max(1, Math.min(6, Math.floor(f.gradeNumber || 1)));
                name = `${n} ${f.stream}`;
                gradeLevel = `Form ${n}`;
            }
            else if (it.type === 'alevel') {
                const a = it;
                name = `${a.band} ${a.stream}`;
                gradeLevel = a.band;
            }
            else {
                continue;
            }
            const found = await this.repo.findOne({ where: { name, academicYear: year } });
            if (found) {
                existing++;
                continue;
            }
            const c = this.repo.create({ name, gradeLevel, academicYear: year });
            await this.repo.save(c);
            created++;
        }
        return { success: true, created, existing };
    }
};
exports.ClassesService = ClassesService;
exports.ClassesService = ClassesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(class_entity_1.ClassEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(teacher_entity_1.Teacher)),
    __param(2, (0, typeorm_1.InjectRepository)(settings_entity_1.Settings)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ClassesService);
//# sourceMappingURL=classes.service.js.map