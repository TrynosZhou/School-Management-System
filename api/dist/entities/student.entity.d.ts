import { User } from './user.entity';
import { Enrollment } from './enrollment.entity';
export declare class Student {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    studentId?: string | null;
    boardingStatus: 'day' | 'boarder';
    isStaffChild: boolean;
    takesMeals: boolean;
    takesTransport: boolean;
    user?: User | null;
    parent?: User | null;
    enrollments: Enrollment[];
    dob?: string | null;
    nationality?: string | null;
    religion?: string | null;
    address?: string | null;
    nextOfKin?: string | null;
    gender?: string | null;
    contactNumber?: string | null;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}
