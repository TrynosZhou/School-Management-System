import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    // Check if it's a JSON parsing error
    if (error && error.message && error.message.includes('Unexpected token')) {
      console.warn('JSON parsing error caught by global handler:', error.message);
      // Don't re-throw, just log it
      return;
    }
    
    // For other errors, log to console and re-throw
    console.error('Global error handler caught:', error);
    
    // Re-throw the error so Angular's default error handling can still work
    throw error;
  }
}
