import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountSettings } from './account-settings.entity';
import { StudentAccount } from './student-account.entity';
import { FeeInvoice } from './fee-invoice.entity';
import { FeeTransaction } from './fee-transaction.entity';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { Student } from '../entities/student.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { Settings } from '../settings/settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AccountSettings, StudentAccount, FeeInvoice, FeeTransaction, Student, Enrollment, Settings])],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
