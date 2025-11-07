import { Repository } from 'typeorm';
import { Teacher } from '../entities/teacher.entity';
export interface CreateTeacherDto {
    firstName: string;
    lastName: string;
    email: string;
    subjectTaught?: string | null;
    dateOfBirth?: string | null;
    startDate?: string | null;
    qualifications?: string | null;
    anyOtherQualification?: string | null;
    contactNumber?: string | null;
    physicalAddress?: string | null;
    nextOfKin?: string | null;
    gender?: string | null;
    anyOtherRole?: string | null;
}
export declare class TeachersService {
    private readonly repo;
    constructor(repo: Repository<Teacher>);
    create(dto: CreateTeacherDto): Promise<Teacher>;
    findAll(): Promise<Teacher[]>;
    findOne(id: string): Promise<Teacher>;
    update(id: string, partial: Partial<CreateTeacherDto>): Promise<Teacher>;
    remove(id: string): Promise<void>;
}
