import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ClassEntity {
  id: string;
  name: string;
  gradeLevel: string;
  academicYear: string;
  classTeacher?: { id: string; firstName: string; lastName: string } | null;
}

export interface CreateClassPayload {
  name: string;
  gradeLevel: string;
  academicYear: string;
  teacherId?: string;
}

@Injectable({ providedIn: 'root' })
export class ClassesService {
  private http = inject(HttpClient);
  private baseUrl = '/api/classes';

  list(): Observable<ClassEntity[]> {
    return this.http.get<ClassEntity[]>(this.baseUrl);
  }

  get(id: string): Observable<ClassEntity> {
    return this.http.get<ClassEntity>(`${this.baseUrl}/${id}`);
  }

  create(body: CreateClassPayload): Observable<ClassEntity> {
    return this.http.post<ClassEntity>(this.baseUrl, body);
  }

  update(id: string, body: Partial<CreateClassPayload>): Observable<ClassEntity> {
    return this.http.patch<ClassEntity>(`${this.baseUrl}/${id}`, body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
