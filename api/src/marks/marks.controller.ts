import { Body, Controller, Get, Param, Post, Req, UseGuards, ForbiddenException, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Like } from 'typeorm';
import { Mark } from './mark.entity';
import { Student } from '../entities/student.entity';
import { ClassEntity } from '../entities/class.entity';
import { Subject } from '../entities/subject.entity';
import { TeachingAssignment } from '../teaching/teaching-assignment.entity';
import { Teacher } from '../entities/teacher.entity';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BearerGuard } from '../auth/bearer.guard';
import { Settings } from '../settings/settings.entity';

class CaptureEntryDto {
  @IsUUID()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  score: string; // decimal string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string | null;
}

class CaptureMarksDto {
  @IsString()
  @IsNotEmpty()
  session: string;

  @IsUUID()
  classId: string;

  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  examType?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CaptureEntryDto)
  entries: CaptureEntryDto[];
}

@Controller('marks')
export class MarksController {
  constructor(
    @InjectRepository(Mark) private readonly marks: Repository<Mark>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(ClassEntity) private readonly classes: Repository<ClassEntity>,
    @InjectRepository(Subject) private readonly subjects: Repository<Subject>,
    @InjectRepository(TeachingAssignment) private readonly assignments: Repository<TeachingAssignment>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(Settings) private readonly settingsRepo: Repository<Settings>,
  ) {}

  @UseGuards(BearerGuard)
  @Post('capture')
  async capture(@Body() body: CaptureMarksDto, @Req() req: any) {
    const role = req.user?.role;
    if (role !== 'admin' && role !== 'teacher') throw new ForbiddenException('Only teachers/admin can capture marks');
    const klass = await this.classes.findOne({ where: { id: body.classId } });
    if (!klass) return { success: false, message: 'Class not found' };

    // Authorization: teachers can only capture marks for classes they are assigned to (or class teacher)
    if (role === 'teacher') {
      const email = req.user?.email as string | undefined;
      if (!email) throw new ForbiddenException('Unauthorized');
      const teacher = await this.teachers.findOne({ where: { email } });
      if (!teacher) throw new ForbiddenException('Teacher profile not found');
      const subject = body.subjectId ? await this.subjects.findOne({ where: { id: body.subjectId } }) : null;

      let allowed = false;
      // Class teacher can enter for any subject
      if ((klass as any).classTeacher?.id === teacher.id) {
        allowed = true;
      } else {
        // Check active assignments for this class
        const assns = await this.assignments.find({ where: { teacher: { id: teacher.id } as any, klass: { id: klass.id } as any, status: 'active' } as any });
        if (assns?.length) {
          // If teacher has a class-level assignment (subject null), allow all subjects
          const hasClassLevel = assns.some(a => !a.subject);
          if (hasClassLevel) {
            allowed = true;
          } else if (subject) {
            allowed = assns.some(a => a.subject && a.subject.id === subject.id);
          }
        }
      }
      if (!allowed) throw new ForbiddenException('You are not assigned to this class/subject');
    }

    let saved = 0;
    const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
    type Band = { grade: string; min: number; max: number };
    const parseBands = (json?: string | null): Band[] => {
      try {
        if (!json) return [];
        const arr = JSON.parse(json);
        if (!Array.isArray(arr) || !arr.length) return [];
        const out: Band[] = [];
        for (const it of arr) {
          const g = (it?.grade || '').toString().trim();
          let min = Number((it?.min ?? '').toString());
          let max = Number((it?.max ?? '').toString());
          if ((isNaN(min) || isNaN(max)) && typeof it?.range === 'string') {
            const s = it.range.toString().trim();
            // Format 1: "70 - 89" (hyphen, en/em dashes)
            let m = /(-?\d+(?:\.\d+)?)\s*[\-\u2013\u2014]\s*(-?\d+(?:\.\d+)?)/.exec(s);
            // Format 2: "70 to 89"
            if (!m) m = /(-?\d+(?:\.\d+)?)\s*to\s*(-?\d+(?:\.\d+)?)/i.exec(s);
            // Format 3: ">69 and < 90" or ">=70 and <=89"
            if (!m) {
              const m2 = /(>=|>)\s*(-?\d+(?:\.\d+)?)\s*(?:and|,)?\s*(<=|<)\s*(-?\d+(?:\.\d+)?)/i.exec(s);
              if (m2) {
                const lowOp = m2[1]; const lowV = parseFloat(m2[2]);
                const highOp = m2[3]; const highV = parseFloat(m2[4]);
                min = lowOp === '>' ? (lowV + 0.0001) : lowV;
                max = highOp === '<' ? (highV - 0.0001) : highV;
              }
            }
            if (m && m.length >= 3) { min = parseFloat(m[1]); max = parseFloat(m[2]); }
          }
          if (!g || isNaN(min) || isNaN(max)) continue;
          if (min > max) { const t = min; min = max; max = t; }
          out.push({ grade: g, min, max });
        }
        out.sort((a,b) => b.min - a.min);
        return out;
      } catch { return []; }
    };
    let bands = parseBands(settings?.gradingBandsJson || null);
    // Validate bands: if all bands have min=0 and max=0, they're invalid
    if (bands && bands.length > 0) {
      const allInvalid = bands.every(b => b.min === 0 && b.max === 0);
      if (allInvalid) {
        console.log('[Capture] ⚠️ Settings bands are invalid (all zeros), using defaults');
        bands = [];
      } else {
        console.log('[Capture] Using Settings bands:', JSON.stringify(bands));
      }
    }
    if (!bands || bands.length === 0) {
      console.log('[Capture] Using hardcoded default bands');
      bands = [
        { grade: 'A*', min: 90, max: 100 },
        { grade: 'A',  min: 70, max: 89 },
        { grade: 'B',  min: 60, max: 69 },
        { grade: 'C',  min: 50, max: 59 },
        { grade: 'D',  min: 45, max: 49 },
        { grade: 'E',  min: 40, max: 44 },
        { grade: 'U',  min: 0,  max: 39 },
      ];
    }
    const gradeFor = (scoreNum: number): string | null => {
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
      if (!student) continue; // skip invalid students
      // Upsert: find existing mark for same student+class+subject+session
      const existing = await this.marks.findOne({ where: {
        student: { id: student.id } as any,
        klass: { id: klass.id } as any,
        subject: subj ? ({ id: subj.id } as any) : (null as any),
        session: body.session,
        examType: body.examType ? body.examType : (IsNull() as any),
      } as any });
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
      } else {
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

    if (saved === 0) return { success: false, message: 'No valid entries' };
    return { success: true, saved };
  }

  @UseGuards(BearerGuard)
  @Get('class/:classId/session/:session')
  async listByClassSession(@Param('classId') classId: string, @Param('session') session: string, @Req() req: any) {
    const role = req.user?.role;
    if (role !== 'admin') {
      const email = req.user?.email as string | undefined;
      if (!email) throw new ForbiddenException('Unauthorized');
      const teacher = await this.teachers.findOne({ where: { email } });
      if (!teacher) throw new ForbiddenException('Teacher profile not found');
      const klass = await this.classes.findOne({ where: { id: classId } });
      if (!klass) throw new ForbiddenException('Class not found');
      let allowed = (klass as any).classTeacher?.id === teacher.id;
      if (!allowed) {
        const assns = await this.assignments.find({ where: { teacher: { id: teacher.id } as any, klass: { id: classId } as any, status: 'active' } as any });
        allowed = assns.length > 0;
      }
      if (!allowed) throw new ForbiddenException('You are not assigned to this class');
    }
    return this.marks.find({ where: { klass: { id: classId } as any, session } });
  }

  // Get marks by student ID with optional term and examType filters
  // Diagnostic endpoint to check grading bands
  @UseGuards(BearerGuard)
  @Get('debug/bands')
  async debugBands() {
    const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
    type Band = { grade: string; min: number; max: number };
    const parseBands = (json?: string | null): Band[] => {
      try {
        if (!json) return [];
        const arr = JSON.parse(json);
        if (!Array.isArray(arr) || !arr.length) return [];
        const out: Band[] = [];
        for (const it of arr) {
          const g = (it?.grade || '').toString().trim();
          const min = Number((it?.min ?? '').toString());
          const max = Number((it?.max ?? '').toString());
          if (!g || isNaN(min) || isNaN(max)) continue;
          out.push({ grade: g, min, max });
        }
        out.sort((a,b) => b.min - a.min);
        return out;
      } catch { return []; }
    };
    const bands = parseBands(settings?.gradingBandsJson || null);
    return {
      rawJson: settings?.gradingBandsJson,
      parsedBands: bands,
      defaultsWillBeUsed: !bands || bands.length === 0
    };
  }

  @UseGuards(BearerGuard)
  @Get()
  async getMarksByStudent(
    @Query('studentId') studentId?: string,
    @Query('term') term?: string,
    @Query('examType') examType?: string
  ) {
    if (!studentId) {
      return [];
    }

    const where: any = { student: { id: studentId } };
    if (term) where.session = Like(`%${term}%`);
    if (examType) where.examType = examType;

    const marks = await this.marks.find({ 
      where, 
      order: { session: 'ASC' },
      relations: ['student', 'subject', 'klass']
    });

    // Ensure grade consistency: recompute grades using Settings bands (with sensible defaults)
    try {
      const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
      type Band = { grade: string; min: number; max: number };
      const parseBands = (json?: string | null): Band[] => {
        try {
          if (!json) return [];
          const arr = JSON.parse(json);
          if (!Array.isArray(arr) || !arr.length) return [];
          const out: Band[] = [];
          for (const it of arr) {
            const g = (it?.grade || '').toString().trim();
            const min = Number((it?.min ?? '').toString());
            const max = Number((it?.max ?? '').toString());
            if (!g || isNaN(min) || isNaN(max)) continue;
            out.push({ grade: g, min, max });
          }
          out.sort((a,b) => b.min - a.min);
          return out;
        } catch { return []; }
      };
      let bands = parseBands(settings?.gradingBandsJson || null);
      // Validate bands: if all bands have min=0 and max=0, they're invalid
      if (bands && bands.length > 0) {
        const allInvalid = bands.every(b => b.min === 0 && b.max === 0);
        if (allInvalid) {
          console.log('[GET /marks] ⚠️ Settings bands are invalid (all zeros), using defaults');
          bands = [];
        } else {
          console.log('[GET /marks] Using Settings grade bands:', bands.length);
        }
      }
      if (!bands || bands.length === 0) {
        console.log('[GET /marks] Using default grade bands');
        bands = [
          { grade: 'A*', min: 90, max: 100 },
          { grade: 'A',  min: 70, max: 89 },
          { grade: 'B',  min: 60, max: 69 },
          { grade: 'C',  min: 50, max: 59 },
          { grade: 'D',  min: 45, max: 49 },
          { grade: 'E',  min: 40, max: 44 },
          { grade: 'U',  min: 0,  max: 39 },
        ];
      }
      const gradeFor = (scoreNum: number): string | null => {
        for (const b of bands) { if (scoreNum >= b.min && scoreNum <= b.max) return b.grade; }
        return null;
      };
      const toUpdate: any[] = [];
      for (const m of marks as any[]) {
        const sc = Number(m.score);
        if (Number.isFinite(sc) && sc >= 0 && sc <= 100) {
          const g = gradeFor(sc);
          if (g) {
            if (m.grade !== g) {
              console.log(`[GET /marks] Recomputing grade for mark ${m.id}: score=${sc}, old grade=${m.grade}, new grade=${g}`);
              m.grade = g;
              toUpdate.push(m);
            } else {
              m.grade = g; // Ensure it's set for response
            }
          } else {
            console.log(`[GET /marks] No band match for score ${sc}, mark ${m.id}`);
          }
        }
      }
      // Persist recomputed grades back to database
      if (toUpdate.length > 0) {
        await this.marks.save(toUpdate);
        console.log(`[GET /marks] Persisted ${toUpdate.length} recomputed grades`);
      }
    } catch (err) {
      console.error('[GET /marks] Failed to recompute grades:', err);
    }

    // Attach per-subject position within the stream (same gradeLevel + academicYear) for the given term/examType
    try {
      // Group by subject+session+examType+stream
      type Key = string;
      const keyOf = (m: Mark): Key => {
        const subjId = (m as any).subject?.id || 'null';
        const session = (m as any).session || '';
        const exam = ((m as any).examType || '') as string;
        const gl = (m as any).klass?.gradeLevel || '';
        const ay = (m as any).klass?.academicYear || '';
        return `${subjId}|${session}|${exam}|${gl}|${ay}`;
      };
      // Cache computed rankings per key
      const cache = new Map<Key, Array<{ sid: string; score: number }>>();
      for (const m of marks as any[]) {
        const k = keyOf(m);
        if (!cache.has(k)) {
          const subjId = (m as any).subject?.id as string | undefined;
          const session = (m as any).session as string;
          const ex = (m as any).examType as (string | null | undefined);
          const gl = (m as any).klass?.gradeLevel as (string | undefined);
          const ay = (m as any).klass?.academicYear as (string | undefined);
          let list = await this.marks.find({
            where: {
              ...(subjId ? { subject: { id: subjId } as any } : {} as any),
              session,
              ...(ex ? { examType: ex } : {} as any),
            } as any,
            relations: ['klass','student','subject']
          });
          // Filter to stream (same gradeLevel + academicYear)
          list = (list || []).filter(x => {
            const kls = (x as any).klass;
            if (!kls) return false;
            if (gl && kls.gradeLevel !== gl) return false;
            if (ay && kls.academicYear !== ay) return false;
            return true;
          });
          const arr = list.map(x => ({ sid: (x as any).student?.id as string, score: Number((x as any).score) || 0 }));
          arr.sort((a,b) => b.score - a.score);
          cache.set(k, arr);
        }
        const arr = cache.get(k) || [];
        const sid = (m as any).student?.id as string;
        const idx = arr.findIndex(r => r.sid === sid);
        (m as any).position = idx >= 0 ? (idx + 1) : null;
        (m as any).positionTotal = arr.length;
      }
    } catch {}

    return marks;
  }

  // Distinct sessions across all marks
  @UseGuards(BearerGuard)
  @Get('sessions')
  async sessions() {
    const rows = await this.marks.createQueryBuilder('m')
      .select('DISTINCT m.session', 'session')
      .orderBy('m.session', 'ASC')
      .getRawMany();
    return rows.map((r) => r.session as string);
  }

  // Distinct sessions for a specific class
  @UseGuards(BearerGuard)
  @Get('sessions/class/:classId')
  async sessionsByClass(@Param('classId') classId: string) {
    const rows = await this.marks.createQueryBuilder('m')
      .select('DISTINCT m.session', 'session')
      .where('m.klassId = :classId', { classId })
      .orderBy('m.session', 'ASC')
      .getRawMany();
    return rows.map((r) => r.session as string);
  }

  // Aggregate report by class and session, grouped by student
  @UseGuards(BearerGuard)
  @Get('report/class/:classId/session/:session')
  async reportByClassSession(@Param('classId') classId: string, @Param('session') session: string, @Req() req: any) {
    const role = req.user?.role;
    if (role !== 'admin') {
      const email = req.user?.email as string | undefined;
      if (!email) throw new ForbiddenException('Unauthorized');
      const teacher = await this.teachers.findOne({ where: { email } });
      if (!teacher) throw new ForbiddenException('Teacher profile not found');
      const klass = await this.classes.findOne({ where: { id: classId } });
      if (!klass) throw new ForbiddenException('Class not found');
      let allowed = (klass as any).classTeacher?.id === teacher.id;
      if (!allowed) {
        const assns = await this.assignments.find({ where: { teacher: { id: teacher.id } as any, klass: { id: classId } as any, status: 'active' } as any });
        allowed = assns.length > 0;
      }
      if (!allowed) throw new ForbiddenException('You are not assigned to this class');
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
      studentId: r.studentId as string,
      studentName: r.studentName as string,
      count: Number(r.count),
      avg: Number(r.avg),
      min: Number(r.min),
      max: Number(r.max),
    }));
  }

  // Per-subject stream rankings and averages for a term
  // Stream is inferred from the reference class: same gradeLevel, academicYear, and stream (e.g., Blue/White/Gold) parsed from class name
  @UseGuards(BearerGuard)
  @Get('stream/subjects/:classId')
  async streamSubjectRankings(
    @Param('classId') classId: string,
    @Query('term') term?: string,
    @Query('examType') examTypeRaw?: string,
    @Req() req?: any,
  ) {
    const klass = await this.classes.findOne({ where: { id: classId } });
    if (!klass) throw new ForbiddenException('Class not found');

    // Detect stream token from class name (e.g., Blue|White|Gold)
    const detectStream = (name: string | null | undefined): string | null => {
      if (!name) return null;
      const m = /(Blue|White|Gold)/i.exec(name);
      return m ? (m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()) : null;
    };
    const streamName = detectStream((klass as any).name);

    // Normalize filters
    const whereTerm: any = {};
    if (term && term.trim().length > 0) whereTerm.session = Like(`%${term.trim()}%`);
    const examType = (typeof examTypeRaw === 'string' && examTypeRaw.trim().length > 0) ? examTypeRaw.trim() : undefined;
    if (examType) whereTerm.examType = examType;

    // Pull all marks for term/examType, then filter to stream cohort
    const allTermMarks = await this.marks.find({ where: whereTerm as any });
    const streamMarks = allTermMarks.filter(m => {
      const k = (m as any).klass as any;
      if (!k) return false;
      if (k.gradeLevel !== (klass as any).gradeLevel) return false;
      if ((klass as any).academicYear && k.academicYear !== (klass as any).academicYear) return false;
      if (streamName && detectStream(k.name) !== streamName) return false;
      return true;
    });

    // Group by subject
    type Row = { sid: string; studentName: string; score: number };
    const bySubject = new Map<string, { subjectName: string; rows: Row[] }>();
    for (const m of streamMarks as any[]) {
      const subjId = m.subject?.id as string | undefined;
      const subjName = m.subject?.name as string | undefined;
      const studentId = m.student?.id as string | undefined;
      const studentName = m.student ? `${m.student.firstName} ${m.student.lastName}` : undefined;
      if (!subjId || !studentId) continue;
      const e = bySubject.get(subjId) || { subjectName: subjName || '-', rows: [] };
      e.rows.push({ sid: studentId, studentName: studentName || '-', score: Number(m.score) || 0 });
      bySubject.set(subjId, e);
    }

    const result = Array.from(bySubject.entries()).map(([subjectId, v]) => {
      const sorted = [...v.rows].sort((a,b)=> b.score - a.score);
      const rankings = sorted.map((r, i) => ({
        studentId: r.sid,
        studentName: r.studentName,
        score: r.score,
        rank: i + 1,
      }));
      const mean = v.rows.length ? v.rows.reduce((a,b)=> a + b.score, 0) / v.rows.length : 0;
      return {
        subjectId,
        subjectName: v.subjectName,
        total: v.rows.length,
        mean,
        rankings,
      };
    }).sort((a,b)=> a.subjectName.localeCompare(b.subjectName));

    return {
      term: term || null,
      examType: examType || null,
      stream: {
        gradeLevel: (klass as any).gradeLevel || null,
        academicYear: (klass as any).academicYear || null,
        name: streamName,
      },
      subjects: result,
    };
  }

  // Admin-only: One-click cleanup to remove historical duplicate marks.
  // Keeps the most recent row per unique key (studentId, klassId, subjectId, session).
  @UseGuards(BearerGuard)
  @Post('dedupe')
  async dedupe(@Req() req: any) {
    const role = req.user?.role;
    if (role !== 'admin') throw new ForbiddenException('Only admin can run dedupe');

    // Preview duplicates before
    const beforeRows: Array<{ studentId: string; klassId: string; subjectId: string | null; session: string; cnt: number }>
      = await this.marks.query(
        `SELECT studentId, klassId, subjectId, session, COUNT(*) AS cnt
         FROM marks
         GROUP BY studentId, klassId, subjectId, session
         HAVING cnt > 1;`
      );

    // Pass 1: delete older by createdAt, keep most recent
    const pass1: any = await this.marks.query(
      `DELETE m1 FROM marks m1
       JOIN marks m2
         ON m1.studentId = m2.studentId
        AND m1.klassId   = m2.klassId
        AND ((m1.subjectId IS NULL AND m2.subjectId IS NULL) OR m1.subjectId = m2.subjectId)
        AND m1.session   = m2.session
        AND m1.createdAt < m2.createdAt;`
    );

    // Pass 2: if duplicates with identical timestamps exist, keep the highest id
    const pass2: any = await this.marks.query(
      `DELETE m1 FROM marks m1
       JOIN marks m2
         ON m1.studentId = m2.studentId
        AND m1.klassId   = m2.klassId
        AND ((m1.subjectId IS NULL AND m2.subjectId IS NULL) OR m1.subjectId = m2.subjectId)
        AND m1.session   = m2.session
        AND m1.id        < m2.id;`
    );

    const afterRows: Array<{ remaining_dupes: number }> = await this.marks.query(
      `SELECT COUNT(*) AS remaining_dupes FROM (
         SELECT 1 FROM marks
         GROUP BY studentId, klassId, subjectId, session
         HAVING COUNT(*) > 1
       ) t;`
    );

    // affectedRows is MySQL response field on OkPacket
    const deleted = Number((pass1?.affectedRows || pass1?.affected || 0)) + Number((pass2?.affectedRows || pass2?.affected || 0));
    const before = beforeRows?.length || 0;
    const remaining = Number(afterRows?.[0]?.remaining_dupes || 0);
    return { success: true, before, deleted, remaining };
  }

  // Admin-only: Recompute grades for all marks based on current Settings bands
  @UseGuards(BearerGuard)
  @Post('recompute-grades')
  async recomputeGrades(@Req() req: any) {
    const role = req.user?.role;
    if (role !== 'admin') throw new ForbiddenException('Only admin can recompute grades');
    const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
    type Band = { grade: string; min: number; max: number };
    const parseBands = (json?: string | null): Band[] => {
      try {
        if (!json) return [];
        const arr = JSON.parse(json);
        if (!Array.isArray(arr) || !arr.length) return [];
        const out: Band[] = [];
        for (const it of arr) {
          const g = (it?.grade || '').toString().trim();
          let min = Number((it?.min ?? '').toString());
          let max = Number((it?.max ?? '').toString());
          if ((isNaN(min) || isNaN(max)) && typeof it?.range === 'string') {
            const m = /(-?\d+(?:\.\d+)?)\s*[\-\u2013\u2014]\s*(-?\d+(?:\.\d+)?)/.exec(it.range);
            if (m) { min = parseFloat(m[1]); max = parseFloat(m[2]); }
          }
          if (!g || isNaN(min) || isNaN(max)) continue;
          if (min > max) { const t = min; min = max; max = t; }
          out.push({ grade: g, min, max });
        }
        out.sort((a,b) => b.min - a.min);
        return out;
      } catch { return []; }
    };
    let bands = parseBands(settings?.gradingBandsJson || null);
    // Validate bands: if all bands have min=0 and max=0, they're invalid
    if (bands && bands.length > 0) {
      const allInvalid = bands.every(b => b.min === 0 && b.max === 0);
      if (allInvalid) {
        console.log('[Recompute] ⚠️ Settings bands are invalid (all zeros), cannot recompute');
        return { success: false, message: 'Grading bands in Settings are invalid (all zeros). Please configure valid bands first.' } as any;
      }
    }
    if (!bands || bands.length === 0) {
      return { success: false, message: 'No grading bands configured in Settings. Please configure bands first.' } as any;
    }
    const gradeFor = (scoreNum: number): string | null => {
      for (const b of bands) { if (scoreNum >= b.min && scoreNum <= b.max) return b.grade; }
      // If no explicit band matches, do not assign a grade
      return null;
    };
    const all = await this.marks.find();
    let updated = 0; const toSave: Mark[] = [] as any;
    for (const m of all) {
      const sc = Number((m as any).score);
      if (!Number.isFinite(sc) || sc < 0 || sc > 100) continue;
      const g = gradeFor(sc);
      if ((m as any).grade !== g) {
        (m as any).grade = g;
        updated++;
        toSave.push(m);
      }
    }
    if (toSave.length) await this.marks.save(toSave);
    return { success: true, total: all.length, updated };
  }

  // ----- Grade Bands Management (UI support) -----
  // Note: For compatibility with existing grading logic, we persist only the 'Overall' category
  // bands into settings.gradingBandsJson (which expects an array). Other categories are ignored on save.

  @UseGuards(BearerGuard)
  @Get('grades')
  async getGrades(@Req() req: any) {
    const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
    type Band = { grade: string; min: number; max: number };
    const parseBands = (json?: string | null): Band[] => {
      try {
        if (!json) return [];
        const arr = JSON.parse(json);
        if (!Array.isArray(arr)) return [];
        const out: Band[] = [];
        for (const it of arr) {
          const g = (it?.grade || '').toString().trim();
          let min = (it?.min !== undefined && it?.min !== null && it?.min !== '') ? Number(it.min) : NaN;
          let max = (it?.max !== undefined && it?.max !== null && it?.max !== '') ? Number(it.max) : NaN;
          if ((isNaN(min) || isNaN(max)) && typeof it?.range === 'string') {
            const s = it.range.toString().trim();
            // Format 1: "70 - 89" (hyphen, en/em dashes)
            let m = /(-?\d+(?:\.\d+)?)\s*[\-\u2013\u2014]\s*(-?\d+(?:\.\d+)?)/.exec(s);
            // Format 2: "70 to 89"
            if (!m) m = /(-?\d+(?:\.\d+)?)\s*to\s*(-?\d+(?:\.\d+)?)/i.exec(s);
            // Format 3: ">69 and < 90" or ">=70 and <=89"
            if (!m) {
              const m2 = /(>=|>)\s*(-?\d+(?:\.\d+)?)\s*(?:and|,)?\s*(<=|<)\s*(-?\d+(?:\.\d+)?)/i.exec(s);
              if (m2) {
                const lowOp = m2[1]; const lowV = parseFloat(m2[2]);
                const highOp = m2[3]; const highV = parseFloat(m2[4]);
                min = lowOp === '>' ? (lowV + 0.0001) : lowV;
                max = highOp === '<' ? (highV - 0.0001) : highV;
              }
            }
            if (m && m.length >= 3) { min = parseFloat(m[1]); max = parseFloat(m[2]); }
          }
          if (!g || isNaN(min) || isNaN(max)) continue;
          if (min > max) { const t = min; min = max; max = t; }
          out.push({ grade: g, min, max });
        }
        out.sort((a,b) => b.min - a.min);
        return out;
      } catch { return []; }
    };
    const overall = parseBands(settings?.gradingBandsJson || null);
    // Return categories for UI; default Exam/Test to overall bands if not separately stored
    return [
      { category: 'Overall', bands: overall },
      { category: 'Exam', bands: overall },
      { category: 'Test', bands: overall },
    ];
  }

  @UseGuards(BearerGuard)
  @Post('grades')
  async saveGrades(@Body() body: Array<{ category: string; bands: Array<{ grade: string; min: number; max: number }> }>, @Req() req: any){
    const role = req.user?.role;
    if (role !== 'admin') throw new ForbiddenException('Only admin can save grades');
    console.log('[POST /grades] Received body:', JSON.stringify(body));
    // Persist only 'Overall' into gradingBandsJson for compatibility
    const overall = (body || []).find(x => (x?.category || '').toLowerCase() === 'overall')
      || (body && body[0]);
    console.log('[POST /grades] Overall category:', JSON.stringify(overall));
    const toSave = Array.isArray(overall?.bands) ? overall!.bands
      .filter(b => {
        if (!b || typeof b.grade !== 'string') return false;
        const min = Number(b.min);
        const max = Number(b.max);
        if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
        // Skip invalid bands where min and max are both 0 (likely uninitialized)
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
      // Use sensible defaults if nothing valid was provided
      toSave.push(
        { grade: 'A*', min: 90, max: 100 },
        { grade: 'A',  min: 70, max: 89 },
        { grade: 'B',  min: 60, max: 69 },
        { grade: 'C',  min: 50, max: 59 },
        { grade: 'D',  min: 45, max: 49 },
        { grade: 'E',  min: 40, max: 44 },
        { grade: 'U',  min: 0,  max: 39 },
      );
    }
    const existing = await this.settingsRepo.findOne({ where: { id: 'global' } });
    let settingsEntity: Settings;
    if (existing) settingsEntity = existing;
    else settingsEntity = this.settingsRepo.create({ id: 'global' } as Partial<Settings>);
    settingsEntity.gradingBandsJson = JSON.stringify(toSave);
    await this.settingsRepo.save(settingsEntity);
    console.log('[POST /grades] ✅ Saved gradingBandsJson:', settingsEntity.gradingBandsJson);
    return { success: true, message: 'Grades saved' };
  }
}
