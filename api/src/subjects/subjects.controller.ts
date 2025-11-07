import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import type { CreateSubjectDto } from './subjects.service';
import { BearerGuard } from '../auth/bearer.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjects: SubjectsService) {}

  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateSubjectDto) {
    return this.subjects.create(dto);
  }

  @Get()
  findAll() {
    return this.subjects.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subjects.findOne(id);
  }

  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() partial: Partial<CreateSubjectDto>) {
    return this.subjects.update(id, partial);
  }

  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.subjects.remove(id);
  }
}
