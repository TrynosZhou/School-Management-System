"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParentsController = void 0;
const common_1 = require("@nestjs/common");
const parents_service_1 = require("./parents.service");
const bearer_guard_1 = require("../auth/bearer.guard");
const email_service_1 = require("../email/email.service");
const jwt_1 = require("@nestjs/jwt");
let ParentsController = class ParentsController {
    parents;
    email;
    jwt;
    constructor(parents, email, jwt) {
        this.parents = parents;
        this.email = email;
        this.jwt = jwt;
    }
    async link(req, body) {
        const uid = req.user?.sub;
        const role = (req.user?.role || '').toLowerCase();
        if (role !== 'parent')
            throw new common_1.ForbiddenException('Parents only');
        const code = String(body.studentIdOrCode || '').trim();
        const lastName = String(body.lastName || '').trim();
        const dob = body?.dob ? String(body.dob).trim().replace(/\//g, '-') : undefined;
        if (!code || !lastName)
            throw new common_1.ForbiddenException('StudentID and last name are required');
        return this.parents.linkStudent(uid, code, dob, lastName);
    }
    async myStudents(req) {
        const role = (req.user?.role || '').toLowerCase();
        if (role !== 'parent')
            throw new common_1.ForbiddenException('Parents only');
        const uid = req.user?.sub;
        return this.parents.myStudents(uid);
    }
    async unlink(req, studentId) {
        const role = (req.user?.role || '').toLowerCase();
        if (role !== 'parent')
            throw new common_1.ForbiddenException('Parents only');
        const uid = req.user?.sub;
        return this.parents.unlink(uid, studentId);
    }
    async unlinkDeleteBody(req, body) {
        const role = (req.user?.role || '').toLowerCase();
        if (role !== 'parent')
            throw new common_1.ForbiddenException('Parents only');
        const uid = req.user?.sub;
        const idOrCode = (body?.studentId || body?.studentIdOrCode || '').toString().trim();
        return this.parents.unlink(uid, idOrCode);
    }
    async unlinkPost(req, body) {
        const role = (req.user?.role || '').toLowerCase();
        if (role !== 'parent')
            throw new common_1.ForbiddenException('Parents only');
        const uid = req.user?.sub;
        const idOrCode = (body?.studentId || body?.studentIdOrCode || '').toString().trim();
        return this.parents.unlink(uid, idOrCode);
    }
    async softDelete(req, body) {
        const role = (req.user?.role || '').toLowerCase();
        if (role !== 'parent')
            throw new common_1.ForbiddenException('Parents only');
        const uid = req.user?.sub;
        const idOrCode = (body?.studentId || body?.studentIdOrCode || '').toString().trim();
        return this.parents.softDeleteStudent(uid, idOrCode);
    }
    async redeem(req, body) {
        const uid = req.user?.sub;
        if ((req.user?.role || '').toLowerCase() !== 'parent')
            throw new common_1.ForbiddenException('Parents only');
        return this.parents.redeemInvite(uid, body.code);
    }
    async createInvite(req, body) {
        if ((req.user?.role || '').toLowerCase() !== 'admin')
            throw new common_1.ForbiddenException('Admins only');
        return this.parents.createInvite(body.studentId, body.expiresAt);
    }
    async listLinked(req, studentId) {
        if ((req.user?.role || '').toLowerCase() !== 'admin')
            throw new common_1.ForbiddenException('Admins only');
        if (!studentId)
            return [];
        return this.parents.listLinkedParents(studentId);
    }
    async adminParentsWithLinks(req) {
        if ((req.user?.role || '').toLowerCase() !== 'admin')
            throw new common_1.ForbiddenException('Admins only');
        return this.parents.adminParentsWithLinks();
    }
    async adminParentsAll(req) {
        if ((req.user?.role || '').toLowerCase() !== 'admin')
            throw new common_1.ForbiddenException('Admins only');
        return this.parents.adminParentsAllFlat();
    }
    async adminLink(req, body) {
        throw new common_1.ForbiddenException('Only parents can link students');
    }
    async adminUnlink(req, body) {
        if ((req.user?.role || '').toLowerCase() !== 'admin')
            throw new common_1.ForbiddenException('Admins only');
        const parentId = String(body?.parentId || '');
        const studentId = String(body?.studentId || '');
        return this.parents.adminUnlink(parentId, studentId);
    }
    async adminDeleteParent(req, body) {
        if ((req.user?.role || '').toLowerCase() !== 'admin')
            throw new common_1.ForbiddenException('Admins only');
        const parentId = String(body?.parentId || '');
        return this.parents.adminDeleteParent(parentId);
    }
    async migrateLinks(req) {
        if ((req.user?.role || '').toLowerCase() !== 'admin')
            throw new common_1.ForbiddenException('Admins only');
        return this.parents.migrateParentLinks();
    }
    async bulkEmail(req, body) {
        if ((req.user?.role || '').toLowerCase() !== 'admin')
            throw new common_1.ForbiddenException('Admins only');
        const subject = (body.subject || '').trim();
        const html = (body.html || '').trim();
        if (!subject || !html)
            throw new common_1.ForbiddenException('Subject and message are required');
        const recipients = Array.isArray(body.studentIds) && body.studentIds.length
            ? await this.parents.parentEmailsForStudents(body.studentIds)
            : await this.parents.parentEmailsAll();
        if (!recipients.length)
            return { ok: false, message: 'No parent emails found' };
        const batchSize = 50;
        const delayMs = 400;
        const chunks = [];
        for (let i = 0; i < recipients.length; i += batchSize)
            chunks.push(recipients.slice(i, i + batchSize));
        for (let i = 0; i < chunks.length; i++) {
            await this.email.send(chunks[i], subject, html);
            if (i < chunks.length - 1)
                await new Promise(r => setTimeout(r, delayMs));
        }
        return { ok: true, sent: recipients.length, batches: chunks.length };
    }
    async events(token, res) {
        try {
            const payload = await this.jwt.verifyAsync(String(token || ''));
            const role = (payload?.role || '').toLowerCase();
            if (!(role === 'parent' || role === 'admin'))
                throw new common_1.ForbiddenException('Forbidden');
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders?.();
            const write = (data) => {
                try {
                    res.write(`data: ${JSON.stringify(data)}\n\n`);
                }
                catch { }
            };
            write({ type: 'hello', role, at: Date.now() });
            const hb = setInterval(() => write({ type: 'heartbeat', at: Date.now() }), 25000);
            const off = this.parents.onChange((payload) => write(payload));
            reqOnClose(res, () => { try {
                clearInterval(hb);
            }
            catch { } ; try {
                off();
            }
            catch { } ; try {
                res.end();
            }
            catch { } });
        }
        catch {
            try {
                res.status(401).end();
            }
            catch { }
        }
    }
};
exports.ParentsController = ParentsController;
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Post)('link-student'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ParentsController.prototype, "link", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('my-students'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ParentsController.prototype, "myStudents", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Delete)('unlink/:studentId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('studentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ParentsController.prototype, "unlink", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Delete)('unlink'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ParentsController.prototype, "unlinkDeleteBody", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Post)('unlink'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ParentsController.prototype, "unlinkPost", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Post)('soft-delete'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ParentsController.prototype, "softDelete", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Post)('redeem'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ParentsController.prototype, "redeem", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Post)('admin/create-invite'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ParentsController.prototype, "createInvite", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('admin/linked'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('studentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ParentsController.prototype, "listLinked", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('admin/parents-with-links'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ParentsController.prototype, "adminParentsWithLinks", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('admin/parents-all'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ParentsController.prototype, "adminParentsAll", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Post)('admin/link'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ParentsController.prototype, "adminLink", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Post)('admin/unlink'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ParentsController.prototype, "adminUnlink", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Post)('admin/delete-parent'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ParentsController.prototype, "adminDeleteParent", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Post)('admin/migrate-links'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ParentsController.prototype, "migrateLinks", null);
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Post)('admin/bulk-email'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ParentsController.prototype, "bulkEmail", null);
__decorate([
    (0, common_1.Get)('events'),
    __param(0, (0, common_1.Query)('token')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ParentsController.prototype, "events", null);
exports.ParentsController = ParentsController = __decorate([
    (0, common_1.Controller)('parents'),
    __metadata("design:paramtypes", [parents_service_1.ParentsService, email_service_1.EmailService, jwt_1.JwtService])
], ParentsController);
function reqOnClose(res, cb) {
    const done = () => { try {
        cb();
    }
    catch { } };
    res.on?.('close', done);
    res.on?.('finish', done);
}
//# sourceMappingURL=parents.controller.js.map