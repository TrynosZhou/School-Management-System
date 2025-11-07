import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CaptureEntry { studentId: string; score: string; comment?: string | null }
export interface CapturePayload { session: string; examType?: string; classId: string; subjectId?: string; entries: CaptureEntry[] }
export interface GradeBand { grade: string; min: number; max: number }
export interface CategoryGradeBands { category: string; bands: GradeBand[] }

@Injectable({ providedIn: 'root' })
export class MarksService {
  private http = inject(HttpClient);
  private baseUrl = '/api/marks';

  capture(payload: CapturePayload): Observable<{ success: boolean; saved?: number; message?: string }> {
    return this.http.post<{ success: boolean; saved?: number; message?: string }>(`${this.baseUrl}/capture`, payload);
  }

  getGradeBands(): Observable<CategoryGradeBands[]> {
    return this.http.get<CategoryGradeBands[]>(`${this.baseUrl}/grades`);
  }

  saveGradeBands(payload: CategoryGradeBands[]): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(`${this.baseUrl}/grades`, payload);
  }

  recomputeGrades(): Observable<{ success: boolean; total: number; updated: number; message?: string }> {
    return this.http.post<{ success: boolean; total: number; updated: number; message?: string }>(`${this.baseUrl}/recompute-grades`, {});
  }
}
