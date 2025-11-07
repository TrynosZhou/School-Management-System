import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { IdCardsController } from './idcards.controller';
import { TeachingLoadReportController } from './teaching-load-report.controller';
import { Student } from '../entities/student.entity';
import { Mark } from '../marks/mark.entity';
import { Settings } from '../settings/settings.entity';
import { Attendance } from '../entities/attendance.entity';
import { Teacher } from '../entities/teacher.entity';
import { ClassEntity } from '../entities/class.entity';
import { Subject } from '../entities/subject.entity';
import { TeachingAssignment } from '../teaching/teaching-assignment.entity';
import { ReportRemark } from './report-remark.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { ParentsModule } from '../parents/parents.module';
import { EmailService } from '../email/email.service';
import { AccountsModule } from '../accounts/accounts.module';
import { AccountSettings } from '../accounts/account-settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Student, Mark, Settings, ReportRemark, Attendance, Enrollment, Teacher, ClassEntity, Subject, TeachingAssignment, AccountSettings]), ParentsModule, AccountsModule],
  controllers: [ReportsController, IdCardsController, TeachingLoadReportController],
  providers: [EmailService],
})
export class ReportsModule {}
