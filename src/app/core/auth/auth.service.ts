import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthUtils } from 'app/core/auth/auth.utils';
import { UserService } from 'app/core/user/user.service';
import { catchError, map, Observable, of, ReplaySubject, switchMap, takeUntil, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateUserObject, StoredUser } from '../user/user.types';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private _authenticated: boolean = false;
    private _httpClient = inject(HttpClient);
    private _userService = inject(UserService);
    private createdUser: ReplaySubject<CreateUserObject> = new ReplaySubject<CreateUserObject>(1);
    private baseUrl = environment.apiUrl;

    private readonly ACCESS_TOKEN_KEY = 'accessToken';
    private readonly TEMP_TOKEN_KEY = 'temp_auth_token';
    private readonly STORAGE_KEYS = {
        USER_DATA: 'geminia_user_data'
    };

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for access token
     */
    set accessToken(token: string) {
        localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    }

    get accessToken(): string {
        return localStorage.getItem(this.ACCESS_TOKEN_KEY) ?? '';
    }

    set tempToken(token: string) {
        if (token) {
            localStorage.setItem(this.TEMP_TOKEN_KEY, token);
        } else {
            this.clearTempToken();
        }
    }

    get tempToken(): string {
        return localStorage.getItem(this.TEMP_TOKEN_KEY) ?? '';
    }

    clearTempToken(): void {
        localStorage.removeItem(this.TEMP_TOKEN_KEY);
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Forgot password
     *
     * @param email
     */
    forgotPassword(password: string): Observable<any> {
        const credentials = { "email": password }
        return this._httpClient.post(`${this.baseUrl}/self/resetpass`, credentials);
    }

    /**
     * Reset password
     *
     * @param password
     */
    resetPassword(password: string, confirmPassword: string, userId: number,tempToken: string): Observable<any> {
        const credentials = {"userid": userId, "tempToken": tempToken,"password":password,"passwordConfirm":confirmPassword }
        return this._httpClient.post(`${this.baseUrl}/self/updatepass`, credentials);
    }

    /**
     * verify password
     *
     * @param password
     */
    verifyUser(userId: number,tempToken: string, code: string): Observable<any> {
        const credentials = {"userid": userId, "tempToken": tempToken,"code":code }
        return this._httpClient.post(`${this.baseUrl}/self/verifuser`, credentials);
    }

    signIn(credentials: { username: string; password: string }): Observable<any> {
        console.log('🔐 Login attempt:', {
            url: `${this.baseUrl}/login`,
            username: credentials.username,
            timestamp: new Date().toISOString()
        });

        return this._httpClient.post(`${this.baseUrl}/login`, credentials).pipe(
            tap((response: any) => {
                // Store the temp token if it exists in the response
                if (response && response.tempToken) {
                    this.tempToken = response.tempToken;
                }
                return response;
            }),
            catchError(error => {
                return throwError(() => error);
            })
        );
    }

    createUser(user: CreateUserObject): Observable<any> {
        return this._httpClient.post<CreateUserObject>(
            `${this.baseUrl}/self/registration/user`,
            user   // send user directly, not { user }
        ).pipe(
            map((response) => {
                this.createdUser.next(response);
                return response;  // return so subscriber gets it
            })
        );
    }

    /**
     * Resend OTP to the user
     * @param payload Object containing tempToken
     */
    resendOtp(payload: { tempToken: string }): Observable<any> {
        const resendOtpUrl = `${this.baseUrl}/login/resend-otp`;
        
        return this._httpClient.post(resendOtpUrl, payload).pipe(
            tap((response: any) => {
                // Update temp token if a new one is provided in the response
                if (response.tempToken) {
                    this.tempToken = response.tempToken;
                }
            }),
            catchError((error) => {
                return throwError(() => new Error(error?.error?.message || 'Failed to resend OTP. Please try again.'));
            })
        );
    }

    verifyOtp(payload: { tempToken: string; otp: string }): Observable<any> {
        const validationUrl = `${this.baseUrl}/login/validate`;

        return this._httpClient.post<any>(validationUrl, payload).pipe(
            tap((response: any) => {

                this.accessToken = response.base64EncodedAuthenticationKey || response.token || '';

                // Set user data properly
                const userData = {
                    username: response.username || response.email || payload.tempToken,
                    name: response.name || response.fullName || 'User',
                    email: response.email || response.username || '',
                    userType: response.userType || 'C',
                    loginTime: Date.now(),
                    phoneNumber: response.phoneNumber || response.phone || ''
                };
                sessionStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
                this._userService.setCurrentUser(userData, this.accessToken);

                // Set session flags
                sessionStorage.setItem('isLoggedIn', 'true');
                sessionStorage.setItem('userType', userData.userType);

                this.clearTempToken();
            }),
            catchError((error) => {
                // Also clear the temp token on failure
                const devMessage = error?.error?.errors?.[0]?.developerMessage;
                return throwError(() => new Error(devMessage || 'Invalid OTP. Please try again.'));
            })
        );
    }

    /**
     * Sign in
     *
     * @param credentials
     */
    // signIn(credentials: { email: string; password: string }): Observable<any> {
    //     // Throw error, if the user is already logged in
    //     if (this._authenticated) {
    //         return throwError('User is already logged in.');
    //     }
    //
    //     return this._httpClient.post('api/auth/sign-in', credentials).pipe(
    //         switchMap((response: any) => {
    //             // Store the access token in the local storage
    //             this.accessToken = response.accessToken;
    //
    //             // Set the authenticated flag to true
    //             this._authenticated = true;
    //
    //             // Store the user on the user service
    //             this._userService.user = response.user;
    //
    //             // Return a new observable with the response
    //             return of(response);
    //         })
    //     );
    // }

    /**
     * Sign in using the access token
     */
    signInUsingToken(): Observable<any> {
        // Sign in using the token
        return this._httpClient
            .post('api/auth/sign-in-with-token', {
                accessToken: this.accessToken,
            })
            .pipe(
                catchError(() =>
                    // Return false
                    of(false)
                ),
                switchMap((response: any) => {
                    // Replace the access token with the new one if it's available on
                    // the response object.
                    //
                    // This is an added optional step for better security. Once you sign
                    // in using the token, you should generate a new one on the server
                    // side and attach it to the response object. Then the following
                    // piece of code can replace the token with the refreshed one.
                    if (response.accessToken) {
                        this.accessToken = response.accessToken;
                    }

                    // Set the authenticated flag to true
                    this._authenticated = true;

                    // Store the user on the user service
                    this._userService.currentUser$ = response.user;

                    // Return true
                    return of(true);
                })
            );
    }

    /**
     * Sign out
     */
    signOut(): Observable<any> {
        // Remove the access token from the local storage
        localStorage.removeItem('accessToken');

        // Set the authenticated flag to false
        this._authenticated = false;

        // Return the observable
        return of(true);
    }

    /**
     * Sign up
     *
     * @param user
     */
    signUp(user: {
        name: string;
        email: string;
        password: string;
        company: string;
    }): Observable<any> {
        return this._httpClient.post('api/auth/sign-up', user);
    }

    /**
     * Unlock session
     *
     * @param credentials
     */
    unlockSession(credentials: {
        email: string;
        password: string;
    }): Observable<any> {
        return this._httpClient.post('api/auth/unlock-session', credentials);
    }

    /**
     * Check the authentication status
     */
    check(): Observable<boolean> {

        this._userService.currentUser$
            .subscribe((user: StoredUser) => {
               if(!user){
                   this.clearSession();
                   return of(false);
               }
            });
        const token = this.accessToken;
        console.log(token);

        if (!token) {
            return of(false);
        }

        if (token.split('.').length !== 3) {
            return of(false);
        }

        if (AuthUtils.isTokenExpired(token)) {
            return of(false);
        }

        return of(true);
    }


    clearSession(): void {
        try {
            sessionStorage.removeItem('isLoggedIn');
            sessionStorage.removeItem('accessToken');
            sessionStorage.removeItem('userType');
            sessionStorage.removeItem(this.STORAGE_KEYS.USER_DATA);
            this.accessToken = null;
        } catch (error) {
            console.error('Failed to clear stored data:', error);
        }
    }
}
