import { Controller, Post, UploadedFile, UploadedFiles, UseInterceptors, Body, Get, Param, BadRequestException, Query, Delete } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { ElearningService } from './elearning.service';

@Controller('elearning')
export class ElearningController {
  constructor(private readonly svc: ElearningService) {}

  @Post('student/signup')
  studentSignup(@Body() body: any){ return this.svc.signup('student', body); }

  @Post('student/login')
  studentLogin(@Body() body: any){ return this.svc.login('student', body); }

  @Post('teacher/signup')
  teacherSignup(@Body() body: any){ return this.svc.signup('teacher', body); }

  @Post('teacher/login')
  teacherLogin(@Body() body: any){ return this.svc.login('teacher', body); }

  @Post('resources')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = path.join(process.cwd(), 'uploads', 'resources');
        try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch {}
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/[^a-z0-9\-_.]+/gi, '_');
        cb(null, `${Date.now()}_${base}${ext}`);
      }
    })
  }))
  uploadResource(@UploadedFile() file: any, @Body() body: any){
    if (!file) throw new BadRequestException('No file uploaded');
    try {
      return this.svc.uploadResource(file, body);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('uploadResource error', e);
      throw e;
    }
  }

  // Public: list downloadable resources (optionally filter by class)
  @Get('resources')
  listResources(@Query('role') role?: string, @Query('classRef') classRef?: string, @Query('now') now?: string){
    const nowNum = now ? Number(now) : Date.now();
    return this.svc.listResources({ role, classRef, now: Number.isFinite(nowNum as any) ? nowNum : Date.now() });
  }

  // Student: submit assignment/test files for a resource
  @Post('resources/:id/submissions')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = path.join(process.cwd(), 'uploads', 'submissions');
        try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch {}
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/[^a-z0-9\-_.]+/gi, '_');
        cb(null, `${Date.now()}_${base}${ext}`);
      }
    })
  }))
  submitResource(@Param('id') id: string, @UploadedFile() file: any, @Body() body: any){
    if (!file) throw new BadRequestException('No file uploaded');
    const isPdf = (file?.mimetype || '').toLowerCase().includes('pdf') || (file?.originalname || '').toLowerCase().endsWith('.pdf');
    if (!isPdf) throw new BadRequestException('Only PDF submissions are allowed');
    try {
      return this.svc.submitResource(id, file, body);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('submitResource error', e);
      throw e;
    }
  }

  // Teacher/Admin: list student submissions with download links
  @Get('submissions')
  listSubmissions(@Query('role') role?: string, @Query('classRef') classRef?: string){
    return this.svc.listSubmissions({ role, classRef });
  }

  // Tests (simplified)
  @Get('tests')
  listTests(){ return this.svc.listTests(); }

  @Get('tests/:id')
  getTest(@Param('id') id: string){ return this.svc.getTest(id); }

  @Post('tests/:id/submit')
  submitTest(@Param('id') id: string, @Body() body: any){ return this.svc.submitTest(id, body?.answers || {}); }

  @Delete('tests/:id')
  removeTest(@Param('id') id: string){ return this.svc.removeTest(id); }

  // AI endpoints
  @Post('ai/generate-test')
  generateAiTest(@Body() body: any){
    return this.svc.generateAiTest({
      subject: body?.subject || 'General',
      classRef: body?.classRef || '',
      syllabusCode: body?.syllabusCode || '',
      total: Number(body?.total) || 75,
      // @ts-ignore
      jobId: typeof body?.jobId === 'string' ? body.jobId : undefined,
    });
  }

  @Post('ai/mark')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = path.join(process.cwd(), 'uploads', 'marking');
        try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch {}
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/[^a-z0-9\-_.]+/gi, '_');
        cb(null, `${Date.now()}_${base}${ext}`);
      }
    })
  }))
  mark(@UploadedFile() file: any){
    if (!file) throw new BadRequestException('No file uploaded');
    return this.svc.markPaper(file);
  }

  @Post('ai/build-bank')
  @UseInterceptors(FilesInterceptor('files', 15, {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = path.join(process.cwd(), 'uploads', 'bank-input');
        try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch {}
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/[^a-z0-9\-_.]+/gi, '_');
        cb(null, `${Date.now()}_${base}${ext}`);
      }
    })
  }))
  async buildBank(@Body() body: any, @UploadedFiles() files: any[]){
    const syllabusCode = (body?.syllabusCode || '').trim();
    if (!syllabusCode) throw new BadRequestException('syllabusCode is required');
    return this.svc.buildBank({ syllabusCode, subject: body?.subject || '', classRef: body?.classRef || '', jobId: typeof body?.jobId === 'string' ? body.jobId : undefined, heuristicOnly: !!body?.heuristicOnly }, files || []);
  }

  // Progress polling endpoint
  @Get('ai/progress/:id')
  getProgress(@Param('id') id: string){
    return this.svc.getProgress(id);
  }

  // Check OpenAI configuration presence
  @Get('ai/check-config')
  checkConfig(){
    return this.svc.checkAiConfig();
  }

  // OpenAI self-test endpoint
  @Get('ai/self-test')
  async selfTest(){
    return this.svc.selfTest();
  }
}
