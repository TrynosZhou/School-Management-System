import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParentStudent } from './parent-student.entity';
import { ParentLinkToken } from './parent-link-token.entity';
import { ParentsService } from './parents.service';
import { ParentsController } from './parents.controller';
import { Student } from '../entities/student.entity';
import { User } from '../entities/user.entity';
import { EmailService } from '../email/email.service';

@Module({
  imports: [TypeOrmModule.forFeature([ParentStudent, ParentLinkToken, Student, User])],
  providers: [ParentsService, EmailService],
  controllers: [ParentsController],
  exports: [ParentsService],
})
export class ParentsModule {}
