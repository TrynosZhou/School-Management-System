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
exports.ElearningController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const elearning_service_1 = require("./elearning.service");
let ElearningController = class ElearningController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    studentSignup(body) { return this.svc.signup('student', body); }
    studentLogin(body) { return this.svc.login('student', body); }
    teacherSignup(body) { return this.svc.signup('teacher', body); }
    teacherLogin(body) { return this.svc.login('teacher', body); }
    uploadResource(file, body) {
        if (!file)
            throw new common_1.BadRequestException('No file uploaded');
        try {
            return this.svc.uploadResource(file, body);
        }
        catch (e) {
            console.error('uploadResource error', e);
            throw e;
        }
    }
    listResources(role, classRef, now) {
        const nowNum = now ? Number(now) : Date.now();
        return this.svc.listResources({ role, classRef, now: Number.isFinite(nowNum) ? nowNum : Date.now() });
    }
    submitResource(id, file, body) {
        if (!file)
            throw new common_1.BadRequestException('No file uploaded');
        const isPdf = (file?.mimetype || '').toLowerCase().includes('pdf') || (file?.originalname || '').toLowerCase().endsWith('.pdf');
        if (!isPdf)
            throw new common_1.BadRequestException('Only PDF submissions are allowed');
        try {
            return this.svc.submitResource(id, file, body);
        }
        catch (e) {
            console.error('submitResource error', e);
            throw e;
        }
    }
    listSubmissions(role, classRef) {
        return this.svc.listSubmissions({ role, classRef });
    }
    listTests() { return this.svc.listTests(); }
    getTest(id) { return this.svc.getTest(id); }
    submitTest(id, body) { return this.svc.submitTest(id, body?.answers || {}); }
    removeTest(id) { return this.svc.removeTest(id); }
    generateAiTest(body) {
        return this.svc.generateAiTest({
            subject: body?.subject || 'General',
            classRef: body?.classRef || '',
            syllabusCode: body?.syllabusCode || '',
            total: Number(body?.total) || 75,
            jobId: typeof body?.jobId === 'string' ? body.jobId : undefined,
        });
    }
    mark(file) {
        if (!file)
            throw new common_1.BadRequestException('No file uploaded');
        return this.svc.markPaper(file);
    }
    async buildBank(body, files) {
        const syllabusCode = (body?.syllabusCode || '').trim();
        if (!syllabusCode)
            throw new common_1.BadRequestException('syllabusCode is required');
        return this.svc.buildBank({ syllabusCode, subject: body?.subject || '', classRef: body?.classRef || '', jobId: typeof body?.jobId === 'string' ? body.jobId : undefined, heuristicOnly: !!body?.heuristicOnly }, files || []);
    }
    getProgress(id) {
        return this.svc.getProgress(id);
    }
    checkConfig() {
        return this.svc.checkAiConfig();
    }
    async selfTest() {
        return this.svc.selfTest();
    }
};
exports.ElearningController = ElearningController;
__decorate([
    (0, common_1.Post)('student/signup'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ElearningController.prototype, "studentSignup", null);
__decorate([
    (0, common_1.Post)('student/login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ElearningController.prototype, "studentLogin", null);
__decorate([
    (0, common_1.Post)('teacher/signup'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ElearningController.prototype, "teacherSignup", null);
__decorate([
    (0, common_1.Post)('teacher/login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ElearningController.prototype, "teacherLogin", null);
__decorate([
    (0, common_1.Post)('resources'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                const dir = path.join(process.cwd(), 'uploads', 'resources');
                try {
                    if (!fs.existsSync(dir))
                        fs.mkdirSync(dir, { recursive: true });
                }
                catch { }
                cb(null, dir);
            },
            filename: (_req, file, cb) => {
                const ext = path.extname(file.originalname);
                const base = path.basename(file.originalname, ext).replace(/[^a-z0-9\-_.]+/gi, '_');
                cb(null, `${Date.now()}_${base}${ext}`);
            }
        })
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ElearningController.prototype, "uploadResource", null);
__decorate([
    (0, common_1.Get)('resources'),
    __param(0, (0, common_1.Query)('role')),
    __param(1, (0, common_1.Query)('classRef')),
    __param(2, (0, common_1.Query)('now')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ElearningController.prototype, "listResources", null);
__decorate([
    (0, common_1.Post)('resources/:id/submissions'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                const dir = path.join(process.cwd(), 'uploads', 'submissions');
                try {
                    if (!fs.existsSync(dir))
                        fs.mkdirSync(dir, { recursive: true });
                }
                catch { }
                cb(null, dir);
            },
            filename: (_req, file, cb) => {
                const ext = path.extname(file.originalname);
                const base = path.basename(file.originalname, ext).replace(/[^a-z0-9\-_.]+/gi, '_');
                cb(null, `${Date.now()}_${base}${ext}`);
            }
        })
    })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], ElearningController.prototype, "submitResource", null);
__decorate([
    (0, common_1.Get)('submissions'),
    __param(0, (0, common_1.Query)('role')),
    __param(1, (0, common_1.Query)('classRef')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ElearningController.prototype, "listSubmissions", null);
__decorate([
    (0, common_1.Get)('tests'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ElearningController.prototype, "listTests", null);
__decorate([
    (0, common_1.Get)('tests/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ElearningController.prototype, "getTest", null);
__decorate([
    (0, common_1.Post)('tests/:id/submit'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ElearningController.prototype, "submitTest", null);
__decorate([
    (0, common_1.Delete)('tests/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ElearningController.prototype, "removeTest", null);
__decorate([
    (0, common_1.Post)('ai/generate-test'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ElearningController.prototype, "generateAiTest", null);
__decorate([
    (0, common_1.Post)('ai/mark'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                const dir = path.join(process.cwd(), 'uploads', 'marking');
                try {
                    if (!fs.existsSync(dir))
                        fs.mkdirSync(dir, { recursive: true });
                }
                catch { }
                cb(null, dir);
            },
            filename: (_req, file, cb) => {
                const ext = path.extname(file.originalname);
                const base = path.basename(file.originalname, ext).replace(/[^a-z0-9\-_.]+/gi, '_');
                cb(null, `${Date.now()}_${base}${ext}`);
            }
        })
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ElearningController.prototype, "mark", null);
__decorate([
    (0, common_1.Post)('ai/build-bank'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 15, {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                const dir = path.join(process.cwd(), 'uploads', 'bank-input');
                try {
                    if (!fs.existsSync(dir))
                        fs.mkdirSync(dir, { recursive: true });
                }
                catch { }
                cb(null, dir);
            },
            filename: (_req, file, cb) => {
                const ext = path.extname(file.originalname);
                const base = path.basename(file.originalname, ext).replace(/[^a-z0-9\-_.]+/gi, '_');
                cb(null, `${Date.now()}_${base}${ext}`);
            }
        })
    })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array]),
    __metadata("design:returntype", Promise)
], ElearningController.prototype, "buildBank", null);
__decorate([
    (0, common_1.Get)('ai/progress/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ElearningController.prototype, "getProgress", null);
__decorate([
    (0, common_1.Get)('ai/check-config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ElearningController.prototype, "checkConfig", null);
__decorate([
    (0, common_1.Get)('ai/self-test'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ElearningController.prototype, "selfTest", null);
exports.ElearningController = ElearningController = __decorate([
    (0, common_1.Controller)('elearning'),
    __metadata("design:paramtypes", [elearning_service_1.ElearningService])
], ElearningController);
//# sourceMappingURL=elearning.controller.js.map