import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassEntity } from '../entities/class.entity';
import { Teacher } from '../entities/teacher.entity';
import { ClassesService } from './classes.service';
import { Settings } from '../settings/settings.entity';
import { ClassesController } from './classes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ClassEntity, Teacher, Settings])],
  providers: [ClassesService],
  controllers: [ClassesController],
  exports: [ClassesService],
})
export class ClassesModule {}
