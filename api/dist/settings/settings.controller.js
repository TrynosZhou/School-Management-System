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
exports.SettingsController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const settings_entity_1 = require("./settings.entity");
const user_entity_1 = require("../entities/user.entity");
const bearer_guard_1 = require("../auth/bearer.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const platform_express_1 = require("@nestjs/platform-express");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let SettingsController = class SettingsController {
    repo;
    users;
    constructor(repo, users) {
        this.repo = repo;
        this.users = users;
    }
    async get() {
        let s = await this.repo.findOne({ where: { id: 'global' } });
        if (!s) {
            s = this.repo.create({ id: 'global' });
            await this.repo.save(s);
        }
        return s;
    }
    async update(body) {
        let s = await this.repo.findOne({ where: { id: 'global' } });
        if (!s)
            s = this.repo.create({ id: 'global' });
        Object.assign(s, body);
        await this.repo.save(s);
        return s;
    }
    async uploadLogo(file) {
        if (!file || !file.buffer)
            return { success: false, message: 'No file uploaded' };
        const assetsDir = path.join(process.cwd(), 'assets');
        if (!fs.existsSync(assetsDir))
            fs.mkdirSync(assetsDir, { recursive: true });
        const ext = (file.originalname.split('.').pop() || 'png').toLowerCase();
        const filename = `logo-${Date.now()}.${ext}`;
        const target = path.join(assetsDir, filename);
        fs.writeFileSync(target, file.buffer);
        let s = await this.repo.findOne({ where: { id: 'global' } });
        if (!s)
            s = this.repo.create({ id: 'global' });
        s.logoUrl = path.join('assets', filename).replace(/\\/g, '/');
        await this.repo.save(s);
        return { success: true, logoUrl: s.logoUrl };
    }
    allModules() {
        return [
            { key: 'students', label: 'Students' },
            { key: 'teachers', label: 'Teachers' },
            { key: 'classes', label: 'Classes' },
            { key: 'subjects', label: 'Subjects' },
            { key: 'enrollments', label: 'Enrollments' },
            { key: 'marks', label: 'Marks' },
            { key: 'reports', label: 'Reports' },
            { key: 'fees', label: 'Fees' },
            { key: 'accounts', label: 'Accounts' },
            { key: 'attendance', label: 'Attendance' },
            { key: 'settings', label: 'Settings' },
            { key: 'teaching', label: 'Teaching Assignments' },
        ];
    }
    listModules() {
        return this.allModules();
    }
    async getUserModules(email) {
        if (!email)
            throw new common_1.ForbiddenException('email is required');
        const user = await this.users.findOne({ where: { email } });
        if (!user)
            return { email, modules: [] };
        let modules = [];
        try {
            modules = user.modulesJson ? JSON.parse(user.modulesJson) : [];
        }
        catch {
            modules = [];
        }
        return { email, modules };
    }
    async setUserModules(body) {
        const email = body?.email?.trim();
        if (!email)
            throw new common_1.ForbiddenException('email is required');
        const modules = Array.isArray(body?.modules) ? body.modules.filter(Boolean) : [];
        let user = await this.users.findOne({ where: { email } });
        if (!user)
            throw new common_1.ForbiddenException('User not found');
        user.modulesJson = JSON.stringify(modules);
        await this.users.save(user);
        return { success: true };
    }
};
exports.SettingsController = SettingsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "get", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Patch)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "update", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Post)('logo'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "uploadLogo", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('modules-list'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "listModules", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('user-modules'),
    __param(0, (0, common_1.Query)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getUserModules", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Patch)('user-modules'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "setUserModules", null);
exports.SettingsController = SettingsController = __decorate([
    (0, common_1.Controller)('settings'),
    __param(0, (0, typeorm_1.InjectRepository)(settings_entity_1.Settings)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], SettingsController);
//# sourceMappingURL=settings.controller.js.map