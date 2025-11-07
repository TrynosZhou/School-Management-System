# Marks API Endpoint Fix

## Problem
When clicking a student ID in the Remarks Manager to view the report card modal, the following error occurred:
```
Failed to load report card data: Cannot GET /api/marks?studentId=496a03a7-9384-416a-a292-5e9d558438a3&term=Term%201&examType=End%20of%20Term
```

## Root Cause
The marks controller (`api/src/marks/marks.controller.ts`) did not have a GET endpoint that accepts query parameters for:
- `studentId`
- `term` 
- `examType`

The frontend was trying to call `GET /api/marks?studentId=X&term=Y`, but this route didn't exist.

## Solution

### 1. Added New API Endpoint

**File:** `api/src/marks/marks.controller.ts`

Added a new GET endpoint at line 214:

```typescript
// Get marks by student ID with optional term and examType filters
@UseGuards(BearerGuard)
@Get()
async getMarksByStudent(
  @Query('studentId') studentId?: string,
  @Query('term') term?: string,
  @Query('examType') examType?: string
) {
  if (!studentId) {
    return [];
  }

  const where: any = { student: { id: studentId } };
  if (term) where.session = Like(`%${term}%`);
  if (examType) where.examType = examType;

  const marks = await this.marks.find({ 
    where, 
    order: { session: 'ASC' },
    relations: ['student', 'subject', 'klass']
  });

  return marks;
}
```

**Features:**
- Protected with `BearerGuard` (requires authentication)
- Returns empty array if no `studentId` provided
- Filters by `term` using LIKE pattern matching (e.g., "Term 1" matches "2025 Term 1")
- Optionally filters by `examType`
- Includes relations for `student`, `subject`, and `klass` (class)
- Orders results by session ascending

### 2. Fixed Frontend Data Mapping

**File:** `web/src/app/reports/remarks-manager.component.ts`

Updated line 719-720 to correctly map the API response:

```typescript
const subjectMarks: SubjectMark[] = marks.map(m => ({
  subject: m.subject?.name || 'Unknown',
  mark: Number(m.score) || 0,  // API uses 'score' not 'mark'
  grade: m.grade || this.calculateGrade(Number(m.score) || 0),  // Use API grade if available
  position: m.position
}));
```

**Changes:**
- Changed `m.mark` to `m.score` (API field name)
- Use API-provided `m.grade` if available, fallback to client-side calculation
- Properly handle missing/null values

## How to Test

### 1. Restart the API Server
```bash
cd api
npm run start:dev
# Or if using Docker: docker compose restart api
```

### 2. Test the Endpoint Directly
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/marks?studentId=496a03a7-9384-416a-a292-5e9d558438a3&term=Term%201"
```

Expected response: Array of mark objects with subject, score, grade, etc.

### 3. Test in the UI
1. Go to http://localhost:4200/reports/remarks-manager
2. Select Class and Term
3. Click "Load Students"
4. Click on any **Student ID** (blue, underlined)
5. Modal should open and display:
   - Loading spinner
   - Student information
   - **Marks table with all subjects and grades** ✅
   - Total marks
   - Average percentage
   - Remark entry fields

## API Response Format

```json
[
  {
    "id": "mark-uuid",
    "score": "85",
    "grade": "A",
    "comment": null,
    "session": "2025 Term 1",
    "examType": "End of Term",
    "student": {
      "id": "student-uuid",
      "firstName": "John",
      "lastName": "Doe"
    },
    "subject": {
      "id": "subject-uuid",
      "name": "Mathematics"
    },
    "klass": {
      "id": "class-uuid",
      "name": "Form 1 Blue"
    },
    "createdAt": "2025-11-01T12:00:00.000Z",
    "updatedAt": "2025-11-01T12:00:00.000Z"
  }
]
```

## Files Modified

1. **`api/src/marks/marks.controller.ts`**
   - Added new `GET /api/marks` endpoint (23 lines)
   - Positioned before `GET /sessions` to ensure proper route matching

2. **`web/src/app/reports/remarks-manager.component.ts`**
   - Fixed data mapping from `m.mark` to `m.score`
   - Added fallback to API-provided grades

## Security

- Endpoint is protected with `BearerGuard`
- Requires valid JWT token
- Teachers/principals can access marks for their students
- No additional authorization checks (assumes marks are accessible to authenticated staff)

## Edge Cases Handled

- **No studentId**: Returns empty array
- **No marks found**: Returns empty array (handled in frontend with "No marks recorded" message)
- **Missing subject**: Shows "Unknown" subject name
- **Invalid score**: Defaults to 0
- **Term pattern matching**: Uses LIKE to match partial terms (e.g., "Term 1" matches "2025 Term 1")

## Alternative Solutions Considered

1. **Use existing class/session endpoint**: Would require knowing the class ID, which adds complexity
2. **Create dedicated student marks endpoint**: More RESTful but requires new route structure
3. **Add to reports controller**: Would duplicate marks logic

**Selected approach**: Add simple query-based endpoint to marks controller - cleanest and most flexible.

## Related Issues

This fix resolves the modal error and enables the full workflow:
1. ✅ Click student ID
2. ✅ Load marks from API
3. ✅ Display grades in table
4. ✅ Calculate totals and average
5. ✅ Write informed remarks based on performance
6. ✅ Save remarks to database

## Summary

The marks API now supports fetching student marks by ID with term and exam type filters. The modal in the Remarks Manager can successfully load and display student grades, enabling teachers and principals to write context-aware, informed remarks.

---
**Fixed:** Nov 1, 2025  
**Status:** ✅ Ready to Test (requires API server restart)
