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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const serve_static_1 = require("@nestjs/serve-static");
const path = __importStar(require("path"));
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const user_entity_1 = require("./entities/user.entity");
const users_module_1 = require("./users/users.module");
const auth_module_1 = require("./auth/auth.module");
const students_module_1 = require("./students/students.module");
const teachers_module_1 = require("./teachers/teachers.module");
const subjects_module_1 = require("./subjects/subjects.module");
const classes_module_1 = require("./classes/classes.module");
const enrollments_module_1 = require("./enrollments/enrollments.module");
const stats_module_1 = require("./stats/stats.module");
const marks_module_1 = require("./marks/marks.module");
const teaching_module_1 = require("./teaching/teaching.module");
const reports_module_1 = require("./reports/reports.module");
const settings_module_1 = require("./settings/settings.module");
const accounts_module_1 = require("./accounts/accounts.module");
const attendance_module_1 = require("./attendance/attendance.module");
const parents_module_1 = require("./parents/parents.module");
const elearning_module_1 = require("./elearning/elearning.module");
const hr_module_1 = require("./hr/hr.module");
const library_module_1 = require("./library/library.module");
const exams_module_1 = require("./exams/exams.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: path.join(process.cwd(), 'uploads'),
                serveRoot: '/uploads',
            }),
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRoot({
                type: 'mysql',
                host: process.env.DB_HOST || '127.0.0.1',
                port: parseInt(process.env.DB_PORT || '3306', 10),
                username: process.env.DB_USERNAME || 'schooluser',
                password: process.env.DB_PASSWORD || 'schoolpass',
                database: process.env.DB_NAME || 'schoolpro',
                entities: [user_entity_1.User],
                synchronize: true,
                autoLoadEntities: true,
            }),
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            students_module_1.StudentsModule,
            teachers_module_1.TeachersModule,
            subjects_module_1.SubjectsModule,
            classes_module_1.ClassesModule,
            enrollments_module_1.EnrollmentsModule,
            stats_module_1.StatsModule,
            marks_module_1.MarksModule,
            teaching_module_1.TeachingModule,
            reports_module_1.ReportsModule,
            settings_module_1.SettingsModule,
            accounts_module_1.AccountsModule,
            attendance_module_1.AttendanceModule,
            parents_module_1.ParentsModule,
            elearning_module_1.ElearningModule,
            hr_module_1.HrModule,
            library_module_1.LibraryModule,
            exams_module_1.ExamsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map