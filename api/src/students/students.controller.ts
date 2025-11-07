import { Controller, Get, Post, Body, Param, Query, ParseIntPipe, Patch, Delete, UseGuards, UploadedFile, UseInterceptors, BadRequestException, Res, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
import type { Response } from 'express';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { BearerGuard } from '../auth/bearer.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @Post()
  create(@Body() dto: CreateStudentDto) {
    return this.students.create(dto);
  }

  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.students.findAll(page, Math.min(Math.max(limit, 1), 100));
  }

  // Serve student passport photo saved under assets/photos
  @Get(':id/photo')
  async getPhoto(@Param('id') id: string, @Res() res: Response) {
    const baseDir = path.join(process.cwd(), 'assets', 'photos');
    const tryFiles: string[] = [];
    // Try by UUID first with common extensions
    ['jpg', 'jpeg', 'png', 'webp'].forEach(ext => tryFiles.push(path.join(baseDir, `${id}.${ext}`)));
    try {
      const s = await this.students.findOne(id);
      const code = (s?.studentId || '').trim();
      if (code) ['jpg', 'jpeg', 'png', 'webp'].forEach(ext => tryFiles.push(path.join(baseDir, `${code}.${ext}`)));
    } catch {}
    const found = tryFiles.find(p => fs.existsSync(p));
    if (!found) throw new NotFoundException('Photo not found');
    const ext = (found.split('.').pop() || 'jpg').toLowerCase();
    const mime = ext === 'png' ? 'image/png' : (ext === 'webp' ? 'image/webp' : 'image/jpeg');
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(found).pipe(res);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.students.findByIdOrCode(id);
  }

  @Get('byStudentId/:studentId')
  findByStudentId(@Param('studentId') studentId: string) {
    return this.students.findByStudentId(studentId);
  }

  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @Patch(':id')
  update(@Param('id') id: string, @Body() partial: Partial<CreateStudentDto>) {
    return this.students.update(id, partial);
  }

  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.students.remove(id);
  }

  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Post('backfillStudentIds')
  backfill() {
    return this.students.backfillStudentIds();
  }

  // Upload student's passport photo to be used on ID card
  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(@Param('id') id: string, @UploadedFile() file?: any) {
    if (!file || !file.buffer?.length) throw new BadRequestException('No file uploaded');
    // Determine extension from mimetype
    const ext = ((): string => {
      const mt = (file.mimetype || '').toLowerCase();
      if (mt.includes('png')) return 'png';
      if (mt.includes('webp')) return 'webp';
      if (mt.includes('jpeg') || mt.includes('jpg')) return 'jpg';
      return 'jpg';
    })();
    const baseDir = path.join(process.cwd(), 'assets', 'photos');
    fs.mkdirSync(baseDir, { recursive: true });
    // Save as both UUID and studentId (if available) for compatibility
    const targetUuid = path.join(baseDir, `${id}.${ext}`);
    fs.writeFileSync(targetUuid, file.buffer);
    try {
      const s = await this.students.findOne(id);
      if (s?.studentId) {
        const targetSid = path.join(baseDir, `${s.studentId}.${ext}`);
        fs.writeFileSync(targetSid, file.buffer);
      }
    } catch {}
    return { success: true };
  }
}
