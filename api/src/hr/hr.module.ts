import { Module } from '@nestjs/common';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Settings } from '../settings/settings.entity';
import { EmployeeEntity } from '../entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Settings, EmployeeEntity])],
  controllers: [HrController],
  providers: [HrService],
})
export class HrModule {}
