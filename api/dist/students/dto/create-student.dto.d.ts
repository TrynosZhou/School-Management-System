export declare class CreateStudentDto {
    firstName: string;
    lastName: string;
    email?: string | null;
    userId?: string;
    dob?: string | null;
    nationality?: string | null;
    religion?: string | null;
    address?: string | null;
    nextOfKin?: string | null;
    gender?: string | null;
    boardingStatus: 'day' | 'boarder';
    contactNumber?: string | null;
    isStaffChild?: boolean;
    takesMeals?: boolean;
    takesTransport?: boolean;
}
