"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const reports_controller_1 = require("./reports.controller");
const idcards_controller_1 = require("./idcards.controller");
const teaching_load_report_controller_1 = require("./teaching-load-report.controller");
const student_entity_1 = require("../entities/student.entity");
const mark_entity_1 = require("../marks/mark.entity");
const settings_entity_1 = require("../settings/settings.entity");
const attendance_entity_1 = require("../entities/attendance.entity");
const teacher_entity_1 = require("../entities/teacher.entity");
const class_entity_1 = require("../entities/class.entity");
const subject_entity_1 = require("../entities/subject.entity");
const teaching_assignment_entity_1 = require("../teaching/teaching-assignment.entity");
const report_remark_entity_1 = require("./report-remark.entity");
const enrollment_entity_1 = require("../entities/enrollment.entity");
const parents_module_1 = require("../parents/parents.module");
const email_service_1 = require("../email/email.service");
const accounts_module_1 = require("../accounts/accounts.module");
const account_settings_entity_1 = require("../accounts/account-settings.entity");
let ReportsModule = class ReportsModule {
};
exports.ReportsModule = ReportsModule;
exports.ReportsModule = ReportsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([student_entity_1.Student, mark_entity_1.Mark, settings_entity_1.Settings, report_remark_entity_1.ReportRemark, attendance_entity_1.Attendance, enrollment_entity_1.Enrollment, teacher_entity_1.Teacher, class_entity_1.ClassEntity, subject_entity_1.Subject, teaching_assignment_entity_1.TeachingAssignment, account_settings_entity_1.AccountSettings]), parents_module_1.ParentsModule, accounts_module_1.AccountsModule],
        controllers: [reports_controller_1.ReportsController, idcards_controller_1.IdCardsController, teaching_load_report_controller_1.TeachingLoadReportController],
        providers: [email_service_1.EmailService],
    })
], ReportsModule);
//# sourceMappingURL=reports.module.js.map