import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from './auth-state.service';
import { EntitlementsService } from './entitlements.service';

// Guard that checks route data.module entitlement. Admins bypass.
export const entitlementGuard: CanActivateFn = (route) => {
  const auth = inject(AuthStateService);
  const ent = inject(EntitlementsService);
  const router = inject(Router);
  const mod = route.data?.['module'] as string | undefined;
  if (!mod) return true; // nothing to check
  if (auth.isAdmin()) return true; // admin bypass
  // If entitlements are still loading (e.g., immediately after login), allow navigation
  if (ent.loading()) return true;
  if (ent.has(mod)) return true;
  router.navigateByUrl('/dashboard');
  return false;
};
