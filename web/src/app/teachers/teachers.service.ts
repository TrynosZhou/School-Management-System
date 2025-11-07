import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  subjectTaught?: string | null;
  dateOfBirth?: string | null;
  startDate?: string | null;
  qualifications?: string | null;
  anyOtherQualification?: string | null;
  contactNumber?: string | null;
  physicalAddress?: string | null;
  nextOfKin?: string | null;
  gender?: string | null;
  anyOtherRole?: string | null;
}

@Injectable({ providedIn: 'root' })
export class TeachersService {
  private http = inject(HttpClient);
  private baseUrl = '/api/teachers';

  list(): Observable<Teacher[]> {
    return this.http.get<Teacher[]>(this.baseUrl);
  }

  get(id: string): Observable<Teacher> {
    return this.http.get<Teacher>(`${this.baseUrl}/${id}`);
  }

  create(body: Partial<Teacher>): Observable<Teacher> {
    return this.http.post<Teacher>(this.baseUrl, body);
  }

  update(id: string, body: Partial<Teacher>): Observable<Teacher> {
    return this.http.patch<Teacher>(`${this.baseUrl}/${id}`, body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
