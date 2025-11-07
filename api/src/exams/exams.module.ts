import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { ExamEntity } from './exam.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExamEntity])],
  providers: [ExamsService],
  controllers: [ExamsController],
})
export class ExamsModule {}
