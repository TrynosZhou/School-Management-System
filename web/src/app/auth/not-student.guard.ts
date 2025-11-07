import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthStateService } from './auth-state.service';

export const notStudentGuard: CanActivateFn = (_route, _state): boolean | UrlTree => {
  const auth = inject(AuthStateService);
  const router = inject(Router);
  const role = auth.role();
  if (role !== 'student') return true;
  return router.parseUrl('/reports');
};
