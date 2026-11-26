import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import localeEsPe from '@angular/common/locales/es-PE';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { PaquetesRepository } from './features/paquetes/data-access/paquetes.repository';
import { PaquetesMockRepository } from './features/paquetes/data-access/paquetes-mock.repository';
import { AuthRepository } from './features/auth/data-access/auth.repository';
import { AuthApiRepository } from './features/auth/data-access/auth-api.repository';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AdminRepository } from './features/admin/data-access/admin.repository';
import { AdminMockRepository } from './features/admin/data-access/admin-mock.repository';
import { ServiciosRepository } from './features/admin/data-access/servicios.repository';
import { ServiciosApiRepository } from './features/admin/data-access/servicios-api.repository';

registerLocaleData(localeEsPe);
export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es-PE' },
    { provide: PaquetesRepository, useClass: PaquetesMockRepository },
    provideHttpClient(withInterceptors([authInterceptor]), withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' })),
    { provide: AuthRepository, useClass: AuthApiRepository },
    { provide: AdminRepository, useClass: AdminMockRepository },
    { provide: ServiciosRepository, useClass: ServiciosApiRepository },
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }))
  ]
};
