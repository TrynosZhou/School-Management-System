import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import type { CreateTeacherDto } from './teachers.service';
import { BearerGuard } from '../auth/bearer.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachers: TeachersService) {}

  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateTeacherDto) {
    return this.teachers.create(dto);
  }

  // Allow a logged-in teacher (or admin) to create their own Teacher profile.
  // - For role 'teacher', the email is forced to the JWT email; other fields come from body.
  // - For role 'admin', falls back to the behavior of create with provided body (but exposed here for convenience).
  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @Post('create-self')
  createSelf(@Req() req: any, @Body() partial: Partial<CreateTeacherDto>) {
    const role = String(req.user?.role || '').toLowerCase();
    const emailFromJwt = req.user?.email as string | undefined;
    if (!emailFromJwt) throw new ForbiddenException('Unauthorized');
    const dto: CreateTeacherDto = {
      firstName: partial.firstName || 'Teacher',
      lastName: partial.lastName || 'Account',
      email: role === 'teacher' ? emailFromJwt : (partial.email || emailFromJwt),
      subjectTaught: partial.subjectTaught ?? null,
      dateOfBirth: partial.dateOfBirth ?? null,
      startDate: partial.startDate ?? null,
      qualifications: partial.qualifications ?? null,
      anyOtherQualification: partial.anyOtherQualification ?? null,
      contactNumber: partial.contactNumber ?? null,
      physicalAddress: partial.physicalAddress ?? null,
      nextOfKin: partial.nextOfKin ?? null,
      gender: partial.gender ?? null,
      anyOtherRole: partial.anyOtherRole ?? null,
    } as CreateTeacherDto;
    return this.teachers.create(dto);
  }

  @Get()
  findAll() {
    return this.teachers.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teachers.findOne(id);
  }

  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() partial: Partial<CreateTeacherDto>) {
    return this.teachers.update(id, partial);
  }

  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teachers.remove(id);
  }
}
