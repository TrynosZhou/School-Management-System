import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface AppSettingsDto {
  schoolName?: string | null;
  academicYear?: string | null;
  primaryColor?: string | null;
  logoUrl?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SettingsStateService {
  private http = inject(HttpClient);

  private loaded = signal(false);
  private settings = signal<AppSettingsDto>({});

  schoolName = computed(() => this.settings().schoolName || 'SchoolPro');
  academicYear = computed(() => this.settings().academicYear || '');
  primaryColor = computed(() => this.settings().primaryColor || '#1d4ed8');
  logoUrl = computed(() => this.settings().logoUrl || '');

  ensureLoaded() {
    if (this.loaded()) return;
    this.http.get<AppSettingsDto>('/api/settings').subscribe({
      next: (s) => { this.settings.set(s || {}); this.loaded.set(true); },
      error: () => { this.loaded.set(true); },
    });
  }

  refresh() {
    this.loaded.set(false);
    this.ensureLoaded();
  }
}
