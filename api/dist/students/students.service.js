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
exports.StudentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const student_entity_1 = require("../entities/student.entity");
const fee_invoice_entity_1 = require("../accounts/fee-invoice.entity");
const fee_transaction_entity_1 = require("../accounts/fee-transaction.entity");
const student_account_entity_1 = require("../accounts/student-account.entity");
const account_settings_entity_1 = require("../accounts/account-settings.entity");
const settings_entity_1 = require("../settings/settings.entity");
let StudentsService = class StudentsService {
    repo;
    invoices;
    tx;
    accounts;
    accSettings;
    settings;
    constructor(repo, invoices, tx, accounts, accSettings, settings) {
        this.repo = repo;
        this.invoices = invoices;
        this.tx = tx;
        this.accounts = accounts;
        this.accSettings = accSettings;
        this.settings = settings;
    }
    async create(dto) {
        if (dto.email) {
            const exists = await this.repo.findOne({ where: { email: dto.email } });
            if (exists)
                throw new common_1.BadRequestException('Email already exists');
        }
        const s = this.repo.create(dto);
        if (!s.studentId) {
            let prefix = 'JHS';
            try {
                const set = await this.settings.findOne({ where: { id: 'global' } });
                const configured = String(set?.studentIdPrefix || '').trim();
                if (configured)
                    prefix = configured.toUpperCase();
            }
            catch { }
            let uniqueId = '';
            do {
                const n = Math.floor(1000000 + Math.random() * 9000000);
                uniqueId = `${prefix}${n}`;
            } while (await this.repo.findOne({ where: { studentId: uniqueId } }));
            s.studentId = uniqueId;
        }
        const saved = await this.repo.save(s);
        try {
            const acc = await this.accSettings.findOne({ where: { id: 'global' } });
            const term = acc?.currentTerm || 'Term 1';
            const year = acc?.academicYear || '';
            let termAdded = 0;
            let acctForStudent = await this.accounts.findOne({ where: { student: { id: saved.id } } });
            if (!acctForStudent) {
                acctForStudent = this.accounts.create({ student: saved, balance: '0' });
                acctForStudent = await this.accounts.save(acctForStudent);
            }
            const existingCredit = Math.max(0, 0 - parseFloat(String(acctForStudent.balance || '0')));
            try {
                if (!dto.isStaffChild) {
                    let base = 0;
                    if (dto.boardingStatus === 'boarder') {
                        base = parseFloat(String(acc?.boarderFeeAmount || '0')) || 0;
                    }
                    else {
                        base = parseFloat(String(acc?.dayFeeAmount || '0')) || 0;
                    }
                    if (base > 0) {
                        const existingForTerm = await this.invoices.find({ where: { student: { id: saved.id }, term, academicYear: year } });
                        const hasAggregated = existingForTerm.some(i => ((i.description || '').toLowerCase().includes('aggregated')));
                        if (!hasAggregated) {
                            const amountAgg = base.toFixed(2);
                            const invAgg = this.invoices.create({ student: saved, term, academicYear: year, amount: amountAgg, description: `${term} fees (aggregated)`, status: 'unpaid' });
                            await this.invoices.save(invAgg);
                            const trxAgg = this.tx.create({ student: saved, type: 'invoice', amount: amountAgg, term, academicYear: year, note: invAgg.description || undefined });
                            await this.tx.save(trxAgg);
                            let accRec = await this.accounts.findOne({ where: { student: { id: saved.id } } });
                            if (!accRec) {
                                accRec = this.accounts.create({ student: saved, balance: '0' });
                                accRec = await this.accounts.save(accRec);
                            }
                            accRec.balance = (parseFloat(accRec.balance) + parseFloat(amountAgg)).toFixed(2);
                            await this.accounts.save(accRec);
                            termAdded += parseFloat(amountAgg) || 0;
                        }
                    }
                }
            }
            catch { }
            const wantsMeals = !!dto.takesMeals;
            if (wantsMeals && dto.boardingStatus === 'day') {
                let dh = '0';
                try {
                    const set = await this.settings.findOne({ where: { id: 'global' } });
                    dh = String(set?.dhFee || '0');
                }
                catch { }
                const base = parseFloat(dh) || 0;
                if (base > 0) {
                    const isStaff = !!dto.isStaffChild;
                    const amount = (isStaff ? base * 0.5 : base).toFixed(2);
                    const exists = await this.invoices.findOne({ where: { student: { id: saved.id }, term, academicYear: year, description: 'Dining Hall fee' } });
                    if (!exists) {
                        const inv = this.invoices.create({ student: saved, term, academicYear: year, amount: amount, description: 'Dining Hall fee', status: 'unpaid' });
                        await this.invoices.save(inv);
                        const trx = this.tx.create({ student: saved, type: 'invoice', amount: amount, term, academicYear: year, note: inv.description || undefined });
                        await this.tx.save(trx);
                        let accRec = await this.accounts.findOne({ where: { student: { id: saved.id } } });
                        if (!accRec) {
                            accRec = this.accounts.create({ student: saved, balance: '0' });
                            accRec = await this.accounts.save(accRec);
                        }
                        accRec.balance = (parseFloat(accRec.balance) + parseFloat(amount)).toFixed(2);
                        await this.accounts.save(accRec);
                        termAdded += parseFloat(amount) || 0;
                    }
                }
            }
            const wantsTransport = !!dto.takesTransport;
            if (wantsTransport && (dto.boardingStatus === 'day') && !dto.isStaffChild) {
                let tf = '0';
                try {
                    const set = await this.settings.findOne({ where: { id: 'global' } });
                    tf = String(set?.transportFee || '0');
                }
                catch { }
                const baseT = parseFloat(tf) || 0;
                if (baseT > 0) {
                    const amountT = baseT.toFixed(2);
                    const existsT = await this.invoices.findOne({ where: { student: { id: saved.id }, term, academicYear: year, description: 'Transport fee' } });
                    if (!existsT) {
                        const invT = this.invoices.create({ student: saved, term, academicYear: year, amount: amountT, description: 'Transport fee', status: 'unpaid' });
                        await this.invoices.save(invT);
                        const trxT = this.tx.create({ student: saved, type: 'invoice', amount: amountT, term, academicYear: year, note: invT.description || undefined });
                        await this.tx.save(trxT);
                        let accRec = await this.accounts.findOne({ where: { student: { id: saved.id } } });
                        if (!accRec) {
                            accRec = this.accounts.create({ student: saved, balance: '0' });
                            accRec = await this.accounts.save(accRec);
                        }
                        accRec.balance = (parseFloat(accRec.balance) + parseFloat(amountT)).toFixed(2);
                        await this.accounts.save(accRec);
                        termAdded += parseFloat(amountT) || 0;
                    }
                }
            }
            try {
                if (!dto.isStaffChild) {
                    let desk = '0';
                    try {
                        const set = await this.settings.findOne({ where: { id: 'global' } });
                        desk = String(set?.deskFee || '0');
                    }
                    catch { }
                    const deskAmt = parseFloat(desk) || 0;
                    if (deskAmt > 0) {
                        const existsDesk = await this.invoices.findOne({ where: { student: { id: saved.id }, description: 'Desk fee' } });
                        const alreadyChargedDesk = !!existsDesk && (parseFloat(String(existsDesk.amount)) > 0);
                        if (!alreadyChargedDesk) {
                            const amountDesk = deskAmt.toFixed(2);
                            const invDesk = this.invoices.create({ student: saved, term, academicYear: year, amount: amountDesk, description: 'Desk fee', status: 'unpaid' });
                            await this.invoices.save(invDesk);
                            const trxDesk = this.tx.create({ student: saved, type: 'invoice', amount: amountDesk, term, academicYear: year, note: invDesk.description || undefined });
                            await this.tx.save(trxDesk);
                            let accRec = await this.accounts.findOne({ where: { student: { id: saved.id } } });
                            if (!accRec) {
                                accRec = this.accounts.create({ student: saved, balance: '0' });
                                accRec = await this.accounts.save(accRec);
                            }
                            accRec.balance = (parseFloat(accRec.balance) + parseFloat(amountDesk)).toFixed(2);
                            await this.accounts.save(accRec);
                            termAdded += parseFloat(amountDesk) || 0;
                        }
                    }
                }
            }
            catch { }
            try {
                if (existingCredit > 0 && termAdded > 0) {
                    const apply = Math.min(existingCredit, termAdded);
                    if (apply > 0) {
                        const adj = this.tx.create({ student: saved, type: 'adjustment', amount: String(-apply), term, academicYear: year, note: 'Apply prepaid to current term (on registration)' });
                        await this.tx.save(adj);
                        let accRec = await this.accounts.findOne({ where: { student: { id: saved.id } } });
                        if (!accRec) {
                            accRec = this.accounts.create({ student: saved, balance: '0' });
                            accRec = await this.accounts.save(accRec);
                        }
                        accRec.balance = (parseFloat(accRec.balance) - apply).toFixed(2);
                        await this.accounts.save(accRec);
                    }
                }
            }
            catch { }
        }
        catch { }
        return saved;
    }
    async findAll(page = 1, limit = 20) {
        const [data, total] = await this.repo.findAndCount({
            order: { lastName: 'ASC', firstName: 'ASC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, total, page, limit };
    }
    async findOne(id) {
        const s = await this.repo.findOne({ where: { id } });
        if (!s)
            throw new common_1.NotFoundException('Student not found');
        return s;
    }
    async findByIdOrCode(idOrCode) {
        const term = String(idOrCode || '').trim();
        if (!term)
            throw new common_1.NotFoundException('Student not found');
        let s = await this.repo.findOne({ where: { id: term } });
        if (!s) {
            s = await this.repo.findOne({ where: { studentId: term } });
        }
        if (!s)
            throw new common_1.NotFoundException('Student not found');
        return s;
    }
    async findByStudentId(studentId) {
        const s = await this.repo.findOne({ where: { studentId } });
        if (!s)
            throw new common_1.NotFoundException('Student not found');
        return s;
    }
    async update(id, partial) {
        const s = await this.findOne(id);
        if (partial.email && partial.email !== s.email) {
            const exists = await this.repo.findOne({ where: { email: partial.email } });
            if (exists)
                throw new common_1.BadRequestException('Email already exists');
        }
        Object.assign(s, partial);
        return this.repo.save(s);
    }
    async remove(id) {
        const res = await this.repo.delete(id);
        if (res.affected === 0)
            throw new common_1.NotFoundException('Student not found');
    }
    async backfillStudentIds() {
        let prefix = 'JHS';
        try {
            const set = await this.settings.findOne({ where: { id: 'global' } });
            const configured = String(set?.studentIdPrefix || '').trim();
            if (configured)
                prefix = configured.toUpperCase();
        }
        catch { }
        const missing = await this.repo.find({ where: { studentId: null }, order: { createdAt: 'ASC' } });
        let updated = 0;
        let start;
        let end;
        for (const s of missing) {
            let candidate = '';
            do {
                const n = Math.floor(1000000 + Math.random() * 9000000);
                candidate = `${prefix}${n}`;
            } while (await this.repo.findOne({ where: { studentId: candidate } }));
            s.studentId = candidate;
            await this.repo.save(s);
            updated += 1;
            if (!start)
                start = s.studentId;
            end = s.studentId;
        }
        return { updated, start, end };
    }
};
exports.StudentsService = StudentsService;
exports.StudentsService = StudentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(student_entity_1.Student)),
    __param(1, (0, typeorm_1.InjectRepository)(fee_invoice_entity_1.FeeInvoice)),
    __param(2, (0, typeorm_1.InjectRepository)(fee_transaction_entity_1.FeeTransaction)),
    __param(3, (0, typeorm_1.InjectRepository)(student_account_entity_1.StudentAccount)),
    __param(4, (0, typeorm_1.InjectRepository)(account_settings_entity_1.AccountSettings)),
    __param(5, (0, typeorm_1.InjectRepository)(settings_entity_1.Settings)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], StudentsService);
//# sourceMappingURL=students.service.js.map