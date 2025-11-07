import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface AppUser {
  id: string;
  email: string;
  role?: string | null;
  fullName?: string | null;
  contactNumber?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private baseUrl = '/api/users';

  list(){ return this.http.get<AppUser[]>(this.baseUrl); }
  create(body: { email: string; password: string; role?: string; fullName?: string | null; contactNumber?: string | null }){ return this.http.post<AppUser>(this.baseUrl, body); }
  update(id: string, partial: Partial<Pick<AppUser,'fullName'|'contactNumber'|'role'|'status'>>){ return this.http.patch<AppUser>(`${this.baseUrl}/${id}`, partial); }
  remove(id: string){ return this.http.delete<void>(`${this.baseUrl}/${id}`); }
  resetPassword(email: string, newPassword: string){ return this.http.post<{ success: true }>(`${this.baseUrl}/reset-password`, { email, newPassword }); }
}
