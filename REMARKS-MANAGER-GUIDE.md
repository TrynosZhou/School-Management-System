# Report Card Remarks Manager - User Guide

## Overview
The **Remarks Manager** is a comprehensive UI for adding and managing teacher and principal remarks for student report cards. This is required for parents to access their children's report cards.

## Why This is Needed
When a parent logs in and tries to view a report card, the system checks:
1. ✅ Parent is linked to the student
2. ✅ No outstanding arrears for the term
3. ✅ **Both teacher AND principal remarks are present**
4. ✅ **Status is set to `ready_for_pdf`**

If any of these fail, the parent gets a **403 Forbidden** error with a message like:
- "This report card is not yet ready. Remarks are pending."
- "This report card is temporarily unavailable due to outstanding arrears."

## How to Access
1. Log in as **Admin** or **Teacher**
2. Navigate to **Reports → Remarks Manager** from the navigation menu
3. Or visit: `http://localhost:4200/reports/remarks-manager`

## Features

### 📌 Filters
- **Class** (required): Select the class
- **Term** (required): Choose Term 1, 2, or 3
- **Exam Type** (optional): Filter by Midterm or End of Term

### 📊 Dashboard Stats
- **Ready for Parents**: Count of students with complete remarks
- **Pending**: Count of students missing remarks
- **Total Students**: Total number of students in the class

### ✏️ Inline Editing
- Click on any student row to expand and edit
- Add/edit teacher remarks (e.g., "Excellent performance. Keep it up!")
- Add/edit principal remarks (e.g., "Well done. Continue to excel.")
- Character count shown for each remark
- Visual indicators for empty or short remarks

### 💾 Save Options
- **Individual Save**: Click "💾 Save" on each student
- **Save All Changes**: Batch save all modified remarks at once

### ✅ Auto-Status Update
The API automatically sets status to `ready_for_pdf` when BOTH remarks are present. Once status is ready:
- The report card becomes accessible to parents
- Parents won't see the "not yet ready" error

### 📖 Bulk Actions
- **Expand All**: Open all student records for editing
- **Collapse All**: Close all student records

## Quick Workflow

### First Time Setup
1. Select **Class** and **Term**
2. Click **🔍 Load Students**
3. Click **📖 Expand All** to see all students
4. Add teacher and principal remarks for each student
5. Click **💾 Save All Changes**
6. Verify stats show all students as "Ready"

### Update Existing Remarks
1. Load the class/term
2. Click on individual student to expand
3. Edit the remarks
4. Click **💾 Save** for that student

## Parent Access Flow
Once remarks are saved and status is `ready_for_pdf`:

1. Parent logs in at `/parent/login`
2. Parent dashboard shows linked students
3. Parent clicks "View Report Card"
4. API checks:
   - ✅ Parent-student linkage
   - ✅ Fee balance
   - ✅ Remarks present and status ready
5. Report card PDF is generated and displayed

## API Endpoints Used
- `GET /api/enrollments/by-class/:classId` - Get students in class
- `GET /api/reports/remarks?studentId=X&term=Y` - Fetch existing remarks
- `PUT /api/reports/remarks` - Save/update remarks

## Troubleshooting

### "No students found"
- Ensure students are enrolled in the selected class
- Check class selection is correct

### Parent still sees "not ready" error
- Verify both teacher AND principal remarks are filled
- Check that status shows "✅ Ready" in the manager
- Reload parent dashboard to refresh

### Changes not saving
- Check browser console for errors
- Verify API is running on port 3000
- Ensure you're logged in as admin/teacher

## Related Pages
- **Remarks Readiness** (`/reports/remarks-readiness`): View-only dashboard showing status
- **Report Card Viewer** (`/reports/report-card/:id/view`): Preview generated PDFs

## Summary
The Remarks Manager provides a streamlined interface for school staff to add the required remarks for parent report card access. Both teacher and principal remarks must be completed for each student/term before parents can view the report cards.

---
**Created:** Nov 1, 2025  
**Route:** `/reports/remarks-manager`  
**Access:** Admin and Teachers only
