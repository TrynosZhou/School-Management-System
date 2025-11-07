import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthStateService } from './auth-state.service';

export const studentGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
  const auth = inject(AuthStateService);
  const router = inject(Router);
  const role = auth.role();
  if (role === 'student') return true;
  const returnUrl = state.url && state.url !== '/' ? `?returnUrl=${encodeURIComponent(state.url)}` : '';
  return router.parseUrl(`/login${returnUrl}`);
};
