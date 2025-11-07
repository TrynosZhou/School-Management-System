import { Student } from '../entities/student.entity';
import { ClassEntity } from '../entities/class.entity';
import { Subject } from '../entities/subject.entity';
export declare class Mark {
    id: string;
    student: Student;
    klass: ClassEntity;
    subject?: Subject | null;
    session: string;
    examType?: string | null;
    score: string;
    comment?: string | null;
    grade?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
