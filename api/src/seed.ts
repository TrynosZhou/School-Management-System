import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Student } from './entities/student.entity';
import { Teacher } from './entities/teacher.entity';
import { Subject } from './entities/subject.entity';
import { ClassEntity } from './entities/class.entity';
import * as bcrypt from 'bcrypt';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'error', 'warn'] });
  const ds = app.get(DataSource);
  try {
    const users = ds.getRepository(User);
    const students = ds.getRepository(Student);
    const teachers = ds.getRepository(Teacher);
    const subjects = ds.getRepository(Subject);
    const classes = ds.getRepository(ClassEntity);

    // Default admin
    const adminEmail = 'admin@example.com';
    let admin = await users.findOne({ where: { email: adminEmail } });
    if (!admin) {
      const hash = await bcrypt.hash('password123', 10);
      admin = users.create({ email: adminEmail, passwordHash: hash, role: 'admin' as any });
      await users.save(admin);
      console.log('Created default admin: admin@example.com / password123');
    } else {
      console.log('Admin already exists');
    }

    // Demo subjects
    const demoSubjects = [
      { code: 'MATH', name: 'Mathematics' },
      { code: 'ENG', name: 'English' },
      { code: 'SCI', name: 'Science' },
    ];
    for (const s of demoSubjects) {
      const exists = await subjects.findOne({ where: { code: s.code } });
      if (!exists) await subjects.save(subjects.create(s));
    }

    // Demo classes
    const demoClasses = [
      { name: 'Grade 10 A', gradeLevel: '10', academicYear: '2025-2026' },
      { name: 'Grade 10 B', gradeLevel: '10', academicYear: '2025-2026' },
      { name: 'Grade 11 A', gradeLevel: '11', academicYear: '2025-2026' },
    ];
    for (const c of demoClasses) {
      const exists = await classes.findOne({ where: { name: c.name, academicYear: c.academicYear } });
      if (!exists) await classes.save(classes.create(c));
    }

    // Demo teachers
    const demoTeachers = [
      { firstName: 'Alice', lastName: 'Ng', email: 'alice.ng@example.com', subjectSpecialty: 'Mathematics' },
      { firstName: 'Brian', lastName: 'Lee', email: 'brian.lee@example.com', subjectSpecialty: 'English' },
    ];
    for (const t of demoTeachers) {
      const exists = await teachers.findOne({ where: { email: t.email } });
      if (!exists) await teachers.save(teachers.create(t));
    }

    // Demo students
    const demoStudents = [
      { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
      { firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@example.com' },
    ];
    for (const s of demoStudents) {
      const exists = await students.findOne({ where: { email: s.email } });
      if (!exists) await students.save(students.create(s));
    }

    console.log('Seeding complete');
  } catch (e) {
    console.error('Seed failed', e);
  } finally {
    await app.close();
  }
}

run();
