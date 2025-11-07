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
exports.IdCardsController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const student_entity_1 = require("../entities/student.entity");
const enrollment_entity_1 = require("../entities/enrollment.entity");
const settings_entity_1 = require("../settings/settings.entity");
const account_settings_entity_1 = require("../accounts/account-settings.entity");
const PDFDocument = require("pdfkit");
const pdf_lib_1 = require("pdf-lib");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const bearer_guard_1 = require("../auth/bearer.guard");
let IdCardsController = class IdCardsController {
    students;
    enrollRepo;
    settingsRepo;
    accountSettingsRepo;
    constructor(students, enrollRepo, settingsRepo, accountSettingsRepo) {
        this.students = students;
        this.enrollRepo = enrollRepo;
        this.settingsRepo = settingsRepo;
        this.accountSettingsRepo = accountSettingsRepo;
    }
    async byClass(classId, res) {
        if (!classId) {
            res.status(400).json({ message: 'classId is required' });
            return;
        }
        const enrolls = await this.enrollRepo.find({ where: { classEntity: { id: classId }, status: 'active' }, relations: { student: true } });
        const students = Array.from(new Map((enrolls || []).map(e => [e.student.id, e.student])).values())
            .sort((a, b) => {
            const aid = (a.studentId || a.id).toString();
            const bid = (b.studentId || b.id).toString();
            const idCmp = aid.localeCompare(bid, undefined, { numeric: true, sensitivity: 'base' });
            if (idCmp !== 0)
                return idCmp;
            return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
        });
        const buildCard = async (s) => {
            return await new Promise(async (resolve) => {
                const d = new PDFDocument({ size: [320, 200], margin: 10 });
                const chunks = [];
                d.on('data', (c) => chunks.push(c));
                d.on('end', () => resolve(Buffer.concat(chunks)));
                try {
                    const enr = await this.enrollRepo.find({ where: { student: { id: s.id }, status: 'active' }, order: { createdAt: 'DESC' } });
                    const klass = enr[0]?.classEntity;
                    const classDisplay = klass ? `${klass.name}` : '-';
                    d.roundedRect(5, 5, d.page.width - 10, d.page.height - 10, 8).stroke('#cbd5e1');
                    const bannerH2 = 28;
                    d.save();
                    d.rect(5, 5, d.page.width - 10, bannerH2).fill('#0b3d91');
                    d.restore();
                    d.font('Helvetica-Bold').fontSize(13).fillColor('#ffffff').text('Student ID Card', 5, 10, { align: 'center', width: d.page.width - 10 });
                    try {
                        const settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
                        const logoPath = settings?.logoUrl && !settings.logoUrl.startsWith('http') ? (path.isAbsolute(settings.logoUrl) ? settings.logoUrl : path.join(process.cwd(), settings.logoUrl)) : (settings?.logoUrl && settings.logoUrl.startsWith('http') ? settings.logoUrl : null);
                        if (logoPath) {
                            try {
                                d.image(logoPath, 12, 8, { width: 20, height: 20, fit: [20, 20] });
                            }
                            catch { }
                        }
                    }
                    catch { }
                    const leftX = 12;
                    const topY = 40;
                    const photoW = 80, photoH = 100;
                    const assetsDir = path.join(process.cwd(), 'assets', 'photos');
                    const sidForPhoto = (s.studentId || s.id).toString();
                    const candidates = ['jpg', 'jpeg', 'png', 'webp'].flatMap(ext => [path.join(assetsDir, `${sidForPhoto}.${ext}`), path.join(assetsDir, `${s.id}.${ext}`)]);
                    let photoPath = null;
                    try {
                        for (const p of candidates) {
                            if (fs.existsSync(p)) {
                                photoPath = p;
                                break;
                            }
                        }
                    }
                    catch { }
                    if (photoPath) {
                        try {
                            d.image(photoPath, leftX, topY, { width: photoW, height: photoH, fit: [photoW, photoH] });
                        }
                        catch { }
                    }
                    const rightX = leftX + 100;
                    const contentW = d.page.width - rightX - 12;
                    let y = topY;
                    const sLabelW = 70;
                    const sValueW = Math.max(60, contentW - sLabelW - 6);
                    const darkBlue = '#0b3d91';
                    const fullName = `${s.firstName} ${s.lastName}`.trim();
                    d.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('Name :', rightX, y, { width: sLabelW, ellipsis: true });
                    let nameFontSize = 12;
                    while (nameFontSize > 8) {
                        d.font('Helvetica-Bold').fontSize(nameFontSize);
                        const w = d.widthOfString(fullName);
                        if (w <= sValueW)
                            break;
                        nameFontSize -= 1;
                    }
                    d.fillColor(darkBlue).font('Helvetica-Bold').fontSize(nameFontSize).text(fullName, rightX + sLabelW + 4, y - 2, { width: sValueW, ellipsis: true });
                    y += 22;
                    d.save();
                    d.strokeColor('#e5e7eb').lineWidth(0.6).moveTo(rightX, y).lineTo(rightX + sLabelW + sValueW + 4, y).stroke();
                    d.restore();
                    d.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('Student ID :', rightX, y + 6, { width: sLabelW, ellipsis: true });
                    d.fillColor(darkBlue).font('Helvetica-Bold').fontSize(10).text(`${s.studentId || s.id}`, rightX + sLabelW + 4, y + 4, { width: sValueW, ellipsis: true });
                    y += 22;
                    d.save();
                    d.strokeColor('#e5e7eb').lineWidth(0.6).moveTo(rightX, y).lineTo(rightX + sLabelW + sValueW + 4, y).stroke();
                    d.restore();
                    d.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('D.O.B :', rightX, y + 6, { width: sLabelW, ellipsis: true });
                    d.fillColor(darkBlue).font('Helvetica-Bold').fontSize(10).text(s.dob ? String(s.dob) : '-', rightX + sLabelW + 4, y + 4, { width: sValueW, ellipsis: true });
                    y += 22;
                    d.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('Class :', rightX, y + 6, { width: sLabelW, ellipsis: true });
                    d.fillColor(darkBlue).font('Helvetica-Bold').fontSize(10).text(classDisplay, rightX + sLabelW + 4, y + 4, { width: sValueW, ellipsis: true });
                    y += 22;
                    d.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('Address :', rightX, y + 6, { width: sLabelW, ellipsis: true });
                    d.fillColor(darkBlue).font('Helvetica-Bold').fontSize(10).text(s.address || '-', rightX + sLabelW + 4, y + 4, { width: sValueW, ellipsis: true });
                    y += 28;
                    d.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('Year :', rightX, y + 6, { width: sLabelW, ellipsis: true });
                    const fallbackYear = (await this.accountSettingsRepo.findOne({ where: { id: 'global' } }))?.academicYear || String(new Date().getFullYear());
                    d.fillColor(darkBlue).font('Helvetica-Bold').fontSize(10).text(klass?.academicYear || fallbackYear, rightX + sLabelW + 4, y + 4, { width: sValueW, ellipsis: true });
                }
                catch { }
                try {
                    d.end();
                }
                catch { }
            });
        };
        const merged = await pdf_lib_1.PDFDocument.create();
        for (const s of students) {
            try {
                const buf = await buildCard(s);
                const src = await pdf_lib_1.PDFDocument.load(buf);
                const pages = await merged.copyPages(src, src.getPageIndices());
                pages.forEach(p => merged.addPage(p));
            }
            catch { }
        }
        const out = await merged.save();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="student-ids-by-class.pdf"');
        res.end(Buffer.from(out));
    }
};
exports.IdCardsController = IdCardsController;
__decorate([
    (0, common_1.UseGuards)(bearer_guard_1.BearerGuard),
    (0, common_1.Get)('student-id-cards/by-class'),
    __param(0, (0, common_1.Query)('classId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], IdCardsController.prototype, "byClass", null);
exports.IdCardsController = IdCardsController = __decorate([
    (0, common_1.Controller)('reports'),
    __param(0, (0, typeorm_1.InjectRepository)(student_entity_1.Student)),
    __param(1, (0, typeorm_1.InjectRepository)(enrollment_entity_1.Enrollment)),
    __param(2, (0, typeorm_1.InjectRepository)(settings_entity_1.Settings)),
    __param(3, (0, typeorm_1.InjectRepository)(account_settings_entity_1.AccountSettings)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], IdCardsController);
//# sourceMappingURL=idcards.controller.js.map