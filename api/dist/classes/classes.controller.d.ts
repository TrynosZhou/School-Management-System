import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
export declare class ClassesController {
    private readonly classes;
    constructor(classes: ClassesService);
    create(dto: CreateClassDto): Promise<import("../entities/class.entity").ClassEntity>;
    findAll(): Promise<import("../entities/class.entity").ClassEntity[]>;
    findOne(id: string): Promise<import("../entities/class.entity").ClassEntity>;
    update(id: string, partial: Partial<CreateClassDto>): Promise<import("../entities/class.entity").ClassEntity>;
    remove(id: string): Promise<void>;
    promoteAll(): Promise<{
        success: boolean;
        promoted: number;
        graduated: number;
    }>;
    normalizeNames(body: {
        defaultStream?: 'Blue' | 'White' | 'Gold';
    }): Promise<{
        success: boolean;
        updated: number;
    }>;
    ensure(body: {
        year: string;
        items: ({
            type: 'form';
            gradeNumber: number;
            stream: 'Blue' | 'White' | 'Gold';
        } | {
            type: 'alevel';
            band: 'Lower 6' | 'Upper 6';
            stream: 'Sci' | 'Comm' | 'Arts';
        })[];
    }): Promise<{
        success: boolean;
        created: number;
        existing: number;
    }>;
}
