import { Body, Controller, Get, Post, Req, UseGuards, ForbiddenException, Query, Delete, Param, Res } from '@nestjs/common';
import { ParentsService } from './parents.service';
import { BearerGuard } from '../auth/bearer.guard';
import { EmailService } from '../email/email.service';
import { JwtService } from '@nestjs/jwt';

@Controller('parents')
export class ParentsController {
  constructor(private readonly parents: ParentsService, private readonly email: EmailService, private readonly jwt: JwtService) {}

  @UseGuards(BearerGuard)
  @Post('link-student')
  async link(@Req() req: any, @Body() body: { studentIdOrCode: string; lastName: string; dob?: string }) {
    const uid = req.user?.sub as string;
    const role = (req.user?.role || '').toLowerCase();
    if (role !== 'parent') throw new ForbiddenException('Parents only');
    const code = String(body.studentIdOrCode || '').trim();
    const lastName = String(body.lastName || '').trim();
    const dob = body?.dob ? String(body.dob).trim().replace(/\//g, '-') : undefined;
    if (!code || !lastName) throw new ForbiddenException('StudentID and last name are required');
    return this.parents.linkStudent(uid, code, dob, lastName);
  }

  @UseGuards(BearerGuard)
  @Get('my-students')
  async myStudents(@Req() req: any) {
    const role = (req.user?.role || '').toLowerCase();
    if (role !== 'parent') throw new ForbiddenException('Parents only');
    const uid = req.user?.sub as string;
    return this.parents.myStudents(uid);
  }

  // Parent: unlink a linked student
  @UseGuards(BearerGuard)
  @Delete('unlink/:studentId')
  async unlink(@Req() req: any, @Param('studentId') studentId: string) {
    const role = (req.user?.role || '').toLowerCase();
    if (role !== 'parent') throw new ForbiddenException('Parents only');
    const uid = req.user?.sub as string;
    return this.parents.unlink(uid, studentId);
  }

  // Some clients send DELETE without a path param but with a JSON body
  @UseGuards(BearerGuard)
  @Delete('unlink')
  async unlinkDeleteBody(@Req() req: any, @Body() body: { studentId?: string; studentIdOrCode?: string }) {
    const role = (req.user?.role || '').toLowerCase();
    if (role !== 'parent') throw new ForbiddenException('Parents only');
    const uid = req.user?.sub as string;
    const idOrCode = (body?.studentId || body?.studentIdOrCode || '').toString().trim();
    return this.parents.unlink(uid, idOrCode);
  }

  // Fallback for clients where DELETE is blocked by intermediaries
  @UseGuards(BearerGuard)
  @Post('unlink')
  async unlinkPost(@Req() req: any, @Body() body: { studentId?: string; studentIdOrCode?: string }) {
    const role = (req.user?.role || '').toLowerCase();
    if (role !== 'parent') throw new ForbiddenException('Parents only');
    const uid = req.user?.sub as string;
    const idOrCode = (body?.studentId || body?.studentIdOrCode || '').toString().trim();
    return this.parents.unlink(uid, idOrCode);
  }

  // Parent: soft-delete a student (mark as deleted). Dangerous, but per requirements.
  @UseGuards(BearerGuard)
  @Post('soft-delete')
  async softDelete(@Req() req: any, @Body() body: { studentId?: string; studentIdOrCode?: string }) {
    const role = (req.user?.role || '').toLowerCase();
    if (role !== 'parent') throw new ForbiddenException('Parents only');
    const uid = req.user?.sub as string;
    const idOrCode = (body?.studentId || body?.studentIdOrCode || '').toString().trim();
    return this.parents.softDeleteStudent(uid, idOrCode);
  }

  // Parent redeem invite code
  @UseGuards(BearerGuard)
  @Post('redeem')
  async redeem(@Req() req: any, @Body() body: { code: string }) {
    const uid = req.user?.sub as string;
    if ((req.user?.role || '').toLowerCase() !== 'parent') throw new ForbiddenException('Parents only');
    return this.parents.redeemInvite(uid, body.code);
  }

  // Admin: create invite code
  @UseGuards(BearerGuard)
  @Post('admin/create-invite')
  async createInvite(@Req() req: any, @Body() body: { studentId: string; expiresAt?: string }) {
    if ((req.user?.role || '').toLowerCase() !== 'admin') throw new ForbiddenException('Admins only');
    return this.parents.createInvite(body.studentId, body.expiresAt);
  }

  // Admin: list linked parents for a student
  @UseGuards(BearerGuard)
  @Get('admin/linked')
  async listLinked(@Req() req: any, @Query('studentId') studentId: string) {
    if ((req.user?.role || '').toLowerCase() !== 'admin') throw new ForbiddenException('Admins only');
    if (!studentId) return [];
    return this.parents.listLinkedParents(studentId);
  }

  // Admin: list parents with their linked students
  @UseGuards(BearerGuard)
  @Get('admin/parents-with-links')
  async adminParentsWithLinks(@Req() req: any) {
    if ((req.user?.role || '').toLowerCase() !== 'admin') throw new ForbiddenException('Admins only');
    return this.parents.adminParentsWithLinks();
  }

  // Admin: list all parents (including without links)
  @UseGuards(BearerGuard)
  @Get('admin/parents-all')
  async adminParentsAll(@Req() req: any) {
    if ((req.user?.role || '').toLowerCase() !== 'admin') throw new ForbiddenException('Admins only');
    return this.parents.adminParentsAllFlat();
  }

  // Admin: link an existing parent to a student by studentId or student code
  @UseGuards(BearerGuard)
  @Post('admin/link')
  async adminLink(@Req() req: any, @Body() body: { parentId: string; studentIdOrCode: string }) {
    // Enforce policy: only parents can link their students; administrators cannot perform links
    throw new ForbiddenException('Only parents can link students');
  }

  // Admin: unlink a parent-student relation
  @UseGuards(BearerGuard)
  @Post('admin/unlink')
  async adminUnlink(@Req() req: any, @Body() body: { parentId: string; studentId: string }) {
    if ((req.user?.role || '').toLowerCase() !== 'admin') throw new ForbiddenException('Admins only');
    const parentId = String(body?.parentId || '');
    const studentId = String(body?.studentId || '');
    return this.parents.adminUnlink(parentId, studentId);
  }

  // Admin: delete a parent account and their links
  @UseGuards(BearerGuard)
  @Post('admin/delete-parent')
  async adminDeleteParent(@Req() req: any, @Body() body: { parentId: string }) {
    if ((req.user?.role || '').toLowerCase() !== 'admin') throw new ForbiddenException('Admins only');
    const parentId = String(body?.parentId || '');
    return this.parents.adminDeleteParent(parentId);
  }

  // Admin: migrate parent_students to students.parentId
  @UseGuards(BearerGuard)
  @Post('admin/migrate-links')
  async migrateLinks(@Req() req: any) {
    if ((req.user?.role || '').toLowerCase() !== 'admin') throw new ForbiddenException('Admins only');
    return this.parents.migrateParentLinks();
  }

  // Admin: send bulk email to parents (all or by specific student IDs)
  @UseGuards(BearerGuard)
  @Post('admin/bulk-email')
  async bulkEmail(
    @Req() req: any,
    @Body() body: { subject: string; html: string; studentIds?: string[] }
  ) {
    if ((req.user?.role || '').toLowerCase() !== 'admin') throw new ForbiddenException('Admins only');
    const subject = (body.subject || '').trim();
    const html = (body.html || '').trim();
    if (!subject || !html) throw new ForbiddenException('Subject and message are required');
    const recipients = Array.isArray(body.studentIds) && body.studentIds.length
      ? await this.parents.parentEmailsForStudents(body.studentIds)
      : await this.parents.parentEmailsAll();
    if (!recipients.length) return { ok: false, message: 'No parent emails found' };
    // Send in batches to avoid throttling
    const batchSize = 50;
    const delayMs = 400;
    const chunks: string[][] = [];
    for (let i=0; i<recipients.length; i+=batchSize) chunks.push(recipients.slice(i, i+batchSize));
    for (let i=0; i<chunks.length; i++) {
      await this.email.send(chunks[i], subject, html);
      if (i < chunks.length - 1) await new Promise(r => setTimeout(r, delayMs));
    }
    return { ok: true, sent: recipients.length, batches: chunks.length };
  }

  // SSE: real-time events for parent/admin UIs. Authenticate via token query param.
  // Usage: GET /api/parents/events?token=JWT
  @Get('events')
  async events(@Query('token') token: string, @Res() res: any) {
    try {
      const payload = await this.jwt.verifyAsync(String(token || ''));
      const role = (payload?.role || '').toLowerCase();
      if (!(role === 'parent' || role === 'admin')) throw new ForbiddenException('Forbidden');
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();
      const write = (data: any) => {
        try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
      };
      // initial event so client knows connection is open
      write({ type: 'hello', role, at: Date.now() });
      // heartbeat every 25s
      const hb = setInterval(() => write({ type: 'heartbeat', at: Date.now() }), 25000);
      // subscribe to changes
      const off = this.parents.onChange((payload: any) => write(payload));
      // cleanup on close
      reqOnClose(res, () => { try { clearInterval(hb); } catch {}; try { off(); } catch {}; try { res.end(); } catch {} });
    } catch {
      try { res.status(401).end(); } catch {}
    }
  }
}

// Helper to detect client disconnect across Nest adapters
function reqOnClose(res: any, cb: () => void){
  const done = () => { try { cb(); } catch {} };
  res.on?.('close', done);
  res.on?.('finish', done);
}
