import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private http = inject(HttpClient);
  private baseUrl = '/api/reports';
  private authHeaders(){
    const token = localStorage.getItem('access_token') || '';
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  getTeachingPeriodsJson() {
    return this.http.get<any[]>(`${this.baseUrl}/teaching-periods/json`, { headers: this.authHeaders() });
  }

  async downloadTeachingPeriodsPdf() {
    const blob = await this.http.get(`${this.baseUrl}/teaching-periods/pdf`, { responseType: 'blob' as const, headers: this.authHeaders() }).toPromise();
    if (!blob) return;
    await this.downloadBlob(blob, 'teaching-periods.pdf');
  }

  async downloadTeachingPeriodsCsv() {
    const blob = await this.http.get(`${this.baseUrl}/teaching-periods/csv`, { responseType: 'blob' as const, headers: this.authHeaders() }).toPromise();
    if (!blob) return;
    await this.downloadBlob(blob, 'teaching-periods.csv');
  }

  async openStudentIdsByClass(classId: string) {
    const blob = await this.http.get(`${this.baseUrl}/student-id-cards/by-class`, {
      params: { classId },
      responseType: 'blob' as const,
      headers: this.authHeaders(),
    }).toPromise();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  async downloadReportCard(studentId: string, term?: string, examType?: string) {
    const params: any = {};
    if (term) params.term = term;
    if (examType) params.examType = examType;
    const resp = await this.http.get(`${this.baseUrl}/report-card/${studentId}` as string, {
      params,
      responseType: 'blob' as const,
      headers: this.authHeaders(),
      observe: 'response' as const,
    }).toPromise();
    if (!resp || !resp.body) return;
    const blob = resp.body;
    // Try to read filename from Content-Disposition
    const cd = resp.headers.get('Content-Disposition') || resp.headers.get('content-disposition') || '';
    const match = /filename\s*=\s*"?([^";]+)"?/i.exec(cd);
    let filename = match ? match[1] : '';
    if (!filename) {
      try {
        // Try to fetch student's full name for a friendly filename
        const student: any = await this.http.get(`/api/students/${encodeURIComponent(studentId)}`, { headers: this.authHeaders() }).toPromise();
        const s = (student && (student as any).student) || student || {};
        const full = `${s.firstName || ''} ${s.lastName || ''}`.trim();
        if (full) filename = `${full}.pdf`;
      } catch {}
    }
    if (!filename) filename = 'report-card.pdf';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Honours roll by grade
  getHonoursByGradeJson(gradeLevel: string, term: string, examType: string, academicYear?: string, stream?: string) {
    const params: any = { gradeLevel, term, examType };
    if (academicYear) params.academicYear = academicYear;
    if (stream) params.stream = stream;
    return this.http.get<any>(`${this.baseUrl}/honours-roll/grade/json`, { params, headers: this.authHeaders() });
  }

  async downloadHonoursByGradeCsv(gradeLevel: string, term: string, examType: string, academicYear?: string, stream?: string) {
    const params: any = { gradeLevel, term, examType };
    if (academicYear) params.academicYear = academicYear;
    if (stream) params.stream = stream;
    const blob = await this.http.get(`${this.baseUrl}/honours-roll/grade/csv`, {
      params,
      responseType: 'blob' as const,
      headers: this.authHeaders(),
    }).toPromise();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `honours-grade-${gradeLevel}-${term}${stream ? '-' + stream : ''}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async getReportCardBlob(studentId: string, term?: string, examType?: string) {
    const params: any = {};
    if (term) params.term = term;
    if (examType) params.examType = examType;
    const blob = await this.http.get(`${this.baseUrl}/report-card/${studentId}` as string, {
      params,
      responseType: 'blob' as const,
      headers: this.authHeaders(),
    }).toPromise();
    return blob || null;
  }

  getRemarks(studentId: string, term?: string, examType?: string) {
    const params: any = { studentId };
    if (term) params.term = term;
    if (examType) params.examType = examType;
    console.log('📖 getRemarks called with params:', params);
    return this.http.get<any>(`${this.baseUrl}/remarks`, { params, headers: this.authHeaders() });
  }

  saveRemarks(input: { studentId: string; term?: string; examType?: string; teacherRemark?: string; principalRemark?: string }) {
    console.log('📤 ReportService.saveRemarks called with:', input);
    return this.http.put<{ ok: boolean; id?: string; error?: string }>(`${this.baseUrl}/remarks`, input, { headers: this.authHeaders() });
  }

  publishReports(classId: string, term: string, examType?: string) {
    const body: any = { classId, term };
    if (examType) body.examType = examType;
    return this.http.post(`${this.baseUrl}/publish`, body, { responseType: 'blob' as const, observe: 'response', headers: this.authHeaders() });
  }

  async downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  async openStudentIdCard(studentId: string) {
    const blob = await this.http.get(`${this.baseUrl}/student-id-card/${studentId}` as string, {
      responseType: 'blob' as const,
      headers: this.authHeaders(),
    }).toPromise();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  async getStudentIdCardBlob(studentId: string) {
    const blob = await this.http.get(`${this.baseUrl}/student-id-card/${studentId}` as string, {
      responseType: 'blob' as const,
      headers: this.authHeaders(),
    }).toPromise();
    return blob || null;
  }

  async downloadMarksheetPdf(classId: string, term: string) {
    const blob = await this.http.get(`${this.baseUrl}/marksheet/pdf`, {
      params: { classId, term },
      responseType: 'blob' as const,
      headers: this.authHeaders(),
    }).toPromise();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `marksheet-${classId}-${term}.pdf`; a.click();
    URL.revokeObjectURL(url);
  }

  async downloadMarksheetCsv(classId: string, term: string) {
    const blob = await this.http.get(`${this.baseUrl}/marksheet/csv`, {
      params: { classId, term },
      responseType: 'blob' as const,
      headers: this.authHeaders(),
    }).toPromise();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `marksheet-${classId}-${term}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  getMarksheetJson(classId: string, term: string) {
    return this.http.get<any>(`${this.baseUrl}/marksheet/json`, { params: { classId, term } });
  }

  publishResults(term: string, classId?: string, options?: { suppressArrears?: boolean }) {
    const body: any = { term };
    if (classId) body.classId = classId;
    if (options?.suppressArrears) body.suppressArrears = true;
    return this.http.put<{ ok: boolean; sent: number; suppressed?: number; error?: string }>(`${this.baseUrl}/publish`, body);
  }

  async maskPdfArea(
    pdfBlob: Blob,
    opts: { x: number; y: number; width: number; height: number; pageIndex?: number; color?: { r: number; g: number; b: number } }
  ): Promise<Blob> {
    const { PDFDocument, rgb } = await import('pdf-lib');
    const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
    const pdfDoc = await PDFDocument.load(bytes);
    const pages = pdfDoc.getPages();
    const page = pages[Math.min(Math.max(opts.pageIndex ?? 0, 0), pages.length - 1)];
    const fill = rgb(opts.color?.r ?? 1, opts.color?.g ?? 1, opts.color?.b ?? 1);
    page.drawRectangle({ x: opts.x, y: opts.y, width: opts.width, height: opts.height, color: fill, borderColor: fill, borderWidth: 0 });
    const out = await pdfDoc.save();
    return new Blob([out], { type: 'application/pdf' });
  }

  async stampReportWithRemark(
    pdfBlob: Blob,
    remark: string,
    options?: { x?: number; y?: number; maxWidth?: number; fontSize?: number; pageIndex?: number; bold?: boolean }
  ): Promise<Blob> {
    const { PDFDocument, StandardFonts } = await import('pdf-lib');
    const x = options?.x ?? 72;
    const y = options?.y ?? 205;
    const maxWidth = options?.maxWidth ?? 460;
    const fontSize = options?.fontSize ?? 10;
    const pageIndex = options?.pageIndex ?? 0;

    const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
    const pdfDoc = await PDFDocument.load(bytes);
    const pages = pdfDoc.getPages();
    const page = pages[Math.min(Math.max(pageIndex, 0), pages.length - 1)];
    const font = await pdfDoc.embedFont(options?.bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica);

    const text = (remark || '—').toString();
    page.drawText(text, { x, y, size: fontSize, font, lineHeight: fontSize + 2, maxWidth });

    const out = await pdfDoc.save();
    return new Blob([out], { type: 'application/pdf' });
  }

  computeSubjectsPassedFromJson(json: any, student: { id?: string; displayId?: string }, passMark = 50): number | null {
    try {
      const students: any[] = json?.students || json?.data || [];
      const s = students.find(x => (
        (student.id && (x.id === student.id || x.studentId === student.id)) ||
        (student.displayId && (x.displayId === student.displayId || x.admNo === student.displayId))
      )) || json?.[student.id || student.displayId || ''];
      if (!s) return null;
      const subjects: any[] = s.subjects || s.marks || s.results || [];
      if (!Array.isArray(subjects) || !subjects.length) return null;
      const getScore = (r: any) => {
        const v = r?.total ?? r?.score ?? r?.mark ?? r?.average ?? r?.avg ?? r?.final;
        const n = typeof v === 'string' ? parseFloat(v) : v;
        return typeof n === 'number' && !isNaN(n) ? n : null;
      };
      let count = 0;
      for (const subj of subjects) {
        const sc = getScore(subj);
        if (sc != null && sc >= passMark) count++;
      }
      return count;
    } catch {
      return null;
    }
  }
}
