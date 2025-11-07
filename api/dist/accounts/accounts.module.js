"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const account_settings_entity_1 = require("./account-settings.entity");
const student_account_entity_1 = require("./student-account.entity");
const fee_invoice_entity_1 = require("./fee-invoice.entity");
const fee_transaction_entity_1 = require("./fee-transaction.entity");
const accounts_controller_1 = require("./accounts.controller");
const accounts_service_1 = require("./accounts.service");
const student_entity_1 = require("../entities/student.entity");
const enrollment_entity_1 = require("../entities/enrollment.entity");
const settings_entity_1 = require("../settings/settings.entity");
let AccountsModule = class AccountsModule {
};
exports.AccountsModule = AccountsModule;
exports.AccountsModule = AccountsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([account_settings_entity_1.AccountSettings, student_account_entity_1.StudentAccount, fee_invoice_entity_1.FeeInvoice, fee_transaction_entity_1.FeeTransaction, student_entity_1.Student, enrollment_entity_1.Enrollment, settings_entity_1.Settings])],
        controllers: [accounts_controller_1.AccountsController],
        providers: [accounts_service_1.AccountsService],
        exports: [accounts_service_1.AccountsService],
    })
], AccountsModule);
//# sourceMappingURL=accounts.module.js.map