import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../entities/student.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { FeeInvoice } from '../accounts/fee-invoice.entity';
import { FeeTransaction } from '../accounts/fee-transaction.entity';
import { StudentAccount } from '../accounts/student-account.entity';
import { AccountSettings } from '../accounts/account-settings.entity';
import { Settings } from '../settings/settings.entity';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student) private readonly repo: Repository<Student>,
    @InjectRepository(FeeInvoice) private readonly invoices: Repository<FeeInvoice>,
    @InjectRepository(FeeTransaction) private readonly tx: Repository<FeeTransaction>,
    @InjectRepository(StudentAccount) private readonly accounts: Repository<StudentAccount>,
    @InjectRepository(AccountSettings) private readonly accSettings: Repository<AccountSettings>,
    @InjectRepository(Settings) private readonly settings: Repository<Settings>,
  ) {}

  async create(dto: CreateStudentDto): Promise<Student> {
    if (dto.email) {
      const exists = await this.repo.findOne({ where: { email: dto.email } });
      if (exists) throw new BadRequestException('Email already exists');
    }
    const s = this.repo.create(dto);
    // Generate human studentId if missing: <PREFIX> + 7-digit random number
    if (!s.studentId) {
      let prefix = 'JHS';
      try {
        const set = await this.settings.findOne({ where: { id: 'global' } });
        const configured = String((set as any)?.studentIdPrefix || '').trim();
        if (configured) prefix = configured.toUpperCase();
      } catch {}
      let uniqueId = '';
      do {
        const n = Math.floor(1000000 + Math.random() * 9000000); // 7 digits
        uniqueId = `${prefix}${n}`;
      } while (await this.repo.findOne({ where: { studentId: uniqueId } as any }));
      s.studentId = uniqueId;
    }
    const saved = await this.repo.save(s);
    // Auto-invoice term and applicable components at registration
    try {
      // Determine term/year
      const acc = await this.accSettings.findOne({ where: { id: 'global' } });
      const term = acc?.currentTerm || 'Term 1';
      const year = acc?.academicYear || '';
      // Detect existing prepaid credit (negative balance) before creating invoices
      let termAdded = 0;
      let acctForStudent = await this.accounts.findOne({ where: { student: { id: saved.id } as any } });
      if (!acctForStudent) { acctForStudent = this.accounts.create({ student: saved as any, balance: '0' }); acctForStudent = await this.accounts.save(acctForStudent); }
      const existingCredit = Math.max(0, 0 - parseFloat(String(acctForStudent.balance || '0')));

      // Base term fee (aggregated base only) from AccountSettings
      try {
        // Staff children: no term fees
        if (!dto.isStaffChild) {
          let base = 0;
          if (dto.boardingStatus === 'boarder') {
            base = parseFloat(String((acc as any)?.boarderFeeAmount || '0')) || 0;
          } else {
            base = parseFloat(String((acc as any)?.dayFeeAmount || '0')) || 0;
          }
          if (base > 0) {
            const existingForTerm = await this.invoices.find({ where: { student: { id: saved.id } as any, term, academicYear: year } });
            const hasAggregated = existingForTerm.some(i => ((i.description || '').toLowerCase().includes('aggregated')));
            if (!hasAggregated) {
              const amountAgg = base.toFixed(2) as any;
              const invAgg = this.invoices.create({ student: saved as any, term, academicYear: year, amount: amountAgg, description: `${term} fees (aggregated)`, status: 'unpaid' });
              await this.invoices.save(invAgg);
              const trxAgg = this.tx.create({ student: saved as any, type: 'invoice', amount: amountAgg, term, academicYear: year, note: invAgg.description || undefined });
              await this.tx.save(trxAgg);
              let accRec = await this.accounts.findOne({ where: { student: { id: saved.id } as any } });
              if (!accRec) { accRec = this.accounts.create({ student: saved as any, balance: '0' }); accRec = await this.accounts.save(accRec); }
              accRec.balance = (parseFloat(accRec.balance as any) + parseFloat(amountAgg as any)).toFixed(2) as any;
              await this.accounts.save(accRec);
              termAdded += parseFloat(amountAgg as any) || 0;
            }
          }
        }
      } catch {}

      const wantsMeals = !!dto.takesMeals;
      // DH applies to day scholars only; staff children pay 50% if they take meals
      if (wantsMeals && dto.boardingStatus === 'day') {
        // Fetch DH fee from settings and current term/year from account settings
        let dh = '0';
        try { const set = await this.settings.findOne({ where: { id: 'global' } }); dh = String((set as any)?.dhFee || '0'); } catch {}
        const base = parseFloat(dh as any) || 0;
        if (base > 0) {
          const isStaff = !!dto.isStaffChild;
          const amount = (isStaff ? base * 0.5 : base).toFixed(2);
          // prevent duplicate invoice same day for new student
          const exists = await this.invoices.findOne({ where: { student: { id: saved.id } as any, term, academicYear: year, description: 'Dining Hall fee' } });
          if (!exists) {
            const inv = this.invoices.create({ student: saved as any, term, academicYear: year, amount: amount as any, description: 'Dining Hall fee', status: 'unpaid' });
            await this.invoices.save(inv);
            const trx = this.tx.create({ student: saved as any, type: 'invoice', amount: amount as any, term, academicYear: year, note: inv.description || undefined });
            await this.tx.save(trx);
            let accRec = await this.accounts.findOne({ where: { student: { id: saved.id } as any } });
            if (!accRec) { accRec = this.accounts.create({ student: saved as any, balance: '0' }); accRec = await this.accounts.save(accRec); }
            accRec.balance = (parseFloat(accRec.balance as any) + parseFloat(amount as any)).toFixed(2) as any;
            await this.accounts.save(accRec);
            termAdded += parseFloat(amount as any) || 0;
          }
        }
      }
      // Transport fee: applies to day scholars who opted in, excluding staff children
      const wantsTransport = !!dto.takesTransport;
      if (wantsTransport && (dto.boardingStatus === 'day') && !dto.isStaffChild) {
        let tf = '0';
        try { const set = await this.settings.findOne({ where: { id: 'global' } }); tf = String((set as any)?.transportFee || '0'); } catch {}
        const baseT = parseFloat(tf as any) || 0;
        if (baseT > 0) {
          const amountT = baseT.toFixed(2);
          const existsT = await this.invoices.findOne({ where: { student: { id: saved.id } as any, term, academicYear: year, description: 'Transport fee' } });
          if (!existsT) {
            const invT = this.invoices.create({ student: saved as any, term, academicYear: year, amount: amountT as any, description: 'Transport fee', status: 'unpaid' });
            await this.invoices.save(invT);
            const trxT = this.tx.create({ student: saved as any, type: 'invoice', amount: amountT as any, term, academicYear: year, note: invT.description || undefined });
            await this.tx.save(trxT);
            let accRec = await this.accounts.findOne({ where: { student: { id: saved.id } as any } });
            if (!accRec) { accRec = this.accounts.create({ student: saved as any, balance: '0' }); accRec = await this.accounts.save(accRec); }
            accRec.balance = (parseFloat(accRec.balance as any) + parseFloat(amountT as any)).toFixed(2) as any;
            await this.accounts.save(accRec);
            termAdded += parseFloat(amountT as any) || 0;
          }
        }
      }

      // One-time Desk fee for new students (if configured), regardless of day/boarder
      try {
        // Staff children: no desk fee
        if (!dto.isStaffChild) {
          let desk = '0';
          try { const set = await this.settings.findOne({ where: { id: 'global' } }); desk = String((set as any)?.deskFee || '0'); } catch {}
          const deskAmt = parseFloat(desk as any) || 0;
          if (deskAmt > 0) {
            const existsDesk = await this.invoices.findOne({ where: { student: { id: saved.id } as any, description: 'Desk fee' } });
            const alreadyChargedDesk = !!existsDesk && (parseFloat(String((existsDesk as any).amount)) > 0);
            if (!alreadyChargedDesk) {
              const amountDesk = deskAmt.toFixed(2) as any;
              const invDesk = this.invoices.create({ student: saved as any, term, academicYear: year, amount: amountDesk, description: 'Desk fee', status: 'unpaid' });
              await this.invoices.save(invDesk);
              const trxDesk = this.tx.create({ student: saved as any, type: 'invoice', amount: amountDesk, term, academicYear: year, note: invDesk.description || undefined });
              await this.tx.save(trxDesk);
              let accRec = await this.accounts.findOne({ where: { student: { id: saved.id } as any } });
              if (!accRec) { accRec = this.accounts.create({ student: saved as any, balance: '0' }); accRec = await this.accounts.save(accRec); }
              accRec.balance = (parseFloat(accRec.balance as any) + parseFloat(amountDesk as any)).toFixed(2) as any;
              await this.accounts.save(accRec);
              termAdded += parseFloat(amountDesk as any) || 0;
            }
          }
        }
      } catch {}
      // Apply prepaid credit up to the amount added at registration for this term
      try {
        if (existingCredit > 0 && termAdded > 0) {
          const apply = Math.min(existingCredit, termAdded);
          if (apply > 0) {
            const adj = this.tx.create({ student: saved as any, type: 'adjustment', amount: String(-apply), term, academicYear: year, note: 'Apply prepaid to current term (on registration)' });
            await this.tx.save(adj);
            let accRec = await this.accounts.findOne({ where: { student: { id: saved.id } as any } });
            if (!accRec) { accRec = this.accounts.create({ student: saved as any, balance: '0' }); accRec = await this.accounts.save(accRec); }
            accRec.balance = (parseFloat(accRec.balance as any) - apply).toFixed(2) as any;
            await this.accounts.save(accRec);
          }
        }
      } catch {}
    } catch {}
    return saved;
  }

  async findAll(page = 1, limit = 20): Promise<{ data: Student[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.repo.findAndCount({
      order: { lastName: 'ASC', firstName: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Student> {
    const s = await this.repo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Student not found');
    return s;
  }

  // Flexible lookup by UUID or human-readable studentId code
  async findByIdOrCode(idOrCode: string): Promise<Student> {
    const term = String(idOrCode || '').trim();
    if (!term) throw new NotFoundException('Student not found');
    // Try by UUID/id first
    let s = await this.repo.findOne({ where: { id: term } });
    if (!s) {
      // Fallback to studentId code
      s = await this.repo.findOne({ where: { studentId: term } as any });
    }
    if (!s) throw new NotFoundException('Student not found');
    return s;
  }

  async findByStudentId(studentId: string): Promise<Student> {
    const s = await this.repo.findOne({ where: { studentId } as any });
    if (!s) throw new NotFoundException('Student not found');
    return s;
  }

  async update(id: string, partial: Partial<CreateStudentDto>): Promise<Student> {
    const s = await this.findOne(id);
    if (partial.email && partial.email !== s.email) {
      const exists = await this.repo.findOne({ where: { email: partial.email } });
      if (exists) throw new BadRequestException('Email already exists');
    }
    Object.assign(s, partial);
    return this.repo.save(s);
  }

  async remove(id: string): Promise<void> {
    const res = await this.repo.delete(id);
    if (res.affected === 0) throw new NotFoundException('Student not found');
  }

  async backfillStudentIds(): Promise<{ updated: number; start?: string; end?: string }> {
    let prefix = 'JHS';
    try {
      const set = await this.settings.findOne({ where: { id: 'global' } });
      const configured = String((set as any)?.studentIdPrefix || '').trim();
      if (configured) prefix = configured.toUpperCase();
    } catch {}
    // Fetch all students missing studentId
    const missing = await this.repo.find({ where: { studentId: null as any }, order: { createdAt: 'ASC' as any } });
    let updated = 0; let start: string | undefined; let end: string | undefined;
    for (const s of missing) {
      let candidate = '';
      do {
        const n = Math.floor(1000000 + Math.random() * 9000000);
        candidate = `${prefix}${n}`;
      } while (await this.repo.findOne({ where: { studentId: candidate } as any }));
      s.studentId = candidate;
      await this.repo.save(s);
      updated += 1;
      if (!start) start = s.studentId;
      end = s.studentId;
    }
    return { updated, start, end };
  }
}
