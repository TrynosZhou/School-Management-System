import { ClassEntity } from '../entities/class.entity';
import { Subject } from '../entities/subject.entity';
import { Teacher } from '../entities/teacher.entity';
export declare class ExamEntity {
    id: string;
    name: string;
    term: string | null;
    academicYear: string | null;
    subject?: Subject | null;
    classEntity?: ClassEntity | null;
    dateTime: Date | null;
    venue: string | null;
    invigilator1?: Teacher | null;
    invigilator2?: Teacher | null;
    status: 'scheduled' | 'completed' | 'cancelled';
    notes: string | null;
    finalizedAt: Date | null;
}
