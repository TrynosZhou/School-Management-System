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
exports.MarksController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const mark_entity_1 = require("./mark.entity");
const student_entity_1 = require("../entities/student.entity");
const class_entity_1 = require("../entities/class.entity");
const subject_entity_1 = require("../entities/subject.entity");
const teaching_assignment_entity_1 = require("../teaching/teaching-assignment.entity");
const teacher_entity_1 = require("../entities/teacher.entity");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const bearer_guard_1 = require("../auth/bearer.guard");
const settings_entity_1 = require("../settings/settings.entity");
class CaptureEntryDto {
    studentId;
    score;
    comment;
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CaptureEntryDto.prototype, "studentId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CaptureEntryDto.prototype, "score", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", Object)
], CaptureEntryDto.prototype, "comment", void 0);
class CaptureMarksDto {
    session;
    classId;
    subjectId;
    examType;
    entries;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CaptureMarksDto.prototype, "session", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CaptureMarksDto.prototype, "classId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CaptureMarksDto.prototype, "subjectId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CaptureMarksDto.prototype, "examType", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CaptureEntryDto),
    __metadata("design:type", Array)
], CaptureMarksDto.prototype, "entries", void 0);
let MarksController = class MarksController {
    marks;
    students;
    classes;
    subjects;
    assignments;
    teachers;
    settingsRepo;
    constructor(marks, students, classes, subjects, assignments, teachers, settingsRepo) {
        this.marks = marks;
        this.students = students;
        this.classes = classes;
        this.subjects = subjects;
        this.assignments = assignments;
        this.teachers = teachers;
        this.settingsRepo = settingsRepo;
    }
    async capture(body, req) {
        const role = req.user?.role;
        if (role !== 'admin' && role !== 'teacher')
            throw new common_1.ForbiddenException('Only teachers/admin can capture marks');
        const klass = await this.classes.findOne({ where: { id: body.classId } });
        if (!klass)
            return { success: false, message: 'Class not found' };
        if (role === 'teacher') {
            const email = req.user?.email;
            if (!email)
                throw new common_1.ForbiddenException('Unauthorized');
            const teacher = await this.teachers.findOne({ where: { email } });
            if (!teacher)
                throw new common_1.ForbiddenException('Teacher profile not found');
            const subject = body.subjectId ? await this.subjects.findOne({ where: { id: body.subjectId } }) : null;
            let allowed = false;
            if (klass.classTeacher?.id === teacher.id) {
                allowed = true;
            }
            else {
                const assns = await this.assignments.find({ where: { teacher: { id: teacher.id }, klass: { id: klass.id }, status: 'active' } });
                if (assns?.length) {
                    const hasClassLevel = assns.some(a => !a.subject);
                    if (hasClassLevel) {
                        allowed = true;
                    }
                    else if (subject) {
                        allowed = assns.some(a => a.subject && a.subject.id === subject.id);
                    }
                }
            }
            if (!allowed)
                throw new common_1.ForbiddenException('You are not assigned to this class/subject');
        }
        let saved = 0;
        const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
        const parseBands = (json) => {
            try {
                if (!json)
                    return [];
                const arr = JSON.parse(json);
                if (!Array.isArray(arr) || !arr.length)
                    return [];
                const out = [];
                for (const it of arr) {
                    const g = (it?.grade || '').toString().trim();
                    let min = Number((it?.min ?? '').toString());
                    let max = Number((it?.max ?? '').toString());
                    if ((isNaN(min) || isNaN(max)) && typeof it?.range === 'string') {
                        const s = it.range.toString().trim();
                        let m = /(-?\d+(?:\.\d+)?)\s*[\-\u2013\u2014]\s*(-?\d+(?:\.\d+)?)/.exec(s);
                        if (!m)
                            m = /(-?\d+(?:\.\d+)?)\s*to\s*(-?\d+(?:\.\d+)?)/i.exec(s);
                        if (!m) {
                            const m2 = /(>=|>)\s*(-?\d+(?:\.\d+)?)\s*(?:and|,)?\s*(<=|<)\s*(-?\d+(?:\.\d+)?)/i.exec(s);
                            if (m2) {
                                const lowOp = m2[1];
                                const lowV = parseFloat(m2[2]);
                                const highOp = m2[3];
                                const highV = parseFloat(m2[4]);
                                min = lowOp === '>' ? (lowV + 0.0001) : lowV;
                                max = highOp === '<' ? (highV - 0.0001) : highV;
                            }
                        }
                        if (m && m.length >= 3) {
                            min = parseFloat(m[1]);
                            max = parseFloat(m[2]);
                        }
                    }
                    if (!g || isNaN(min) || isNaN(max))
                        continue;
                    if (min > max) {
                        const t = min;
                        min = max;
                        max = t;
                    }
                    out.push({ grade: g, min, max });
                }
                out.sort((a, b) => b.min - a.min);
                return out;
            }
            catch {
                return [];
            }
        };
        let bands = parseBands(settings?.gradingBandsJson || null);
        if (bands && bands.length > 0) {
            const allInvalid = bands.every(b => b.min === 0 && b.max === 0);
            if (allInvalid) {
                console.log('[Capture] ⚠️ Settings bands are invalid (all zeros), using defaults');
                bands = [];
            }
            else {
                console.log('[Capture] Using Settings bands:', JSON.stringify(bands));
            }
        }
        if (!bands || bands.length === 0) {
            console.log('[Capture] Using hardcoded default bands');
            bands = [
                { grade: 'A*', min: 90, max: 100 },
                { grade: 'A', min: 70, max: 89 },
                { grade: 'B', min: 60, max: 69 },
                { grade: 'C', min: 50, max: 59 },
                { grade: 'D', min: 45, max: 49 },
                { grade: 'E', min: 40, max: 44 },
                { grade: 'U', min: 0, max: 39 },
            ];
        }
        const gradeFor = (scoreNum) => {
            if (bands.length) {
                for (const b of bands) {
                    console.log(`[Capture gradeFor] Checking score ${scoreNum} against band ${b.grade} (${b.min}-${b.max})`);
                    if (scoreNum >= b.min && scoreNum <= b.max) {
                        console.log(`[Capture gradeFor] MATCH! Score ${scoreNum} → Grade ${b.grade}`);
                        return b.grade;
                    }
                }
                console.log(`[Capture gradeFor] No band match for score ${scoreNum}`);
                return null;
            }
            return null;
        };
        const subj = body.subjectId ? await this.subjects.findOne({ where: { id: body.subjectId } }) : null;
        for (const e of body.entries) {
            const student = await this.students.findOne({ where: { id: e.studentId } });
            if (!student)
                continue;
            const existing = await this.marks.findOne({ where: {
                    student: { id: student.id },
                    klass: { id: klass.id },
                    subject: subj ? { id: subj.id } : null,
                    session: body.session,
                    examType: body.examType ? body.examType : (0, typeorm_2.IsNull)(),
                } });
            const nScore = Number(e.score);
            const letter = isNaN(nScore) ? null : gradeFor(nScore);
            console.log(`[Capture] Student ${e.studentId}: score=${e.score}, computed grade=${letter}`);
            if (existing) {
                existing.score = e.score;
                existing.comment = e.comment ?? null;
                existing.examType = body.examType ?? null;
                existing.grade = letter;
                await this.marks.save(existing);
                console.log(`[Capture] Updated existing mark ${existing.id} with grade=${letter}`);
                saved += 1;
            }
            else {
                const mark = this.marks.create({
                    klass,
                    student,
                    session: body.session,
                    subject: subj || null,
                    examType: body.examType ?? null,
                    score: e.score,
                    comment: e.comment ?? null,
                    grade: letter,
                });
                const savedMark = await this.marks.save(mark);
                console.log(`[Capture] Created new mark ${savedMark.id} with grade=${letter}`);
                saved += 1;
            }
        }
        if (saved === 0)
            return { success: false, message: 'No valid entries' };
        return { success: true, saved };
    }
    async listByClassSession(classId, session, req) {
        const role = req.user?.role;
        if (role !== 'admin') {
            const email = req.user?.email;
            if (!email)
                throw new common_1.ForbiddenException('Unauthorized');
            const teacher = await this.teachers.findOne({ where: { email } });
            if (!teacher)
                throw new common_1.ForbiddenException('Teacher profile not found');
            const klass = await this.classes.findOne({ where: { id: classId } });
            if (!klass)
                throw new common_1.ForbiddenException('Class not found');
            let allowed = klass.classTeacher?.id === teacher.id;
            if (!allowed) {
                const assns = await this.assignments.find({ where: { teacher: { id: teacher.id }, klass: { id: classId }, status: 'active' } });
                allowed = assns.length > 0;
            }
            if (!allowed)
                throw new common_1.ForbiddenException('You are not assigned to this class');
        }
        return this.marks.find({ where: { klass: { id: classId }, session } });
    }
    async debugBands() {
        const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
        const parseBands = (json) => {
            try {
                if (!json)
                    return [];
                const arr = JSON.parse(json);
                if (!Array.isArray(arr) || !arr.length)
                    return [];
                const out = [];
                for (const it of arr) {
                    const g = (it?.grade || '').toString().trim();
                    const min = Number((it?.min ?? '').toString());
                    const max = Number((it?.max ?? '').toString());
                    if (!g || isNaN(min) || isNaN(max))
                        continue;
                    out.push({ grade: g, min, max });
                }
                out.sort((a, b) => b.min - a.min);
                return out;
            }
            catch {
                return [];
            }
        };
        const bands = parseBands(settings?.gradingBandsJson || null);
        return {
            rawJson: settings?.gradingBandsJson,
            parsedBands: bands,
            defaultsWillBeUsed: !bands || bands.length === 0
        };
    }
    async getMarksByStudent(studentId, term, examType) {
        if (!studentId) {
            return [];
        }
        const where = { student: { id: studentId } };
        if (term)
            where.session = (0, typeorm_2.Like)(`%${term}%`);
        if (examType)
            where.examType = examType;
        const marks = await this.marks.find({
            where,
            order: { session: 'ASC' },
            relations: ['student', 'subject', 'klass']
        });
        try {
            const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
            const parseBands = (json) => {
                try {
                    if (!json)
                        return [];
                    const arr = JSON.parse(json);
                    if (!Array.isArray(arr) || !arr.length)
                        return [];
                    const out = [];
                    for (const it of arr) {
                        const g = (it?.grade || '').toString().trim();
                        const min = Number((it?.min ?? '').toString());
                        const max = Number((it?.max ?? '').toString());
                        if (!g || isNaN(min) || isNaN(max))
                            continue;
                        out.push({ grade: g, min, max });
                    }
                    out.sort((a, b) => b.min - a.min);
                    return out;
                }
                catch {
                    return [];
                }
            };
            let bands = parseBands(settings?.gradingBandsJson || null);
            if (bands && bands.length > 0) {
                const allInvalid = bands.every(b => b.min === 0 && b.max === 0);
                if (allInvalid) {
                    console.log('[GET /marks] ⚠️ Settings bands are invalid (all zeros), using defaults');
                    bands = [];
                }
                else {
                    console.log('[GET /marks] Using Settings grade bands:', bands.length);
                }
            }
            if (!bands || bands.length === 0) {
                console.log('[GET /marks] Using default grade bands');
                bands = [
                    { grade: 'A*', min: 90, max: 100 },
                    { grade: 'A', min: 70, max: 89 },
                    { grade: 'B', min: 60, max: 69 },
                    { grade: 'C', min: 50, max: 59 },
                    { grade: 'D', min: 45, max: 49 },
                    { grade: 'E', min: 40, max: 44 },
                    { grade: 'U', min: 0, max: 39 },
                ];
            }
            const gradeFor = (scoreNum) => {
                for (const b of bands) {
                    if (scoreNum >= b.min && scoreNum <= b.max)
                        return b.grade;
                }
                return null;
            };
            const toUpdate = [];
            for (const m of marks) {
                const sc = Number(m.score);
                if (Number.isFinite(sc) && sc >= 0 && sc <= 100) {
                    const g = gradeFor(sc);
                    if (g) {
                        if (m.grade !== g) {
                            console.log(`[GET /marks] Recomputing grade for mark ${m.id}: score=${sc}, old grade=${m.grade}, new grade=${g}`);
                            m.grade = g;
                            toUpdate.push(m);
                        }
                        else {
                            m.grade = g;
                        }
                    }
                    else {
                        console.log(`[GET /marks] No band match for score ${sc}, mark ${m.id}`);
                    }
                }
            }
            if (toUpdate.length > 0) {
                await this.marks.save(toUpdate);
                console.log(`[GET /marks] Persisted ${toUpdate.length} recomputed grades`);
            }
        }
        catch (err) {
            console.error('[GET /marks] Failed to recompute grades:', err);
        }
        try {
            const keyOf = (m) => {
                const subjId = m.subject?.id || 'null';
                const session = m.session || '';
                const exam = (m.examType || '');
                const gl = m.klass?.gradeLevel || '';
                const ay = m.klass?.academicYear || '';
                return `${subjId}|${session}|${exam}|${gl}|${ay}`;
            };
            const cache = new Map();
            for (const m of marks) {
                const k = keyOf(m);
                if (!cache.has(k)) {
                    const subjId = m.subject?.id;
                    const session = m.session;
                    const ex = m.examType;
                    const gl = m.klass?.gradeLevel;
                    const ay = m.klass?.academicYear;
                    let list = await this.marks.find({
                        where: {
                            ...(subjId ? { subject: { id: subjId } } : {}),
                            session,
                            ...(ex ? { examType: ex } : {}),
                        },
                        relations: ['klass', 'student', 'subject']
                    });
                    list = (list || []).filter(x => {
                        const kls = x.klass;
                        if (!kls)
                            return false;
                        if (gl && kls.gradeLevel !== gl)
                            return false;
                        if (ay && kls.academicYear !== ay)
                            return false;
                        return true;
                    });
                    const arr = list.map(x => ({ sid: x.student?.id, score: Number(x.score) || 0 }));
                    arr.sort((a, b) => b.score - a.score);
                    cache.set(k, arr);
                }
                const arr = cache.get(k) || [];
                const sid = m.student?.id;
                const idx = arr.findIndex(r => r.sid === sid);
                m.position = idx >= 0 ? (idx + 1) : null;
                m.positionTotal = arr.length;
            }
        }
        catch { }
        return marks;
    }
    async sessions() {
        const rows = await this.marks.createQueryBuilder('m')
            .select('DISTINCT m.session', 'session')
            .orderBy('m.session', 'ASC')
            .getRawMany();
        return rows.map((r) => r.session);
    }
    async sessionsByClass(classId) {
        const rows = await this.marks.createQueryBuilder('m')
            .select('DISTINCT m.session', 'session')
            .where('m.klassId = :classId', { classId })
            .orderBy('m.session', 'ASC')
            .getRawMany();
        return rows.map((r) => r.session);
    }
    async reportByClassSession(classId, session, req) {
        const role = req.user?.role;
        if (role !== 'admin') {
            const email = req.user?.email;
            if (!email)
                throw new common_1.ForbiddenException('Unauthorized');
            const teacher = await this.teachers.findOne({ where: { email } });
            if (!teacher)
                throw new common_1.ForbiddenException('Teacher profile not found');
            const klass = await this.classes.findOne({ where: { id: classId } });
            if (!klass)
                throw new common_1.ForbiddenException('Class not found');
            let allowed = klass.classTeacher?.id === teacher.id;
            if (!allowed) {
                const assns = await this.assignments.find({ where: { teacher: { id: teacher.id }, klass: { id: classId }, status: 'active' } });
                allowed = assns.length > 0;
            }
            if (!allowed)
                throw new common_1.ForbiddenException('You are not assigned to this class');
        }
        const qb = this.marks.createQueryBuilder('m')
            .leftJoin('m.student', 's')
            .select('s.id', 'studentId')
            .addSelect("CONCAT(s.firstName, ' ', s.lastName)", 'studentName')
            .addSelect('COUNT(*)', 'count')
            .addSelect('AVG(m.score)', 'avg')
            .addSelect('MIN(m.score)', 'min')
            .addSelect('MAX(m.score)', 'max')
            .where('m.klassId = :classId', { classId })
            .andWhere('m.session = :session', { session })
            .groupBy('s.id');
        const rows = await qb.getRawMany();
        return rows.map((r) => ({
            studentId: r.studentId,
            studentName: r.studentName,
            count: Number(r.count),
            avg: Number(r.avg),
            min: Number(r.min),
            max: Number(r.max),
        }));
    }
    async streamSubjectRankings(classId, term, examTypeRaw, req) {
        const klass = await this.classes.findOne({ where: { id: classId } });
        if (!klass)
            throw new common_1.ForbiddenException('Class not found');
        const detectStream = (name) => {
            if (!name)
                return null;
            const m = /(Blue|White|Gold)/i.exec(name);
            return m ? (m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()) : null;
        };
        const streamName = detectStream(klass.name);
        const whereTerm = {};
        if (term && term.trim().length > 0)
            whereTerm.session = (0, typeorm_2.Like)(`%${term.trim()}%`);
        const examType = (typeof examTypeRaw === 'string' && examTypeRaw.trim().length > 0) ? examTypeRaw.trim() : undefined;
        if (examType)
            whereTerm.examType = examType;
        const allTermMarks = await this.marks.find({ where: whereTerm });
        const streamMarks = allTermMarks.filter(m => {
            const k = m.klass;
            if (!k)
                return false;
            if (k.gradeLevel !== klass.gradeLevel)
                return false;
            if (klass.academicYear && k.academicYear !== klass.academicYear)
                return false;
            if (streamName && detectStream(k.name) !== streamName)
                return false;
            return true;
        });
        const bySubject = new Map();
        for (const m of streamMarks) {
            const subjId = m.subject?.id;
            const subjName = m.subject?.name;
            const studentId = m.student?.id;
            const studentName = m.student ? `${m.student.firstName} ${m.student.lastName}` : undefined;
            if (!subjId || !studentId)
                continue;
            const e = bySubject.get(subjId) || { subjectName: subjName || '-', rows: [] };
            e.rows.push({ sid: studentId, studentName: studentName || '-', score: Number(m.score) || 0 });
            bySubject.set(subjId, e);
        }
        const result = Array.from(bySubject.entries()).map(([subjectId, v]) => {
            const sorted = [...v.rows].sort((a, b) => b.score - a.score);
            const rankings = sorted.map((r, i) => ({
                studentId: r.sid,
                studentName: r.studentName,
                score: r.score,
                rank: i + 1,
            }));
            const mean = v.rows.length ? v.rows.reduce((a, b) => a + b.score, 0) / v.rows.length : 0;
            return {
                subjectId,
                subjectName: v.subjectName,
                total: v.rows.length,
                mean,
                rankings,
            };
        }).sort((a, b) => a.subjectName.localeCompare(b.subjectName));
        return {
            term: term || null,
            examType: examType || null,
            stream: {
                gradeLevel: klass.gradeLevel || null,
                academicYear: klass.academicYear || null,
                name: streamName,
            },
            subjects: result,
        };
    }
    async dedupe(req) {
        const role = req.user?.role;
        if (role !== 'admin')
            throw new common_1.ForbiddenException('Only admin can run dedupe');
        const beforeRows = await this.marks.query(`SELECT studentId, klassId, subjectId, session, COUNT(*) AS cnt
         FROM marks
         GROUP BY studentId, klassId, subjectId, session
         HAVING cnt > 1;`);
        const pass1 = await this.marks.query(`DELETE m1 FROM marks m1
       JOIN marks m2
         ON m1.studentId = m2.studentId
        AND m1.klassId   = m2.klassId
        AND ((m1.subjectId IS NULL AND m2.subjectId IS NULL) OR m1.subjectId = m2.subjectId)
        AND m1.session   = m2.session
        AND m1.createdAt < m2.createdAt;`);
        const pass2 = await this.marks.query(`DELETE m1 FROM marks m1
       JOIN marks m2
         ON m1.studentId = m2.studentId
        AND m1.klassId   = m2.klassId
        AND ((m1.subjectId IS NULL AND m2.subjectId IS NULL) OR m1.subjectId = m2.subjectId)
        AND m1.session   = m2.session
        AND m1.id        < m2.id;`);
        const afterRows = await this.marks.query(`SELECT COUNT(*) AS remaining_dupes FROM (
         SELECT 1 FROM marks
         GROUP BY studentId, klassId, subjectId, session
         HAVING COUNT(*) > 1
       ) t;`);
        const deleted = Number((pass1?.affectedRows || pass1?.affected || 0)) + Number((pass2?.affectedRows || pass2?.affected || 0));
        const before = beforeRows?.length || 0;
        const remaining = Number(afterRows?.[0]?.remaining_dupes || 0);
        return { success: true, before, deleted, remaining };
    }
    async recomputeGrades(req) {
        const role = req.user?.role;
        if (role !== 'admin')
            throw new common_1.ForbiddenException('Only admin can recompute grades');
        const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
        const parseBands = (json) => {
            try {
                if (!json)
                    return [];
                const arr = JSON.parse(json);
                if (!Array.isArray(arr) || !arr.length)
                    return [];
                const out = [];
                for (const it of arr) {
                    const g = (it?.grade || '').toString().trim();
                    let min = Number((it?.min ?? '').toString());
                    let max = Number((it?.max ?? '').toString());
                    if ((isNaN(min) || isNaN(max)) && typeof it?.range === 'string') {
                        const m = /(-?\d+(?:\.\d+)?)\s*[\-\u2013\u2014]\s*(-?\d+(?:\.\d+)?)/.exec(it.range);
                        if (m) {
                            min = parseFloat(m[1]);
                            max = parseFloat(m[2]);
                        }
                    }
                    if (!g || isNaN(min) || isNaN(max))
                        continue;
                    if (min > max) {
                        const t = min;
                        min = max;
                        max = t;
                    }
                    out.push({ grade: g, min, max });
                }
                out.sort((a, b) => b.min - a.min);
                return out;
            }
            catch {
                return [];
            }
        };
        let bands = parseBands(settings?.gradingBandsJson || null);
        if (bands && bands.length > 0) {
            const allInvalid = bands.every(b => b.min === 0 && b.max === 0);
            if (allInvalid) {
                console.log('[Recompute] ⚠️ Settings bands are invalid (all zeros), cannot recompute');
                return { success: false, message: 'Grading bands in Settings are invalid (all zeros). Please configure valid bands first.' };
            }
        }
        if (!bands || bands.length === 0) {
            return { success: false, message: 'No grading bands configured in Settings. Please configure bands first.' };
        }
        const gradeFor = (scoreNum) => {
            for (const b of bands) {
                if (scoreNum >= b.min && scoreNum <= b.max)
                    return b.grade;
            }
            return null;
        };
        const all = await this.marks.find();
        let updated = 0;
        const toSave = [];
        for (const m of all) {
            const sc = Number(m.score);
            if (!Number.isFinite(sc) || sc < 0 || sc > 100)
                continue;
            const g = gradeFor(sc);
            if (m.grade !== g) {
                m.grade = g;
                updated++;
                toSave.push(m);
            }
        }
        if (toSave.length)
            await this.marks.save(toSave);
        return { success: true, total: all.length, updated };
    }
    async getGrades(req) {
        const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
        const parseBands = (json) => {
            try {
                if (!json)
                    return [];
                const arr = JSON.parse(json);
                if (!Array.isArray(arr))
                    return [];
                const out = [];
                for (const it of arr) {
                    const g = (it?.grade || '').toString().trim();
                    let min = (it?.min !== undefined && it?.min !== null && it?.min !== '') ? Number(it.min) : NaN;
                    let max = (it?.max !== undefined && it?.max !== null && it?.max !== '') ? Number(it.max) : NaN;
                    if ((isNaN(min) || isNaN(max)) && typeof it?.range === 'string') {
                        const s = it.range.toString().trim();
                        let m = /(-?\d+(?:\.\d+)?)\s*[\-\u2013\u2014]\s*(-?\d+(?:\.\d+)?)/.exec(s);
                        if (!m)
                            m = /(-?\d+(?:\.\d+)?)\s*to\s*(-?\d+(?:\.\d+)?)/i.exec(s);
                        if (!m) {
                            const m2 = /(>=|>)\s*(-?\d+(?:\.\d+)?)\s*(?:and|,)?\s*(<=|<)\s*(-?\d+(?:\.\d+)?)/i.exec(s);
                            if (m2) {
                                const lowOp = m2[1];
                                const lowV = parseFloat(m2[2]);
                                const highOp = m2[3];
                                const highV = parseFloat(m2[4]);
                                min = lowOp === '>' ? (lowV + 0.0001) : lowV;
                                max = highOp === '<' ? (highV - 0.0001) : highV;
                            }
                        }
                        if (m && m.length >= 3) {
                            min = parseFloat(m[1]);
                            max = parseFloat(m[2]);
                        }
                    }
                    if (!g || isNaN(min) || isNaN(max))
                        continue;
                    if (min > max) {
                        const t = min;
                        min = max;
                        max = t;
                    }
                    out.push({ grade: g, min, max });
                }
                out.sort((a, b) => b.min - a.min);
                return out;
            }
            catch {
                return [];
            }
        };
        const overall = parseBands(settings?.gradingBandsJson || null);
        return [
            { category: 'Overall', bands: overall },
            { category: 'Exam', bands: overall },
            { category: 'Test', bands: overall },
        ];
    }
    async saveGrades(body, req) {
        const role = req.user?.role;
        if (role !== 'admin')
            throw new common_1.ForbiddenException('Only admin can save grades');
        console.log('[POST /grades] Received body:', JSON.stringify(body));
        const overall = (body || []).find(x => (x?.category || '').toLowerCase() === 'overall')
            || (body && body[0]);
        console.log('[POST /grades] Overall category:', JSON.stringify(overall));
        const toSave = Array.isArray(overall?.bands) ? overall.bands
            .filter(b => {
            if (!b || typeof b.grade !== 'string')
                return false;
            const min = Number(b.min);
            const max = Number(b.max);
            if (!Number.isFinite(min) || !Number.isFinite(max))
                return false;
            if (min === 0 && max === 0) {
                console.log(`[POST /grades] Skipping invalid band with grade=${b.grade}, min=0, max=0`);
                return false;
            }
            return true;
        })
            .map(b => ({ grade: String(b.grade).trim(), min: Number(b.min), max: Number(b.max) })) : [];
        console.log('[POST /grades] Filtered bands to save:', JSON.stringify(toSave));
        if (toSave.length === 0) {
            console.log('[POST /grades] ⚠️ No valid bands to save! Using hardcoded defaults.');
            toSave.push({ grade: 'A*', min: 90, max: 100 }, { grade: 'A', min: 70, max: 89 }, { grade: 'B', min: 60, max: 69 }, { grade: 'C', min: 50, max: 59 }, { grade: 'D', min: 45, max: 49 }, { grade: 'E', min: 40, max: 44 }, { grade: 'U', min: 0, max: 39 });
        }
        const existing = await this.settingsRepo.findOne({ where: { id: 'global' } });
        let settingsEntity;
        if (existing)
            settingsEntity = existing;
        else
            settingsEntity = this.settingsRepo.create({ id: 'global' });
        settingsEntity.gradingBandsJson = JSON.stringify(toSave);
        await this.settingsRepo.save(settingsEntity);
        console.log('[POST /grades] ✅ Saved gradingBandsJson:', settingsEntity.gradingBandsJson);
        return { success: true, message: 'Grades saved' };
    }
};
exports.MarksController = MarksController;
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Post)('capture'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CaptureMarksDto, Object]),
    __metadata("design:returntype", Promise)
], MarksController.prototype, "capture", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('class/:classId/session/:session'),
    __param(0, (0, common_1.Param)('classId')),
    __param(1, (0, common_1.Param)('session')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MarksController.prototype, "listByClassSession", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('debug/bands'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MarksController.prototype, "debugBands", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('studentId')),
    __param(1, (0, common_1.Query)('term')),
    __param(2, (0, common_1.Query)('examType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], MarksController.prototype, "getMarksByStudent", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('sessions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MarksController.prototype, "sessions", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('sessions/class/:classId'),
    __param(0, (0, common_1.Param)('classId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MarksController.prototype, "sessionsByClass", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('report/class/:classId/session/:session'),
    __param(0, (0, common_1.Param)('classId')),
    __param(1, (0, common_1.Param)('session')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MarksController.prototype, "reportByClassSession", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('stream/subjects/:classId'),
    __param(0, (0, common_1.Param)('classId')),
    __param(1, (0, common_1.Query)('term')),
    __param(2, (0, common_1.Query)('examType')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], MarksController.prototype, "streamSubjectRankings", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Post)('dedupe'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MarksController.prototype, "dedupe", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Post)('recompute-grades'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MarksController.prototype, "recomputeGrades", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('grades'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MarksController.prototype, "getGrades", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Post)('grades'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], MarksController.prototype, "saveGrades", null);
exports.MarksController = MarksController = __decorate([
    (0, common_1.Controller)('marks'),
    __param(0, (0, typeorm_1.InjectRepository)(mark_entity_1.Mark)),
    __param(1, (0, typeorm_1.InjectRepository)(student_entity_1.Student)),
    __param(2, (0, typeorm_1.InjectRepository)(class_entity_1.ClassEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(subject_entity_1.Subject)),
    __param(4, (0, typeorm_1.InjectRepository)(teaching_assignment_entity_1.TeachingAssignment)),
    __param(5, (0, typeorm_1.InjectRepository)(teacher_entity_1.Teacher)),
    __param(6, (0, typeorm_1.InjectRepository)(settings_entity_1.Settings)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], MarksController);
//# sourceMappingURL=marks.controller.js.map