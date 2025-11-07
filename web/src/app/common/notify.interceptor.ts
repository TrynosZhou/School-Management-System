import { HttpEvent, HttpInterceptorFn, HttpEventType, HttpResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

function actionFromMethod(method: string): 'save' | 'update' | 'delete' | null {
  const m = (method || '').toUpperCase();
  if (m === 'POST') return 'save';
  if (m === 'PUT' || m === 'PATCH') return 'update';
  if (m === 'DELETE') return 'delete';
  return null;
}

export const notifyInterceptor: HttpInterceptorFn = (req, next): Observable<HttpEvent<unknown>> => {
  const action = actionFromMethod(req.method);
  const url = (req.url || '').toLowerCase();
  const isAuth = url.includes('/api/auth/');
  const isAuthLogin = url.includes('/api/auth/login');
  const isELearningLogin = url.includes('/api/elearning/student/login') || url.includes('/api/elearning/teacher/login');
  return next(req).pipe(
    tap({
      next: (evt) => {
        // Success messages only when the request completes
        if (evt && (evt instanceof HttpResponse || (evt as any).type === HttpEventType.Response)) {
          // Auth-specific handling
          if (isAuthLogin || isELearningLogin) {
            try { window.alert('Login successful'); } catch {}
            return;
          }
          // Suppress generic alerts for other auth requests
          if (isAuth || isELearningLogin) return;
          if (action) {
            try {
              // Suppress global alerts for 'save' and 'update'; only show delete success
              if (action === 'delete') {
                window.alert('Record deleted successfully.');
              }
            } catch {}
          }
        }
      },
      error: (err) => {
        if (isAuthLogin || isELearningLogin) {
          try { window.alert((err?.error?.message || err?.message) ? `Login failed\n${err?.error?.message || err?.message}` : 'Login failed'); } catch {}
          return;
        }
        if (isAuth || isELearningLogin) return; // suppress other auth errors from generic messages
        if (action) {
          try {
            const msg = action === 'save' ? 'Failed to save record.'
              : action === 'update' ? 'Failed to update record.'
              : 'Failed to delete record.';
            const detail = (err?.error?.message || err?.message || '').toString();
            window.alert(detail ? `${msg}\n${detail}` : msg);
          } catch {}
        }
      }
    })
  );
};
