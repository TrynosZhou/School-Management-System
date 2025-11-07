import { Teacher } from '../entities/teacher.entity';
import { ClassEntity } from '../entities/class.entity';
import { Subject } from '../entities/subject.entity';
export declare class TeachingAssignment {
    id: string;
    teacher: Teacher;
    klass: ClassEntity;
    subject?: Subject | null;
    status: 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
}
