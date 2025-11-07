import { TeachersService } from './teachers.service';
import type { CreateTeacherDto } from './teachers.service';
export declare class TeachersController {
    private readonly teachers;
    constructor(teachers: TeachersService);
    create(dto: CreateTeacherDto): Promise<import("../entities/teacher.entity").Teacher>;
    createSelf(req: any, partial: Partial<CreateTeacherDto>): Promise<import("../entities/teacher.entity").Teacher>;
    findAll(): Promise<import("../entities/teacher.entity").Teacher[]>;
    findOne(id: string): Promise<import("../entities/teacher.entity").Teacher>;
    update(id: string, partial: Partial<CreateTeacherDto>): Promise<import("../entities/teacher.entity").Teacher>;
    remove(id: string): Promise<void>;
}
