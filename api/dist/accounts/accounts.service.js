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
exports.AccountsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const settings_entity_1 = require("../settings/settings.entity");
const account_settings_entity_1 = require("./account-settings.entity");
const student_account_entity_1 = require("./student-account.entity");
const fee_invoice_entity_1 = require("./fee-invoice.entity");
const fee_transaction_entity_1 = require("./fee-transaction.entity");
const student_entity_1 = require("../entities/student.entity");
const enrollment_entity_1 = require("../entities/enrollment.entity");
let AccountsService = class AccountsService {
    settings;
    accounts;
    invoices;
    tx;
    students;
    enrollments;
    settingsRepo;
    constructor(settings, accounts, invoices, tx, students, enrollments, settingsRepo) {
        this.settings = settings;
        this.accounts = accounts;
        this.invoices = invoices;
        this.tx = tx;
        this.students = students;
        this.enrollments = enrollments;
        this.settingsRepo = settingsRepo;
    }
    async getSettings() {
        let s = await this.settings.findOne({ where: { id: 'global' } });
        if (!s) {
            const created = this.settings.create({ id: 'global', termFeeAmount: '0', dayFeeAmount: '0', boarderFeeAmount: '0' });
            s = await this.settings.save(created);
        }
        let mutated = false;
        if (s.dayFeeAmount == null) {
            s.dayFeeAmount = '0';
            mutated = true;
        }
        if (s.boarderFeeAmount == null) {
            s.boarderFeeAmount = '0';
            mutated = true;
        }
        if (s.receiptSeq == null) {
            s.receiptSeq = 0;
            mutated = true;
        }
        if (mutated) {
            try {
                s = await this.settings.save(s);
            }
            catch { }
        }
        return s;
    }
    async updateSettings(partial) {
        const s = await this.getSettings();
        Object.assign(s, partial);
        return this.settings.save(s);
    }
    async getOrCreateStudentAccount(student) {
        let acc = await this.accounts.findOne({ where: { student: { id: student.id } } });
        if (!acc) {
            acc = this.accounts.create({ student, balance: '0' });
            acc = await this.accounts.save(acc);
        }
        return acc;
    }
    async bulkGenerateInvoices(term, academicYear, amount, description) {
        const s = await this.getSettings();
        const t = term || s.currentTerm || 'Term 1';
        const yr = academicYear || s.academicYear || '';
        const settingsRow = await this.settingsRepo.findOne({ where: { id: 'global' } });
        const dhFee = parseFloat(String(settingsRow?.dhFee || '0')) || 0;
        const transportFee = parseFloat(String(settingsRow?.transportFee || '0')) || 0;
        const deskFee = parseFloat(String(settingsRow?.deskFee || '0')) || 0;
        const allStudents = await this.students.find();
        let created = 0;
        for (const st of allStudents) {
            const acc0 = await this.getOrCreateStudentAccount(st);
            const existingCredit = Math.max(0, 0 - parseFloat(acc0.balance));
            const carryForward = Math.max(0, parseFloat(acc0.balance));
            let termAdded = 0;
            const exists = await this.invoices.findOne({ where: { student: { id: st.id }, term: t, academicYear: yr } });
            if (exists)
                continue;
            const base = amount
                ? parseFloat(String(amount))
                : (st.isStaffChild
                    ? 0
                    : (st.boardingStatus === 'boarder' ? parseFloat(String(s.boarderFeeAmount || 0)) : parseFloat(String(s.dayFeeAmount || 0))));
            const isDay = st.boardingStatus === 'day';
            const wantsTransport = !!st.takesTransport;
            const wantsMeals = !!st.takesMeals;
            const isStaff = !!st.isStaffChild;
            const addons = (!isStaff && isDay ? ((wantsTransport ? transportFee : 0) + (wantsMeals ? dhFee : 0)) : 0);
            const agg = (base + addons + carryForward);
            const amtStr = (agg || 0).toFixed(2);
            const inv = this.invoices.create({ student: st, term: t, academicYear: yr, amount: amtStr, description: description || `${t} fees (aggregated)`, status: 'unpaid' });
            await this.invoices.save(inv);
            const trx = this.tx.create({ student: st, type: 'invoice', amount: amtStr, term: t, academicYear: yr, note: inv.description || undefined });
            await this.tx.save(trx);
            const acc = await this.getOrCreateStudentAccount(st);
            acc.balance = (parseFloat(acc.balance) + parseFloat(amtStr)).toFixed(2);
            await this.accounts.save(acc);
            if (carryForward > 0) {
                const adj = this.tx.create({ student: st, type: 'adjustment', amount: String(-carryForward), term: t, academicYear: yr, note: 'Carry-forward included in aggregated invoice' });
                await this.tx.save(adj);
                const accAdj = await this.getOrCreateStudentAccount(st);
                accAdj.balance = (parseFloat(accAdj.balance) - carryForward).toFixed(2);
                await this.accounts.save(accAdj);
            }
            termAdded += (base + addons);
            created++;
            if (deskFee > 0) {
                const existsDesk = await this.invoices.findOne({ where: { student: { id: st.id }, description: 'Desk fee' } });
                const alreadyChargedDesk = !!existsDesk && (parseFloat(String(existsDesk.amount)) > 0);
                if (!alreadyChargedDesk) {
                    const deskAmtStr = (deskFee || 0).toFixed(2);
                    const deskInv = this.invoices.create({ student: st, term: t, academicYear: yr, amount: deskAmtStr, description: 'Desk fee', status: 'unpaid' });
                    await this.invoices.save(deskInv);
                    const deskTx = this.tx.create({ student: st, type: 'invoice', amount: deskAmtStr, term: t, academicYear: yr, note: 'Desk fee' });
                    await this.tx.save(deskTx);
                    acc.balance = (parseFloat(acc.balance) + parseFloat(deskAmtStr)).toFixed(2);
                    await this.accounts.save(acc);
                    termAdded += parseFloat(deskAmtStr) || 0;
                }
            }
            if (existingCredit > 0 && termAdded > 0) {
                const apply = Math.min(existingCredit, termAdded);
                if (apply > 0) {
                    const adj = this.tx.create({ student: st, type: 'adjustment', amount: String(-apply), term: t, academicYear: yr, note: 'Apply prepaid to current term' });
                    await this.tx.save(adj);
                    const acc2 = await this.getOrCreateStudentAccount(st);
                    acc2.balance = (parseFloat(acc2.balance) - apply).toFixed(2);
                    await this.accounts.save(acc2);
                }
            }
        }
        return { created, term: t, academicYear: yr };
    }
    async listBalances() {
        const rows = await this.accounts.find();
        return rows.map(r => ({ studentId: r.student.id, studentName: `${r.student.firstName} ${r.student.lastName}`, studentCode: r.student.studentId || r.student.id, balance: Number(r.balance) }));
    }
    async getStudentBalanceById(studentId) {
        const st = await this.students.findOne({ where: [{ id: studentId }, { studentId: studentId }] });
        if (!st)
            throw new common_1.BadRequestException('Student not found');
        const acc = await this.getOrCreateStudentAccount(st);
        const invoices = await this.invoices.find({ where: { student: { id: st.id } }, order: { createdAt: 'DESC' } });
        const txs = await this.tx.find({ where: { student: { id: st.id } }, order: { createdAt: 'DESC' } });
        return { student: { id: st.id, name: `${st.firstName} ${st.lastName}`, code: st.studentId || st.id }, balance: Number(acc.balance), invoices, transactions: txs };
    }
    async getStudentTermBalanceById(studentId, term, academicYear) {
        const st = await this.students.findOne({ where: [{ id: studentId }, { studentId: studentId }] });
        if (!st)
            throw new common_1.BadRequestException('Student not found');
        const s = await this.getSettings();
        const t = term || s.currentTerm || '';
        const yr = academicYear || s.academicYear || '';
        const where = { student: { id: st.id }, status: 'unpaid' };
        if (t)
            where.term = t;
        if (yr)
            where.academicYear = yr;
        const unpaidInvoices = await this.invoices.find({ where });
        const sum = (unpaidInvoices || []).reduce((a, inv) => a + (parseFloat(String(inv.amount || 0)) || 0), 0);
        console.log(`[getStudentTermBalanceById] Student ${st.id}, term: ${t}, unpaid invoices: ${unpaidInvoices.length}, balance: ${sum}`);
        return { student: { id: st.id, name: `${st.firstName} ${st.lastName}`, code: st.studentId || st.id }, term: t, academicYear: yr, balance: Number(sum.toFixed(2)) };
    }
    async termEndUpdate(targetTerm) {
        const s = await this.getSettings();
        return { success: true, termClosed: targetTerm || s.currentTerm };
    }
    async yearEndUpdate(targetYear) {
        const s = await this.getSettings();
        return { success: true, yearClosed: targetYear || s.academicYear };
    }
    async recordPayment(studentIdOrCode, amount, note, opts) {
        if (!amount)
            throw new common_1.BadRequestException('Amount required');
        const amt = parseFloat(amount);
        if (!(amt > 0))
            throw new common_1.BadRequestException('Amount must be > 0');
        const st = await this.students.findOne({ where: [{ id: studentIdOrCode }, { studentId: studentIdOrCode }] });
        if (!st)
            throw new common_1.BadRequestException('Student not found');
        const acc = await this.getOrCreateStudentAccount(st);
        const s = await this.getSettings();
        const term = String((opts?.term ?? s.currentTerm ?? '')).trim();
        const academicYear = String((opts?.academicYear ?? s.academicYear ?? '')).trim();
        if (!term || !academicYear) {
            throw new common_1.BadRequestException('Term and Academic Year are required');
        }
        let receipt = opts?.receiptNumber || null;
        if (!receipt) {
            const next = (s.receiptSeq || 0) + 1;
            s.receiptSeq = next;
            await this.settings.save(s);
            const seq = String(next).padStart(4, '0');
            receipt = `J${seq}`;
        }
        const trx = this.tx.create({
            student: st,
            type: 'payment',
            amount: String(-amt),
            note,
            receiptNumber: receipt,
            method: opts?.method || null,
            reference: opts?.reference || null,
            receivedAt: opts?.receivedAt || null,
            term,
            academicYear,
        });
        await this.tx.save(trx);
        acc.balance = (parseFloat(acc.balance) - amt).toFixed(2);
        await this.accounts.save(acc);
        try {
            const where = { student: { id: st.id }, status: 'unpaid', term, academicYear };
            const unpaidInvoices = await this.invoices.find({
                where,
                order: { createdAt: 'ASC' }
            });
            console.log(`[Payment] Found ${unpaidInvoices.length} unpaid invoices for student ${st.id}, term: ${term}`);
            let remaining = amt;
            const settledInvoices = [];
            for (const inv of unpaidInvoices) {
                if (remaining <= 0)
                    break;
                const invAmt = parseFloat(String(inv.amount)) || 0;
                if (invAmt <= 0)
                    continue;
                if (remaining >= invAmt) {
                    inv.status = 'paid';
                    remaining -= invAmt;
                    settledInvoices.push(inv);
                    console.log(`[Payment] Marked invoice ${inv.id} (${inv.description}, ${invAmt}) as PAID`);
                }
                else {
                    console.log(`[Payment] Partial payment: invoice ${inv.id} (${inv.description}, ${invAmt}) needs ${invAmt - remaining} more`);
                }
            }
            if (settledInvoices.length > 0) {
                await this.invoices.save(settledInvoices);
                console.log(`[Payment] ✅ Settled ${settledInvoices.length} invoices`);
            }
        }
        catch (err) {
            console.error('[Payment] Error settling invoices:', err);
        }
        return { success: true, balance: Number(acc.balance), receiptNumber: receipt, id: trx.id };
    }
    async bulkGenerateInvoicesByClass(classId, term, academicYear, amount, description) {
        if (!classId)
            throw new common_1.BadRequestException('classId is required');
        const s = await this.getSettings();
        const t = term || s.currentTerm || 'Term 1';
        const yr = academicYear || s.academicYear || '';
        const enrols = await this.enrollments.find({ where: { classEntity: { id: classId } } });
        const studentIds = Array.from(new Set(enrols.map(e => e.student?.id).filter(Boolean)));
        let created = 0;
        for (const sid of studentIds) {
            const st = await this.students.findOne({ where: { id: sid } });
            if (!st)
                continue;
            const acc0 = await this.getOrCreateStudentAccount(st);
            const existingCredit = Math.max(0, 0 - parseFloat(acc0.balance));
            const carryForward = Math.max(0, parseFloat(acc0.balance));
            let termAdded = 0;
            const exists = await this.invoices.findOne({ where: { student: { id: st.id }, term: t, academicYear: yr } });
            if (exists)
                continue;
            const base = amount
                ? parseFloat(String(amount))
                : (st.isStaffChild
                    ? 0
                    : (st.boardingStatus === 'boarder' ? parseFloat(String(s.boarderFeeAmount || 0)) : parseFloat(String(s.dayFeeAmount || 0))));
            const settingsRow = await this.settingsRepo.findOne({ where: { id: 'global' } });
            const dhFee = parseFloat(String(settingsRow?.dhFee || '0')) || 0;
            const transportFee = parseFloat(String(settingsRow?.transportFee || '0')) || 0;
            const deskFee = parseFloat(String(settingsRow?.deskFee || '0')) || 0;
            const isDay = st.boardingStatus === 'day';
            const wantsTransport = !!st.takesTransport;
            const wantsMeals = !!st.takesMeals;
            const isStaff = !!st.isStaffChild;
            const addons = (!isStaff && isDay ? ((wantsTransport ? transportFee : 0) + (wantsMeals ? dhFee : 0)) : 0);
            const agg = (base + addons + carryForward);
            const amtStr = (agg || 0).toFixed(2);
            const inv = this.invoices.create({ student: st, term: t, academicYear: yr, amount: amtStr, description: description || `${t} fees (aggregated)`, status: 'unpaid' });
            await this.invoices.save(inv);
            const trx = this.tx.create({ student: st, type: 'invoice', amount: amtStr, term: t, academicYear: yr, note: inv.description || undefined });
            await this.tx.save(trx);
            const acc = await this.getOrCreateStudentAccount(st);
            acc.balance = (parseFloat(acc.balance) + parseFloat(amtStr)).toFixed(2);
            await this.accounts.save(acc);
            created++;
            termAdded += (base + addons);
            if (carryForward > 0) {
                const adj = this.tx.create({ student: st, type: 'adjustment', amount: String(-carryForward), term: t, academicYear: yr, note: 'Carry-forward included in aggregated invoice' });
                await this.tx.save(adj);
                const accAdj = await this.getOrCreateStudentAccount(st);
                accAdj.balance = (parseFloat(accAdj.balance) - carryForward).toFixed(2);
                await this.accounts.save(accAdj);
            }
            if (deskFee > 0) {
                const existsDesk = await this.invoices.findOne({ where: { student: { id: st.id }, description: 'Desk fee' } });
                const alreadyChargedDesk = !!existsDesk && (parseFloat(String(existsDesk.amount)) > 0);
                if (!alreadyChargedDesk) {
                    const deskAmtStr = (deskFee || 0).toFixed(2);
                    const deskInv = this.invoices.create({ student: st, term: t, academicYear: yr, amount: deskAmtStr, description: 'Desk fee', status: 'unpaid' });
                    await this.invoices.save(deskInv);
                    const deskTx = this.tx.create({ student: st, type: 'invoice', amount: deskAmtStr, term: t, academicYear: yr, note: 'Desk fee' });
                    await this.tx.save(deskTx);
                    acc.balance = (parseFloat(acc.balance) + parseFloat(deskAmtStr)).toFixed(2);
                    await this.accounts.save(acc);
                    termAdded += parseFloat(deskAmtStr) || 0;
                }
            }
            if (existingCredit > 0 && termAdded > 0) {
                const apply = Math.min(existingCredit, termAdded);
                if (apply > 0) {
                    const adj = this.tx.create({ student: st, type: 'adjustment', amount: String(-apply), term: t, academicYear: yr, note: 'Apply prepaid to current term' });
                    await this.tx.save(adj);
                    const acc2 = await this.getOrCreateStudentAccount(st);
                    acc2.balance = (parseFloat(acc2.balance) - apply).toFixed(2);
                    await this.accounts.save(acc2);
                }
            }
        }
        return { created, term: t, academicYear: yr };
    }
    async exportBalancesCsv() {
        const rows = await this.listBalances();
        const header = 'Student Name,Code,Balance\n';
        const body = rows.map(r => `${r.studentName},${r.studentCode},${r.balance.toFixed(2)}`).join('\n');
        return header + body + '\n';
    }
    async getTransaction(txId) {
        const t = await this.tx.findOne({ where: { id: txId } });
        if (!t)
            throw new common_1.BadRequestException('Receipt not found');
        return t;
    }
    async recentPayments(limit = 20, opts) {
        const qb = this.tx.createQueryBuilder('t')
            .leftJoinAndSelect('t.student', 's')
            .where('t.type = :ty', { ty: 'payment' })
            .orderBy('t.createdAt', 'DESC')
            .limit(Math.max(1, Math.min(100, limit)));
        if (opts?.method)
            qb.andWhere('t.method = :m', { m: opts.method });
        if (opts?.from)
            qb.andWhere('(t.receivedAt >= :f OR (t.receivedAt IS NULL AND t.createdAt >= :f))', { f: opts.from });
        if (opts?.to)
            qb.andWhere('(t.receivedAt <= :z OR (t.receivedAt IS NULL AND t.createdAt <= :z))', { z: opts.to });
        return qb.getMany();
    }
    async normalizeInvoicesForTermYear(term, academicYear) {
        if (!term || !academicYear)
            throw new common_1.BadRequestException('term and academicYear are required');
        const s = await this.getSettings();
        const settingsRow = await this.settingsRepo.findOne({ where: { id: 'global' } });
        const dhFee = parseFloat(String(settingsRow?.dhFee || '0')) || 0;
        const transportFee = parseFloat(String(settingsRow?.transportFee || '0')) || 0;
        const allStudents = await this.students.find();
        let normalized = 0;
        for (const st of allStudents) {
            const invs = await this.invoices.find({ where: { student: { id: st.id }, term, academicYear } });
            if (!invs || invs.length === 0)
                continue;
            const comps = (d) => {
                const x = (d || '').toLowerCase();
                return x.includes('dining hall') || x.includes('transport') || x.includes('desk');
            };
            const nonComponentInvs = invs.filter(i => !comps(i.description || ''))
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            let aggregated = nonComponentInvs[0];
            const acc = await this.getOrCreateStudentAccount(st);
            const isDay = st.boardingStatus === 'day';
            const isStaff = !!st.isStaffChild;
            const wantsTransport = !!st.takesTransport;
            const wantsMeals = !!st.takesMeals;
            const base = (st.isStaffChild
                ? 0
                : (st.boardingStatus === 'boarder' ? parseFloat(String(s.boarderFeeAmount || 0)) : parseFloat(String(s.dayFeeAmount || 0)))) || 0;
            const aggAmt = aggregated ? (parseFloat(String(aggregated.amount || '0')) || 0) : 0;
            if (!aggregated && base > 0) {
                const baseStr = base.toFixed(2);
                const inv = this.invoices.create({ student: st, term, academicYear, amount: baseStr, description: `${term} fees (aggregated)`, status: 'unpaid' });
                aggregated = await this.invoices.save(inv);
                const trx = this.tx.create({ student: st, type: 'invoice', amount: baseStr, term, academicYear, note: inv.description || undefined });
                await this.tx.save(trx);
                const acc0 = await this.getOrCreateStudentAccount(st);
                acc0.balance = (parseFloat(acc0.balance) + parseFloat(baseStr)).toFixed(2);
                await this.accounts.save(acc0);
                normalized++;
            }
            const dhInvs = invs.filter(i => (i.description || '') === 'Dining Hall fee').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            const transportInvs = invs.filter(i => (i.description || '') === 'Transport fee').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            const existingDhInv = dhInvs[0];
            const existingTransportInv = transportInvs[0];
            let reduction = 0;
            if (!isStaff && isDay && wantsTransport && transportFee > 0) {
                if (existingTransportInv) {
                    const amt = Math.min(transportFee, aggAmt - base - reduction);
                    if (amt > 0)
                        reduction += amt;
                }
                else {
                    const amt = Math.min(transportFee, aggAmt - base - reduction);
                    if (amt > 0) {
                        const tfStr = amt.toFixed(2);
                        const tfInv = this.invoices.create({ student: st, term, academicYear, amount: tfStr, description: 'Transport fee', status: 'unpaid' });
                        await this.invoices.save(tfInv);
                        const tfTx = this.tx.create({ student: st, type: 'invoice', amount: tfStr, term, academicYear, note: 'Transport fee' });
                        await this.tx.save(tfTx);
                        acc.balance = (parseFloat(acc.balance) + parseFloat(tfStr)).toFixed(2);
                        await this.accounts.save(acc);
                        reduction += amt;
                    }
                }
            }
            if (!isStaff && isDay && wantsMeals && dhFee > 0) {
                if (existingDhInv) {
                    const amt = Math.min(dhFee, aggAmt - base - reduction);
                    if (amt > 0)
                        reduction += amt;
                }
                else {
                    const amt = Math.min(dhFee, aggAmt - base - reduction);
                    if (amt > 0) {
                        const dhStr = amt.toFixed(2);
                        const dhInv = this.invoices.create({ student: st, term, academicYear, amount: dhStr, description: 'Dining Hall fee', status: 'unpaid' });
                        await this.invoices.save(dhInv);
                        const dhTx = this.tx.create({ student: st, type: 'invoice', amount: dhStr, term, academicYear, note: 'Dining Hall fee' });
                        await this.tx.save(dhTx);
                        acc.balance = (parseFloat(acc.balance) + parseFloat(dhStr)).toFixed(2);
                        await this.accounts.save(acc);
                        reduction += amt;
                    }
                }
            }
            if (aggregated && aggAmt > base && reduction > 0) {
                const newAmt = (aggAmt - reduction);
                aggregated.amount = newAmt.toFixed(2);
                await this.invoices.save(aggregated);
                const adjTx = this.tx.create({ student: st, type: 'adjustment', amount: String(-reduction), term, academicYear, note: 'Normalize: remove addons from aggregated' });
                await this.tx.save(adjTx);
                acc.balance = (parseFloat(acc.balance) - reduction).toFixed(2);
                await this.accounts.save(acc);
                normalized++;
            }
            if (dhInvs.length > 1) {
                for (let k = 1; k < dhInvs.length; k++) {
                    const extra = dhInvs[k];
                    const amt = parseFloat(String(extra.amount || '0')) || 0;
                    if (amt > 0) {
                        const adj = this.tx.create({ student: st, type: 'adjustment', amount: String(-amt), term, academicYear, note: 'Normalize: remove duplicate Dining Hall fee' });
                        await this.tx.save(adj);
                        acc.balance = (parseFloat(acc.balance) - amt).toFixed(2);
                        await this.accounts.save(acc);
                    }
                    await this.invoices.delete(extra.id);
                    normalized++;
                }
            }
            if (transportInvs.length > 1) {
                for (let k = 1; k < transportInvs.length; k++) {
                    const extra = transportInvs[k];
                    const amt = parseFloat(String(extra.amount || '0')) || 0;
                    if (amt > 0) {
                        const adj = this.tx.create({ student: st, type: 'adjustment', amount: String(-amt), term, academicYear, note: 'Normalize: remove duplicate Transport fee' });
                        await this.tx.save(adj);
                        acc.balance = (parseFloat(acc.balance) - amt).toFixed(2);
                        await this.accounts.save(acc);
                    }
                    await this.invoices.delete(extra.id);
                    normalized++;
                }
            }
        }
        return { normalized };
    }
    async reconcileInvoices(studentIdOrCode, term) {
        const st = await this.students.findOne({ where: [{ id: studentIdOrCode }, { studentId: studentIdOrCode }] });
        if (!st)
            throw new common_1.BadRequestException('Student not found');
        const where = { student: { id: st.id }, status: 'unpaid' };
        if (term)
            where.term = term;
        const unpaidInvoices = await this.invoices.find({
            where,
            order: { createdAt: 'ASC' }
        });
        if (unpaidInvoices.length === 0) {
            return { success: true, message: 'No unpaid invoices', settled: 0 };
        }
        const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + (parseFloat(String(inv.amount)) || 0), 0);
        const acc = await this.getOrCreateStudentAccount(st);
        const currentBalance = parseFloat(String(acc.balance)) || 0;
        console.log(`[Reconcile] Student ${st.id}, Balance: ${currentBalance}, Unpaid invoices total: ${totalUnpaid}`);
        if (currentBalance <= 0) {
            for (const inv of unpaidInvoices) {
                inv.status = 'paid';
            }
            await this.invoices.save(unpaidInvoices);
            console.log(`[Reconcile] ✅ Marked ${unpaidInvoices.length} invoices as PAID (balance is ${currentBalance})`);
            return { success: true, settled: unpaidInvoices.length, message: `Settled ${unpaidInvoices.length} invoices` };
        }
        const amountAvailable = totalUnpaid - currentBalance;
        let remaining = amountAvailable;
        const settledInvoices = [];
        for (const inv of unpaidInvoices) {
            if (remaining <= 0)
                break;
            const invAmt = parseFloat(String(inv.amount)) || 0;
            if (invAmt <= 0)
                continue;
            if (remaining >= invAmt) {
                inv.status = 'paid';
                remaining -= invAmt;
                settledInvoices.push(inv);
                console.log(`[Reconcile] Marked invoice ${inv.id} (${inv.description}, ${invAmt}) as PAID`);
            }
        }
        if (settledInvoices.length > 0) {
            await this.invoices.save(settledInvoices);
            console.log(`[Reconcile] ✅ Settled ${settledInvoices.length} invoices`);
        }
        return { success: true, settled: settledInvoices.length, message: `Settled ${settledInvoices.length} invoices` };
    }
};
exports.AccountsService = AccountsService;
exports.AccountsService = AccountsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(account_settings_entity_1.AccountSettings)),
    __param(1, (0, typeorm_1.InjectRepository)(student_account_entity_1.StudentAccount)),
    __param(2, (0, typeorm_1.InjectRepository)(fee_invoice_entity_1.FeeInvoice)),
    __param(3, (0, typeorm_1.InjectRepository)(fee_transaction_entity_1.FeeTransaction)),
    __param(4, (0, typeorm_1.InjectRepository)(student_entity_1.Student)),
    __param(5, (0, typeorm_1.InjectRepository)(enrollment_entity_1.Enrollment)),
    __param(6, (0, typeorm_1.InjectRepository)(settings_entity_1.Settings)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AccountsService);
//# sourceMappingURL=accounts.service.js.map