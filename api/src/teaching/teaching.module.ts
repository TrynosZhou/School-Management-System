import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeachingAssignment } from './teaching-assignment.entity';
import { ClassEntity } from '../entities/class.entity';
import { Subject } from '../entities/subject.entity';
import { Teacher } from '../entities/teacher.entity';
import { TeachingController } from './teaching.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TeachingAssignment, ClassEntity, Subject, Teacher])],
  controllers: [TeachingController],
})
export class TeachingModule {}
