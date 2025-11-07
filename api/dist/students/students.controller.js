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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const students_service_1 = require("./students.service");
const create_student_dto_1 = require("./dto/create-student.dto");
const bearer_guard_1 = require("../auth/bearer.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
let StudentsController = class StudentsController {
    students;
    constructor(students) {
        this.students = students;
    }
    create(dto) {
        return this.students.create(dto);
    }
    findAll(page = 1, limit = 20) {
        return this.students.findAll(page, Math.min(Math.max(limit, 1), 100));
    }
    async getPhoto(id, res) {
        const baseDir = path.join(process.cwd(), 'assets', 'photos');
        const tryFiles = [];
        ['jpg', 'jpeg', 'png', 'webp'].forEach(ext => tryFiles.push(path.join(baseDir, `${id}.${ext}`)));
        try {
            const s = await this.students.findOne(id);
            const code = (s?.studentId || '').trim();
            if (code)
                ['jpg', 'jpeg', 'png', 'webp'].forEach(ext => tryFiles.push(path.join(baseDir, `${code}.${ext}`)));
        }
        catch { }
        const found = tryFiles.find(p => fs.existsSync(p));
        if (!found)
            throw new common_1.NotFoundException('Photo not found');
        const ext = (found.split('.').pop() || 'jpg').toLowerCase();
        const mime = ext === 'png' ? 'image/png' : (ext === 'webp' ? 'image/webp' : 'image/jpeg');
        res.setHeader('Content-Type', mime);
        res.setHeader('Cache-Control', 'no-store');
        fs.createReadStream(found).pipe(res);
    }
    findOne(id) {
        return this.students.findByIdOrCode(id);
    }
    findByStudentId(studentId) {
        return this.students.findByStudentId(studentId);
    }
    update(id, partial) {
        return this.students.update(id, partial);
    }
    remove(id) {
        return this.students.remove(id);
    }
    backfill() {
        return this.students.backfillStudentIds();
    }
    async uploadPhoto(id, file) {
        if (!file || !file.buffer?.length)
            throw new common_1.BadRequestException('No file uploaded');
        const ext = (() => {
            const mt = (file.mimetype || '').toLowerCase();
            if (mt.includes('png'))
                return 'png';
            if (mt.includes('webp'))
                return 'webp';
            if (mt.includes('jpeg') || mt.includes('jpg'))
                return 'jpg';
            return 'jpg';
        })();
        const baseDir = path.join(process.cwd(), 'assets', 'photos');
        fs.mkdirSync(baseDir, { recursive: true });
        const targetUuid = path.join(baseDir, `${id}.${ext}`);
        fs.writeFileSync(targetUuid, file.buffer);
        try {
            const s = await this.students.findOne(id);
            if (s?.studentId) {
                const targetSid = path.join(baseDir, `${s.studentId}.${ext}`);
                fs.writeFileSync(targetSid, file.buffer);
            }
        }
        catch { }
        return { success: true };
    }
};
exports.StudentsController = StudentsController;
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'teacher'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_student_dto_1.CreateStudentDto]),
    __metadata("design:returntype", void 0)
], StudentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page', new common_1.ParseIntPipe({ optional: true }))),
    __param(1, (0, common_1.Query)('limit', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], StudentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id/photo'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StudentsController.prototype, "getPhoto", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StudentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('byStudentId/:studentId'),
    __param(0, (0, common_1.Param)('studentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StudentsController.prototype, "findByStudentId", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'teacher'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], StudentsController.prototype, "update", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StudentsController.prototype, "remove", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Post)('backfillStudentIds'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StudentsController.prototype, "backfill", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Post)(':id/photo'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StudentsController.prototype, "uploadPhoto", null);
exports.StudentsController = StudentsController = __decorate([
    (0, common_1.Controller)('students'),
    __metadata("design:paramtypes", [students_service_1.StudentsService])
], StudentsController);
//# sourceMappingURL=students.controller.js.map