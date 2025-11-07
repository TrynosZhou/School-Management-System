import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { notifyInterceptor } from './common/notify.interceptor';
import { tokenInterceptor } from './auth/token.interceptor';
import { GlobalErrorHandler } from './common/global-error.handler';
import { responseInterceptor } from './common/response.interceptor';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([tokenInterceptor, responseInterceptor, notifyInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler }
  ]
};
