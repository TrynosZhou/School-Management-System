"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const student_entity_1 = require("../entities/student.entity");
const fee_invoice_entity_1 = require("../accounts/fee-invoice.entity");
const fee_transaction_entity_1 = require("../accounts/fee-transaction.entity");
const student_account_entity_1 = require("../accounts/student-account.entity");
const account_settings_entity_1 = require("../accounts/account-settings.entity");
const settings_entity_1 = require("../settings/settings.entity");
const students_service_1 = require("./students.service");
const students_controller_1 = require("./students.controller");
let StudentsModule = class StudentsModule {
};
exports.StudentsModule = StudentsModule;
exports.StudentsModule = StudentsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([student_entity_1.Student, fee_invoice_entity_1.FeeInvoice, fee_transaction_entity_1.FeeTransaction, student_account_entity_1.StudentAccount, account_settings_entity_1.AccountSettings, settings_entity_1.Settings])],
        providers: [students_service_1.StudentsService],
        controllers: [students_controller_1.StudentsController],
        exports: [students_service_1.StudentsService],
    })
], StudentsModule);
//# sourceMappingURL=students.module.js.map