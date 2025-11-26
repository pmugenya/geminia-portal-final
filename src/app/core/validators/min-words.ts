import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function minWords(min: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (!control.value) return null;
        const words = control.value.trim().split(/\s+/)
            .filter((word: string) => word.length > 0).length;
        return words < min ? { minWords: { requiredWords: min, actualWords: words } } : null;
    };
}

export function maxWords(max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (!control.value) return null;
        const words = control.value.trim().split(/\s+/)
            .filter((word: string) => word.length > 0).length;
        return words > max ? { maxWords: { maxWords: max, actualWords: words } } : null;
    };
}

export const noWhitespaceValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    // Ensure the value is a string before calling trim
    const stringValue = typeof control.value === 'string' ? control.value : String(control.value);
    const isWhitespace = stringValue.trim().length === 0;
    return isWhitespace ? { whitespace: true } : null;
};
