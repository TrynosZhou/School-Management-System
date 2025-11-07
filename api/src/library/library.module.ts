import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from '../entities/book.entity';
import { Member } from '../entities/member.entity';
import { Borrow } from '../entities/borrow.entity';
import { LibraryService } from './library.service';
import { LibraryController } from './library.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Book, Member, Borrow])],
  providers: [LibraryService],
  controllers: [LibraryController],
})
export class LibraryModule {}
