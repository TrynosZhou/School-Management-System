import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Student {
  id: string;
  studentId?: string | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  boardingStatus: 'day' | 'boarder';
  dob?: string | null;
  nationality?: string | null;
  religion?: string | null;
  address?: string | null;
  nextOfKin?: string | null;
  gender?: string | null;
  contactNumber?: string | null;
  isStaffChild?: boolean;
  takesMeals?: boolean;
  takesTransport?: boolean;
}

export interface Paged<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class StudentsService {
  private http = inject(HttpClient);
  private baseUrl = '/api/students';

  list(page = 1, limit = 20): Observable<Paged<Student>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<Paged<Student>>(this.baseUrl, { params });
  }

  get(id: string): Observable<Student> {
    return this.http.get<Student>(`${this.baseUrl}/${id}`);
  }

  create(body: Partial<Student> & { firstName: string; lastName: string; boardingStatus: 'day' | 'boarder' }): Observable<Student> {
    return this.http.post<Student>(this.baseUrl, body);
  }

  update(id: string, body: Partial<Student>): Observable<Student> {
    return this.http.patch<Student>(`${this.baseUrl}/${id}`, body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  uploadPhoto(id: string, file: File): Observable<{ success: boolean }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/${id}/photo`, form);
  }

  // Fetch enrollments for a student to derive current class
  getEnrollmentsByStudent(studentId: string): Observable<any[]> {
    return this.http.get<any[]>(`/api/enrollments/student/${studentId}`);
  }
}
