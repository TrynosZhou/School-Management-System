import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AttendanceRecord {
  id?: string;
  studentId: string;
  classId?: string;
  date: string; // YYYY-MM-DD
  term?: string;
  present: boolean;
}

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private http = inject(HttpClient);
  private baseUrl = '/api/attendance';

  record(body: AttendanceRecord): Observable<any> {
    return this.http.post(`${this.baseUrl}/record`, body);
  }

  list(params: { studentId?: string; term?: string; from?: string; to?: string }): Observable<any[]> {
    const q = new URLSearchParams();
    if (params.studentId) q.set('studentId', params.studentId);
    if (params.term) q.set('term', params.term);
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    return this.http.get<any[]>(`${this.baseUrl}/list?${q.toString()}`);
  }

  summary(params: { studentId: string; term?: string; from?: string; to?: string }): Observable<{ total: number; present: number }> {
    const q = new URLSearchParams();
    q.set('studentId', params.studentId);
    if (params.term) q.set('term', params.term);
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    return this.http.get<{ total: number; present: number }>(`${this.baseUrl}/summary?${q.toString()}`);
  }
}
