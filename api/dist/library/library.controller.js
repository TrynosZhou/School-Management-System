"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibraryController = void 0;
const common_1 = require("@nestjs/common");
const library_service_1 = require("./library.service");
let LibraryController = class LibraryController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    listBooks() { return this.svc.listBooks(); }
    addBook(body) { return this.svc.addBook(body); }
    removeBook(id) { return this.svc.removeBook(id); }
    async lookup(barcode) {
        if (!barcode)
            throw new common_1.BadRequestException('barcode required');
        return this.svc.findBookByBarcode(barcode);
    }
    listMembers() { return this.svc.listMembers(); }
    addMember(body) { return this.svc.addMember(body); }
    removeMember(id) { return this.svc.removeMember(id); }
    listBorrows(onLoan, overdue) {
        return this.svc.listBorrows({ onLoan: onLoan === '1' || onLoan === 'true', overdue: overdue === '1' || overdue === 'true' });
    }
    borrow(body) { return this.svc.borrow(body); }
    returnBorrow(id, body) { return this.svc.returnBorrow(id, body); }
    returnByBarcode(barcode) {
        if (!barcode)
            throw new common_1.BadRequestException('barcode required');
        return this.svc.returnByBarcode(barcode);
    }
};
exports.LibraryController = LibraryController;
__decorate([
    (0, common_1.Get)('books'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LibraryController.prototype, "listBooks", null);
__decorate([
    (0, common_1.Post)('books'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LibraryController.prototype, "addBook", null);
__decorate([
    (0, common_1.Delete)('books/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LibraryController.prototype, "removeBook", null);
__decorate([
    (0, common_1.Get)('books/lookup'),
    __param(0, (0, common_1.Query)('barcode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LibraryController.prototype, "lookup", null);
__decorate([
    (0, common_1.Get)('members'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LibraryController.prototype, "listMembers", null);
__decorate([
    (0, common_1.Post)('members'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LibraryController.prototype, "addMember", null);
__decorate([
    (0, common_1.Delete)('members/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LibraryController.prototype, "removeMember", null);
__decorate([
    (0, common_1.Get)('borrows'),
    __param(0, (0, common_1.Query)('onLoan')),
    __param(1, (0, common_1.Query)('overdue')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], LibraryController.prototype, "listBorrows", null);
__decorate([
    (0, common_1.Post)('borrows'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LibraryController.prototype, "borrow", null);
__decorate([
    (0, common_1.Put)('borrows/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LibraryController.prototype, "returnBorrow", null);
__decorate([
    (0, common_1.Post)('borrows/return-by-barcode'),
    __param(0, (0, common_1.Body)('barcode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LibraryController.prototype, "returnByBarcode", null);
exports.LibraryController = LibraryController = __decorate([
    (0, common_1.Controller)('library'),
    __metadata("design:paramtypes", [library_service_1.LibraryService])
], LibraryController);
//# sourceMappingURL=library.controller.js.map