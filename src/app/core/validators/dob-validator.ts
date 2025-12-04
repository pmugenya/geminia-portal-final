import { AbstractControl, ValidationErrors } from '@angular/forms';

export function dobValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const dob = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dob > today) return { futureDate: true };

    const minValidYear = today.getFullYear() - 120;
    if (dob.getFullYear() < minValidYear) return { tooOld: true };

    return null;
}
