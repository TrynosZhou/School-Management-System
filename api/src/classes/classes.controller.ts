import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { BearerGuard } from '../auth/bearer.guard';

@Controller('classes')
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}

  @UseGuards(BearerGuard)
  @Post()
  create(@Body() dto: CreateClassDto) {
    return this.classes.create(dto);
  }

  @Get()
  findAll() {
    return this.classes.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classes.findOne(id);
  }

  @UseGuards(BearerGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() partial: Partial<CreateClassDto>) {
    return this.classes.update(id, partial);
  }

  @UseGuards(BearerGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.classes.remove(id);
  }

  @UseGuards(BearerGuard)
  @Post('promote')
  promoteAll() {
    return this.classes.promoteClasses();
  }

  @UseGuards(BearerGuard)
  @Post('normalize-names')
  normalizeNames(@Body() body: { defaultStream?: 'Blue' | 'White' | 'Gold' }) {
    const def = body?.defaultStream ?? 'Blue';
    return this.classes.normalizeNames(def);
  }

  @UseGuards(BearerGuard)
  @Post('ensure')
  ensure(@Body() body: { year: string; items: ({ type: 'form'; gradeNumber: number; stream: 'Blue' | 'White' | 'Gold' } | { type: 'alevel'; band: 'Lower 6' | 'Upper 6'; stream: 'Sci' | 'Comm' | 'Arts' })[] }) {
    return this.classes.ensureClasses(body?.year, body?.items || []);
  }
}
