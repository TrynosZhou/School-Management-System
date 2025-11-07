import { SubjectsService } from './subjects.service';
import type { CreateSubjectDto } from './subjects.service';
export declare class SubjectsController {
    private readonly subjects;
    constructor(subjects: SubjectsService);
    create(dto: CreateSubjectDto): Promise<import("../entities/subject.entity").Subject>;
    findAll(): Promise<import("../entities/subject.entity").Subject[]>;
    findOne(id: string): Promise<import("../entities/subject.entity").Subject>;
    update(id: string, partial: Partial<CreateSubjectDto>): Promise<import("../entities/subject.entity").Subject>;
    remove(id: string): Promise<void>;
}
