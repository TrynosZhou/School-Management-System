import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ParentsService {
  private http = inject(HttpClient);
  private baseUrl = '/api/parents';
  private reportsUrl = '/api/reports';

  myStudents() {
    const url = `${this.baseUrl}/my-students`;
    const bust = `_=${Date.now()}`;
    const sep = url.includes('?') ? '&' : '?';
    const fullUrl = `${url}${sep}${bust}`;
    console.log('Fetching linked students from:', fullUrl);
    return this.http.get<Array<{ id: string; studentId?: string | null; firstName: string; lastName: string }>>(fullUrl);
  }

  linkStudent(input: { studentIdOrCode: string; lastName: string; dob?: string }) {
    return this.http.post(`${this.baseUrl}/link-student`, input);
  }

  redeem(code: string) {
    return this.http.post(`${this.baseUrl}/redeem`, { code });
  }

  adminCreateInvite(studentId: string, expiresAt?: string) {
    return this.http.post<{ code: string }>(`${this.baseUrl}/admin/create-invite`, { studentId, expiresAt });
  }

  adminListLinked(studentId: string) {
    return this.http.get<Array<{ id: string; email: string }>>(`${this.baseUrl}/admin/linked`, { params: { studentId } });
  }

  async fetchReportBlob(studentId: string, term?: string): Promise<Blob | null> {
    const params: any = {}; if (term) params.term = term;
    const url = `${this.reportsUrl}/parent/report-card/${encodeURIComponent(studentId)}`;
    try {
      const blob = await this.http.get(url, { params, responseType: 'blob' as const }).toPromise();
      return blob || null;
    } catch { return null; }
  }

  unlink(studentId: string) {
    const urlPost = `${this.baseUrl}/unlink`;
    // Always use POST for broader compatibility (some environments block DELETE or DELETE bodies)
    return this.http.post<{ ok: true }>(urlPost, { studentId: studentId, studentIdOrCode: studentId });
  }

  unlinkByCode(studentIdOrCode: string) {
    const urlPost = `${this.baseUrl}/unlink`;
    return this.http.post<{ ok: true }>(urlPost, { studentIdOrCode, studentId: studentIdOrCode });
  }

  softDeleteById(studentId: string){
    const urlPost = `${this.baseUrl}/soft-delete`;
    return this.http.post<{ ok: true }>(urlPost, { studentId });
  }

  softDeleteByCode(studentIdOrCode: string){
    const urlPost = `${this.baseUrl}/soft-delete`;
    return this.http.post<{ ok: true }>(urlPost, { studentIdOrCode });
  }

  adminParentsWithLinks() {
    return this.http.get<Array<{
      parentId: string;
      parentFullName: string | null;
      parentEmail: string | null;
      parentContactNumber: string | null;
      studentId: string;
      studentCode: string | null;
      studentFullName: string;
    }>>(`${this.baseUrl}/admin/parents-with-links`);
  }

  adminParentsAll() {
    return this.http.get<Array<{
      parentId: string;
      parentFullName: string | null;
      parentEmail: string | null;
      parentContactNumber: string | null;
      studentId: string | null;
      studentCode: string | null;
      studentFullName: string | null;
    }>>(`${this.baseUrl}/admin/parents-all`);
  }

  adminLink(parentId: string, studentIdOrCode: string) {
    return this.http.post<{ ok: true }>(`${this.baseUrl}/admin/link`, { parentId, studentIdOrCode });
  }

  adminUnlink(parentId: string, studentId: string) {
    return this.http.post<{ ok: true }>(`${this.baseUrl}/admin/unlink`, { parentId, studentId });
  }

  adminDeleteParent(parentId: string) {
    return this.http.post<{ ok: true }>(`${this.baseUrl}/admin/delete-parent`, { parentId });
  }
}
