import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ElearningService {
  private resources: Array<{ id: string; type: string; title: string; classRef?: string; subject?: string; syllabusCode?: string; url: string; startAt?: number; endAt?: number; dueAt?: number }> = [];
  private submissions: Record<string, Array<{ id: string; resourceId: string; student?: string; url: string; createdAt: number }>> = {};
  private tests: Array<{ id: string; title: string; questions: Array<{ id: string; text: string; options: string[]; answer: number }> }> = [
    {
      id: 'sample-test-1',
      title: 'Sample Test: Mathematics Basics',
      questions: [
        { id: 'q1', text: '2 + 2 = ?', options: ['3', '4', '5', '6'], answer: 1 },
        { id: 'q2', text: '5 - 3 = ?', options: ['1', '2', '3', '4'], answer: 1 },
      ]
    }
  ];
  private async ocrImageFallback(imagePath: string, lang: string, jobId?: string): Promise<string> {
    try {
      // dynamic import to keep optional
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Tesseract = require('tesseract.js');
      this.setProgress(jobId, 'ocr-image', 20, path.basename(imagePath));
      const { data } = await Tesseract.recognize(imagePath, lang, { logger: () => {} });
      const text = (data?.text || '').trim();
      return text;
    } catch {
      return '';
    }
  }
  private async ocrPdfFallback(pdfPath: string, lang: string, jobId?: string): Promise<string> {
    // Convert PDF pages to images then OCR each
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const poppler = require('pdf-poppler');
      const outDir = path.join(process.cwd(), 'uploads', 'tmp-ocr', `${Date.now()}_${Math.random().toString(36).slice(2,6)}`);
      try { if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true }); } catch {}
      const base = path.join(outDir, 'page');
      this.setProgress(jobId, 'ocr-pdf-convert', 22, path.basename(pdfPath));
      await poppler.convert(pdfPath, { format: 'png', out_dir: outDir, out_prefix: 'page', page: null, scale: 150 });
      const files = (fs.readdirSync(outDir) || []).filter(n => /page.*\.png$/i.test(n)).sort();
      let all = '';
      for (let i=0; i<files.length; i++){
        const img = path.join(outDir, files[i]);
        const pct = 22 + Math.round(((i+1)/Math.max(1,files.length))*18);
        this.setProgress(jobId, 'ocr-pdf-ocr', pct, files[i]);
        const part = await this.ocrImageFallback(img, lang, jobId);
        if (part) all += `\n\n${part}`;
      }
      // Cleanup
      try { files.forEach(f => { try{ fs.unlinkSync(path.join(outDir, f)); }catch{} }); fs.rmdirSync(outDir, { recursive: true }); } catch {}
      return all.trim();
    } catch {
      return '';
    }
  }
  // lightweight in-memory progress store
  private progress: Record<string, { id: string; phase: string; pct: number; detail?: string; updatedAt: number }> = {};
  private setProgress(id: string | undefined, phase: string, pct: number, detail?: string){
    if (!id) return;
    this.progress[id] = { id, phase, pct: Math.max(0, Math.min(100, Math.round(pct))), detail, updatedAt: Date.now() };
  }
  getProgress(id: string){
    return this.progress[id] || { id, phase: 'idle', pct: 0 } as any;
  }
  checkAiConfig(){
    return {
      ok: true,
      hasKey: !!(process.env.OPENAI_API_KEY || ''),
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      baseURL: process.env.OPENAI_BASE_URL || null,
    };
  }
  signup(role: 'student'|'teacher', body: any){
    return { ok: true, role, email: body?.email || null };
  }
  login(role: 'student'|'teacher', body: any){
    return { ok: true, role, token: 'stub-token' };
  }
  uploadResource(file: any, body: any){
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Ensure directories exist
    try {
      const dir = path.join(__dirname, '..', 'uploads', 'resources');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch {}
    const rec = {
      id,
      type: body?.type || 'notes',
      title: body?.title || (file?.originalname || 'Untitled'),
      classRef: body?.classRef || '',
      subject: body?.subject || '',
      syllabusCode: body?.syllabusCode || '',
      url: `http://localhost:3000/uploads/resources/${encodeURIComponent(file?.filename || file?.originalname || 'file')}`,
      startAt: body?.startAt ? Number(body.startAt) : undefined,
      endAt: body?.endAt ? Number(body.endAt) : undefined,
      dueAt: body?.dueAt ? Number(body.dueAt) : undefined,
    };
    this.resources.unshift(rec);
    return rec;
  }

  listResources(filter?: { role?: string; classRef?: string; now?: number }){
    const role = (filter?.role || '').toLowerCase();
    const now = Number.isFinite(filter?.now as any) ? Number(filter!.now) : Date.now();
    const classRef = (filter?.classRef || '').trim();
    const items = this.resources.slice();
    // Teachers/admins can see all; students see only their class and within schedule
    if (role === 'teacher' || role === 'admin') return items;
    // Student view: filter by class and schedule
    return items.filter(r => {
      if (classRef && r.classRef && r.classRef !== classRef) return false;
      if (r.type === 'test') {
        const start = typeof r.startAt === 'number' ? r.startAt : 0;
        const end = typeof r.endAt === 'number' ? r.endAt : Number.POSITIVE_INFINITY;
        return now >= start && now <= end;
      }
      if (r.type === 'assignment') {
        const due = typeof r.dueAt === 'number' ? r.dueAt : Number.POSITIVE_INFINITY;
        return now <= due;
      }
      // notes/textbook default: visible
      return true;
    });
  }

  submitResource(id: string, file: any, body: any){
    const subId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const dir = path.join(__dirname, '..', 'uploads', 'submissions');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch {}
    const res = this.resources.find(r => r.id === id);
    const now = Date.now();
    if (res) {
      if (res.type === 'test') {
        const start = typeof res.startAt === 'number' ? res.startAt : 0;
        const end = typeof res.endAt === 'number' ? res.endAt : Number.POSITIVE_INFINITY;
        if (!(now >= start && now <= end)) {
          return { ok: false, error: 'Submission window closed for this test' };
        }
      } else if (res.type === 'assignment') {
        const due = typeof res.dueAt === 'number' ? res.dueAt : 0;
        if (due && now > due) {
          return { ok: false, error: 'Assignment due date has passed' };
        }
      }
    }
    const item = { id: subId, resourceId: id, student: body?.student || null, url: `http://localhost:3000/uploads/submissions/${encodeURIComponent(file?.filename || file?.originalname || 'submission')}` , createdAt: now };
    if (!this.submissions[id]) this.submissions[id] = [];
    this.submissions[id].unshift(item);
    return { ok: true, id: subId };
  }

  listSubmissions(filter?: { role?: string; classRef?: string }){
    const role = (filter?.role || '').toLowerCase();
    const classRef = (filter?.classRef || '').trim();
    const rows: Array<{ id: string; resourceId: string; resourceTitle: string; type: string; classRef?: string; subject?: string; student?: string; url: string; createdAt: number }>=[];
    for (const [rid, arr] of Object.entries(this.submissions)){
      const res = this.resources.find(r => r.id === rid);
      for (const s of (arr || [])){
        rows.push({ id: s.id, resourceId: rid, resourceTitle: res?.title || '(deleted resource)', type: res?.type || 'notes', classRef: res?.classRef, subject: res?.subject, student: s.student, url: s.url, createdAt: s.createdAt });
      }
    }
    if (role === 'admin') return rows;
    if (role === 'teacher') {
      if (!classRef) return rows; // if no class filter, show all
      return rows.filter(r => (r.classRef || '') === classRef);
    }
    // students shouldn't list others
    return [];
  }

  listTests(){
    return this.tests.map(t => ({ id: t.id, title: t.title, questionCount: t.questions.length }));
  }

  getTest(id: string){
    const t = this.tests.find(x => x.id === id);
    if (!t) return { error: 'Not found' };
    // Do not send answers
    return { id: t.id, title: t.title, questions: t.questions.map(q => ({ id: q.id, text: q.text, options: q.options })) };
  }

  submitTest(id: string, body: any){
    const t = this.tests.find(x => x.id === id);
    if (!t) return { error: 'Not found' };
    const answers: Record<string, number> = body?.answers || {};
    let score = 0;
    t.questions.forEach(q => {
      const a = answers[q.id];
      if (typeof a === 'number' && a === q.answer) score++;
    });
    return { ok: true, total: t.questions.length, score };
  }

  // --- AI generation using syllabus bank ---
  async generateAiTest(input: { subject: string; classRef: string; syllabusCode: string; total: number; jobId?: string }){
    const code = (input.syllabusCode || '').trim();
    this.setProgress(input.jobId, 'resolve-bank', 5, `code=${code}`);
    const bankDirs = [
      path.join(__dirname, '..', 'data', 'papers'),
      path.join(process.cwd(), 'data', 'papers'),
    ];
    // Resolve bank file by trying variants
    const candidates: string[] = [];
    if (code) candidates.push(`${code}.json`);
    const lastToken = code.split(/[^a-zA-Z0-9]+/).filter(Boolean).pop();
    if (lastToken && lastToken !== code) candidates.push(`${lastToken}.json`);
    const normalized = code.replace(/[^a-zA-Z0-9\-_.]/g, '_');
    if (normalized && normalized !== code) candidates.push(`${normalized}.json`);
    let bankPath = '';
    for (const name of candidates){
      for (const dir of bankDirs){
        const p = path.join(dir, name);
        if (fs.existsSync(p)) { bankPath = p; break; }
      }
      if (bankPath) break;
    }
    if (!bankPath) {
      this.setProgress(input.jobId, 'auto-build', 15, 'building bank');
      // Try to auto-build the bank from past papers using OpenAI
      try { await this.buildBank({ syllabusCode: code, subject: input.subject, classRef: input.classRef, jobId: input.jobId }, []); } catch {}
      for (const name of candidates){
        for (const dir of bankDirs){
          const p = path.join(dir, name);
          if (fs.existsSync(p)) { bankPath = p; break; }
        }
        if (bankPath) break;
      }
      if (!bankPath) {
        // As a final fallback, list available banks to help the user
        let available: string[] = [];
        try {
          for (const dir of bankDirs){
            try { const items = (fs.readdirSync(dir) || []).filter(f => f.toLowerCase().endsWith('.json')); available.push(...items); } catch {}
          }
        } catch {}
        return { ok: false, error: `Syllabus bank not found for code: ${code}`, hint: `Available banks: ${available.slice(0,20).join(', ')}` };
      }
    }
    let bank: Array<{ id?: string; text: string; options?: string[]; answer?: number; marks: number; topic?: string }> = [];
    try {
      let raw = fs.readFileSync(bankPath, 'utf8');
      if (raw && raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1); // strip BOM
      const txt = (raw || '').trim();
      if (!txt) bank = [];
      else {
        try { bank = JSON.parse(txt); }
        catch {
          const s = txt.indexOf('['); const e = txt.lastIndexOf(']');
          if (s !== -1 && e !== -1 && e > s) bank = JSON.parse(txt.slice(s, e+1));
          else throw new Error('Invalid JSON format');
        }
      }
    } catch (e) {
      return { ok: false, error: 'Failed to read syllabus bank', path: bankPath, detail: (e as Error).message };
    }
    if (!Array.isArray(bank) || bank.length === 0) {
      // Attempt auto-build then re-read
      this.setProgress(input.jobId, 'auto-build', 25, 'bank empty, rebuilding');
      try { await this.buildBank({ syllabusCode: code, subject: input.subject, classRef: input.classRef, jobId: input.jobId }, []); } catch {}
      try {
        if (fs.existsSync(bankPath)) {
          const txt2 = (fs.readFileSync(bankPath, 'utf8') || '').trim();
          if (txt2) {
            try { bank = JSON.parse(txt2); } catch {}
          }
        }
      } catch {}
      // If still no bank after rebuild attempt, stop with explicit error (no dummy questions)
      if (!Array.isArray(bank) || bank.length === 0) {
        return { ok: false, error: 'No questions available for the selected syllabus. Ensure OpenAI is configured or upload past papers to build the bank.' };
      }
    }
    // If bank exists but is small, try to augment it from uploads and retry once
    if (Array.isArray(bank) && bank.length > 0 && bank.length < 20) {
      this.setProgress(input.jobId, 'augment-bank', 35, `size=${bank.length}`);
      try { await this.buildBank({ syllabusCode: code, subject: input.subject, classRef: input.classRef, jobId: input.jobId }, []); } catch {}
      try {
        if (fs.existsSync(bankPath)) {
          const txt3 = (fs.readFileSync(bankPath, 'utf8') || '').trim();
          if (txt3) {
            try {
              const newer = JSON.parse(txt3);
              if (Array.isArray(newer) && newer.length >= bank.length) bank = newer;
            } catch {}
          }
        }
      } catch {}
    }
    // Assemble paper: order lower->higher (by marks) and aim for 75 marks
    this.setProgress(input.jobId, 'assembling-test', 55, `bank=${bank.length}`);
    const target = 75;
    const pool = bank.filter(q => q && Number.isFinite(q.marks as any) && q.marks > 0);
    if (!pool.length) return { ok: false, error: 'Insufficient questions in bank' };
    // Sort ascending by marks to represent lower->higher order
    const ordered = [...pool].sort((a, b) => (a.marks - b.marks) || a.text.localeCompare(b.text));
    // Try exact subset sum (bounded knapsack) with cap on items for performance
    const maxItems = Math.min(200, ordered.length);
    const items = ordered.slice(0, maxItems);
    const dp: Array<{ prev: number; took: boolean } | null> = Array((target + 1) * (maxItems + 1)).fill(null);
    // Helper to index dp[i][s]
    const idx = (i: number, s: number) => i * (target + 1) + s;
    for (let i = 0; i <= maxItems; i++) dp[idx(i, 0)] = { prev: -1, took: false }; // sum 0 achievable
    for (let i = 1; i <= maxItems; i++) {
      const w = Math.min(target, Math.max(1, Math.floor(items[i - 1].marks)));
      for (let s = 0; s <= target; s++) {
        // not take
        if (dp[idx(i - 1, s)]) dp[idx(i, s)] = { prev: s, took: false };
        // take
        if (s - w >= 0 && dp[idx(i - 1, s - w)] && !dp[idx(i, s)]) dp[idx(i, s)] = { prev: s - w, took: true };
      }
    }
    let best = target;
    while (best >= 0 && !dp[idx(maxItems, best)]) best--;
    let chosen: typeof bank = [];
    let sum = 0;
    if (best >= 0) {
      // Reconstruct
      let s = best;
      for (let i = maxItems; i >= 1; i--) {
        const cell = dp[idx(i, s)];
        if (!cell) continue;
        if (cell.took) {
          chosen.push(items[i - 1]);
          sum += Math.min(target, Math.max(1, Math.floor(items[i - 1].marks)));
          s = cell.prev;
        } else {
          s = cell.prev;
        }
      }
      // Ensure lower->higher order in final output
      chosen = chosen.sort((a, b) => (a.marks - b.marks) || a.text.localeCompare(b.text));
    }
    if (!chosen.length) {
      // Fallback to greedy ascending until <= target
      let acc = 0; const accList: typeof bank = [];
      for (const q of ordered) { const m = Math.floor(q.marks); if (acc + m <= target) { acc += m; accList.push(q); } }
      chosen = accList; sum = acc;
    }
    if (!chosen.length) return { ok: false, error: 'Insufficient questions in bank' };

    const id = `${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    const title = `${input.subject} Test (${code})`;
    const lines: string[] = [];
    lines.push(`# ${title}`);
    lines.push(`Class: ${input.classRef}`);
    lines.push(`Total Marks: ${target} (assembled: ${sum})`);
    lines.push('');
    chosen.forEach((q, idx) => {
      lines.push(`${idx+1}. (${q.marks} marks) ${q.text}`);
      if (Array.isArray(q.options) && q.options.length) {
        const opts = q.options.map((o, i) => `   ${String.fromCharCode(65+i)}) ${o}`).join('\n');
        lines.push(opts);
      }
      lines.push('');
    });
    // Ensure resources folder exists
    const dir = path.join(process.cwd(), 'uploads', 'resources');
    try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch {}
    const filename = `${Date.now()}_${input.subject.replace(/[^a-z0-9\-_.]+/gi, '_')}_${code}_test.txt`;
    const full = path.join(dir, filename);
    try { fs.writeFileSync(full, lines.join('\n'), 'utf8'); } catch (e) {
      return { ok: false, error: 'Failed to write generated test', detail: (e as Error).message };
    }
    const resource = {
      id,
      type: 'test',
      title,
      classRef: input.classRef,
      url: `http://localhost:3000/uploads/resources/${encodeURIComponent(filename)}`,
    };
    this.resources.unshift(resource);
    this.setProgress(input.jobId, 'done', 100, 'ready');
    return { ok: true, resource };
  }

  removeTest(id: string){
    const idx = this.tests.findIndex(t => t.id === id);
    if (idx === -1) return { ok: false, error: 'Not found' } as any;
    this.tests.splice(idx, 1);
    return { ok: true } as any;
  }

  markPaper(file: any){
    // Very simple stub: compute pseudo score by file size modulo 75
    let score = 0;
    try {
      const stats = fs.statSync(file?.path || '');
      score = (stats.size % 75);
    } catch { score = Math.floor(Math.random()*75); }
    const total = 75;
    const summary = `Marked script '${file?.originalname || file?.filename}'. Score: ${score}/${total}.`;
    return { ok: true, score, total, summary };
  }

  async buildBank(input: { syllabusCode: string; subject?: string; classRef?: string; jobId?: string; heuristicOnly?: boolean }, files: Array<{ path: string; originalname?: string; mimetype?: string }>){
    const code = (input?.syllabusCode || '').trim();
    if (!code) return { ok: false, error: 'syllabusCode required' };
    this.setProgress(input.jobId, 'gather-inputs', 5, 'scanning files');
    // Read files -> text (prefer uploads, else scan server folder data/past-papers/<code>)
    const texts: string[] = [];
    const candidates: Array<{ path: string; mimetype?: string }> = [];
    if (files && files.length) {
      candidates.push(...files.map(f => ({ path: f.path, mimetype: f.mimetype })));
    } else {
      const paperFolders = [
        path.join(__dirname, '..', 'data', 'past-papers', code),
        path.join(process.cwd(), 'data', 'past-papers', code),
        path.join(process.cwd(), 'uploads', 'bank-input', code),
        path.join(process.cwd(), 'uploads', 'bank-input'),
      ];
      for (const folder of paperFolders){
        try {
          const entries = fs.existsSync(folder) ? fs.readdirSync(folder) : [];
          for (const name of entries) {
            const lower = name.toLowerCase();
            if (lower.endsWith('.pdf') || lower.endsWith('.txt') || lower.endsWith('.docx') || lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
              candidates.push({ path: path.join(folder, name), mimetype: lower.endsWith('.pdf') ? 'application/pdf' : '' });
            }
          }
          if (candidates.length) break;
        } catch {}
      }
    }
    const ENABLE_OCR = String(process.env.ENABLE_OCR || '').toLowerCase() === 'true';
    const OCR_LANG = (process.env.OCR_LANG || 'eng').toString();
    for (let i=0; i<candidates.length; i++){
      const f = candidates[i];
      if (!f?.path) continue;
      try {
        const p = f.path.toLowerCase();
        if ((f.mimetype || '').toLowerCase().includes('pdf') || p.endsWith('.pdf')){
          const buffer = fs.readFileSync(f.path);
          const data = await (pdfParse as any)(buffer);
          if (data?.text && String(data.text).trim()) {
            texts.push(String(data.text));
          } else if (ENABLE_OCR) {
            try {
              const ocred = await this.ocrPdfFallback(f.path, OCR_LANG, input.jobId);
              if (ocred) texts.push(ocred);
            } catch {}
          }
        } else if (p.endsWith('.txt')) {
          const t = fs.readFileSync(f.path, 'utf8');
          if (t) texts.push(t);
        } else if (p.endsWith('.docx')) {
          const result = await (mammoth as any).extractRawText({ path: f.path });
          if (result?.value) texts.push(String(result.value));
        } else if (p.endsWith('.png') || p.endsWith('.jpg') || p.endsWith('.jpeg')) {
          if (ENABLE_OCR) {
            try {
              const ocred = await this.ocrImageFallback(f.path, OCR_LANG, input.jobId);
              if (ocred) texts.push(ocred);
            } catch {}
          }
        }
      } catch {}
      this.setProgress(input.jobId, 'extract-text', 10 + Math.round(((i+1)/Math.max(1,candidates.length))*20), path.basename(f.path));
    }
    const joined = texts.join('\n\n').trim();
    if (!joined) {
      // If no source text available, attempt direct AI generation from syllabus code
      const apiKey = process.env.OPENAI_API_KEY || '';
      const baseURL = process.env.OPENAI_BASE_URL || undefined;
      const timeout = Number(process.env.OPENAI_TIMEOUT_MS || '60000');
      const client = apiKey ? new OpenAI({ apiKey, baseURL, timeout: isFinite(timeout) ? timeout : 60000 }) : null;
      if (!client) {
        return { ok: false, error: 'No text extracted and OpenAI not configured' };
      }
      this.setProgress(input.jobId, 'ai-direct', 20, 'generating from syllabus');
      const sys = 'You are an assistant that creates exam questions aligned to a given syllabus code into a strict JSON array. Output ONLY a JSON array. Each item MUST have: text (string), marks (number). Optional: options (string[]), answer (number, 0-based), topic (string), id (string). Generate diverse difficulty, mostly short- to medium-answer, include some MCQ when natural.';
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const prompt = `Create as many high-quality exam questions as possible for syllabus ${code}. Return ONLY JSON array with objects: { text, marks, options?, answer?, topic? }.`;
      try {
        const resp = await client.chat.completions.create({
          model,
          temperature: 0.2,
          max_tokens: 4000,
          messages: [
            { role: 'system', content: sys },
            { role: 'user', content: prompt }
          ]
        });
        const content = resp.choices?.[0]?.message?.content || '';
        const arr = (() => {
          let c = (content || '').trim();
          if (!c) return [] as any[];
          if (c.startsWith('```')) {
            const first = c.indexOf('\n');
            if (first > -1) c = c.slice(first + 1);
            const last = c.lastIndexOf('```');
            if (last > -1) c = c.slice(0, last);
          }
          try { const v = JSON.parse(c); return Array.isArray(v) ? v : []; } catch {}
          const s = c.indexOf('['); const e = c.lastIndexOf(']');
          if (s !== -1 && e !== -1 && e > s) { try { const v = JSON.parse(c.slice(s, e+1)); return Array.isArray(v) ? v : []; } catch {} }
          return [] as any[];
        })();
        if (!arr.length) return { ok: false, error: 'AI returned no usable questions' };
        // Write bank for future reuse
        const bankDirs = [
          path.join(__dirname, '..', 'data', 'papers'),
          path.join(process.cwd(), 'data', 'papers'),
        ];
        let bankDir = bankDirs.find(d => fs.existsSync(d)) || bankDirs[0];
        try { if (!fs.existsSync(bankDir)) fs.mkdirSync(bankDir, { recursive: true }); } catch {}
        const bankPath = path.join(bankDir, `${code}.json`);
        try { fs.writeFileSync(bankPath, JSON.stringify(arr, null, 2), 'utf8'); } catch {}
      } catch (e) {
        return { ok: false, error: 'AI generation failed', detail: (e as Error).message };
      }
    }

    // Call OpenAI to extract questions in required JSON schema (fallback to heuristic if unavailable)
    const apiKey = process.env.OPENAI_API_KEY || '';
    const baseURL = process.env.OPENAI_BASE_URL || undefined;
    const timeout = Number(process.env.OPENAI_TIMEOUT_MS || '60000');
    const client = apiKey ? new OpenAI({ apiKey, baseURL, timeout: isFinite(timeout) ? timeout : 60000 }) : null;
    const sys = 'You are an assistant that extracts exam questions from raw past papers text into a strict JSON array. Extract as MANY distinct, atomic questions as possible. Each item MUST have: text (string), marks (number). Optional: options (string[]), answer (number, 0-based), topic (string), id (string). Prefer leaving options/answer empty unless clearly MCQ. Do not include explanations. Output ONLY valid JSON array, no prose.';
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const parseArray = (raw: string): any[] => {
      let content = (raw || '').trim();
      if (!content) return [];
      if (content.startsWith('```')){
        const firstNl = content.indexOf('\n');
        if (firstNl > -1) content = content.slice(firstNl + 1);
        const fence = content.lastIndexOf('```');
        if (fence > -1) content = content.slice(0, fence);
      }
      try { const v = JSON.parse(content); return Array.isArray(v) ? v : []; } catch {}
      const s = content.indexOf('['); const e = content.lastIndexOf(']');
      if (s !== -1 && e !== -1 && e > s) {
        try { const v = JSON.parse(content.slice(s, e+1)); return Array.isArray(v) ? v : []; } catch {}
      }
      return [];
    };

    const chunks: string[] = [];
    const CHUNK = 10000;
    for (let i=0; i<joined.length; i+=CHUNK) chunks.push(joined.slice(i, i+CHUNK));
    let extracted: any[] = [];
    if (client && !input.heuristicOnly) {
      for (const [idx, part] of chunks.entries()){
        let lastErr: any = null;
        for (let attempt=0; attempt<3; attempt++){
          try {
            const user = `Extract clean, distinct exam questions as a JSON array (no prose). Syllabus: ${code}. Part ${idx+1}/${chunks.length}. Text between <<< >>>.\n<<<\n${part}\n>>>`;
            const resp = await client.chat.completions.create({
              model,
              temperature: 0.1,
              max_tokens: 4000,
              messages: [
                { role: 'system', content: sys },
                { role: 'user', content: user }
              ]
            });
            const content = resp.choices?.[0]?.message?.content || '';
            const arr = parseArray(content);
            if (arr.length) { extracted.push(...arr); break; }
            lastErr = new Error('Empty or invalid JSON array from model');
          } catch (e:any) { lastErr = e; }
          // simple backoff
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
        if (!extracted.length && lastErr) {
          // continue to next chunk but remember failure
        }
        this.setProgress(input.jobId, 'ai-extract', 40 + Math.round(((idx+1)/Math.max(1,chunks.length))*30), `chunk ${idx+1}/${chunks.length}`);
      }
    }

    // Heuristic fallback: parse questions based on numbering patterns if AI yielded nothing
    if (!extracted.length) {
      const heuristicExtract = (text: string): any[] => {
        const lines = text.split(/\r?\n/);
        const items: { text: string; marks?: number }[] = [];
        let current: string[] = [];
        const pushCurrent = () => {
          const t = current.join(' ').replace(/\s+/g, ' ').trim();
          if (t.length > 15) {
            const m = /\((\d{1,3})\s*marks?\)/i.exec(t) || /(\d{1,3})\s*marks?/i.exec(t);
            const marks = m ? Math.min(20, Math.max(1, Number(m[1]) || 5)) : 5;
            items.push({ text: t, marks });
          }
          current = [];
        };
        const qStart = (s: string) => /^(\s*(Q\s*\d+|\(?\d{1,3}\)?[\).]))\s+/i.test(s);
        for (const ln of lines){
          if (qStart(ln) && current.length) pushCurrent();
          if (qStart(ln)) current.push(ln.replace(/^(\s*(Q\s*\d+|\(?\d{1,3}\)?[\).]))\s+/i, ''));
          else current.push(ln);
        }
        if (current.length) pushCurrent();
        // Deduplicate and cap
        const seen = new Set<string>();
        const uniq = items.filter(it => {
          const key = it.text.slice(0, 300).toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return uniq.map(it => ({ text: it.text, marks: it.marks || 5 }));
      };
      this.setProgress(input.jobId, 'heuristic-extract', 75, 'AI unavailable/empty');
      extracted = heuristicExtract(joined);
      if (!extracted.length) {
        return { ok: false, error: 'AI extraction failed', detail: 'No parseable questions from model or heuristic' };
      }
    }

    // Validate/normalize entries
    const cleaned: Array<{ id?: string; text: string; marks: number; options?: string[]; answer?: number; topic?: string }> = [];
    for (const q of extracted){
      if (!q || typeof q.text !== 'string') continue;
      const marks = Number(q.marks);
      cleaned.push({
        id: typeof q.id === 'string' ? q.id : undefined,
        text: q.text.trim(),
        marks: Number.isFinite(marks) && marks > 0 ? marks : 5,
        options: Array.isArray(q.options) ? q.options.slice(0, 8).map((o: any) => String(o)) : undefined,
        answer: typeof q.answer === 'number' ? q.answer : undefined,
        topic: typeof q.topic === 'string' ? q.topic : undefined,
      });
    }
    if (!cleaned.length) return { ok: false, error: 'No valid questions extracted' };

    // Merge into bank JSON (resolve directory robustly)
    const bankDirs = [
      path.join(__dirname, '..', 'data', 'papers'),
      path.join(process.cwd(), 'data', 'papers'),
    ];
    let bankDir = bankDirs.find(d => fs.existsSync(d)) || bankDirs[0];
    try { if (!fs.existsSync(bankDir)) fs.mkdirSync(bankDir, { recursive: true }); } catch {}
    const bankPath = path.join(bankDir, `${code}.json`);
    let existing: any[] = [];
    try { if (fs.existsSync(bankPath)) existing = JSON.parse(fs.readFileSync(bankPath, 'utf8')); } catch (e:any) {
      return { ok: false, error: 'Failed to read existing bank', detail: e?.message };
    }
    const byKey = new Map<string, any>();
    const keyOf = (q: any) => (q?.id ? String(q.id) : (q?.text || '')).slice(0, 300);
    for (const q of (existing || [])) { const k = keyOf(q); if (k) byKey.set(k, q); }
    for (const q of cleaned) { const k = keyOf(q); if (k && !byKey.has(k)) byKey.set(k, q); }
    const merged = Array.from(byKey.values());
    if (!merged.length) {
      return { ok: false, error: 'No valid questions to write to bank' };
    }
    try { fs.writeFileSync(bankPath, JSON.stringify(merged, null, 2), 'utf8'); } catch (e: any) {
      return { ok: false, error: 'Failed to write bank', detail: e?.message };
    }
    // Auto-generate a downloadable test resource from the newly built bank
    let resource: any = null;
    try {
      const gen = await this.generateAiTest({
        subject: input.subject || 'Generated Test',
        classRef: input.classRef || '',
        syllabusCode: code,
        total: 100,
        jobId: input.jobId,
      });
      if (gen && (gen as any).ok && (gen as any).resource) resource = (gen as any).resource;
    } catch {}
    this.setProgress(input.jobId, 'done', 100, `bank total=${merged.length}`);
    return { ok: true, count: cleaned.length, total: merged.length, bank: `data/papers/${code}.json`, resource };
  }

  async selfTest(){
    const apiKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey) return { ok: false, error: 'OPENAI_API_KEY not configured' };
    try {
      const baseURL = process.env.OPENAI_BASE_URL || undefined;
      const timeout = Number(process.env.OPENAI_TIMEOUT_MS || '20000');
      const client = new OpenAI({ apiKey, baseURL, timeout: isFinite(timeout) ? timeout : 20000 });
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const resp = await client.chat.completions.create({
        model,
        temperature: 0,
        max_tokens: 10,
        messages: [ { role: 'system', content: 'You are a ping responder. Reply with a single word: PONG' }, { role: 'user', content: 'Ping' } ]
      });
      const content = resp.choices?.[0]?.message?.content || '';
      return { ok: true, content };
    } catch (e:any) {
      return { ok: false, error: e?.message || String(e) };
    }
  }
}
