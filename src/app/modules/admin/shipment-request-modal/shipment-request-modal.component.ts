import { Component, Inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormField } from '@angular/material/form-field';
import { NgClass } from '@angular/common';
import { MatDatepicker, MatDatepickerInput, MatDatepickerToggle } from '@angular/material/datepicker';
import { CustomValidators } from '../../../core/validators/custom.validators';
import { maxWords, minWords, noWhitespaceValidator } from '../../../core/validators/min-words';
import { MatInput } from '@angular/material/input';
import { ThousandsSeparatorValueAccessor } from '../../../core/directives/thousands-separator-value-accessor';

@Component({
    selector: 'app-shipment-request-modal',
    standalone: true,
    templateUrl: './shipment-request-modal.component.html',
    imports: [
        ReactiveFormsModule,
        MatFormField,
        NgClass,
        MatDatepickerInput,
        MatDatepickerToggle,
        MatDatepicker,
        MatInput,
        ThousandsSeparatorValueAccessor,
    ],
})
export class ShipmentRequestModalComponent {

    form: FormGroup;
    isExport: boolean;
    showExportModal:boolean;
    exportDestinationCountries: string[] = [];
    allCountriesList: string[] = ['Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Australia', 'Austria', 'Bangladesh', 'Belgium', 'Brazil', 'Canada', 'China', 'Denmark', 'Egypt', 'Finland', 'France', 'Germany', 'Ghana', 'Greece', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Japan', 'Kenya', 'Mexico', 'Netherlands', 'New Zealand', 'Nigeria', 'North Korea', 'Norway', 'Pakistan', 'Russia', 'Saudi Arabia', 'Somalia', 'South Africa', 'Spain', 'Sudan', 'Sweden', 'Switzerland', 'Syria', 'Tanzania', 'Turkey', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States of America', 'Yemen', 'Zambia', 'Zimbabwe'].sort();
    exportRequestForm!: FormGroup;
    highRiskRequestForm!: FormGroup;
    minDate = new Date();

    constructor(
        private dialogRef: MatDialogRef<ShipmentRequestModalComponent>,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        console.log(data);
        this.isExport = data.isExport;
        this.showExportModal = data.showExportModal;
        this.exportRequestForm = this.createExportRequestForm();
        this.highRiskRequestForm = this.createHighRiskRequestForm();
    }

    close() {
        this.dialogRef.close();
    }

    onExportRequestSubmit() {
        if (this.exportRequestForm.invalid) return;
        this.dialogRef.close(this.exportRequestForm.value);
    }

    onHighRiskRequestSubmit() {
        if (this.highRiskRequestForm.invalid) return;
        this.dialogRef.close(this.highRiskRequestForm.value);
    }

    private createExportRequestForm(): FormGroup {
        const form = this.createModalForm();
        form.get('originCountry')?.patchValue('Kenya');
        form.get('originCountry')?.disable();
        return form;
    }

    private createModalForm(): FormGroup {
        return this.fb.group({
            firstName: ['', [Validators.required, CustomValidators.firstName]],
            lastName: ['', [Validators.required, CustomValidators.lastName]],
            email: ['', [Validators.required, CustomValidators.email]],
            phoneNumber: ['', [Validators.required, CustomValidators.phoneNumber]],
            originCountry: ['', Validators.required],
            destinationCountry: ['', Validators.required],
            shipmentDate: ['', [Validators.required, this.noPastDatesValidator]],
            sumInsured: [null, [Validators.required, Validators.min(1)]],
            goodsDescription: ['', [Validators.required, minWords(2), maxWords(100), noWhitespaceValidator]],
            termsAndPolicyConsent: [false, Validators.requiredTrue],
        });
    }

    noPastDatesValidator(control: AbstractControl): { [key: string]: boolean } | null {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const controlDate = new Date(control.value);
        return controlDate < today ? { pastDate: true } : null;
    }

    private createHighRiskRequestForm(): FormGroup {
        const form = this.createModalForm();
        form.get('destinationCountry')?.patchValue('Kenya');
        form.get('destinationCountry')?.disable();
        return form;
    }

    onModalFirstNameInput(event: any, formType: 'export' | 'highRisk'): void {
        let value = event.target.value.trim();
        value = value.replace(/[^a-zA-Z]/g, '');
        if (value.length > 0) {
            value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        }
        const form = formType === 'export' ? this.exportRequestForm : this.highRiskRequestForm;
        form.patchValue({ firstName: value });
    }

    onModalLastNameInput(event: any, formType: 'export' | 'highRisk'): void {
        let value = event.target.value.trim();
        value = value.replace(/[^a-zA-Z]/g, '');
        if (value.length > 0) {
            value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        }
        const form = formType === 'export' ? this.exportRequestForm : this.highRiskRequestForm;
        form.patchValue({ lastName: value });
    }

    onModalEmailInput(event: any, formType: 'export' | 'highRisk'): void {
        const value = event.target.value.trim();
        const form = formType === 'export' ? this.exportRequestForm : this.highRiskRequestForm;
        form.patchValue({ email: value });
    }

    onModalPhoneNumberInput(event: any, formType: 'export' | 'highRisk'): void {
        let value = event.target.value.trim();
        value = value.replace(/[^0-9]/g, '');
        if (value.length > 10) {
            value = value.substring(0, 10);
        }
        const form = formType === 'export' ? this.exportRequestForm : this.highRiskRequestForm;
        form.patchValue({ phoneNumber: value });
    }

    preventSpaceInEmail(event: KeyboardEvent): void {
        // Prevent space key from being entered in email fields
        if (event.key === ' ' || event.code === 'Space' || event.keyCode === 32) {
            event.preventDefault();
        }
    }

    trimInput(event: Event, controlName: string, formType: 'quotation' | 'export' | 'highRisk'): void {
        const input = event.target as HTMLInputElement | HTMLTextAreaElement;
        const originalValue = input.value;
        // For email, strip ALL whitespace characters; otherwise trim ends
        const sanitizedValue = controlName === 'email'
            ? originalValue.replace(/\s+/g, '')
            : originalValue.trim();

        if (originalValue !== sanitizedValue) {
            let form: FormGroup;
             if (formType === 'export') {
                form = this.exportRequestForm;
            } else {
                form = this.highRiskRequestForm;
            }

            // Save cursor position
            const cursorPosition = input.selectionStart || 0;
            const leadingSpaces = originalValue.length - originalValue.trimStart().length;

            // Update the input element value immediately
            input.value = sanitizedValue;

            // Update form control with emitEvent to ensure validators run
            const control = form.get(controlName);
            if (control) {
                control.setValue(sanitizedValue, { emitEvent: true });
                control.updateValueAndValidity();
            }

            // Restore cursor position; adjust for removed leading spaces only
            const newPosition = Math.max(0, cursorPosition - leadingSpaces);
            setTimeout(() => {
                if (input.setSelectionRange) {
                    input.setSelectionRange(newPosition, newPosition);
                }
            }, 0);
        }
    }

    openTermsModal(event?: Event): void {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    openPrivacyModal(event?: Event): void {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

}
