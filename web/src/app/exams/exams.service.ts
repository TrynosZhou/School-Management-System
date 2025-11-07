import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface ExamDto {
  id: string;
  name: string;
  term?: string | null;
  academicYear?: string | null;
  subject?: { id: string; name: string; code?: string } | null;
  classEntity?: { id: string; name: string; academicYear?: string } | null;
  dateTime?: string | null;
  venue?: string | null;
  status?: 'scheduled' | 'completed' | 'cancelled';
  notes?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ExamsService {
  private http = inject(HttpClient);
  private base = '/api/exams';

  list(opts?: { classId?: string; subjectId?: string; from?: string; to?: string; q?: string }) {
    const params: any = {};
    if (opts?.classId) params.classId = opts.classId;
    if (opts?.subjectId) params.subjectId = opts.subjectId;
    if (opts?.from) params.from = opts.from;
    if (opts?.to) params.to = opts.to;
    if (opts?.q) params.q = opts.q;
    return this.http.get<ExamDto[]>(this.base, { params });
  }

  create(body: { name: string; term?: string; academicYear?: string; subjectId?: string; classId?: string; date?: string; time?: string; venue?: string; invigilator1Id?: string; invigilator2Id?: string; status?: string; notes?: string }) {
    return this.http.post<ExamDto>(this.base, body);
  }

  exportCsv(opts?: { classId?: string; subjectId?: string; from?: string; to?: string; q?: string }) {
    const params: any = {};
    if (opts?.classId) params.classId = opts.classId;
    if (opts?.subjectId) params.subjectId = opts.subjectId;
    if (opts?.from) params.from = opts.from;
    if (opts?.to) params.to = opts.to;
    if (opts?.q) params.q = opts.q;
    return this.http.get(`${this.base}/export.csv`, { params, responseType: 'blob' as const });
  }

  finalize(id: string) {
    return this.http.post(`${this.base}/${encodeURIComponent(id)}/finalize`, {});
  }
}
