import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from '../settings/settings.entity';
import { AccountSettings } from './account-settings.entity';
import { StudentAccount } from './student-account.entity';
import { FeeInvoice } from './fee-invoice.entity';
import { FeeTransaction } from './fee-transaction.entity';
import { Student } from '../entities/student.entity';
import { Enrollment } from '../entities/enrollment.entity';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(AccountSettings) private readonly settings: Repository<AccountSettings>,
    @InjectRepository(StudentAccount) private readonly accounts: Repository<StudentAccount>,
    @InjectRepository(FeeInvoice) private readonly invoices: Repository<FeeInvoice>,
    @InjectRepository(FeeTransaction) private readonly tx: Repository<FeeTransaction>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(Enrollment) private readonly enrollments: Repository<Enrollment>,
    @InjectRepository(Settings) private readonly settingsRepo: Repository<Settings>,
  ) {}

  async getSettings(): Promise<AccountSettings> {
    let s = await this.settings.findOne({ where: { id: 'global' } });
    if (!s) {
      const created = this.settings.create({ id: 'global', termFeeAmount: '0', dayFeeAmount: '0', boarderFeeAmount: '0' } as Partial<AccountSettings>);
      s = await this.settings.save(created as AccountSettings);
    }
    // Ensure new fields exist
    let mutated = false;
    if ((s as any).dayFeeAmount == null) { (s as any).dayFeeAmount = '0'; mutated = true; }
    if ((s as any).boarderFeeAmount == null) { (s as any).boarderFeeAmount = '0'; mutated = true; }
    if ((s as any).receiptSeq == null) { (s as any).receiptSeq = 0; mutated = true; }
    if (mutated) { try { s = await this.settings.save(s); } catch {} }
    return s as AccountSettings;
  }

  async updateSettings(partial: Partial<AccountSettings>): Promise<AccountSettings> {
    const s = await this.getSettings();
    Object.assign(s, partial);
    return this.settings.save(s);
  }

  private async getOrCreateStudentAccount(student: Student): Promise<StudentAccount> {
    let acc = await this.accounts.findOne({ where: { student: { id: student.id } as any } });
    if (!acc) {
      acc = this.accounts.create({ student, balance: '0' });
      acc = await this.accounts.save(acc);
    }
    return acc;
  }

  async bulkGenerateInvoices(term?: string, academicYear?: string, amount?: string, description?: string) {
    const s = await this.getSettings();
    const t = term || s.currentTerm || 'Term 1';
    const yr = academicYear || s.academicYear || '';
    const settingsRow = await this.settingsRepo.findOne({ where: { id: 'global' } as any });
    const dhFee = parseFloat(String((settingsRow as any)?.dhFee || '0')) || 0;
    const transportFee = parseFloat(String((settingsRow as any)?.transportFee || '0')) || 0;
    const deskFee = parseFloat(String((settingsRow as any)?.deskFee || '0')) || 0;
    const allStudents = await this.students.find();
    let created = 0;
    for (const st of allStudents) {
      // detect prepaid credit (negative balance) and carry-forward (positive balance)
      const acc0 = await this.getOrCreateStudentAccount(st);
      const existingCredit = Math.max(0, 0 - parseFloat(acc0.balance as any));
      const carryForward = Math.max(0, parseFloat(acc0.balance as any));
      let termAdded = 0;
      // prevent duplicate invoice for same student/term/year
      const exists = await this.invoices.findOne({ where: { student: { id: st.id } as any, term: t, academicYear: yr } });
      if (exists) continue;
      // base term fee
      const base = amount
        ? parseFloat(String(amount))
        : (st.isStaffChild
            ? 0
            : (st.boardingStatus === 'boarder' ? parseFloat(String(s.boarderFeeAmount || 0)) : parseFloat(String(s.dayFeeAmount || 0))));
      // add-ons: for day scholars who are NOT staff children, include DH/Transport if opted-in
      const isDay = st.boardingStatus === 'day';
      const wantsTransport = !!(st as any).takesTransport;
      const wantsMeals = !!(st as any).takesMeals;
      const isStaff = !!(st as any).isStaffChild;
      const addons = (!isStaff && isDay ? ((wantsTransport ? transportFee : 0) + (wantsMeals ? dhFee : 0)) : 0);
      // aggregated invoice includes carry-forward to present a single total; offset with adjustment
      const agg = (base + addons + carryForward);
      const amtStr = (agg || 0).toFixed(2) as any;
      const inv = this.invoices.create({ student: st, term: t, academicYear: yr, amount: amtStr, description: description || `${t} fees (aggregated)` , status: 'unpaid' });
      await this.invoices.save(inv);
      const trx = this.tx.create({ student: st, type: 'invoice', amount: amtStr, term: t, academicYear: yr, note: inv.description || undefined });
      await this.tx.save(trx);
      const acc = await this.getOrCreateStudentAccount(st);
      acc.balance = (parseFloat(acc.balance as any) + parseFloat(amtStr as any)).toFixed(2) as any;
      await this.accounts.save(acc);
      // offset carry-forward to avoid double counting in ledger
      if (carryForward > 0) {
        const adj = this.tx.create({ student: st, type: 'adjustment', amount: String(-carryForward), term: t, academicYear: yr, note: 'Carry-forward included in aggregated invoice' });
        await this.tx.save(adj);
        const accAdj = await this.getOrCreateStudentAccount(st);
        accAdj.balance = (parseFloat(accAdj.balance as any) - carryForward).toFixed(2) as any;
        await this.accounts.save(accAdj);
      }
      termAdded += (base + addons);
      created++;
      // DH and Transport included in aggregated invoice when applicable (no separate component invoices)
      // Separate one-time Desk fee invoice if not yet charged (amount > 0 only)
      if (deskFee > 0) {
        const existsDesk = await this.invoices.findOne({ where: { student: { id: st.id } as any, description: 'Desk fee' } });
        const alreadyChargedDesk = !!existsDesk && (parseFloat(String((existsDesk as any).amount)) > 0);
        if (!alreadyChargedDesk) {
          const deskAmtStr = (deskFee || 0).toFixed(2) as any;
          const deskInv = this.invoices.create({ student: st, term: t, academicYear: yr, amount: deskAmtStr, description: 'Desk fee', status: 'unpaid' });
          await this.invoices.save(deskInv);
          const deskTx = this.tx.create({ student: st, type: 'invoice', amount: deskAmtStr, term: t, academicYear: yr, note: 'Desk fee' });
          await this.tx.save(deskTx);
          acc.balance = (parseFloat(acc.balance as any) + parseFloat(deskAmtStr as any)).toFixed(2) as any;
          await this.accounts.save(acc);
          termAdded += parseFloat(deskAmtStr as any) || 0;
        }
      }
      // Apply prepaid credit up to the amount added this term (base + addons)
      if (existingCredit > 0 && termAdded > 0) {
        const apply = Math.min(existingCredit, termAdded);
        if (apply > 0) {
          const adj = this.tx.create({ student: st, type: 'adjustment', amount: String(-apply), term: t, academicYear: yr, note: 'Apply prepaid to current term' });
          await this.tx.save(adj);
          const acc2 = await this.getOrCreateStudentAccount(st);
          acc2.balance = (parseFloat(acc2.balance as any) - apply).toFixed(2) as any;
          await this.accounts.save(acc2);
        }
      }
    }
    return { created, term: t, academicYear: yr } as any;
  }

  async listBalances() {
    const rows = await this.accounts.find();
    return rows.map(r => ({ studentId: r.student.id, studentName: `${r.student.firstName} ${r.student.lastName}`, studentCode: r.student.studentId || r.student.id, balance: Number(r.balance) }));
  }

  async getStudentBalanceById(studentId: string) {
    const st = await this.students.findOne({ where: [{ id: studentId }, { studentId: studentId } as any] });
    if (!st) throw new BadRequestException('Student not found');
    const acc = await this.getOrCreateStudentAccount(st);
    const invoices = await this.invoices.find({ where: { student: { id: st.id } as any }, order: { createdAt: 'DESC' } });
    const txs = await this.tx.find({ where: { student: { id: st.id } as any }, order: { createdAt: 'DESC' } });
    return { student: { id: st.id, name: `${st.firstName} ${st.lastName}`, code: st.studentId || st.id }, balance: Number(acc.balance), invoices, transactions: txs };
  }

  async getStudentTermBalanceById(studentId: string, term?: string, academicYear?: string) {
    const st = await this.students.findOne({ where: [{ id: studentId }, { studentId: studentId } as any] });
    if (!st) throw new BadRequestException('Student not found');
    const s = await this.getSettings();
    const t = term || (s.currentTerm as any) || '';
    const yr = academicYear || (s.academicYear as any) || '';
    
    // Calculate balance from UNPAID invoices only (not all transactions)
    // This ensures that when invoices are marked as "paid", they no longer contribute to the balance
    const where: any = { student: { id: st.id } as any, status: 'unpaid' };
    if (t) where.term = t;
    if (yr) where.academicYear = yr;
    
    const unpaidInvoices = await this.invoices.find({ where });
    const sum = (unpaidInvoices || []).reduce((a, inv) => a + (parseFloat(String(inv.amount || 0)) || 0), 0);
    
    console.log(`[getStudentTermBalanceById] Student ${st.id}, term: ${t}, unpaid invoices: ${unpaidInvoices.length}, balance: ${sum}`);
    
    return { student: { id: st.id, name: `${st.firstName} ${st.lastName}`, code: st.studentId || st.id }, term: t, academicYear: yr, balance: Number(sum.toFixed(2)) } as any;
  }

  async termEndUpdate(targetTerm?: string) {
    // Nothing to do other than ensure balances persist; return a summary
    const s = await this.getSettings();
    return { success: true, termClosed: targetTerm || s.currentTerm };
  }

  async yearEndUpdate(targetYear?: string) {
    // Keep balances; snapshot can be added later
    const s = await this.getSettings();
    return { success: true, yearClosed: targetYear || s.academicYear };
  }

  async recordPayment(studentIdOrCode: string, amount: string, note?: string, opts?: { receiptNumber?: string; method?: string; reference?: string; receivedAt?: string; term?: string; academicYear?: string }) {
    if (!amount) throw new BadRequestException('Amount required');
    const amt = parseFloat(amount as any);
    if (!(amt > 0)) throw new BadRequestException('Amount must be > 0');
    const st = await this.students.findOne({ where: [{ id: studentIdOrCode }, { studentId: studentIdOrCode } as any] });
    if (!st) throw new BadRequestException('Student not found');
    const acc = await this.getOrCreateStudentAccount(st);
    // Determine term and academic year (required): use provided or fall back to settings
    const s = await this.getSettings();
    const term = String((opts?.term ?? s.currentTerm ?? '') as any).trim();
    const academicYear = String((opts?.academicYear ?? s.academicYear ?? '') as any).trim();
    if (!term || !academicYear) {
      throw new BadRequestException('Term and Academic Year are required');
    }
    // Generate sequential receipt number if not provided
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
    acc.balance = (parseFloat(acc.balance as any) - amt).toFixed(2) as any;
    await this.accounts.save(acc);

    // Auto-settle invoices: find unpaid invoices and mark them as paid if payment covers them
    try {
      const where: any = { student: { id: st.id } as any, status: 'unpaid', term, academicYear };
      
      const unpaidInvoices = await this.invoices.find({ 
        where, 
        order: { createdAt: 'ASC' } // Settle oldest first
      });
      
      console.log(`[Payment] Found ${unpaidInvoices.length} unpaid invoices for student ${st.id}, term: ${term}`);
      
      let remaining = amt;
      const settledInvoices: FeeInvoice[] = [];
      
      for (const inv of unpaidInvoices) {
        if (remaining <= 0) break;
        const invAmt = parseFloat(String(inv.amount)) || 0;
        if (invAmt <= 0) continue;
        
        if (remaining >= invAmt) {
          // Payment covers this invoice completely
          inv.status = 'paid';
          remaining -= invAmt;
          settledInvoices.push(inv);
          console.log(`[Payment] Marked invoice ${inv.id} (${inv.description}, ${invAmt}) as PAID`);
        } else {
          // Partial payment - leave as unpaid for now
          console.log(`[Payment] Partial payment: invoice ${inv.id} (${inv.description}, ${invAmt}) needs ${invAmt - remaining} more`);
        }
      }
      
      if (settledInvoices.length > 0) {
        await this.invoices.save(settledInvoices);
        console.log(`[Payment] ✅ Settled ${settledInvoices.length} invoices`);
      }
    } catch (err) {
      console.error('[Payment] Error settling invoices:', err);
      // Don't fail the payment if invoice settlement fails
    }

    return { success: true, balance: Number(acc.balance), receiptNumber: receipt, id: trx.id };
  }

  async bulkGenerateInvoicesByClass(classId: string, term?: string, academicYear?: string, amount?: string, description?: string) {
    if (!classId) throw new BadRequestException('classId is required');
    const s = await this.getSettings();
    const t = term || s.currentTerm || 'Term 1';
    const yr = academicYear || s.academicYear || '';
    const enrols = await this.enrollments.find({ where: { classEntity: { id: classId } as any } });
    const studentIds = Array.from(new Set(enrols.map(e => (e as any).student?.id).filter(Boolean)));
    let created = 0;
    for (const sid of studentIds) {
      const st = await this.students.findOne({ where: { id: sid } });
      if (!st) continue;
      // detect prepaid credit (negative balance) and carry-forward (positive balance)
      const acc0 = await this.getOrCreateStudentAccount(st);
      const existingCredit = Math.max(0, 0 - parseFloat(acc0.balance as any));
      const carryForward = Math.max(0, parseFloat(acc0.balance as any));
      let termAdded = 0;
      const exists = await this.invoices.findOne({ where: { student: { id: st.id } as any, term: t, academicYear: yr } });
      if (exists) continue;
      // aggregated invoice: base plus (DH/Transport for day scholars who are not staff children and opted-in)
      const base = amount
        ? parseFloat(String(amount))
        : (st.isStaffChild
            ? 0
            : (st.boardingStatus === 'boarder' ? parseFloat(String(s.boarderFeeAmount || 0)) : parseFloat(String(s.dayFeeAmount || 0))));
      const settingsRow = await this.settingsRepo.findOne({ where: { id: 'global' } as any });
      const dhFee = parseFloat(String((settingsRow as any)?.dhFee || '0')) || 0;
      const transportFee = parseFloat(String((settingsRow as any)?.transportFee || '0')) || 0;
      const deskFee = parseFloat(String((settingsRow as any)?.deskFee || '0')) || 0;
      const isDay = st.boardingStatus === 'day';
      const wantsTransport = !!(st as any).takesTransport;
      const wantsMeals = !!(st as any).takesMeals;
      const isStaff = !!(st as any).isStaffChild;
      const addons = (!isStaff && isDay ? ((wantsTransport ? transportFee : 0) + (wantsMeals ? dhFee : 0)) : 0);
      const agg = (base + addons + carryForward);
      const amtStr = (agg || 0).toFixed(2) as any;
      const inv = this.invoices.create({ student: st, term: t, academicYear: yr, amount: amtStr, description: description || `${t} fees (aggregated)`, status: 'unpaid' });
      await this.invoices.save(inv);
      const trx = this.tx.create({ student: st, type: 'invoice', amount: amtStr, term: t, academicYear: yr, note: inv.description || undefined });
      await this.tx.save(trx);
      const acc = await this.getOrCreateStudentAccount(st);
      acc.balance = (parseFloat(acc.balance as any) + parseFloat(amtStr as any)).toFixed(2) as any;
      await this.accounts.save(acc);
      created++;
      termAdded += (base + addons);
      // offset carry-forward to avoid double counting in ledger
      if (carryForward > 0) {
        const adj = this.tx.create({ student: st, type: 'adjustment', amount: String(-carryForward), term: t, academicYear: yr, note: 'Carry-forward included in aggregated invoice' });
        await this.tx.save(adj);
        const accAdj = await this.getOrCreateStudentAccount(st);
        accAdj.balance = (parseFloat(accAdj.balance as any) - carryForward).toFixed(2) as any;
        await this.accounts.save(accAdj);
      }
      // Separate one-time Desk fee invoice if not yet charged (amount > 0 only)
      if (deskFee > 0) {
        const existsDesk = await this.invoices.findOne({ where: { student: { id: st.id } as any, description: 'Desk fee' } });
        const alreadyChargedDesk = !!existsDesk && (parseFloat(String((existsDesk as any).amount)) > 0);
        if (!alreadyChargedDesk) {
          const deskAmtStr = (deskFee || 0).toFixed(2) as any;
          const deskInv = this.invoices.create({ student: st, term: t, academicYear: yr, amount: deskAmtStr, description: 'Desk fee', status: 'unpaid' });
          await this.invoices.save(deskInv);
          const deskTx = this.tx.create({ student: st, type: 'invoice', amount: deskAmtStr, term: t, academicYear: yr, note: 'Desk fee' });
          await this.tx.save(deskTx);
          acc.balance = (parseFloat(acc.balance as any) + parseFloat(deskAmtStr as any)).toFixed(2) as any;
          await this.accounts.save(acc);
          termAdded += parseFloat(deskAmtStr as any) || 0;
        }
      }
      // Apply prepaid credit up to the amount added this term
      if (existingCredit > 0 && termAdded > 0) {
        const apply = Math.min(existingCredit, termAdded);
        if (apply > 0) {
          const adj = this.tx.create({ student: st, type: 'adjustment', amount: String(-apply), term: t, academicYear: yr, note: 'Apply prepaid to current term' });
          await this.tx.save(adj);
          const acc2 = await this.getOrCreateStudentAccount(st);
          acc2.balance = (parseFloat(acc2.balance as any) - apply).toFixed(2) as any;
          await this.accounts.save(acc2);
        }
      }
    }
    return { created, term: t, academicYear: yr } as any;
  }

  async exportBalancesCsv(): Promise<string> {
    const rows = await this.listBalances();
    const header = 'Student Name,Code,Balance\n';
    const body = rows.map(r => `${r.studentName},${r.studentCode},${r.balance.toFixed(2)}`).join('\n');
    return header + body + '\n';
  }

  async getTransaction(txId: string) {
    const t = await this.tx.findOne({ where: { id: txId } as any });
    if (!t) throw new BadRequestException('Receipt not found');
    return t;
  }

  async recentPayments(limit = 20, opts?: { from?: string; to?: string; method?: string }) {
    const qb = this.tx.createQueryBuilder('t')
      .leftJoinAndSelect('t.student', 's')
      .where('t.type = :ty', { ty: 'payment' })
      .orderBy('t.createdAt', 'DESC')
      .limit(Math.max(1, Math.min(100, limit)));
    if (opts?.method) qb.andWhere('t.method = :m', { m: opts.method });
    if (opts?.from) qb.andWhere('(t.receivedAt >= :f OR (t.receivedAt IS NULL AND t.createdAt >= :f))', { f: opts.from });
    if (opts?.to) qb.andWhere('(t.receivedAt <= :z OR (t.receivedAt IS NULL AND t.createdAt <= :z))', { z: opts.to });
    return qb.getMany();
  }

  // Normalize invoices for a given term/year: ensure aggregated invoice is base-only,
  // and DH/Transport are separate. Adjust balances via an 'adjustment' transaction.
  async normalizeInvoicesForTermYear(term: string, academicYear: string): Promise<{ normalized: number }> {
    if (!term || !academicYear) throw new BadRequestException('term and academicYear are required');
    const s = await this.getSettings();
    const settingsRow = await this.settingsRepo.findOne({ where: { id: 'global' } as any });
    const dhFee = parseFloat(String((settingsRow as any)?.dhFee || '0')) || 0;
    const transportFee = parseFloat(String((settingsRow as any)?.transportFee || '0')) || 0;
    const allStudents = await this.students.find();
    let normalized = 0;
    for (const st of allStudents) {
      // Fetch all invoices for this student/term/year
      const invs = await this.invoices.find({ where: { student: { id: st.id } as any, term, academicYear } });
      if (!invs || invs.length === 0) continue;
      // Classify invoices: components vs non-components (treat first non-component as 'aggregated' for normalization)
      const comps = (d: string) => {
        const x = (d || '').toLowerCase();
        return x.includes('dining hall') || x.includes('transport') || x.includes('desk');
      };
      const nonComponentInvs = invs.filter(i => !comps(i.description || ''))
        .sort((a: any, b: any) => new Date(a.createdAt as any).getTime() - new Date(b.createdAt as any).getTime());
      let aggregated = nonComponentInvs[0];
      const acc = await this.getOrCreateStudentAccount(st);
      const isDay = st.boardingStatus === 'day';
      const isStaff = !!(st as any).isStaffChild;
      const wantsTransport = !!(st as any).takesTransport;
      const wantsMeals = !!(st as any).takesMeals;
      // compute expected base
      const base = (st.isStaffChild
        ? 0
        : (st.boardingStatus === 'boarder' ? parseFloat(String(s.boarderFeeAmount || 0)) : parseFloat(String(s.dayFeeAmount || 0)))) || 0;
      const aggAmt = aggregated ? (parseFloat(String(aggregated.amount || '0')) || 0) : 0;

      // If there is no aggregated invoice yet but base > 0, create one now (base-only)
      if (!aggregated && base > 0) {
        const baseStr = base.toFixed(2) as any;
        const inv = this.invoices.create({ student: st, term, academicYear, amount: baseStr, description: `${term} fees (aggregated)`, status: 'unpaid' });
        aggregated = await this.invoices.save(inv);
        const trx = this.tx.create({ student: st, type: 'invoice', amount: baseStr, term, academicYear, note: inv.description || undefined });
        await this.tx.save(trx);
        const acc0 = await this.getOrCreateStudentAccount(st);
        acc0.balance = (parseFloat(acc0.balance as any) + parseFloat(baseStr as any)).toFixed(2) as any;
        await this.accounts.save(acc0);
        normalized++;
      }

      // Check existing separate component invoices
      const dhInvs = invs.filter(i => (i.description || '') === 'Dining Hall fee').sort((a: any, b: any) => new Date(a.createdAt as any).getTime() - new Date(b.createdAt as any).getTime());
      const transportInvs = invs.filter(i => (i.description || '') === 'Transport fee').sort((a: any, b: any) => new Date(a.createdAt as any).getTime() - new Date(b.createdAt as any).getTime());
      const existingDhInv = dhInvs[0];
      const existingTransportInv = transportInvs[0];
      let reduction = 0;

      // Transport component
      if (!isStaff && isDay && wantsTransport && transportFee > 0) {
        if (existingTransportInv) {
          const amt = Math.min(transportFee, aggAmt - base - reduction);
          if (amt > 0) reduction += amt;
        } else {
          // create separate invoice if we still have reducible room
          const amt = Math.min(transportFee, aggAmt - base - reduction);
          if (amt > 0) {
            const tfStr = amt.toFixed(2) as any;
            const tfInv = this.invoices.create({ student: st, term, academicYear, amount: tfStr, description: 'Transport fee', status: 'unpaid' });
            await this.invoices.save(tfInv);
            const tfTx = this.tx.create({ student: st, type: 'invoice', amount: tfStr, term, academicYear, note: 'Transport fee' });
            await this.tx.save(tfTx);
            acc.balance = (parseFloat(acc.balance as any) + parseFloat(tfStr as any)).toFixed(2) as any;
            await this.accounts.save(acc);
            reduction += amt;
          }
        }
      }

      // Dining Hall component
      if (!isStaff && isDay && wantsMeals && dhFee > 0) {
        if (existingDhInv) {
          const amt = Math.min(dhFee, aggAmt - base - reduction);
          if (amt > 0) reduction += amt;
        } else {
          const amt = Math.min(dhFee, aggAmt - base - reduction);
          if (amt > 0) {
            const dhStr = amt.toFixed(2) as any;
            const dhInv = this.invoices.create({ student: st, term, academicYear, amount: dhStr, description: 'Dining Hall fee', status: 'unpaid' });
            await this.invoices.save(dhInv);
            const dhTx = this.tx.create({ student: st, type: 'invoice', amount: dhStr, term, academicYear, note: 'Dining Hall fee' });
            await this.tx.save(dhTx);
            acc.balance = (parseFloat(acc.balance as any) + parseFloat(dhStr as any)).toFixed(2) as any;
            await this.accounts.save(acc);
            reduction += amt;
          }
        }
      }

      if (aggregated && aggAmt > base && reduction > 0) {
        const newAmt = (aggAmt - reduction);
        aggregated.amount = newAmt.toFixed(2) as any;
        await this.invoices.save(aggregated);
        const adjTx = this.tx.create({ student: st, type: 'adjustment', amount: String(-reduction), term, academicYear, note: 'Normalize: remove addons from aggregated' });
        await this.tx.save(adjTx);
        acc.balance = (parseFloat(acc.balance as any) - reduction).toFixed(2) as any;
        await this.accounts.save(acc);
        normalized++;
      }

      // De-duplicate DH invoices: keep earliest, offset and remove extras
      if (dhInvs.length > 1) {
        for (let k = 1; k < dhInvs.length; k++) {
          const extra = dhInvs[k];
          const amt = parseFloat(String(extra.amount || '0')) || 0;
          if (amt > 0) {
            const adj = this.tx.create({ student: st, type: 'adjustment', amount: String(-amt), term, academicYear, note: 'Normalize: remove duplicate Dining Hall fee' });
            await this.tx.save(adj);
            acc.balance = (parseFloat(acc.balance as any) - amt).toFixed(2) as any;
            await this.accounts.save(acc);
          }
          await this.invoices.delete(extra.id);
          normalized++;
        }
      }

      // De-duplicate Transport invoices: keep earliest, offset and remove extras
      if (transportInvs.length > 1) {
        for (let k = 1; k < transportInvs.length; k++) {
          const extra = transportInvs[k];
          const amt = parseFloat(String(extra.amount || '0')) || 0;
          if (amt > 0) {
            const adj = this.tx.create({ student: st, type: 'adjustment', amount: String(-amt), term, academicYear, note: 'Normalize: remove duplicate Transport fee' });
            await this.tx.save(adj);
            acc.balance = (parseFloat(acc.balance as any) - amt).toFixed(2) as any;
            await this.accounts.save(acc);
          }
          await this.invoices.delete(extra.id);
          normalized++;
        }
      }
    }
    return { normalized };
  }

  // Utility: Reconcile invoice statuses for a student based on balance and payments
  async reconcileInvoices(studentIdOrCode: string, term?: string) {
    const st = await this.students.findOne({ where: [{ id: studentIdOrCode }, { studentId: studentIdOrCode } as any] });
    if (!st) throw new BadRequestException('Student not found');
    
    const where: any = { student: { id: st.id } as any, status: 'unpaid' };
    if (term) where.term = term;
    
    const unpaidInvoices = await this.invoices.find({ 
      where, 
      order: { createdAt: 'ASC' } 
    });
    
    if (unpaidInvoices.length === 0) {
      return { success: true, message: 'No unpaid invoices', settled: 0 };
    }
    
    // Calculate total unpaid
    const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + (parseFloat(String(inv.amount)) || 0), 0);
    
    // Get current balance
    const acc = await this.getOrCreateStudentAccount(st);
    const currentBalance = parseFloat(String(acc.balance)) || 0;
    
    console.log(`[Reconcile] Student ${st.id}, Balance: ${currentBalance}, Unpaid invoices total: ${totalUnpaid}`);
    
    // If balance is 0 or negative (overpaid/credit), mark all unpaid invoices as paid
    if (currentBalance <= 0) {
      for (const inv of unpaidInvoices) {
        inv.status = 'paid';
      }
      await this.invoices.save(unpaidInvoices);
      console.log(`[Reconcile] ✅ Marked ${unpaidInvoices.length} invoices as PAID (balance is ${currentBalance})`);
      return { success: true, settled: unpaidInvoices.length, message: `Settled ${unpaidInvoices.length} invoices` };
    }
    
    // If balance > 0 but less than total unpaid, settle what we can
    const amountAvailable = totalUnpaid - currentBalance;
    let remaining = amountAvailable;
    const settledInvoices: FeeInvoice[] = [];
    
    for (const inv of unpaidInvoices) {
      if (remaining <= 0) break;
      const invAmt = parseFloat(String(inv.amount)) || 0;
      if (invAmt <= 0) continue;
      
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
}
