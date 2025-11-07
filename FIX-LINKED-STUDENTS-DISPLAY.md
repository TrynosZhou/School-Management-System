# Fix: Linked Students Not Displaying

## Problem
After linking a student (e.g., JHS0000002), the parent dashboard still shows "No linked students yet."

## Root Cause
The service methods weren't properly loading the `parent` relation when fetching/saving students, and some methods were still using the old `parent_students` junction table instead of the new `students.parentId` FK.

## Solution Applied
Updated all parent-student operations to:
1. Load the `parent` relation when fetching students
2. Use `students.parentId` FK instead of junction table
3. Properly save the parent relationship

## What Was Fixed

### Backend Service Methods (api/src/parents/parents.service.ts)
- ✅ `linkStudent()` - now loads parent relation before checking/saving
- ✅ `adminLink()` - loads parent relation
- ✅ `adminUnlink()` - loads parent relation
- ✅ `unlink()` - completely rewritten to use students.parent
- ✅ `parentEmailsForStudents()` - uses students with parent relation
- ✅ `parentEmailsAll()` - queries students where parent is not null
- ✅ `adminParentsWithLinks()` - fetches from students with parent
- ✅ `adminParentsAllFlat()` - updated to use new schema
- ✅ Added imports: `Not`, `IsNull` from typeorm

### Display Requirements
The frontend already shows:
- Full name: `{{ s.firstName }} {{ s.lastName }}`
- Student ID: `{{ s.studentId }}`
- Current invoice balance: fetched from accounts service

## Steps to Apply Fix

### 1. Restart the API
```bash
cd c:\Users\DELL\Desktop\schoolPro\api
# Stop current API process (Ctrl+C)
npm run start:dev
```

Wait for "Nest application successfully started"

### 2. Test Linking
- Login as parent at `/parent/login`
- Go to `/parent/parent_student`
- Enter:
  - Student ID: JHS0000002
  - Last Name: Gudo
  - DOB: 2009-04-10
- Click Link

### 3. Verify Display
- After linking, the student should appear immediately in the "Linked Students" list
- You should see:
  - Full name: "Gudo [FirstName]" (lastName + firstName)
  - Student ID: JHS0000002
  - Current invoice balance: calculated from unpaid invoices

### 4. Check Network Tab
If still not showing:
- Open DevTools → Network
- Look for GET `/api/parents/my-students?_=...`
- Should return 200 with array like:
```json
[{
  "id": "uuid...",
  "studentId": "JHS0000002",
  "firstName": "...",
  "lastName": "Gudo",
  "balance": 0
}]
```

## Troubleshooting

### If student still doesn't appear after linking:
1. Check the DB directly:
```sql
SELECT id, studentId, firstName, lastName, parentId 
FROM students 
WHERE studentId = 'JHS0000002';
```
The `parentId` column should contain the parent's user ID (JWT sub).

2. If `parentId` is NULL, the save didn't work. Check API logs for errors.

3. Verify the parent JWT token:
- Open browser DevTools → Application → Local Storage
- Copy `access_token` and decode at jwt.io
- Verify the `sub` field matches the parent's user ID in the database

### If balance doesn't show:
The balance is calculated from `fee_invoices` where `status <> 'paid'`. 
If the student has no invoices or all are paid, balance will be 0.

## Migration Note
If you already have existing links in the `parent_students` table, run:
```bash
POST http://localhost:3000/api/parents/admin/migrate-links
Authorization: Bearer <admin_token>
```

This copies links from the junction table to `students.parentId`.
