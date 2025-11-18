import {
    HttpErrorResponse,
    HttpEvent,
    HttpHandlerFn,
    HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from 'app/core/auth/auth.service';
import { AuthUtils } from 'app/core/auth/auth.utils';
import { Observable, catchError, throwError } from 'rxjs';

/**
 * Intercept
 *
 * @param req
 * @param next
 */
export const authInterceptor = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
    const authService = inject(AuthService);

    // Start with the base headers
    let headers = req.headers.set('Fineract-Platform-TenantId', 'default');
    const token = authService.accessToken;

    if (token && AuthUtils.isJwtFormat(token) && !AuthUtils.isTokenExpired(token)) {
        headers = headers.set('Authorization', 'Bearer ' + token);
    }


    // Clone the request with all headers
    const newReq = req.clone({ headers });

    // Response
    return next(newReq).pipe(
        catchError((error) => {
            console.log(error);
            // Catch "401 Unauthorized" responses
            if (error instanceof HttpErrorResponse && error.status === 401) {
                // Sign out
              //  authService.signOut();

                // Reload the app
               // location.reload();
            }

            return throwError(error);
        })
    );
};
