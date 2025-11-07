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
exports.ParentsService = void 0;
const common_1 = require("@nestjs/common");
const events_1 = require("events");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const parent_student_entity_1 = require("./parent-student.entity");
const parent_link_token_entity_1 = require("./parent-link-token.entity");
const student_entity_1 = require("../entities/student.entity");
const user_entity_1 = require("../entities/user.entity");
let ParentsService = class ParentsService {
    links;
    students;
    tokens;
    users;
    constructor(links, students, tokens, users) {
        this.links = links;
        this.students = students;
        this.tokens = tokens;
        this.users = users;
    }
    emitter = new events_1.EventEmitter();
    onChange(listener) {
        const fn = (p) => listener(p);
        this.emitter.on('change', fn);
        return () => this.emitter.off('change', fn);
    }
    emitChange(payload) {
        try {
            this.emitter.emit('change', payload);
        }
        catch { }
    }
    async linkStudent(parentUserId, studentIdOrCode, dob, lastName) {
        const parent = await this.users.findOne({ where: { id: parentUserId } });
        if (!parent)
            throw new common_1.BadRequestException('Parent not found');
        let student = await this.students.findOne({ where: { id: studentIdOrCode }, relations: { parent: true } });
        if (!student) {
            student = await this.students.findOne({ where: { studentId: studentIdOrCode }, relations: { parent: true } });
        }
        if (!student)
            throw new common_1.BadRequestException('Student not found');
        if (typeof lastName === 'string' && lastName.trim()) {
            const a = (student.lastName || '').toString().trim().toLowerCase();
            const b = lastName.toString().trim().toLowerCase();
            if (!a || a !== b)
                throw new common_1.ForbiddenException('Last name does not match');
        }
        if (student.dob && dob) {
            const norm = (v) => {
                try {
                    let s = String(v).trim();
                    if (v instanceof Date)
                        s = v.toISOString();
                    if (s.includes('T'))
                        s = s.split('T')[0];
                    s = s.replace(/\//g, '-');
                    return s;
                }
                catch {
                    return String(v);
                }
            };
            const s = norm(student.dob);
            const d = norm(dob);
            if (s !== d)
                throw new common_1.ForbiddenException('DOB does not match');
        }
        else if (student.dob && !dob) {
            throw new common_1.ForbiddenException('DOB required to link this student');
        }
        if (student.parent && student.parent.id !== parent.id) {
            throw new common_1.BadRequestException('This student is already linked to another parent account');
        }
        if (student.parent && student.parent.id === parent.id) {
            throw new common_1.BadRequestException('This student is already linked to your account');
        }
        student.parent = parent;
        await this.students.save(student);
        this.emitChange({ type: 'link', parentId: parent.id, studentId: student.id, studentCode: student.studentId || null, at: Date.now() });
        return { ok: true };
    }
    async adminLink(parentUserId, studentIdOrCode) {
        if (!parentUserId || !studentIdOrCode)
            throw new common_1.BadRequestException('parentId and student required');
        const parent = await this.users.findOne({ where: { id: parentUserId } });
        if (!parent)
            throw new common_1.BadRequestException('Parent not found');
        let student = await this.students.findOne({ where: { id: studentIdOrCode }, relations: { parent: true } });
        if (!student)
            student = await this.students.findOne({ where: { studentId: studentIdOrCode }, relations: { parent: true } });
        if (!student)
            throw new common_1.BadRequestException('Student not found');
        if (student.parent && student.parent.id !== parent.id) {
            throw new common_1.BadRequestException('This student is already linked to another parent account');
        }
        if (!student.parent) {
            student.parent = parent;
            await this.students.save(student);
            this.emitChange({ type: 'link', parentId: parent.id, studentId: student.id, studentCode: student.studentId || null, at: Date.now() });
        }
        return { ok: true };
    }
    async adminUnlink(parentUserId, studentIdOrCode) {
        if (!parentUserId || !studentIdOrCode)
            throw new common_1.BadRequestException('parentId and student required');
        let student = await this.students.findOne({ where: { id: studentIdOrCode }, relations: { parent: true } });
        if (!student)
            student = await this.students.findOne({ where: { studentId: studentIdOrCode }, relations: { parent: true } });
        if (!student)
            return { ok: true };
        if (student.parent && student.parent.id === parentUserId) {
            student.parent = null;
            await this.students.save(student);
            this.emitChange({ type: 'unlink', parentId: parentUserId, studentId: student.id, studentCode: student.studentId || null, at: Date.now() });
        }
        return { ok: true };
    }
    async adminDeleteParent(parentUserId) {
        if (!parentUserId)
            throw new common_1.BadRequestException('parentId required');
        const kids = await this.students.find({ where: { parent: { id: parentUserId } } });
        for (const s of kids) {
            s.parent = null;
            await this.students.save(s);
            this.emitChange({ type: 'unlink', parentId: parentUserId, studentId: s.id, studentCode: s.studentId || null, at: Date.now() });
        }
        await this.users.delete(parentUserId);
        return { ok: true };
    }
    async myStudents(parentUserId) {
        const students = await this.students.createQueryBuilder('s')
            .leftJoin('fee_invoices', 'fi', 'fi.studentId = s.id')
            .where('s.parentId = :pid', { pid: parentUserId })
            .andWhere('(s.isDeleted IS NULL OR s.isDeleted = false)')
            .select([
            'DISTINCT s.id AS id',
            's.studentId AS studentId',
            's.firstName AS firstName',
            's.lastName AS lastName',
            "COALESCE(SUM(CASE WHEN fi.status <> 'paid' THEN CAST(fi.amount AS DECIMAL(12,2)) ELSE 0 END), 0) AS balance",
        ])
            .groupBy('s.id')
            .addGroupBy('s.studentId')
            .addGroupBy('s.firstName')
            .addGroupBy('s.lastName')
            .orderBy('s.lastName', 'ASC')
            .addOrderBy('s.firstName', 'ASC')
            .getRawMany();
        return students.map(r => ({ ...r, balance: Number(r.balance ?? 0) }));
    }
    async isLinked(parentUserId, studentId) {
        const s = await this.students.findOne({ where: { id: studentId }, relations: { parent: true } });
        if (!s)
            return false;
        if (s.parent && s.parent.id === parentUserId)
            return true;
        const raw = await this.students.createQueryBuilder('s')
            .where('s.id = :sid', { sid: studentId })
            .andWhere('s.parentId = :pid', { pid: parentUserId })
            .getOne();
        return !!raw;
    }
    async parentEmailsForStudents(studentIds) {
        if (!studentIds.length)
            return [];
        const students = await this.students.find({ where: studentIds.map(id => ({ id })), relations: { parent: true } });
        const emails = new Set();
        students.forEach(s => { if (s.parent?.email)
            emails.add(s.parent.email); });
        return Array.from(emails);
    }
    async parentEmailsAll() {
        const students = await this.students.find({ where: { parent: { id: (0, typeorm_2.Not)(null) } }, relations: { parent: true } });
        const emails = new Set();
        students.forEach(s => { if (s.parent?.email)
            emails.add(s.parent.email); });
        return Array.from(emails);
    }
    async adminParentsWithLinks() {
        const students = await this.students.find({ where: { parent: { id: (0, typeorm_2.Not)((0, typeorm_2.IsNull)()) } }, relations: { parent: true } });
        return students
            .filter(s => !!s.parent)
            .map(s => ({
            parentId: s.parent.id,
            parentFullName: s.parent.fullName || null,
            parentEmail: s.parent.email || null,
            parentContactNumber: s.parent.contactNumber || null,
            studentId: s.id,
            studentCode: s.studentId || null,
            studentFullName: `${s.firstName || ''} ${s.lastName || ''}`.trim(),
        }));
    }
    async adminParentsAllFlat() {
        const parents = await this.users.createQueryBuilder('u')
            .where('LOWER(u.role) = :r', { r: 'parent' })
            .getMany();
        const students = await this.students.find({ where: { parent: { id: (0, typeorm_2.Not)((0, typeorm_2.IsNull)()) } }, relations: { parent: true } });
        const byParent = new Map();
        students.forEach(s => {
            if (!s.parent?.id)
                return;
            const arr = byParent.get(s.parent.id) || [];
            arr.push({ id: s.id, code: s.studentId || null, name: `${s.firstName || ''} ${s.lastName || ''}`.trim() });
            byParent.set(s.parent.id, arr);
        });
        const rows = [];
        const parentIndex = new Map(parents.map(p => [p.id, p]));
        students.forEach(s => { if (s.parent?.id && !parentIndex.has(s.parent.id))
            parentIndex.set(s.parent.id, s.parent); });
        Array.from(parentIndex.values()).forEach(p => {
            const sts = byParent.get(p.id) || [];
            if (sts.length === 0) {
                rows.push({ parentId: p.id, parentFullName: p.fullName || null, parentEmail: p.email || null, parentContactNumber: p.contactNumber || null, studentId: null, studentCode: null, studentFullName: null });
            }
            else {
                sts.forEach(s => rows.push({ parentId: p.id, parentFullName: p.fullName || null, parentEmail: p.email || null, parentContactNumber: p.contactNumber || null, studentId: s.id, studentCode: s.code, studentFullName: s.name }));
            }
        });
        rows.sort((a, b) => (`${a.parentFullName || ''}`).localeCompare(`${b.parentFullName || ''}`) || (`${a.studentFullName || ''}`).localeCompare(`${b.studentFullName || ''}`));
        return rows;
    }
    async unlink(parentUserId, studentIdOrCode) {
        const pid = (parentUserId || '').trim();
        const arg = (studentIdOrCode || '').trim();
        if (!pid || !arg)
            return { ok: true };
        let student = await this.students.findOne({ where: { id: arg }, relations: { parent: true } });
        if (!student)
            student = await this.students.findOne({ where: { studentId: arg }, relations: { parent: true } });
        if (!student)
            return { ok: true };
        if (student.parent && student.parent.id === pid) {
            student.parent = null;
            await this.students.save(student);
            this.emitChange({ type: 'unlink', parentId: pid, studentId: student.id, studentCode: student.studentId || null, at: Date.now() });
        }
        return { ok: true };
    }
    async softDeleteStudent(parentUserId, studentIdOrCode) {
        const pid = (parentUserId || '').trim();
        const arg = (studentIdOrCode || '').trim();
        if (!pid || !arg)
            return { ok: true };
        let student = await this.students.findOne({ where: { id: arg } });
        if (!student)
            student = await this.students.findOne({ where: { studentId: arg } });
        if (!student)
            return { ok: true };
        const link = await this.links.findOne({ where: { parent: { id: pid }, student: { id: student.id } } });
        if (!link)
            return { ok: true };
        if (!student.isDeleted) {
            student.isDeleted = true;
            await this.students.save(student);
        }
        if (link?.id)
            await this.links.delete(link.id);
        return { ok: true };
    }
    async createInvite(studentId, expiresAt) {
        const student = await this.students.findOne({ where: { id: studentId } });
        if (!student)
            throw new common_1.BadRequestException('Student not found');
        const code = 'P' + Math.random().toString(36).slice(2, 8).toUpperCase() + Date.now().toString(36).slice(-3).toUpperCase();
        const token = this.tokens.create({ student, code, expiresAt: expiresAt ? new Date(expiresAt) : null, usedAt: null });
        await this.tokens.save(token);
        return { code: token.code };
    }
    async redeemInvite(parentUserId, code) {
        const token = await this.tokens.findOne({ where: { code }, relations: { student: true } });
        if (!token)
            throw new common_1.BadRequestException('Invalid code');
        if (token.usedAt)
            throw new common_1.ForbiddenException('Code already used');
        if (token.expiresAt && token.expiresAt.getTime() < Date.now())
            throw new common_1.ForbiddenException('Code expired');
        const parent = await this.users.findOne({ where: { id: parentUserId } });
        if (!parent)
            throw new common_1.BadRequestException('Parent not found');
        const cur = await this.students.findOne({ where: { id: token.student.id }, relations: { parent: true } });
        if (cur?.parent && cur.parent.id !== parent.id)
            throw new common_1.BadRequestException('This student is already linked to another parent account');
        if (!cur?.parent) {
            cur.parent = parent;
            await this.students.save(cur);
        }
        token.usedAt = new Date();
        await this.tokens.save(token);
        return { ok: true };
    }
    async listLinkedParents(studentIdOrCode) {
        let student = await this.students.findOne({ where: { id: studentIdOrCode } });
        if (!student)
            student = await this.students.findOne({ where: { studentId: studentIdOrCode } });
        if (!student)
            return [];
        const s = await this.students.findOne({ where: { id: student.id }, relations: { parent: true } });
        return s?.parent?.id ? [{ id: s.parent.id, email: s.parent.email }] : [];
    }
    async migrateParentLinks() {
        try {
            const links = await this.links.find({ relations: { parent: true, student: true } });
            let migrated = 0;
            for (const link of links) {
                if (link.student && link.parent && !link.student.parent) {
                    link.student.parent = link.parent;
                    await this.students.save(link.student);
                    migrated++;
                }
            }
            return { ok: true, migrated, message: `Successfully migrated ${migrated} parent-student links` };
        }
        catch (error) {
            return { ok: false, migrated: 0, message: `Migration failed: ${error.message}` };
        }
    }
};
exports.ParentsService = ParentsService;
exports.ParentsService = ParentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(parent_student_entity_1.ParentStudent)),
    __param(1, (0, typeorm_1.InjectRepository)(student_entity_1.Student)),
    __param(2, (0, typeorm_1.InjectRepository)(parent_link_token_entity_1.ParentLinkToken)),
    __param(3, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ParentsService);
//# sourceMappingURL=parents.service.js.map