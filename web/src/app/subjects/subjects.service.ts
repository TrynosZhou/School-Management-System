import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Subject {
  id: string;
  code: string;
  name: string;
  teachingPeriods?: number;
}

@Injectable({ providedIn: 'root' })
export class SubjectsService {
  private http = inject(HttpClient);
  private baseUrl = '/api/subjects';

  list(): Observable<Subject[]> {
    return this.http.get<Subject[]>(this.baseUrl);
  }

  get(id: string): Observable<Subject> {
    return this.http.get<Subject>(`${this.baseUrl}/${id}`);
  }

  create(body: Partial<Subject>): Observable<Subject> {
    return this.http.post<Subject>(this.baseUrl, body);
  }

  update(id: string, body: Partial<Subject>): Observable<Subject> {
    return this.http.patch<Subject>(`${this.baseUrl}/${id}`, body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
