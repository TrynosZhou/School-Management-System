import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { ParentStudent } from './parent-student.entity';
import { ParentLinkToken } from './parent-link-token.entity';
import { Student } from '../entities/student.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class ParentsService {
  constructor(
    @InjectRepository(ParentStudent) private readonly links: Repository<ParentStudent>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(ParentLinkToken) private readonly tokens: Repository<ParentLinkToken>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  private emitter = new EventEmitter();
  onChange(listener: (payload: any) => void): () => void {
    const fn = (p: any) => listener(p);
    this.emitter.on('change', fn);
    return () => this.emitter.off('change', fn);
  }
  private emitChange(payload: any){ try { this.emitter.emit('change', payload); } catch {}
  }

  async linkStudent(parentUserId: string, studentIdOrCode: string, dob?: string, lastName?: string) {
    const parent = await this.users.findOne({ where: { id: parentUserId } });
    if (!parent) throw new BadRequestException('Parent not found');

    let student = await this.students.findOne({ where: { id: studentIdOrCode }, relations: { parent: true } as any });
    if (!student) {
      student = await this.students.findOne({ where: { studentId: studentIdOrCode } as any, relations: { parent: true } as any });
    }
    if (!student) throw new BadRequestException('Student not found');

    // Optional verification using last name (required by policy) and DOB if present on record
    if (typeof lastName === 'string' && lastName.trim()) {
      const a = (student.lastName || '').toString().trim().toLowerCase();
      const b = lastName.toString().trim().toLowerCase();
      if (!a || a !== b) throw new ForbiddenException('Last name does not match');
    }
    if (student.dob && dob) {
      const norm = (v: any) => {
        try {
          let s = String(v).trim();
          // If Date object, use toISOString safely; otherwise handle plain strings
          if (v instanceof Date) s = v.toISOString();
          // Keep only date part before 'T' if present
          if (s.includes('T')) s = s.split('T')[0];
          // Replace slashes with dashes to support common inputs like 2025/10/28
          s = s.replace(/\//g, '-');
          // If provided as dd-mm-yyyy, do not try to parse; rely on exact match policy
          return s;
        } catch { return String(v); }
      };
      const s = norm(student.dob);
      const d = norm(dob);
      if (s !== d) throw new ForbiddenException('DOB does not match');
    } else if (student.dob && !dob) {
      throw new ForbiddenException('DOB required to link this student');
    }

    // Enforce single-parent-per-student using Student.parent
    if (student.parent && student.parent.id !== parent.id) {
      throw new BadRequestException('This student is already linked to another parent account');
    }
    if (student.parent && student.parent.id === parent.id) {
      throw new BadRequestException('This student is already linked to your account');
    }
    student.parent = parent;
    await this.students.save(student);
    this.emitChange({ type: 'link', parentId: parent.id, studentId: student.id, studentCode: student.studentId || null, at: Date.now() });
    return { ok: true } as any;
  }

  // ADMIN: create a link between an existing parent user and student by ID or code
  async adminLink(parentUserId: string, studentIdOrCode: string): Promise<{ ok: true }>{
    if (!parentUserId || !studentIdOrCode) throw new BadRequestException('parentId and student required');
    const parent = await this.users.findOne({ where: { id: parentUserId } });
    if (!parent) throw new BadRequestException('Parent not found');
    let student = await this.students.findOne({ where: { id: studentIdOrCode }, relations: { parent: true } as any });
    if (!student) student = await this.students.findOne({ where: { studentId: studentIdOrCode } as any, relations: { parent: true } as any });
    if (!student) throw new BadRequestException('Student not found');
    // Enforce single-parent-per-student
    if (student.parent && student.parent.id !== parent.id) {
      throw new BadRequestException('This student is already linked to another parent account');
    }
    if (!student.parent) {
      student.parent = parent;
      await this.students.save(student);
      this.emitChange({ type: 'link', parentId: parent.id, studentId: student.id, studentCode: student.studentId || null, at: Date.now() });
    }
    return { ok: true };
  }

  // ADMIN: unlink a specific parent-student relation
  async adminUnlink(parentUserId: string, studentIdOrCode: string): Promise<{ ok: true }>{
    if (!parentUserId || !studentIdOrCode) throw new BadRequestException('parentId and student required');
    // Resolve student by UUID or Student ID code
    let student = await this.students.findOne({ where: { id: studentIdOrCode }, relations: { parent: true } as any });
    if (!student) student = await this.students.findOne({ where: { studentId: studentIdOrCode } as any, relations: { parent: true } as any });
    if (!student) return { ok: true };
    if (student.parent && student.parent.id === parentUserId) {
      student.parent = null as any;
      await this.students.save(student);
      this.emitChange({ type: 'unlink', parentId: parentUserId, studentId: student.id, studentCode: student.studentId || null, at: Date.now() });
    }
    return { ok: true };
  }

  // ADMIN: delete a parent account and all its links
  async adminDeleteParent(parentUserId: string): Promise<{ ok: true }>{
    if (!parentUserId) throw new BadRequestException('parentId required');
    // Detach students from this parent, emit unlink events
    const kids = await this.students.find({ where: { parent: { id: parentUserId } as any } as any });
    for (const s of kids) {
      s.parent = null as any;
      await this.students.save(s);
      this.emitChange({ type: 'unlink', parentId: parentUserId, studentId: s.id, studentCode: s.studentId || null, at: Date.now() });
    }
    await this.users.delete(parentUserId as any);
    return { ok: true };
  }

  async myStudents(parentUserId: string): Promise<Array<{ id: string; studentId?: string | null; firstName: string; lastName: string; balance?: number }>> {
    // Fetch students owned by this parent (DISTINCT ensures no duplicates)
    const students = await this.students.createQueryBuilder('s')
      .leftJoin('fee_invoices', 'fi', 'fi.studentId = s.id')
      .where('s.parentId = :pid', { pid: parentUserId })
      .andWhere('(s.isDeleted IS NULL OR s.isDeleted = false)')
      .select([
        'DISTINCT s.id AS id',
        's.studentId AS studentId',
        's.firstName AS firstName',
        's.lastName AS lastName',
        "COALESCE(SUM(CASE WHEN fi.status <> 'paid' THEN CAST(fi.amount AS DECIMAL(12,2)) ELSE 0 END), 0) AS balance",
      ])
      .groupBy('s.id')
      .addGroupBy('s.studentId')
      .addGroupBy('s.firstName')
      .addGroupBy('s.lastName')
      .orderBy('s.lastName', 'ASC')
      .addOrderBy('s.firstName', 'ASC')
      .getRawMany<{ id: string; studentId: string | null; firstName: string; lastName: string; balance: string | number }>();
    return students.map(r => ({ ...r, balance: Number(r.balance ?? 0) }));
  }

  async isLinked(parentUserId: string, studentId: string): Promise<boolean> {
    const s = await this.students.findOne({ where: { id: studentId }, relations: { parent: true } as any });
    if (!s) return false;
    // Check if parent relation exists and matches
    if (s.parent && s.parent.id === parentUserId) return true;
    // Fallback: check raw parentId column value
    const raw = await this.students.createQueryBuilder('s')
      .where('s.id = :sid', { sid: studentId })
      .andWhere('s.parentId = :pid', { pid: parentUserId })
      .getOne();
    return !!raw;
  }

  async parentEmailsForStudents(studentIds: string[]): Promise<string[]> {
    if (!studentIds.length) return [];
    const students = await this.students.find({ where: studentIds.map(id => ({ id })) as any, relations: { parent: true } as any });
    const emails = new Set<string>();
    students.forEach(s => { if (s.parent?.email) emails.add(s.parent.email); });
    return Array.from(emails);
  }

  async parentEmailsAll(): Promise<string[]> {
    const students = await this.students.find({ where: { parent: { id: Not(null as any) } } as any, relations: { parent: true } as any });
    const emails = new Set<string>();
    students.forEach(s => { if (s.parent?.email) emails.add(s.parent.email); });
    return Array.from(emails);
  }

  // ADMIN: list parents with their linked students
  async adminParentsWithLinks(): Promise<Array<{
    parentId: string;
    parentFullName: string | null;
    parentEmail: string | null;
    parentContactNumber: string | null;
    studentId: string;
    studentCode: string | null;
    studentFullName: string;
  }>> {
    const students = await this.students.find({ where: { parent: { id: Not(IsNull()) } } as any, relations: { parent: true } as any });
    return students
      .filter(s => !!s.parent)
      .map(s => ({
        parentId: s.parent!.id,
        parentFullName: s.parent!.fullName || null,
        parentEmail: s.parent!.email || null,
        parentContactNumber: s.parent!.contactNumber || null,
        studentId: s.id,
        studentCode: s.studentId || null,
        studentFullName: `${s.firstName || ''} ${s.lastName || ''}`.trim(),
      }));
  }

  // ADMIN: list ALL parents (even if not linked) as flat rows; parents without links have null student fields
  async adminParentsAllFlat(): Promise<Array<{
    parentId: string;
    parentFullName: string | null;
    parentEmail: string | null;
    parentContactNumber: string | null;
    studentId: string | null;
    studentCode: string | null;
    studentFullName: string | null;
  }>> {
    // Fetch users with a case-insensitive match for role === 'parent'
    const parents = await this.users.createQueryBuilder('u')
      .where('LOWER(u.role) = :r', { r: 'parent' })
      .getMany();
    // Fetch all students with their parent
    const students = await this.students.find({ where: { parent: { id: Not(IsNull()) } } as any, relations: { parent: true } as any });
    const byParent = new Map<string, Array<{ id: string; code: string | null; name: string }>>();
    students.forEach(s => {
      if (!s.parent?.id) return;
      const arr = byParent.get(s.parent.id) || [];
      arr.push({ id: s.id, code: s.studentId || null, name: `${s.firstName || ''} ${s.lastName || ''}`.trim() });
      byParent.set(s.parent.id, arr);
    });
    const rows: Array<{ parentId: string; parentFullName: string | null; parentEmail: string | null; parentContactNumber: string | null; studentId: string | null; studentCode: string | null; studentFullName: string | null; }> = [];
    const parentIndex = new Map(parents.map(p => [p.id, p] as const));
    // Include any parents referenced by students even if their role casing is inconsistent
    students.forEach(s => { if (s.parent?.id && !parentIndex.has(s.parent.id)) parentIndex.set(s.parent.id, s.parent as any); });

    Array.from(parentIndex.values()).forEach(p => {
      const sts = byParent.get(p.id) || [];
      if (sts.length === 0) {
        rows.push({ parentId: p.id, parentFullName: p.fullName || null, parentEmail: p.email || null, parentContactNumber: p.contactNumber || null, studentId: null, studentCode: null, studentFullName: null });
      } else {
        sts.forEach(s => rows.push({ parentId: p.id, parentFullName: p.fullName || null, parentEmail: p.email || null, parentContactNumber: p.contactNumber || null, studentId: s.id, studentCode: s.code, studentFullName: s.name }));
      }
    });
    // sort by parent name asc then student name asc
    rows.sort((a,b) => (`${a.parentFullName||''}`).localeCompare(`${b.parentFullName||''}`) || (`${a.studentFullName||''}`).localeCompare(`${b.studentFullName||''}`));
    return rows;
  }

  async unlink(parentUserId: string, studentIdOrCode: string): Promise<{ ok: true }>{
    const pid = (parentUserId || '').trim();
    const arg = (studentIdOrCode || '').trim();
    if (!pid || !arg) return { ok: true };
    // Find student by UUID or studentId code
    let student = await this.students.findOne({ where: { id: arg }, relations: { parent: true } as any });
    if (!student) student = await this.students.findOne({ where: { studentId: arg } as any, relations: { parent: true } as any });
    if (!student) return { ok: true };
    // Only unlink if this student is linked to this parent
    if (student.parent && student.parent.id === pid) {
      student.parent = null as any;
      await this.students.save(student);
      this.emitChange({ type: 'unlink', parentId: pid, studentId: student.id, studentCode: student.studentId || null, at: Date.now() });
    }
    return { ok: true };
  }

  async softDeleteStudent(parentUserId: string, studentIdOrCode: string): Promise<{ ok: true }>{
    const pid = (parentUserId || '').trim();
    const arg = (studentIdOrCode || '').trim();
    if (!pid || !arg) return { ok: true };
    // Resolve student by UUID or Student ID code
    let student = await this.students.findOne({ where: { id: arg } });
    if (!student) student = await this.students.findOne({ where: { studentId: arg } as any });
    if (!student) return { ok: true };
    // Ensure the parent has a link to this student
    const link = await this.links.findOne({ where: { parent: { id: pid } as any, student: { id: student.id } as any } });
    if (!link) return { ok: true };
    // Mark student as softly deleted
    if (!student.isDeleted) {
      student.isDeleted = true;
      await this.students.save(student);
    }
    // Optionally also remove the link so it disappears immediately for all parents
    if (link?.id) await this.links.delete(link.id as any);
    return { ok: true };
  }

  // ADMIN: create invite token for a student
  async createInvite(studentId: string, expiresAt?: string): Promise<{ code: string }> {
    const student = await this.students.findOne({ where: { id: studentId } });
    if (!student) throw new BadRequestException('Student not found');
    const code = 'P' + Math.random().toString(36).slice(2, 8).toUpperCase() + Date.now().toString(36).slice(-3).toUpperCase();
    const token = this.tokens.create({ student, code, expiresAt: expiresAt ? new Date(expiresAt) : null, usedAt: null });
    await this.tokens.save(token);
    return { code: token.code };
  }

  // PARENT: redeem invite token
  async redeemInvite(parentUserId: string, code: string) {
    const token = await this.tokens.findOne({ where: { code } as any, relations: { student: true } });
    if (!token) throw new BadRequestException('Invalid code');
    if (token.usedAt) throw new ForbiddenException('Code already used');
    if (token.expiresAt && token.expiresAt.getTime() < Date.now()) throw new ForbiddenException('Code expired');
    const parent = await this.users.findOne({ where: { id: parentUserId } });
    if (!parent) throw new BadRequestException('Parent not found');
    // Enforce single-parent-per-student
    const cur = await this.students.findOne({ where: { id: token.student.id }, relations: { parent: true } as any });
    if (cur?.parent && cur.parent.id !== parent.id) throw new BadRequestException('This student is already linked to another parent account');
    if (!cur?.parent) { cur!.parent = parent; await this.students.save(cur!); }
    token.usedAt = new Date();
    await this.tokens.save(token);
    return { ok: true };
  }

  // ADMIN: list linked parents for a student
  async listLinkedParents(studentIdOrCode: string): Promise<Array<{ id: string; email: string }>> {
    // Resolve student by UUID or code to make admin tooling friendlier
    let student = await this.students.findOne({ where: { id: studentIdOrCode } });
    if (!student) student = await this.students.findOne({ where: { studentId: studentIdOrCode } as any });
    if (!student) return [];
    const s = await this.students.findOne({ where: { id: student.id }, relations: { parent: true } as any });
    return s?.parent?.id ? [{ id: s.parent.id, email: s.parent.email }] : [];
  }

  // ADMIN: migrate parent_students to students.parentId (one-time operation after schema change)
  async migrateParentLinks(): Promise<{ ok: boolean; migrated: number; message: string }> {
    try {
      // Fetch all parent_students links
      const links = await this.links.find({ relations: { parent: true, student: true } });
      let migrated = 0;
      for (const link of links) {
        if (link.student && link.parent && !link.student.parent) {
          link.student.parent = link.parent;
          await this.students.save(link.student);
          migrated++;
        }
      }
      return { ok: true, migrated, message: `Successfully migrated ${migrated} parent-student links` };
    } catch (error) {
      return { ok: false, migrated: 0, message: `Migration failed: ${error.message}` };
    }
  }
}
