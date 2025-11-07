import { Body, Controller, Get, Patch, Post, UseGuards, UploadedFile, UseInterceptors, Query, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from './settings.entity';
import { User } from '../entities/user.entity';
import { BearerGuard } from '../auth/bearer.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';

@Controller('settings')
export class SettingsController {
  constructor(
    @InjectRepository(Settings) private readonly repo: Repository<Settings>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  @Get()
  async get() {
    let s = await this.repo.findOne({ where: { id: 'global' } });
    if (!s) {
      s = this.repo.create({ id: 'global' });
      await this.repo.save(s);
    }
    return s;
  }

  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Patch()
  async update(@Body() body: Partial<Settings>) {
    let s = await this.repo.findOne({ where: { id: 'global' } });
    if (!s) s = this.repo.create({ id: 'global' });
    Object.assign(s, body);
    await this.repo.save(s);
    return s;
  }

  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Post('logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(@UploadedFile() file?: any) {
    if (!file || !file.buffer) return { success: false, message: 'No file uploaded' };
    const assetsDir = path.join(process.cwd(), 'assets');
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
    const ext = (file.originalname.split('.').pop() || 'png').toLowerCase();
    const filename = `logo-${Date.now()}.${ext}`;
    const target = path.join(assetsDir, filename);
    fs.writeFileSync(target, file.buffer);
    // save relative path for later use by reports
    let s = await this.repo.findOne({ where: { id: 'global' } });
    if (!s) s = this.repo.create({ id: 'global' });
    s.logoUrl = path.join('assets', filename).replace(/\\/g, '/');
    await this.repo.save(s);
    return { success: true, logoUrl: s.logoUrl };
  }

  // -------- Module Entitlements --------
  // Central list of modules available in the system. Keys should match route/features.
  private allModules(): Array<{ key: string; label: string }> {
    return [
      { key: 'students', label: 'Students' },
      { key: 'teachers', label: 'Teachers' },
      { key: 'classes', label: 'Classes' },
      { key: 'subjects', label: 'Subjects' },
      { key: 'enrollments', label: 'Enrollments' },
      { key: 'marks', label: 'Marks' },
      { key: 'reports', label: 'Reports' },
      { key: 'fees', label: 'Fees' },
      { key: 'accounts', label: 'Accounts' },
      { key: 'attendance', label: 'Attendance' },
      { key: 'settings', label: 'Settings' },
      { key: 'teaching', label: 'Teaching Assignments' },
    ];
  }

  @UseGuards(BearerGuard)
  @Get('modules-list')
  listModules() {
    return this.allModules();
  }

  @UseGuards(BearerGuard)
  @Get('user-modules')
  async getUserModules(@Query('email') email?: string) {
    if (!email) throw new ForbiddenException('email is required');
    const user = await this.users.findOne({ where: { email } });
    if (!user) return { email, modules: [] as string[] };
    let modules: string[] = [];
    try { modules = user.modulesJson ? JSON.parse(user.modulesJson) : []; } catch { modules = []; }
    return { email, modules };
  }

  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Patch('user-modules')
  async setUserModules(@Body() body: { email?: string; modules?: string[] }) {
    const email = body?.email?.trim();
    if (!email) throw new ForbiddenException('email is required');
    const modules = Array.isArray(body?.modules) ? body.modules!.filter(Boolean) : [];
    let user = await this.users.findOne({ where: { email } });
    if (!user) throw new ForbiddenException('User not found');
    user.modulesJson = JSON.stringify(modules);
    await this.users.save(user);
    return { success: true };
  }
}
