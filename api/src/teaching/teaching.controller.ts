import { Body, Controller, Get, Param, Post, UseGuards, Req, ForbiddenException, Delete } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeachingAssignment } from './teaching-assignment.entity';
import { Teacher } from '../entities/teacher.entity';
import { ClassEntity } from '../entities/class.entity';
import { Subject } from '../entities/subject.entity';
import { BearerGuard } from '../auth/bearer.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

class CreateAssignmentDto {
  @IsUUID()
  teacherId: string;

  @IsUUID()
  classId: string;

  @IsOptional()
  @IsUUID()
  subjectId?: string | null;

  @IsIn(['active', 'inactive'])
  status: 'active' | 'inactive';
}

@Controller('teaching')
export class TeachingController {
  constructor(
    @InjectRepository(TeachingAssignment) private readonly assignments: Repository<TeachingAssignment>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(ClassEntity) private readonly classes: Repository<ClassEntity>,
    @InjectRepository(Subject) private readonly subjects: Repository<Subject>,
  ) {}

  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @Post('assign')
  async assign(@Body() dto: CreateAssignmentDto) {
    const teacher = await this.teachers.findOne({ where: { id: dto.teacherId } });
    const klass = await this.classes.findOne({ where: { id: dto.classId } });
    const subject = dto.subjectId ? await this.subjects.findOne({ where: { id: dto.subjectId } }) : null;
    if (!teacher || !klass) return { success: false, message: 'Teacher or class not found' };
    // Enforce: a class can be taught a subject by only one teacher (subject required to enforce)
    if (subject) {
      const existing = await this.assignments.findOne({ where: { klass: { id: klass.id } as any, subject: { id: subject.id } as any } as any });
      if (existing && existing.teacher?.id !== teacher.id) {
        return { success: false, message: 'This class already has a teacher assigned for this subject' };
      }
    }
    // Upsert by (teacher, class, subject): allow multiple subjects per class for same teacher
    let entity = await this.assignments.findOne({ where: { teacher: { id: teacher.id } as any, klass: { id: klass.id } as any, subject: subject ? ({ id: subject.id } as any) : null as any } as any });
    if (!entity) {
      entity = this.assignments.create({ teacher, klass, subject: subject || null, status: dto.status });
    } else {
      entity.status = dto.status;
    }
    await this.assignments.save(entity);
    return { success: true, id: entity.id };
  }

  @UseGuards(BearerGuard)
  @Get('class/:classId')
  listForClass(@Param('classId') classId: string) {
    return this.assignments.find({ where: { klass: { id: classId } as any } });
  }

  @UseGuards(BearerGuard)
  @Get('teacher/:teacherId')
  listForTeacher(@Param('teacherId') teacherId: string) {
    return this.assignments.find({ where: { teacher: { id: teacherId } as any } });
  }

  // List classes taught by a teacher (any subject, active only)
  @UseGuards(BearerGuard)
  @Get('teacher/:teacherId/classes')
  async listClassesForTeacher(@Param('teacherId') teacherId: string) {
    const rows = await this.assignments.find({ where: { teacher: { id: teacherId } as any, status: 'active' } as any });
    // collapse to unique classes
    const ids = Array.from(new Set(rows.map(r => r.klass?.id).filter(Boolean)));
    return ids;
  }

  // Unassign a teacher from a class (remove all assignments for that teacher+class)
  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @Delete('assign')
  async unassign(@Body() body: { teacherId: string; classId: string }) {
    const teacherId = body?.teacherId; const classId = body?.classId;
    if (!teacherId || !classId) return { success: false, message: 'teacherId and classId are required' };
    const found = await this.assignments.find({ where: { teacher: { id: teacherId } as any, klass: { id: classId } as any } as any });
    if (!(found && found.length)) return { success: true, removed: 0 };
    await this.assignments.remove(found);
    return { success: true, removed: found.length };
  }

  // Remove a single subject assignment for a teacher in a class
  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @Delete('assign/one')
  async unassignOne(@Body() body: { teacherId: string; classId: string; subjectId: string }) {
    const { teacherId, classId, subjectId } = body || {} as any;
    if (!teacherId || !classId || !subjectId) return { success: false, message: 'teacherId, classId and subjectId are required' };
    const found = await this.assignments.find({ where: { teacher: { id: teacherId } as any, klass: { id: classId } as any, subject: { id: subjectId } as any } as any });
    if (!(found && found.length)) return { success: true, removed: 0 };
    await this.assignments.remove(found);
    return { success: true, removed: found.length };
  }

  // Current teacher's active assignments based on authenticated JWT email
  @UseGuards(BearerGuard)
  @Get('my-assignments')
  async listMine(@Req() req: any) {
    const role = req.user?.role as string | undefined;
    const email = req.user?.email as string | undefined;
    if (!email) throw new ForbiddenException('Unauthorized');
    // For admins, return empty list instead of 403 (UI for admin doesn't rely on this)
    if (role === 'admin') return [];
    const teacher = await this.teachers.findOne({ where: { email } });
    if (!teacher) throw new ForbiddenException('Teacher profile not found');
    return this.assignments.find({ where: { teacher: { id: teacher.id } as any, status: 'active' } as any });
  }

  // Ensure a Teacher profile exists for the current authenticated user.
  // - If role is 'teacher' and no Teacher with this email exists, create a minimal profile.
  // - Admins can also call this for themselves; returns the found/created profile.
  @UseGuards(BearerGuard)
  @Post('ensure-current-teacher')
  async ensureCurrentTeacher(@Req() req: any) {
    const email = req.user?.email as string | undefined;
    const role = String(req.user?.role || '').toLowerCase();
    if (!email) throw new ForbiddenException('Unauthorized');
    if (role !== 'teacher' && role !== 'admin') throw new ForbiddenException('Only teacher/admin');
    let teacher = await this.teachers.findOne({ where: { email } });
    if (!teacher) {
      // Create a minimal teacher profile using email. Names derived from email local part.
      const local = email.split('@')[0] || 'Teacher';
      const [firstName, ...rest] = local.replace(/[^a-zA-Z]/g, ' ').split(' ').filter(Boolean);
      const lastName = rest.join(' ') || 'Account';
      teacher = this.teachers.create({ email, firstName: firstName || 'Teacher', lastName: lastName || 'Account' });
      teacher = await this.teachers.save(teacher);
    }
    return teacher;
  }
}
