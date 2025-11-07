import { Controller, Get, Post, Body, Query, Res, UseGuards, Param } from '@nestjs/common';
import type { Response } from 'express';
import { ExamsService } from './exams.service';
import { BearerGuard } from '../auth/bearer.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(BearerGuard, RolesGuard)
@Controller('exams')
export class ExamsController {
  constructor(private readonly svc: ExamsService) {}

  @Get()
  @Roles('admin','teacher')
  list(@Query('classId') classId?: string, @Query('subjectId') subjectId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('q') q?: string) {
    return this.svc.list({ classId, subjectId, from, to, q });
  }

  @Post()
  @Roles('admin')
  create(@Body() body: any) {
    return this.svc.create(body);
  }

  @Get('export.csv')
  @Roles('admin','teacher')
  async exportCsv(@Res() res: Response, @Query('classId') classId?: string, @Query('subjectId') subjectId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('q') q?: string) {
    const csv = await this.svc.exportCsv({ classId, subjectId, from, to, q });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="exams.csv"');
    res.send(csv);
  }

  @Post(':id/finalize')
  @Roles('admin')
  finalize(@Param('id') id: string) {
    return this.svc.finalize(id);
  }
}
