import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from '../entities/student.entity';
import { FeeInvoice } from '../accounts/fee-invoice.entity';
import { FeeTransaction } from '../accounts/fee-transaction.entity';
import { StudentAccount } from '../accounts/student-account.entity';
import { AccountSettings } from '../accounts/account-settings.entity';
import { Settings } from '../settings/settings.entity';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Student, FeeInvoice, FeeTransaction, StudentAccount, AccountSettings, Settings])],
  providers: [StudentsService],
  controllers: [StudentsController],
  exports: [StudentsService],
})
export class StudentsModule {}
