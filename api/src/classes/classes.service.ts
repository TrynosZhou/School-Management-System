import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassEntity } from '../entities/class.entity';
import { Teacher } from '../entities/teacher.entity';
import { Settings } from '../settings/settings.entity';
import { CreateClassDto } from './dto/create-class.dto';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(ClassEntity)
    private readonly repo: Repository<ClassEntity>,
    @InjectRepository(Teacher)
    private readonly teachers: Repository<Teacher>,
    @InjectRepository(Settings)
    private readonly settingsRepo: Repository<Settings>,
  ) {}

  async create(dto: CreateClassDto) {
    // Ensure academicYear is always present; if missing, default from Settings
    if (!dto.academicYear) {
      const s = await this.settingsRepo.findOne({ where: { id: 'global' } });
      dto.academicYear = (s?.academicYear || '').toString();
      if (!dto.academicYear) throw new BadRequestException('Academic year not set in Settings');
    }
    const exists = await this.repo.findOne({ where: { name: dto.name, academicYear: dto.academicYear } });
    if (exists) throw new BadRequestException('Class already exists for this academic year');
    const c = this.repo.create({ name: dto.name, gradeLevel: dto.gradeLevel, academicYear: dto.academicYear });
    if (dto.teacherId) {
      const t = await this.teachers.findOne({ where: { id: dto.teacherId } });
      if (!t) throw new BadRequestException('Teacher not found');
      // Enforce: a teacher can be class teacher for at most one class
      const already = await this.repo.findOne({ where: { classTeacher: { id: dto.teacherId } as any } as any });
      if (already) throw new BadRequestException('This teacher is already assigned as a class teacher to another class');
      c.classTeacher = t;
    }
    return this.repo.save(c);
  }

  async findAll() {
    return this.repo.find({ order: { academicYear: 'DESC', name: 'ASC' } });
  }

  async findOne(id: string) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Class not found');
    return c;
  }

  async update(id: string, partial: Partial<CreateClassDto>) {
    const c = await this.findOne(id);
    if (partial.name !== undefined) c.name = partial.name as string;
    if (partial.gradeLevel !== undefined) c.gradeLevel = partial.gradeLevel as string;
    if (partial.academicYear !== undefined) c.academicYear = partial.academicYear as string;
    if (partial.teacherId !== undefined) {
      if (!partial.teacherId) {
        c.classTeacher = null;
      } else {
        const t = await this.teachers.findOne({ where: { id: partial.teacherId as string } });
        if (!t) throw new BadRequestException('Teacher not found');
        // Enforce uniqueness: if another class already has this teacher as class teacher, block
        const other = await this.repo.findOne({ where: { classTeacher: { id: partial.teacherId as string } as any } as any });
        if (other && other.id !== c.id) throw new BadRequestException('This teacher is already assigned as a class teacher to another class');
        c.classTeacher = t;
      }
    }
    return this.repo.save(c);
  }

  async remove(id: string) {
    const res = await this.repo.delete(id);
    if (!res.affected) throw new NotFoundException('Class not found');
  }

  async promoteClasses() {
    const all = await this.repo.find();
    let promoted = 0;
    let graduated = 0;

    const toCreate: ClassEntity[] = [];

    for (const c of all) {
      const current = this.parseForm(c.gradeLevel) ?? this.parseForm(c.name);
      if (current === null) {
        // could not parse; skip
        continue;
      }
      if (current >= 6) {
        // Ensure a Graduated Class exists in the same academic year
        const exists = await this.repo.findOne({ where: { name: 'Graduated Class', academicYear: c.academicYear } });
        if (!exists) {
          const grad = this.repo.create({ name: 'Graduated Class', gradeLevel: 'Graduated Class', academicYear: c.academicYear });
          toCreate.push(grad);
        }
        graduated++;
      } else {
        const nxt = this.nextForm(`Form ${current}`);
        if (nxt === null) continue;
        const stream = this.detectStream(c.name);
        const newName = stream ? `${nxt} ${stream}` : `${nxt}`;
        const newGrade = `Form ${nxt}`;
        // Only create if the next-level class doesn't already exist for this academic year
        const exists = await this.repo.findOne({ where: { name: newName, academicYear: c.academicYear } });
        if (!exists) {
          const nc = this.repo.create({ name: newName, gradeLevel: newGrade, academicYear: c.academicYear });
          toCreate.push(nc);
          promoted++;
        }
      }
    }

    if (toCreate.length) {
      await this.repo.save(toCreate);
    }

    return { success: true, promoted, graduated };
  }

  private parseForm(level: string | null | undefined): number | null {
    if (!level) return null;
    const m = /form\s*(\d+)/i.exec(level);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    return isNaN(n) ? null : n;
  }

  private nextForm(level: string | null | undefined): number | null {
    const n = this.parseForm(level);
    if (n === null) return null;
    if (n >= 6) return 6; // cap at Form 6
    if (n < 1) return 1;
    return n + 1;
  }

  async normalizeNames(defaultStream: 'Blue' | 'White' | 'Gold' = 'Blue') {
    const all = await this.repo.find();
    let updated = 0;
    const allowed = ['Blue','White','Gold'];
    const toSave: ClassEntity[] = [];
    for (const c of all) {
      const n = this.parseForm(c.gradeLevel) ?? this.parseForm(c.name);
      if (!n) continue;
      const detected = this.detectStream(c.name);
      const stream = (detected && allowed.includes(detected)) ? detected as any : defaultStream;
      const wantedName = `${n} ${stream}`;
      const wantedGrade = `Form ${n}`;
      if (c.name !== wantedName || c.gradeLevel !== wantedGrade) {
        c.name = wantedName;
        c.gradeLevel = wantedGrade;
        toSave.push(c);
        updated++;
      }
    }
    if (toSave.length) await this.repo.save(toSave);
    return { success: true, updated };
  }

  private detectStream(name: string | null | undefined): string | null {
    if (!name) return null;
    const m = /(Blue|White|Gold)/i.exec(name);
    return m ? (m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()) : null;
  }

  async ensureClasses(
    year: string,
    items: (
      | { type: 'form'; gradeNumber: number; stream: 'Blue' | 'White' | 'Gold' }
      | { type: 'alevel'; band: 'Lower 6' | 'Upper 6'; stream: 'Sci' | 'Comm' | 'Arts' }
    )[]
  ) {
    if (!year || !items?.length) return { success: true, created: 0, existing: 0 };
    let created = 0, existing = 0;
    for (const it of items) {
      let name = '';
      let gradeLevel = '';
      if ((it as any).type === 'form') {
        const f = it as { type: 'form'; gradeNumber: number; stream: 'Blue'|'White'|'Gold' };
        const n = Math.max(1, Math.min(6, Math.floor(f.gradeNumber || 1)));
        name = `${n} ${f.stream}`;
        gradeLevel = `Form ${n}`;
      } else if ((it as any).type === 'alevel') {
        const a = it as { type: 'alevel'; band: 'Lower 6'|'Upper 6'; stream: 'Sci'|'Comm'|'Arts' };
        name = `${a.band} ${a.stream}`;
        gradeLevel = a.band;
      } else {
        continue;
      }
      const found = await this.repo.findOne({ where: { name, academicYear: year } });
      if (found) { existing++; continue; }
      const c = this.repo.create({ name, gradeLevel, academicYear: year });
      await this.repo.save(c);
      created++;
    }
    return { success: true, created, existing };
  }
}
