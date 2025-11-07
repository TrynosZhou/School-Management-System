import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mark } from './mark.entity';
import { Student } from '../entities/student.entity';
import { ClassEntity } from '../entities/class.entity';
import { Subject } from '../entities/subject.entity';
import { TeachingAssignment } from '../teaching/teaching-assignment.entity';
import { Teacher } from '../entities/teacher.entity';
import { MarksController } from './marks.controller';
import { Settings } from '../settings/settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Mark, Student, ClassEntity, Subject, TeachingAssignment, Teacher, Settings])],
  controllers: [MarksController],
})
export class MarksModule {}
