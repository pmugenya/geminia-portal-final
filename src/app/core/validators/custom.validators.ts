import { AbstractControl, ValidationErrors } from '@angular/forms';

export class CustomValidators {
    // First Name: at least 3 letters
    static firstName(control: AbstractControl): ValidationErrors | null {
        if (!control.value) return null;
        const namePattern = /^[A-Za-z]{3,}$/;
        return namePattern.test(control.value) ? null : {
            firstName: {
                message: 'First Name must be at least 3 letters'
            }
        };
    }

    static idNumber(control: AbstractControl): ValidationErrors | null {
        if (!control.value) return null;
        const idPattern = /^\d{8,9}$/;
        return idPattern.test(control.value) ? null : {
            idNumber: {
                message: 'ID Number must be 8-9 digits (e.g., 28184318)'
            }
        };
    }

    static mpesaNumber(control: AbstractControl): ValidationErrors | null {
        if (!control.value) return null;
        const mpesaPattern = /^(07\d{8}|011\d{6})$/;
        return mpesaPattern.test(control.value) ? null : {
            mpesaNumber: {
                message: 'M-Pesa Number must start with 07 (10 digits) or 011 (9 digits)'
            }
        };
    }


    static vesselName(control: AbstractControl): ValidationErrors | null {
        if (!control.value) return null;
        const namePattern = /^[A-Za-z0-9\s]{3,}$/;
        return namePattern.test(control.value) ? null : {
            vesselName: {
                message: 'Vessel Name must be at least 3 characters (letters, numbers, and spaces)'
            }
        };
    }

    static idfNumber(control: AbstractControl): ValidationErrors | null {
        if (!control.value) return null;
        const idfPattern = /^\d{2}NBOIM\d{9}$/;
        return idfPattern.test(control.value) ? null : {
            idfNumber: {
                message: 'IDF Number must be 2 digits + NBOIM + 9 digits (e.g., 24NBOIM000002014)'
            }
        };
    }

    static kraPin(control: AbstractControl): ValidationErrors | null {
        if (!control.value) return null;
        const kraPinPattern = /^[A-Z]\d{9}[A-Z]$/;
        return kraPinPattern.test(control.value) ? null : {
            kraPin: {
                message: 'KRA PIN must be 1 letter + 9 digits + 1 letter (e.g., A123456789B)'
            }
        };
    }

    // Last Name: at least 3 letters
    static lastName(control: AbstractControl): ValidationErrors | null {
        if (!control.value) return null;
        const namePattern = /^[A-Za-z]{3,}$/;
        return namePattern.test(control.value) ? null : {
            lastName: {
                message: 'Last Name must be at least 3 letters'
            }
        };
    }

    // Email: standard email validation
    static email(control: AbstractControl): ValidationErrors | null {
        if (!control.value) return null;
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(control.value) ? null : {
            email: {
                message: 'Please enter a valid email address'
            }
        };
    }

    // Phone Number: exactly 10 digits
    static phoneNumber(control: AbstractControl): ValidationErrors | null {
        if (!control.value) return null;
        const phonePattern = /^\d{10}$/;
        return phonePattern.test(control.value) ? null : {
            phoneNumber: {
                message: 'Phone Number must be exactly 10 digits'
            }
        };
    }
}
