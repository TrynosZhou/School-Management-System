"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./entities/user.entity");
const student_entity_1 = require("./entities/student.entity");
const teacher_entity_1 = require("./entities/teacher.entity");
const subject_entity_1 = require("./entities/subject.entity");
const class_entity_1 = require("./entities/class.entity");
const mark_entity_1 = require("./marks/mark.entity");
const report_remark_entity_1 = require("./reports/report-remark.entity");
async function run() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, { logger: ['log', 'error', 'warn'] });
    const ds = app.get(typeorm_1.DataSource);
    try {
        console.log('=== DATABASE CONTENT CHECK ===\n');
        const users = await ds.getRepository(user_entity_1.User).count();
        const students = await ds.getRepository(student_entity_1.Student).count();
        const teachers = await ds.getRepository(teacher_entity_1.Teacher).count();
        const subjects = await ds.getRepository(subject_entity_1.Subject).count();
        const classes = await ds.getRepository(class_entity_1.ClassEntity).count();
        const marks = await ds.getRepository(mark_entity_1.Mark).count();
        const remarks = await ds.getRepository(report_remark_entity_1.ReportRemark).count();
        console.log(`Users: ${users}`);
        console.log(`Students: ${students}`);
        console.log(`Teachers: ${teachers}`);
        console.log(`Subjects: ${subjects}`);
        console.log(`Classes: ${classes}`);
        console.log(`Marks: ${marks}`);
        console.log(`Report Remarks: ${remarks}`);
        if (users > 0) {
            const userList = await ds.getRepository(user_entity_1.User).find({ take: 5 });
            console.log('\nSample Users:');
            userList.forEach(u => console.log(`  - ${u.email} (${u.role})`));
        }
        if (students > 0) {
            const studentList = await ds.getRepository(student_entity_1.Student).find({ take: 5 });
            console.log('\nSample Students:');
            studentList.forEach(s => console.log(`  - ${s.firstName} ${s.lastName} (${s.studentId || 'N/A'})`));
        }
        console.log('\n=== END CHECK ===');
    }
    catch (e) {
        console.error('Check failed', e);
    }
    finally {
        await app.close();
    }
}
run();
//# sourceMappingURL=check-data.js.map