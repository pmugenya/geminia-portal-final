import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import {
    FormsModule,
    NgForm,
    ReactiveFormsModule,
    UntypedFormBuilder,
    UntypedFormGroup,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { FuseAlertComponent, FuseAlertType } from '@fuse/components/alert';
import { AuthService } from 'app/core/auth/auth.service';
import { finalize } from 'rxjs';
import { FuseValidators } from '../../../../@fuse/validators';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'auth-forgot-password',
    templateUrl: './forgot-password.component.html',
    encapsulation: ViewEncapsulation.None,
    animations: fuseAnimations,
    imports: [
        FuseAlertComponent,
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        RouterLink,
        CommonModule
    ],
})
export class AuthForgotPasswordComponent implements OnInit {
    @ViewChild('forgotPasswordNgForm') forgotPasswordNgForm!: NgForm;
    @ViewChild('resetPasswordNgForm') resetPasswordNgForm!: NgForm;
    @ViewChild('tokenPasswordNgForm') tokenPasswordNgForm!: NgForm;

    alert: { type: FuseAlertType; message: string } = {
        type: 'success',
        message: '',
    };
    forgotPasswordForm!: UntypedFormGroup;
    resetPasswordForm!: UntypedFormGroup;
    tokenPasswordForm!: UntypedFormGroup;
    showAlert: boolean = false;
    showResetForm: boolean = true;
    showOtp: boolean = false;
    showFinalReset: boolean = false;

    /**
     * Constructor
     */
    constructor(
        private _authService: AuthService,
        private _formBuilder: UntypedFormBuilder,
        public router: Router,
    ) {}

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Create the form
        this.forgotPasswordForm = this._formBuilder.group({
            email: ['', [Validators.required, Validators.email]],
        });

        this.tokenPasswordForm = this._formBuilder.group({
            otpCode: ['', [Validators.required, Validators.required]],
            userid: ['', Validators.required],
            tempToken: ['', Validators.required],
        });
        this.resetPasswordForm = this._formBuilder.group(
            {
                password: ['', Validators.required],
                passwordConfirm: ['', Validators.required],
                userid: ['', Validators.required],
                tempToken: ['', Validators.required],
            },
            {
                validators: FuseValidators.mustMatch(
                    'password',
                    'passwordConfirm'
                ),
            }
        );
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Prevent space key from being entered in email field
     */
    preventSpaceInEmail(event: KeyboardEvent): void {
        if (event.key === ' ' || event.code === 'Space' || event.keyCode === 32) {
            event.preventDefault();
        }
    }

    /**
     * Trim input field on blur or input events
     */
    trimInput(event: Event, controlName: string): void {
        const input = event.target as HTMLInputElement;
        const originalValue = input.value;
        const trimmedValue = originalValue.trim();

        if (originalValue !== trimmedValue) {
            // Save cursor position
            const cursorPosition = input.selectionStart || 0;
            const leadingSpaces = originalValue.length - originalValue.trimStart().length;

            // Update the input element value immediately
            input.value = trimmedValue;

            // Update form control with emitEvent to ensure validators run
            const control = this.forgotPasswordForm.get(controlName);
            if (control) {
                control.setValue(trimmedValue, { emitEvent: true });
                control.updateValueAndValidity();
            }

            // Restore cursor position, adjusting for removed leading spaces
            const newPosition = Math.max(0, cursorPosition - leadingSpaces);
            setTimeout(() => {
                if (input.setSelectionRange) {
                    input.setSelectionRange(newPosition, newPosition);
                }
            }, 0);
        }
    }

    /**
     * Send the reset link
     */
    sendResetLink(): void {
        // Return if the form is invalid
        if (this.forgotPasswordForm.invalid) {
            return;
        }

        // Disable the form
        this.forgotPasswordForm.disable();

        // Hide the alert
        this.showAlert = false;

        // Forgot password
        // Trim whitespace from email
        const email = this.forgotPasswordForm.get('email')?.value?.trim() || '';
        console.log('email...',email);

        this._authService
            .forgotPassword(email)
            .pipe(
                finalize(() => {
                    // Re-enable the form
                    this.forgotPasswordForm.enable();

                    // Reset the form
                    this.forgotPasswordNgForm.resetForm();

                    // Show the alert
                    this.showAlert = true;
                })
            )
            .subscribe(
                (response) => {
                    this.showOtp = true;
                    this.showResetForm = false;
                    this.showFinalReset = false;
                    this.forgotPasswordForm.get('userid')?.setValue(response.userId);
                    this.forgotPasswordForm.get('tempToken')?.setValue(response.tempToken);
                    this.tokenPasswordForm.get('userid')?.setValue(response.userId);
                    this.resetPasswordForm.get('userid')?.setValue(response.userId);
                    this.tokenPasswordForm.get('tempToken')?.setValue(response.tempToken);
                    this.resetPasswordForm.get('tempToken')?.setValue(response.tempToken);
                    // Set the alert
                    this.alert = {
                        type: 'success',
                        message:
                            "Password reset sent! You'll receive an email/mobile phone with otp if you are registered on our system.",
                    };
                },
                (response) => {
                    // Set the alert
                    this.alert = {
                        type: 'error',
                        message:
                            'Email does not found! Are you sure you are already a member?',
                    };
                }
            );
    }

    verifyUser(): void {
        // Return if the form is invalid
        if (this.tokenPasswordForm.invalid) {
            return;
        }

        // Disable the form
        this.tokenPasswordForm.disable();

        // Hide the alert
        this.showAlert = false;

        // Send the request to the server
        this._authService
            .verifyUser(this.tokenPasswordForm.get('userid')?.value ?? '',
                this.tokenPasswordForm.get('tempToken')?.value ?? '',
                this.tokenPasswordForm.get('otpCode')?.value ?? ''
            )
            .pipe(
                finalize(() => {
                    // Re-enable the form
                    this.tokenPasswordForm.enable();

                    // Reset the form
                    this.tokenPasswordNgForm.resetForm();

                    // Show the alert
                    this.showAlert = true;
                })
            )
            .subscribe(
                (response) => {
                    // Set the alert
                    this.alert = {
                        type: 'success',
                        message: 'Your Token has been verified successfully.',
                    };
                    this.showOtp = false;
                    this.showResetForm = false;
                    this.showFinalReset = true;
                },
                (response) => {
                    console.log(response);
                    // Set the alert
                    this.alert = {
                        type: 'error',
                        message: 'Something went wrong, please try again.',
                    };
                }
            );
    }



    resetPassword(): void {
        console.log('passed here...');
        // Return if the form is invalid
        if (this.resetPasswordForm.invalid) {
            return;
        }

        // Disable the form
        this.resetPasswordForm.disable();

        // Hide the alert
        this.showAlert = false;

        // Send the request to the server
        this._authService
            .resetPassword(this.resetPasswordForm.get('password')?.value ?? '',
                this.resetPasswordForm.get('passwordConfirm')?.value ?? '',
                this.resetPasswordForm.get('userid')?.value ?? '',
                this.resetPasswordForm.get('tempToken')?.value ?? ''
            )
            .pipe(
                finalize(() => {
                    // Re-enable the form
                    this.resetPasswordForm.enable();

                    // Reset the form
                    // this.resetPasswordNgForm.resetForm();

                    // Show the alert
                    this.showAlert = true;
                })
            )
            .subscribe(
                (response) => {
                    // Set the alert
                    this.alert = {
                        type: 'success',
                        message: 'Your password has been reset.',
                    };
                    this.router.navigate(['/sign-in']);
                },
                (response) => {
                    // Set the alert
                    this.alert = {
                        type: 'error',
                        message: response!!.error!!.defaultUserMessage||'Something went wrong, please try again.',
                    };
                }
            );
    }

}
