import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

export const authGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const token = localStorage.getItem('access_token');
  const router = inject(Router);
  if (token) return true;
  const returnUrl = state.url && state.url !== '/' ? `?returnUrl=${encodeURIComponent(state.url)}` : '';
  return router.parseUrl(`/login${returnUrl}`);
};
