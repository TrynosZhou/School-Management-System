# Parent-Student Link Migration Guide

## What changed
We migrated from a junction table (`parent_students`) to a direct foreign key (`students.parentId`) to enforce true one-parent-to-many-students relationship.

## Steps to complete migration

### 1. Restart the API
The API will automatically create the new `parentId` column in the `students` table on startup (thanks to `synchronize: true` in TypeORM config).

```bash
cd api
npm run start:dev
# or restart however you normally run the API
```

### 2. Run the migration endpoint

**Option A: Via REST API**
Login as admin and call:
```
POST http://localhost:3000/api/parents/admin/migrate-links
Authorization: Bearer <admin_jwt_token>
```

This will copy all existing links from `parent_students` to `students.parentId`.

**Option B: Via script**
```bash
cd api
npx ts-node src/scripts/migrate-parent-links.ts
```

### 3. Verify
- Login as a parent at `/parent/login`
- Navigate to `/parent/parent_student`
- Click Refresh
- Linked students should now appear in the list

### 4. Test linking a new student
- On `/parent/parent_student` page
- Enter Student ID, Last Name, and DOB
- Click Link
- Student should appear immediately

## What the migration does
- Reads all rows from `parent_students` table
- Sets `student.parent = parent` for each link
- Saves the updated student records
- Returns count of migrated links

## After successful migration
Once verified, you can optionally drop the `parent_students` table:
```sql
DROP TABLE parent_students;
```

But it's safe to keep it as a backup until you're fully confident.

## Rollback (if needed)
If you need to rollback, the migration file at `api/src/migrations/1730130000000-AddParentToStudents.ts` has a `down()` method that will:
- Copy data back from `students.parentId` to `parent_students`
- Drop the `parentId` column
