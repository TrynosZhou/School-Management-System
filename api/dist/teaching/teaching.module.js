"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeachingModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const teaching_assignment_entity_1 = require("./teaching-assignment.entity");
const class_entity_1 = require("../entities/class.entity");
const subject_entity_1 = require("../entities/subject.entity");
const teacher_entity_1 = require("../entities/teacher.entity");
const teaching_controller_1 = require("./teaching.controller");
let TeachingModule = class TeachingModule {
};
exports.TeachingModule = TeachingModule;
exports.TeachingModule = TeachingModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([teaching_assignment_entity_1.TeachingAssignment, class_entity_1.ClassEntity, subject_entity_1.Subject, teacher_entity_1.Teacher])],
        controllers: [teaching_controller_1.TeachingController],
    })
], TeachingModule);
//# sourceMappingURL=teaching.module.js.map