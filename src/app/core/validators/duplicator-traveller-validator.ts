import { AbstractControl, FormArray, ValidationErrors, ValidatorFn } from '@angular/forms';

export const duplicateTravelerValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const formArray = control as FormArray;
    if (!formArray || formArray.length === 0) return null;

    const travelers = formArray.controls.map((c) => {
        const fullName = c.get('fullName')?.value?.trim().toLowerCase();
        const dob = c.get('dob')?.value;
        return { fullName, dob };
    });

    for (let i = 0; i < travelers.length; i++) {
        for (let j = i + 1; j < travelers.length; j++) {
            if (
                travelers[i].fullName &&
                travelers[j].fullName &&
                travelers[i].fullName === travelers[j].fullName &&
                travelers[i].dob &&
                travelers[j].dob &&
                travelers[i].dob === travelers[j].dob
            ) {
                return { duplicateTraveler: true };
            }
        }
    }

    return null;
};
