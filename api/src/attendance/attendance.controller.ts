import { Body, Controller, Get, Post, Query, UseGuards, Req, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import type { RecordAttendanceDto } from './attendance.service';
import { BearerGuard } from '../auth/bearer.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassEntity } from '../entities/class.entity';

@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly svc: AttendanceService,
    @InjectRepository(ClassEntity) private readonly classesRepo: Repository<ClassEntity>,
  ) {}

  @UseGuards(BearerGuard)
  @Post('record')
  async record(@Body() body: RecordAttendanceDto, @Req() req: any) {
    const user = (req?.user || {}) as { role?: string; email?: string };
    if (user.role === 'admin') {
      return this.svc.record(body);
    }
    // Non-admins (e.g., teachers) must provide classId and be the class teacher
    if (!body.classId) throw new ForbiddenException('classId is required');
    const klass = await this.classesRepo.findOne({ where: { id: body.classId } });
    if (!klass) throw new NotFoundException('Class not found');
    const teacherEmail = klass.classTeacher?.email;
    if (!teacherEmail || !user.email || teacherEmail.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException('Only the class teacher or an admin can record attendance for this class');
    }
    return this.svc.record(body);
  }

  @Get('list')
  list(@Query('studentId') studentId?: string, @Query('term') term?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.list(studentId, term, from, to);
  }

  @Get('summary')
  summary(@Query('studentId') studentId: string, @Query('term') term?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.summary(studentId, term, from, to);
  }

  @Get('present-count')
  presentCount(@Query('date') date: string){
    return this.svc.presentCount(date);
  }
}
