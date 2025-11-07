"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./entities/user.entity");
const student_entity_1 = require("./entities/student.entity");
const teacher_entity_1 = require("./entities/teacher.entity");
const subject_entity_1 = require("./entities/subject.entity");
const class_entity_1 = require("./entities/class.entity");
const bcrypt = __importStar(require("bcrypt"));
async function run() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, { logger: ['log', 'error', 'warn'] });
    const ds = app.get(typeorm_1.DataSource);
    try {
        const users = ds.getRepository(user_entity_1.User);
        const students = ds.getRepository(student_entity_1.Student);
        const teachers = ds.getRepository(teacher_entity_1.Teacher);
        const subjects = ds.getRepository(subject_entity_1.Subject);
        const classes = ds.getRepository(class_entity_1.ClassEntity);
        const adminEmail = 'admin@example.com';
        let admin = await users.findOne({ where: { email: adminEmail } });
        if (!admin) {
            const hash = await bcrypt.hash('password123', 10);
            admin = users.create({ email: adminEmail, passwordHash: hash, role: 'admin' });
            await users.save(admin);
            console.log('Created default admin: admin@example.com / password123');
        }
        else {
            console.log('Admin already exists');
        }
        const demoSubjects = [
            { code: 'MATH', name: 'Mathematics' },
            { code: 'ENG', name: 'English' },
            { code: 'SCI', name: 'Science' },
        ];
        for (const s of demoSubjects) {
            const exists = await subjects.findOne({ where: { code: s.code } });
            if (!exists)
                await subjects.save(subjects.create(s));
        }
        const demoClasses = [
            { name: 'Grade 10 A', gradeLevel: '10', academicYear: '2025-2026' },
            { name: 'Grade 10 B', gradeLevel: '10', academicYear: '2025-2026' },
            { name: 'Grade 11 A', gradeLevel: '11', academicYear: '2025-2026' },
        ];
        for (const c of demoClasses) {
            const exists = await classes.findOne({ where: { name: c.name, academicYear: c.academicYear } });
            if (!exists)
                await classes.save(classes.create(c));
        }
        const demoTeachers = [
            { firstName: 'Alice', lastName: 'Ng', email: 'alice.ng@example.com', subjectSpecialty: 'Mathematics' },
            { firstName: 'Brian', lastName: 'Lee', email: 'brian.lee@example.com', subjectSpecialty: 'English' },
        ];
        for (const t of demoTeachers) {
            const exists = await teachers.findOne({ where: { email: t.email } });
            if (!exists)
                await teachers.save(teachers.create(t));
        }
        const demoStudents = [
            { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
            { firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@example.com' },
        ];
        for (const s of demoStudents) {
            const exists = await students.findOne({ where: { email: s.email } });
            if (!exists)
                await students.save(students.create(s));
        }
        console.log('Seeding complete');
    }
    catch (e) {
        console.error('Seed failed', e);
    }
    finally {
        await app.close();
    }
}
run();
//# sourceMappingURL=seed.js.map