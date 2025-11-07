import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TeachingAssignment {
  id: string;
  teacher: { id: string; firstName: string; lastName: string };
  klass: { id: string; name: string; academicYear: string };
  subject?: { id: string; code: string; name: string } | null;
  status: 'active' | 'inactive';
}

@Injectable({ providedIn: 'root' })
export class TeachingService {
  private http = inject(HttpClient);
  private baseUrl = '/api/teaching';

  assign(body: { teacherId: string; classId: string; subjectId?: string | null; status: 'active' | 'inactive' }): Observable<{ success: boolean; id?: string; message?: string }> {
    return this.http.post<{ success: boolean; id?: string; message?: string }>(`${this.baseUrl}/assign`, body);
  }

  listForClass(classId: string): Observable<TeachingAssignment[]> {
    return this.http.get<TeachingAssignment[]>(`${this.baseUrl}/class/${classId}`);
  }

  listForTeacher(teacherId: string): Observable<TeachingAssignment[]> {
    return this.http.get<TeachingAssignment[]>(`${this.baseUrl}/teacher/${teacherId}`);
  }

  listMine(): Observable<TeachingAssignment[]> {
    return this.http.get<TeachingAssignment[]>(`${this.baseUrl}/my-assignments`);
  }

  listClassesForTeacher(teacherId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/teacher/${teacherId}/classes`);
  }

  unassign(body: { teacherId: string; classId: string }){
    return this.http.request<{ success: boolean; removed?: number; message?: string }>('DELETE', `${this.baseUrl}/assign`, { body });
  }

  unassignOne(body: { teacherId: string; classId: string; subjectId: string }){
    return this.http.request<{ success: boolean; removed?: number; message?: string }>('DELETE', `${this.baseUrl}/assign/one`, { body });
  }
}
