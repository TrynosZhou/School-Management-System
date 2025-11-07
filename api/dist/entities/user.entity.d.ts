export declare enum UserStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE"
}
export declare class User {
    id: string;
    email: string;
    passwordHash: string;
    status: UserStatus;
    role?: string;
    fullName?: string | null;
    contactNumber?: string | null;
    modulesJson?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
