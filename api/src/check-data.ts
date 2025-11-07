import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Student } from './entities/student.entity';
import { Teacher } from './entities/teacher.entity';
import { Subject } from './entities/subject.entity';
import { ClassEntity } from './entities/class.entity';
import { Mark } from './marks/mark.entity';
import { ReportRemark } from './reports/report-remark.entity';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'error', 'warn'] });
  const ds = app.get(DataSource);
  
  try {
    console.log('=== DATABASE CONTENT CHECK ===\n');
    
    const users = await ds.getRepository(User).count();
    const students = await ds.getRepository(Student).count();
    const teachers = await ds.getRepository(Teacher).count();
    const subjects = await ds.getRepository(Subject).count();
    const classes = await ds.getRepository(ClassEntity).count();
    const marks = await ds.getRepository(Mark).count();
    const remarks = await ds.getRepository(ReportRemark).count();
    
    console.log(`Users: ${users}`);
    console.log(`Students: ${students}`);
    console.log(`Teachers: ${teachers}`);
    console.log(`Subjects: ${subjects}`);
    console.log(`Classes: ${classes}`);
    console.log(`Marks: ${marks}`);
    console.log(`Report Remarks: ${remarks}`);
    
    if (users > 0) {
      const userList = await ds.getRepository(User).find({ take: 5 });
      console.log('\nSample Users:');
      userList.forEach(u => console.log(`  - ${u.email} (${u.role})`));
    }
    
    if (students > 0) {
      const studentList = await ds.getRepository(Student).find({ take: 5 });
      console.log('\nSample Students:');
      studentList.forEach(s => console.log(`  - ${s.firstName} ${s.lastName} (${s.studentId || 'N/A'})`));
    }
    
    console.log('\n=== END CHECK ===');
  } catch (e) {
    console.error('Check failed', e);
  } finally {
    await app.close();
  }
}

run();
