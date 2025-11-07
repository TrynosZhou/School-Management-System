import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { LibraryService } from './library.service';
import { Borrow } from '../entities/borrow.entity';

@Controller('library')
export class LibraryController {
  constructor(private readonly svc: LibraryService) {}

  // Books
  @Get('books') listBooks() { return this.svc.listBooks(); }
  @Post('books') addBook(@Body() body: any) { return this.svc.addBook(body); }
  @Delete('books/:id') removeBook(@Param('id') id: string) { return this.svc.removeBook(id); }
  @Get('books/lookup') async lookup(@Query('barcode') barcode?: string) {
    if (!barcode) throw new BadRequestException('barcode required');
    return this.svc.findBookByBarcode(barcode);
  }

  // Members
  @Get('members') listMembers() { return this.svc.listMembers(); }
  @Post('members') addMember(@Body() body: any) { return this.svc.addMember(body); }
  @Delete('members/:id') removeMember(@Param('id') id: string) { return this.svc.removeMember(id); }

  // Borrows
  @Get('borrows') listBorrows(@Query('onLoan') onLoan?: string, @Query('overdue') overdue?: string) {
    return this.svc.listBorrows({ onLoan: onLoan === '1' || onLoan === 'true', overdue: overdue === '1' || overdue === 'true' });
  }
  @Post('borrows') borrow(@Body() body: Partial<Borrow>) { return this.svc.borrow(body); }
  @Put('borrows/:id') returnBorrow(@Param('id') id: string, @Body() body: Partial<Borrow>) { return this.svc.returnBorrow(id, body); }
  @Post('borrows/return-by-barcode') returnByBarcode(@Body('barcode') barcode: string) {
    if (!barcode) throw new BadRequestException('barcode required');
    return this.svc.returnByBarcode(barcode);
  }
}
