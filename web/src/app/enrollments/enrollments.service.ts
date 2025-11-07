import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Enrollment {
  id: string;
  studentId: string;
  classId: string;
  startDate?: string | null;
  status?: 'active' | 'completed' | 'withdrawn';
  student?: { id: string; studentId?: string | null; firstName: string; lastName: string; dob?: string | null; gender?: string | null; contactNumber?: string | null; email?: string };
  classEntity?: { id: string; name: string; gradeLevel?: string; academicYear: string };
}

@Injectable({ providedIn: 'root' })
export class EnrollmentsService {
  private http = inject(HttpClient);
  private baseUrl = '/api/enrollments';

  create(body: { studentId: string; classId: string; startDate?: string | null; status?: string }): Observable<Enrollment> {
    return this.http.post<Enrollment>(this.baseUrl, body);
  }

  listByStudent(studentId: string): Observable<Enrollment[]> {
    return this.http.get<Enrollment[]>(`${this.baseUrl}/student/${studentId}`);
  }

  listByClass(classId: string): Observable<Enrollment[]> {
    return this.http.get<Enrollment[]>(`${this.baseUrl}/class/${classId}`);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  listRecent(limit = 5): Observable<Enrollment[]> {
    return this.http.get<Enrollment[]>(`${this.baseUrl}/recent`, { params: { limit: String(limit) } as any });
  }
}
