import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './entities/user.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { TeachersModule } from './teachers/teachers.module';
import { SubjectsModule } from './subjects/subjects.module';
import { ClassesModule } from './classes/classes.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { StatsModule } from './stats/stats.module';
import { MarksModule } from './marks/marks.module';
import { TeachingModule } from './teaching/teaching.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { AccountsModule } from './accounts/accounts.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ParentsModule } from './parents/parents.module';
import { ElearningModule } from './elearning/elearning.module';
import { HrModule } from './hr/hr.module';
import { LibraryModule } from './library/library.module';
import { ExamsModule } from './exams/exams.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: path.join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      // Switch to Postgres for Render
      type: 'postgres',
      // Prefer a single DATABASE_URL if provided (e.g. from Render) otherwise fall back to individual vars
      url: process.env.DATABASE_URL || undefined,
      host: process.env.DATABASE_URL ? undefined : (process.env.DB_HOST || '127.0.0.1'),
      port: process.env.DATABASE_URL ? undefined : parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DATABASE_URL ? undefined : (process.env.DB_USERNAME || process.env.DB_USER || 'postgres'),
      password: process.env.DATABASE_URL ? undefined : (process.env.DB_PASSWORD || process.env.DB_PASS || 'postgres'),
      database: process.env.DATABASE_URL ? undefined : (process.env.DB_NAME || 'schooldb'),
      ssl: (() => {
        const flag = (process.env.DB_SSL || '').toLowerCase();
        if (flag === '1' || flag === 'true' || flag === 'yes') {
          return { rejectUnauthorized: false } as any; // common for managed PG on Render
        }
        return false as any;
      })(),
      entities: [User],
      synchronize: true,
      autoLoadEntities: true,
    }),
    UsersModule,
    AuthModule,
    StudentsModule,
    TeachersModule,
    SubjectsModule,
    ClassesModule,
    EnrollmentsModule,
    StatsModule,
    MarksModule,
    TeachingModule,
    ReportsModule,
    SettingsModule,
    AccountsModule,
    AttendanceModule,
    ParentsModule,
    ElearningModule,
    HrModule,
    LibraryModule,
    ExamsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
