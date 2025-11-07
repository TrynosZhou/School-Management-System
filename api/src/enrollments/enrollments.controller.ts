import { Controller, Post, Body, Get, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import type { CreateEnrollmentDto } from './enrollments.service';
import { BearerGuard } from '../auth/bearer.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @Post()
  create(@Body() dto: CreateEnrollmentDto) {
    return this.enrollments.create(dto);
  }

  @Get('student/:studentId')
  listByStudent(@Param('studentId') studentId: string) {
    return this.enrollments.listByStudent(studentId);
  }

  @Get('class/:classId')
  listByClass(@Param('classId') classId: string) {
    return this.enrollments.listByClass(classId);
  }

  @Get('recent')
  listRecent(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 5;
    return this.enrollments.listRecent(isNaN(n) ? 5 : n);
  }

  @UseGuards(BearerGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.enrollments.remove(id);
  }
}
