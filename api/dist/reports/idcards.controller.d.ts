import type { Response } from 'express';
import { Repository } from 'typeorm';
import { Student } from '../entities/student.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { Settings } from '../settings/settings.entity';
import { AccountSettings } from '../accounts/account-settings.entity';
export declare class IdCardsController {
    private readonly students;
    private readonly enrollRepo;
    private readonly settingsRepo;
    private readonly accountSettingsRepo;
    constructor(students: Repository<Student>, enrollRepo: Repository<Enrollment>, settingsRepo: Repository<Settings>, accountSettingsRepo: Repository<AccountSettings>);
    byClass(classId: string, res: Response): Promise<void>;
}
