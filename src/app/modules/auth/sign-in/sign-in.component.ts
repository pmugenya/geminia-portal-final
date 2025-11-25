import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import {
    FormBuilder,
    FormGroup,
    FormsModule,
    NgForm,
    ReactiveFormsModule,
    UntypedFormBuilder,
    UntypedFormGroup,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { FuseAlertComponent, FuseAlertType } from '@fuse/components/alert';
import { AuthService } from 'app/core/auth/auth.service';
import { finalize } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MarineQuickQuoteComponent } from '../../admin/quick-quote/marine-quick-quote.component';

@Component({
    selector: 'auth-sign-in',
    templateUrl: './sign-in.component.html',
    encapsulation: ViewEncapsulation.None,
    animations: fuseAnimations,
    imports: [
        RouterLink,
        CommonModule,
        FuseAlertComponent,
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatCheckboxModule,
        MatProgressSpinnerModule,
        MarineQuickQuoteComponent
    ],
})
export class AuthSignInComponent implements OnInit,OnDestroy {
    @ViewChild('signInNgForm') signInNgForm: NgForm;

    private readonly STORAGE_KEYS = {
        USER_DATA: 'geminia_user_data'
    };

    alert: { type: FuseAlertType; message: string } = {
        type: 'success',
        message: '',
    };
    signInForm!: FormGroup;
    showAlert: boolean = false;
    loginState: 'credentials' | 'otp' = 'credentials';
    otpCountdown: number = 0;
    showMarineQuote = false;
    private otpCountdownInterval: any;

    /**
     * Constructor
     */
    constructor(
        private _activatedRoute: ActivatedRoute,
        private _authService: AuthService,
        private fb: FormBuilder,
        private _router: Router
    ) {}

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Create the form
        this.signInForm = this.fb.group({
            username: ['', [Validators.required]],
            password: ['', Validators.required],
            otp: [''], // OTP is not required initially
        });
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    handleSignIn(): void {

       if(this.loginState === 'credentials'){
           if (this.signInForm.invalid || this.signInForm.disabled) {
               return;
           }
           this.signIn();
       } else{
           this.verifyOtp();
       }
    }

    /**
     * Sign in
     */
    signIn(): void {
        // Return if the form is invalid
        if (this.signInForm.invalid) {
            return;
        }

        // Disable the form
        this.signInForm.disable();

        // Hide the alert
        this.showAlert = false;

        // Sign in
        this._authService.signIn(this.signInForm.value).subscribe({
            next: (res) => {
                // If we get a temp token, switch to OTP verification
                if (res.tempToken) {
                    this.loginState = 'otp';
                    this.startOtpCountdown();
                } else {
                    this.alert = { 
                        type: 'error', 
                        message: res.message || 'Login failed: Invalid response.' 
                    };
                    this.showAlert = true;
                }
                this.signInForm.enable();
            },
            error: (error) => {
                // Re-enable the form
                this.signInForm.enable();

                // Set the alert
                this.alert = {
                    type: 'error',
                    message: error?.error?.message || 'Invalid username or password. Please try again.',
                };

                // Show the alert
                this.showAlert = true;
            }
        });
    }

    ngOnDestroy(): void {
        this.stopOtpCountdown();
    }

    backToCredentials(): void {
        this.loginState = 'credentials';
        this.showAlert = false;
        this._authService.clearTempToken();
        this.signInForm.get('otp')?.reset();
    }


    /**
     * Resend OTP code
     */
    resendOtp(): void {
        if (this.otpCountdown > 0) return;
        
        this.signInForm.disable();
        this.showAlert = false;
        
        // Get the current temp token
        const tempToken = this._authService.tempToken;
        
        if (!tempToken) {
            this.alert = { 
                type: 'error', 
                message: 'Session expired. Please sign in again.' 
            };
            this.showAlert = true;
            this.loginState = 'credentials';
            this.signInForm.enable();
            return;
        }
        
        // Call the API to resend OTP
        this._authService.resendOtp({ tempToken }).subscribe({
            next: (response) => {
                // Update temp token if a new one is provided
                if (response?.tempToken) {
                    this._authService.tempToken = response.tempToken;
                }
                
                // Restart the countdown
                this.startOtpCountdown();
                this.signInForm.enable();
                this.signInForm.get('otp')?.setValue('');
                
                // Show success message
                this.alert = { 
                    type: 'success', 
                    message: response?.message || 'A new OTP has been sent to your registered contact.' 
                };
                this.showAlert = true;
            },
            error: (error) => {
                this.signInForm.enable();
                this.alert = { 
                    type: 'error', 
                    message: error?.error?.message || 'Failed to resend OTP. Please try again.' 
                };
                this.showAlert = true;
                
                // If the error is due to an invalid/expired token, go back to credentials
                if (error?.status === 401 || error?.status === 403) {
                    this.loginState = 'credentials';
                    this._authService.clearTempToken();
                }
            }
        });
    }

    /**
     * Format the countdown timer for display
     */
    formatCountdown(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    verifyOtp(): void {
        if (!this._authService.tempToken) { this.backToCredentials(); return; }
        this.signInForm.disable();
        this.showAlert = false;
        const { otp } = this.signInForm.value;
        
        // Validate OTP format (6-8 digits)
        if (!/^\d{6,8}$/.test(otp)) {
            this.alert = { type: 'error', message: 'Please enter a valid 6-8 digit OTP code.' };
            this.showAlert = true;
            this.signInForm.enable();
            return;
        }
        
        this._authService.verifyOtp({ tempToken: this._authService.tempToken, otp }).pipe(
            finalize(() => this.signInForm.enable())
        ).subscribe({
            next: () => {
                const userDataString = sessionStorage.getItem(this.STORAGE_KEYS.USER_DATA);
                let redirectURL = this._activatedRoute.snapshot.queryParamMap.get('redirectURL');

                if (!redirectURL && userDataString) {
                    const userData = JSON.parse(userDataString);
                    // No saved URL, choose based on client type
                    if (userData.userType === 'C') {
                        redirectURL = '/dashboard';
                    } else if (userData.userType === 'A') {
                        redirectURL = '/agentdashboard';
                    } else {
                        // fallback
                        redirectURL = '/dashboard';
                    }
                }

                // Navigate to the redirect URL
                this._router.navigateByUrl(redirectURL);
            },
            error: (err) => {
                this.alert = { type: 'error', message: err.message || 'Invalid OTP code.' };
                this.showAlert = true;
            },
        });
    }

    /**
     * Starts the OTP countdown timer (60 seconds)
     */
    startOtpCountdown(): void {
        this.otpCountdown = 60; // 60 seconds countdown
        this.stopOtpCountdown(); // Clear any existing interval

        this.otpCountdownInterval = setInterval(() => {
            this.otpCountdown--;
            if (this.otpCountdown <= 0) {
                this.stopOtpCountdown();
                // When countdown ends, ensure the form is updated
                this.signInForm.get('otp')?.enable();
            }
        }, 1000);
    }

    /**
     * Stops the OTP countdown timer
     */
    stopOtpCountdown(): void {
        if (this.otpCountdownInterval) {
            clearInterval(this.otpCountdownInterval);
            this.otpCountdownInterval = null;
        }
    }

    toggleMarineQuote() {
        this.showMarineQuote = true;
    }
}
