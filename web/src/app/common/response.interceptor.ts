import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { throwError, catchError } from 'rxjs';

export const responseInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error) => {
      // Handle JSON parsing errors
      if (error instanceof HttpErrorResponse) {
        // Check if the error message indicates JSON parsing issues
        const errorMessage = error.message || '';
        const isJsonParseError = errorMessage.includes('Unexpected token') || 
                                  errorMessage.includes('is not valid JSON') ||
                                  errorMessage.includes('JSON.parse');
        
        if (isJsonParseError) {
          console.warn('JSON parsing error detected. Server likely returned HTML instead of JSON:', {
            url: error.url,
            status: error.status,
            message: error.message
          });
          
          // Log the raw error for debugging
          console.warn('Raw error:', error.error);
          
          // Create a user-friendly error
          const friendlyError = new HttpErrorResponse({
            error: { message: 'Server returned an unexpected response. Please check your connection and try again.' },
            status: error.status,
            statusText: error.statusText,
            url: error.url || undefined
          });
          
          return throwError(() => friendlyError);
        }
      }
      
      return throwError(() => error);
    })
  );
};
