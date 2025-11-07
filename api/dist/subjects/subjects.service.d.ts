import { Repository } from 'typeorm';
import { Subject } from '../entities/subject.entity';
export interface CreateSubjectDto {
    code: string;
    name: string;
    teachingPeriods?: number;
}
export declare class SubjectsService {
    private readonly repo;
    constructor(repo: Repository<Subject>);
    create(dto: CreateSubjectDto): Promise<Subject>;
    findAll(): Promise<Subject[]>;
    findOne(id: string): Promise<Subject>;
    update(id: string, partial: Partial<CreateSubjectDto>): Promise<Subject>;
    remove(id: string): Promise<void>;
}
