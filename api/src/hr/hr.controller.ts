import { Controller, Post, Body, Get, Patch, Param, Delete } from '@nestjs/common';
import { HrService } from './hr.service';

@Controller('hr')
export class HrController {
  constructor(private readonly svc: HrService) {}

  @Post('payroll/process')
  process(@Body() body: any){ return this.svc.processPayroll(body?.rows || []); }

  @Get('departments')
  listDepartments(){ return this.svc.listDepartments(); }

  @Post('departments')
  createDepartment(@Body() body: any){ return this.svc.createDepartment(body?.name || body?.title || ''); }

  @Get('employees')
  listEmployees(){ return this.svc.listEmployees(); }

  @Post('employees')
  createEmployee(@Body() body: any){
    // Basic shape validation omitted for brevity
    return this.svc.createEmployee({
      firstName: body?.firstName,
      lastName: body?.lastName,
      gender: (body?.gender === 'Female' ? 'Female' : 'Male'),
      dob: body?.dob,
      phone: body?.phone,
      startDate: body?.startDate,
      address: body?.address,
      qualification: body?.qualification,
      salary: Number(body?.salary || 0),
      grade: body?.grade,
      departmentId: body?.departmentId,
    });
  }

  @Patch('employees/:id')
  updateEmployee(@Param('id') id: string, @Body() body: any){
    return this.svc.updateEmployee(id, body || {});
  }

  @Delete('employees/:id')
  deleteEmployee(@Param('id') id: string){
    return this.svc.deleteEmployee(id);
  }
}
