import { AbstractControl, ValidationErrors } from '@angular/forms';

export function fullNameValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string;
    if (!value) return null;
    const names = value.trim().split(/\s+/);
    return names.length >= 2 ? null : { invalidName: true };
}
