"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarksModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const mark_entity_1 = require("./mark.entity");
const student_entity_1 = require("../entities/student.entity");
const class_entity_1 = require("../entities/class.entity");
const subject_entity_1 = require("../entities/subject.entity");
const teaching_assignment_entity_1 = require("../teaching/teaching-assignment.entity");
const teacher_entity_1 = require("../entities/teacher.entity");
const marks_controller_1 = require("./marks.controller");
const settings_entity_1 = require("../settings/settings.entity");
let MarksModule = class MarksModule {
};
exports.MarksModule = MarksModule;
exports.MarksModule = MarksModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([mark_entity_1.Mark, student_entity_1.Student, class_entity_1.ClassEntity, subject_entity_1.Subject, teaching_assignment_entity_1.TeachingAssignment, teacher_entity_1.Teacher, settings_entity_1.Settings])],
        controllers: [marks_controller_1.MarksController],
    })
], MarksModule);
//# sourceMappingURL=marks.module.js.map