import { Repository } from 'typeorm';
import { ClassEntity } from '../entities/class.entity';
import { Teacher } from '../entities/teacher.entity';
import { Settings } from '../settings/settings.entity';
import { CreateClassDto } from './dto/create-class.dto';
export declare class ClassesService {
    private readonly repo;
    private readonly teachers;
    private readonly settingsRepo;
    constructor(repo: Repository<ClassEntity>, teachers: Repository<Teacher>, settingsRepo: Repository<Settings>);
    create(dto: CreateClassDto): Promise<ClassEntity>;
    findAll(): Promise<ClassEntity[]>;
    findOne(id: string): Promise<ClassEntity>;
    update(id: string, partial: Partial<CreateClassDto>): Promise<ClassEntity>;
    remove(id: string): Promise<void>;
    promoteClasses(): Promise<{
        success: boolean;
        promoted: number;
        graduated: number;
    }>;
    private parseForm;
    private nextForm;
    normalizeNames(defaultStream?: 'Blue' | 'White' | 'Gold'): Promise<{
        success: boolean;
        updated: number;
    }>;
    private detectStream;
    ensureClasses(year: string, items: ({
        type: 'form';
        gradeNumber: number;
        stream: 'Blue' | 'White' | 'Gold';
    } | {
        type: 'alevel';
        band: 'Lower 6' | 'Upper 6';
        stream: 'Sci' | 'Comm' | 'Arts';
    })[]): Promise<{
        success: boolean;
        created: number;
        existing: number;
    }>;
}
