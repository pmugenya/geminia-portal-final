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
        this._authService.signIn(this.signInForm.value).subscribe(
            (res) => {
                // Set the redirect url.
                // The '/signed-in-redirect' is a dummy url to catch the request and redirect the user
                // to the correct page after a successful sign in. This way, that url can be set via
                // routing file and we don't have to touch here.
                if (res.tempToken) {
                    this._authService.tempToken = res.tempToken;
                    this.loginState = 'otp';
                    this.startOtpCountdown();

                } else {
                    this.alert = { type: 'error', message: 'Login failed: Invalid response.' };
                    this.showAlert = true;
                }
                this.signInForm.enable();
                // Reset the form
                this.signInNgForm.resetForm();
            },
            (response) => {
                // Re-enable the form
                this.signInForm.enable();

                // Reset the form
                this.signInNgForm.resetForm();

                // Set the alert
                this.alert = {
                    type: 'error',
                    message: 'Wrong email or password',
                };

                // Show the alert
                this.showAlert = true;
            }
        );
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


    verifyOtp(): void {
        if (!this._authService.tempToken) { this.backToCredentials(); return; }
        this.signInForm.disable();
        this.showAlert = false;
        const { otp } = this.signInForm.value;
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
        this.otpCountdown = 60; // Industry standard: 60 seconds
        this.stopOtpCountdown(); // Clear any existing interval

        this.otpCountdownInterval = setInterval(() => {
            this.otpCountdown--;
            if (this.otpCountdown <= 0) {
                this.stopOtpCountdown();
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
