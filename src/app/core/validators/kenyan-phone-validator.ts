import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const kenyanPhoneNumberValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    // Remove any spaces and validate - accepts any phone number format with at least 9 digits
    const cleanValue = control.value.replace(/\s+/g, '');
    // Accept any phone number with at least 9 digits (allows +254, 0, or any international format)
    const phonePattern = /^[+]?\d{9,15}$/;
    return phonePattern.test(cleanValue) ? null : { invalidPhoneNumber: true };
};
