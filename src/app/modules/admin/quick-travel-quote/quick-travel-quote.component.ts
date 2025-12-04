import { Component, EventEmitter, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { FuseAlertComponent, FuseAlertService } from '../../../../@fuse/components/alert';
import { MatIcon } from '@angular/material/icon';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDatepickerModule, MatDatepickerToggle } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import {
    AsyncPipe, CurrencyPipe,
    DatePipe,
    DecimalPipe,
    NgClass,
    NgForOf,
    NgIf,
    TitleCasePipe,
    UpperCasePipe,
} from '@angular/common';
import { MatStep, MatStepLabel, MatStepper } from '@angular/material/stepper';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectSearchComponent } from 'ngx-mat-select-search';
import { MatInputModule } from '@angular/material/input';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { ThousandsSeparatorValueAccessor } from '../../../core/directives/thousands-separator-value-accessor';
import { MatCheckbox } from '@angular/material/checkbox';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { MY_DATE_FORMATS } from '../travel-quote/travel-quote.component';
import {
    catchError, finalize,
    interval,
    map, of,
    startWith,
    Subject,
    Subscription,
    switchMap,
    takeUntil, takeWhile,
    throwError,
    timeout,
} from 'rxjs';
import {
    Country,
    TravelDuration,
    TravelQuoteData,
    TravelRatesData,
    UserDocumentData,
} from '../../../core/user/user.types';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TravelService } from '../../../core/services/travel.service';
import { UserService } from '../../../core/user/user.service';
import { noWhitespaceValidator } from '../../../core/validators/white-space-validator';
import { kenyanPhoneNumberValidator } from '../../../core/validators/kenyan-phone-validator';
import { duplicateTravelerValidator } from '../../../core/validators/duplicator-traveller-validator';
import { CustomValidators } from '../../../core/validators/custom.validators';
import { fullNameValidator } from '../../../core/validators/full-name-validator';
import { dobValidator } from '../../../core/validators/dob-validator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { QuoteService } from '../../../core/services/quote.service';


@Component({
    selector: 'app-quick-travel',
    standalone: true,
    templateUrl: './quick-travel-quote.component.html',
    styleUrls: ['./quick-travel-quote.component.css'],
    encapsulation: ViewEncapsulation.None,
    imports: [
        FuseAlertComponent,
        MatIcon,
        ReactiveFormsModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatProgressSpinner,
        NgIf,
        NgForOf,
        MatStepper,
        MatStep,
        MatSelect,
        MatOption,
        MatFormFieldModule,
        NgClass,
        MatSelectSearchComponent,
        MatStepLabel,
        MatInputModule,
        MatRadioGroup,
        MatRadioButton,
        ThousandsSeparatorValueAccessor,
        DecimalPipe,
        UpperCasePipe,
        TitleCasePipe,
        DatePipe,
        MatCheckbox,
        MatDatepickerToggle,
        AsyncPipe,
        CurrencyPipe,
        DatePipe,

    ],
    providers: [
        DatePipe,
        { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
        { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    ],
})
export class QuickTravelQuoteComponent implements OnInit, OnDestroy {

    @ViewChild('stepper') stepper!: MatStepper;
    private unsubscribe$ = new Subject<void>();
    private paymentPollingSub?: Subscription;
    quoteForm: FormGroup;
    paymentForm: FormGroup;
    travelerDetailsForm: FormGroup;
    durations: TravelDuration[] = [];
    rates: TravelRatesData[] = [];
    quoteDetails: TravelQuoteData;
    submissionError: string | null = null;
    countries: Country[] = [];
    destCountries: Country[] = [];
    userDocs?: UserDocumentData;
    duplicateFileErrors: { [key: string]: string } = {};
    applicationSubmitted: boolean = false;
    isSubmitting: boolean = false;
    isProcessPayment: boolean = false;
    isProcessingStk = false;
    paymentSuccess?: boolean;
    paymentRefNo: string ='';
    applicationId: number;
    today = new Date();
    totalDays: number = 0;
    @Output() closeQuote = new EventEmitter<void>();
    filteredCountries$;
    filteredDestCountries$;
    searchCtrl = new FormControl('');
    searchDestCtrl = new FormControl('');
    isLoadingData: boolean;
    isLoadingMarineData: boolean;
    quotId: number;

    constructor(
        private fb: FormBuilder,
        public router: Router,
        private dialog: MatDialog,
        private datePipe: DatePipe,
        private _snackBar: MatSnackBar,
        private _fuseAlertService: FuseAlertService,
        private travelService: TravelService,
        private quotationService: QuoteService,
        private userService: UserService
    ) {
        this.quoteForm = this.fb.group({
            duration: ['4', Validators.required],
            plan: ['', Validators.required],
            countryFromId: ['', Validators.required],
            countryToId: ['', Validators.required],
            dateOfTravel: ['', Validators.required],
            estimatedArrival: ['', Validators.required],
        });

        this.travelerDetailsForm = this.fb.group({
            email: ['', [Validators.required, Validators.email, noWhitespaceValidator]],
            phoneNumber: ['', [Validators.required, kenyanPhoneNumberValidator, noWhitespaceValidator]],
            numTravelers: [1, [Validators.required, Validators.min(1)]],
            winterSports: [false],
            // UPDATED: Added duplicateTravelerValidator to the FormArray
            travelers: this.fb.array([], [Validators.required, Validators.minLength(1), duplicateTravelerValidator]),

        });

        this.paymentForm = this.fb.group({
            mpesaNumber: ['', [ CustomValidators.mpesaNumber]],
            kraPinCertificate: [null, Validators.required],
            nationalId: [null, Validators.required],
            agreeToTerms: [false, Validators.requiredTrue],
            firstName: ['', [Validators.required, CustomValidators.firstName]],
            lastName: ['', [Validators.required, CustomValidators.lastName]],
            emailAddress: ['', [Validators.required, CustomValidators.email]],
            phoneNumber: ['', [Validators.required, CustomValidators.phoneNumber]],
            kraPin: ['', [Validators.required, CustomValidators.kraPin]],
            idNumber: ['', [Validators.required, CustomValidators.idNumber]],

        });


    }

    ngOnDestroy(): void {
        this.unsubscribe$.next(); this.unsubscribe$.complete();
        this.paymentPollingSub?.unsubscribe();
    }

    ngOnInit(): void {
console.log('here..');
            this.travelerDetailsForm.get('phoneNumber')?.enable();
            this.travelerDetailsForm.get('email')?.enable();

        this._fuseAlertService.dismiss('submissionError');
        this.loadConfig();

        this.tdf.numTravelers.valueChanges.pipe(takeUntil(this.unsubscribe$), startWith(this.tdf.numTravelers.value)).subscribe(count => {
            if(count > 0 && this.travelers.length !== count) this.updateTravelersArray(count);
        });

        this.travelService.getCountries().subscribe(data => {
            this.countries = data;
            this.destCountries = data;
            // Enable filtering
            this.filteredCountries$ = this.searchCtrl.valueChanges.pipe(
                startWith(''),
                map(text =>
                    this.countries.filter(c =>
                        c.countryname.toLowerCase().includes(text.toLowerCase())
                    )
                )
            );

            this.filteredDestCountries$ = this.searchDestCtrl.valueChanges.pipe(
                startWith(''),
                map(text =>
                    this.destCountries.filter(c =>
                        c.countryname.toLowerCase().includes(text.toLowerCase())
                    )
                )
            );
        });

        this.quoteForm.get('dateOfTravel')?.valueChanges.subscribe(() => {
            this.calculateDays();
        });

        this.quoteForm.get('estimatedArrival')?.valueChanges.subscribe(() => {
            this.calculateDays();
        });

    }

    calculateDays() {
        const start = this.quoteForm.get('dateOfTravel')?.value;
        const end = this.quoteForm.get('estimatedArrival')?.value;

        if (!start || !end) {
            this.totalDays = 0;
            return;
        }

        const startDate = new Date(start);
        const endDate = new Date(end);

        const diffTime = endDate.getTime() - startDate.getTime();
        this.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        this.loadRates(this.totalDays);
    }

    onMpesaNumberInput(event: any): void {
        let value = event.target.value.trim();
        value = value.replace(/[^0-9]/g, '');
        if (value.length > 0 && !value.startsWith('0')) {
            value = '0' + value;
        }
        if (value.length > 10) {
            value = value.substring(0, 10);
        }
        this.travelerDetailsForm.patchValue({ mpesaNumber: value });
    }

    loadConfig(): void {
        this.travelService.getTravelDurations().subscribe({
            next: (data) => {
                this.durations = data;
            },
            error: (err) => {
                console.error('Error loading durations', err);
            }
        });
    }

    fetchuserDocuments(): void {
        this.isLoadingMarineData = true;
        this.userService.getUserDocuments().subscribe({
            next: (data) => {
                console.log(data);
                this.userDocs = data;
                this.isLoadingMarineData = false;
                this.paymentForm.get('idNumber')?.setValue(data.idNo);
                if (data.idNo) {
                    this.paymentForm.get('idNumber')?.disable();
                } else {
                    this.paymentForm.get('idNumber')?.enable();
                }
                this.paymentForm.get('firstName')?.setValue(data.firstName);
                this.paymentForm.get('lastName')?.setValue(data.lastName);
                this.paymentForm.get('emailAddress')?.setValue(data.emailAddress);
                if (data.emailAddress) {
                    this.paymentForm.get('emailAddress')?.disable();
                } else {
                    this.paymentForm.get('emailAddress')?.enable();
                }
                this.travelerDetailsForm.get('phoneNumber')?.setValue(data.phoneNumber);
                this.travelerDetailsForm.get('email')?.setValue(data.emailAddress);
                this.paymentForm.get('phoneNumber')?.setValue(this.extractPhoneNumber(data.phoneNumber));
                this.paymentForm.get('kraPin')?.setValue(data.pinNo);
                if (data.pinNo) {
                    this.paymentForm.get('kraPin')?.disable();
                } else {
                    this.paymentForm.get('kraPin')?.enable();
                }
                if (data.idfDocumentExists) {
                    this.paymentForm.get('nationalId')?.clearValidators();
                    this.paymentForm.get('nationalId')?.updateValueAndValidity();
                } else {
                    this.paymentForm.get('nationalId')?.setValidators(Validators.required);
                    this.paymentForm.get('nationalId')?.updateValueAndValidity();
                }
                if (data.kraDocumentExists) {
                    this.paymentForm.get('kraPinCertificate')?.clearValidators();
                    this.paymentForm.get('kraPinCertificate')?.updateValueAndValidity();
                } else {
                    this.paymentForm.get('kraPinCertificate')?.setValidators(Validators.required);
                    this.paymentForm.get('kraPinCertificate')?.updateValueAndValidity();
                }
            },
            error: (err) => {
                this.isLoadingMarineData = false;
            }
        });
    }

    fetchProspectDocuments(prospectId: number): void {
        this.isLoadingMarineData = true;
        this.userService.checkProspectDocument(prospectId).subscribe({
            next: (data) => {
                this.userDocs = data;
                this.isLoadingMarineData = false;
                this.paymentForm.get('idNumber')?.setValue(data.idNo);
                if (data.idNo) {
                    this.paymentForm.get('idNumber')?.disable();
                } else {
                    this.paymentForm.get('idNumber')?.enable();
                }
                this.paymentForm.get('firstName')?.setValue(data.firstName);
                this.paymentForm.get('lastName')?.setValue(data.lastName);
                this.paymentForm.get('emailAddress')?.setValue(data.emailAddress);
                if (data.emailAddress) {
                    this.paymentForm.get('emailAddress')?.disable();
                } else {
                    this.paymentForm.get('emailAddress')?.enable();
                }
                this.paymentForm.get('phoneNumber')?.setValue(this.extractPhoneNumber(data.phoneNumber));
                this.paymentForm.get('kraPin')?.setValue(data.pinNo);
                if (data.pinNo) {
                    this.paymentForm.get('kraPin')?.disable();
                } else {
                    this.paymentForm.get('kraPin')?.enable();
                }
                if (data.idfDocumentExists) {
                    this.paymentForm.get('nationalId')?.clearValidators();
                    this.paymentForm.get('nationalId')?.updateValueAndValidity();
                } else {
                    this.paymentForm.get('nationalId')?.setValidators(Validators.required);
                    this.paymentForm.get('nationalId')?.updateValueAndValidity();
                }
                if (data.kraDocumentExists) {
                    this.paymentForm.get('kraPinCertificate')?.clearValidators();
                    this.paymentForm.get('kraPinCertificate')?.updateValueAndValidity();
                } else {
                    this.paymentForm.get('kraPinCertificate')?.setValidators(Validators.required);
                    this.paymentForm.get('kraPinCertificate')?.updateValueAndValidity();
                }
            },
            error: (err) => {
                this.isLoadingMarineData = false;
            }
        });
    }

    private extractPhoneNumber(input: string): string {
        if (!input) return '';

        let sanitized = input.trim().replace(/[^\d+]/g, '');

        if (sanitized.startsWith('+254')) {
            let local = sanitized.slice(4); // remove "+254"
            if (local.length === 9 && local.startsWith('7')) {
                return '0' + local;
            }
            return '0' + local.slice(-9);
        } else if (sanitized.startsWith('254')) {
            // without + sign
            let local = sanitized.slice(3);
            return '0' + local.slice(-9);
        } else if (sanitized.length === 9 && sanitized.startsWith('7')) {
            return '0' + sanitized;
        } else if (sanitized.length === 10 && sanitized.startsWith('0')) {
            return sanitized;
        }

        if (sanitized.startsWith('+1') || sanitized.startsWith('+2')) {
            return sanitized;
        }

        return sanitized;
    }

    loadRates(durationId): void {
        this.travelService.getRatesByDuration(durationId).subscribe({
            next: (data) => {
                this.rates = data;
            },
            error: (err) => {
                console.error('Error loading rates', err);
            }
        });
    }

    onFileSelected(event: Event, controlName: string): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (file) {
            // Clear any existing error for this field
            delete this.duplicateFileErrors[controlName];

            // Validate file type
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
            if (!allowedTypes.includes(file.type)) {
                this.duplicateFileErrors[controlName] = 'Only PDF, JPG, and PNG files are allowed';
                input.value = '';
                this.paymentForm.get(controlName)?.setValue(null);
                return;
            }

            // Validate file size (500KB = 500 * 1024 bytes)
            const maxSize = 500 * 1024; // 500KB in bytes
            if (file.size > maxSize) {
                this.duplicateFileErrors[controlName] = 'File size must be less than 500KB';
                input.value = '';
                this.paymentForm.get(controlName)?.setValue(null);
                return;
            }

            // Check if this file is already uploaded in another field
            const documentFields = ['idfDocument', 'invoice', 'kraPinCertificate', 'nationalId'];
            const fieldNames: { [key: string]: string } = {
                kraPinCertificate: 'KRA PIN Certificate',
                nationalId: 'National ID'
            };

            let duplicateFieldName: string | null = null;
            const isDuplicate = documentFields.some((fieldName: string) => {
                if (fieldName === controlName) return false; // Skip current field
                const existingFile = this.paymentForm.get(fieldName)?.value;
                if (!existingFile) return false;

                // Compare file name, size, and last modified date
                const isSame = existingFile.name === file.name &&
                    existingFile.size === file.size &&
                    existingFile.lastModified === file.lastModified;

                if (isSame) {
                    duplicateFieldName = fieldNames[fieldName] || fieldName;
                }

                return isSame;
            });

            if (isDuplicate) {
                // User message: same file reused across different document cards, show specific card name
                const nameToShow = duplicateFieldName || 'this document type';
                this.duplicateFileErrors[controlName] = `This file is already uploaded as ${nameToShow}.`;
                input.value = '';
                this.paymentForm.get(controlName)?.setValue(null);
                return;
            }

            // Store the valid, non-duplicate file on the form control
            this.paymentForm.get(controlName)?.setValue(file);
        }
    }

    get tdf() { return this.travelerDetailsForm.controls; }

    get travelers() { return this.travelerDetailsForm.get('travelers') as FormArray; }

    openTermsOfUse(event: Event): void {
        event.preventDefault();
    }

    openPrivacyPolicy(event: Event): void {
        event.preventDefault();
    }

    moveToNext(): void {

        if (!this.quoteForm.valid) {
            this.submissionError =
                `Please Select Cover Period and Plan to continue...`;
            return;
        }
        this.stepper.next();
    }


    proceedToPayment(): void {

    }

    saveTravelQuote(): void {
        const planId = this.quoteForm.get('plan')?.value;
        const countryFromId = this.quoteForm.get('countryFromId')?.value;
        const countryToId = this.quoteForm.get('countryToId')?.value;
        const dateOfTravel = this.quoteForm.get('dateOfTravel')?.value;
        const estimatedArrival = this.quoteForm.get('estimatedArrival')?.value;
        const email = this.travelerDetailsForm.get('email')?.value;
        const phoneNumber = this.travelerDetailsForm.get('phoneNumber')?.value;
        const numTravelers = this.travelerDetailsForm.get('numTravelers')?.value;
        const winterSports = this.travelerDetailsForm.get('winterSports')?.value;
        const name = this.travelerDetailsForm.get('name')?.value;
        const travellersArray = this.travelerDetailsForm.get('travelers') as FormArray;
        const travellers = travellersArray.getRawValue();

        const requestBody = {
            durationId: this.totalDays,
            planId: planId,
            email: email,
            phoneNumber: phoneNumber,
            numTravelers: numTravelers,
            winterSports: winterSports,
            name: name,
            travellers: travellers,
            countryToId: countryToId,
            countryFromId: countryFromId,
            dateFormat: 'dd MMM yyyy',
            locale: 'en_US',
            dateFrom: this.datePipe.transform(dateOfTravel, 'dd MMM yyyy'),
            dateTo: this.datePipe.transform(estimatedArrival, 'dd MMM yyyy'),
        };
        console.log(requestBody);
        this.travelService.saveTravelQuote(requestBody).subscribe({
            next: (response) => {
                this.quotId = response.id;
                this.loadQuote();
            },
            error: (err) => {
                console.error("Error:", err);
            }
        });
    }

    loadQuote() {
        this.travelService.getSingleQuote(this.quotId).subscribe({
            next: (data) => {
                this.stepper.next();
                console.log('Quote Data:', data);
                this.quoteDetails = data;
            },
            error: (err) => {
                console.error('Error fetching quote:', err);
            }
        });
    }

    createTravelerGroup(): FormGroup {
        return this.fb.group({
            fullName: ['', [Validators.required, fullNameValidator, noWhitespaceValidator]],
            dob: ['', [Validators.required, dobValidator]],
            sameAsPrimary: [false],
            passportFile: [null],
            passportFileName: [null]
        });
    }


    onSameAsPrimaryChange() {
        const primaryForm = this.quoteForm;
        const traveler0 = this.travelers.at(0);

        const isChecked = traveler0.get('sameAsPrimary')?.value;

        if (isChecked) {
            traveler0.patchValue({
                fullName: this.userDocs.firstName+" "+this.userDocs.lastName,
                dob: this.userDocs.dateOfBirth
            });

            if(this.userDocs.dateOfBirth){
                traveler0.get('dob')?.disable();
            }
            else{
                traveler0.get('dob')?.enable();
            }
            traveler0.get('fullName')?.disable();
        } else {
            traveler0.get('fullName')?.reset();
            traveler0.get('dob')?.reset();

            traveler0.get('fullName')?.enable();
            traveler0.get('dob')?.enable();
        }
    }

    updateTravelersArray(count: number): void {
        while (this.travelers.length < count) this.travelers.push(this.createTravelerGroup());
        while (this.travelers.length > count) this.travelers.removeAt(this.travelers.length - 1);
    }

    trimTravelerInput(event: Event, travelerIndex: number, controlName: string): void {
        const input = event.target as HTMLInputElement;
        const originalValue = input.value;
        const sanitizedValue = originalValue.trim();

        if (sanitizedValue !== originalValue) {
            const travelerControl = this.travelers.at(travelerIndex);
            travelerControl.patchValue({ [controlName]: sanitizedValue });
            input.value = sanitizedValue;
        }
    }

    getPassportControl(index: number): FormControl {
        const travelersArray = this.travelerDetailsForm.get('travelers') as FormArray;
        return travelersArray.at(index).get('passportNumber') as FormControl;
    }

    onPassportUpload(event: any, index: number) {
        const file = event.target.files[0];
        if (file) {
            const travelersArray = this.travelerDetailsForm.get('travelers') as FormArray;
            travelersArray.at(index).patchValue({ passportFile: file, passportFileName: file.name });
        }
    }

    submitPolicy() {
        const travelersArray = this.travelerDetailsForm.get('travelers')?.value;

        // Build JSON without files
        const travelersJson = travelersArray.map(t => ({
            fullName: t.fullName,
            passportNumber: t.passportNumber
        }));

        const json  = {
            "travellers": travelersJson,
            "quoteId": this.quotId
        }
        console.log(json);

        const files: File[] = [];

        travelersArray.forEach(t => {
            if (t.passportFile) {
                files.push(t.passportFile);
            }
        });

        this.travelService.submitPolicy(json, files)
            .subscribe({
                next: (res) => {
                    console.log('Success', res);
                    const refNo = res?.transactionId;
                    this.applicationId = res?.commandId;
                    this.paymentRefNo = refNo;
                    this.isSubmitting = false;
                    this.applicationSubmitted = true;
                },
                error: (err) => console.error('Error', err)
            });
    }

    preventLeadingSpace(event: KeyboardEvent): void {
        const input = event.target as HTMLInputElement;
        const cursorPosition = input.selectionStart || 0;

        // Prevent space if:
        // 1. Input is empty or only whitespace
        // 2. Cursor is at position 0 (beginning)
        if (event.key === ' ') {
            if (!input.value || input.value.trim().length === 0 || cursorPosition === 0) {
                event.preventDefault();
            }
        }
    }

    getAge(dob: string | Date | null): number | null {
        if (!dob) return null;
        const birthDate = new Date(dob);
        if (isNaN(birthDate.getTime())) return null; // Invalid date

        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    initiatePayment(): void {
        const mpesaNumber = this.paymentForm.get('mpesaNumber')?.value?.slice(-10); // last 10 digits

        if (!mpesaNumber || mpesaNumber.length !== 10) {
            this._snackBar.open('Please enter a valid M-PESA number', 'Close', {
                duration: 6000,
                panelClass: ['error-snackbar']
            });
            return;
        }

        this.isProcessPayment = true;
        this.isProcessingStk = true;

        this.quotationService.stkPush(mpesaNumber, 1, this.paymentRefNo,"Travel").pipe(
            timeout(15000),
            catchError(err => {
                console.error('STK Push error', err);
                this.isProcessPayment = false;
                this.isProcessingStk = false;
                this._snackBar.open('STK Push failed. Please try again.', 'Close', { duration: 5000 });
                return throwError(() => err);
            })
        ).subscribe({
            next: (res) => {
                console.log('STK Push response', res);
                const { checkOutRequestId, merchantRequestId } = res;

                this.paymentPollingSub?.unsubscribe();

                let attempts = 0;
                const maxAttempts = 12; // 12 * 5s = 60 seconds max polling time

                this.paymentPollingSub = interval(5000).pipe(
                    switchMap(() => {
                        attempts++;
                        return this.quotationService.validatePayment(merchantRequestId, checkOutRequestId);
                    }),
                    takeWhile(() => attempts <= maxAttempts, true),
                    catchError(err => {
                        console.error('Polling error', err);
                        return of({ resultCode: -1 }); // fail gracefully
                    }),
                    finalize(() => {
                        this.isProcessingStk = false;
                        this.isProcessPayment = false;
                    })
                ).subscribe((statusRes) => {
                    console.log('Payment status', statusRes);

                    if (statusRes.resultCode === 0 && statusRes.mpesaCode) {
                        this.paymentSuccess = true;
                        this._snackBar.open('Payment successful!', 'Close', { duration: 4000 });
                        this.paymentPollingSub?.unsubscribe();
                        this.router.navigate(['/viewmarinequote', this.applicationId]);
                    }

                    else if (statusRes.resultCode !== 0) {
                        this.paymentSuccess = false;
                        this._snackBar.open('Payment failed or cancelled.', 'Close', { duration: 4000 });
                        this.paymentPollingSub?.unsubscribe();
                    }

                    else if (attempts >= maxAttempts) {
                        this.paymentSuccess = false;
                        this._snackBar.open('Payment unsuccessful. Request timed out.', 'Close', { duration: 4000 });
                        this.paymentPollingSub?.unsubscribe();
                    }
                });
            },
            error: (err) => {
                console.error('Error during STK request', err);
                this.isProcessingStk = false;
                this.isProcessPayment = false;
                this._snackBar.open('STK request failed. Please try again.', 'Close', { duration: 5000 });
            }
        });
    }

    onSubmit(): void {

    }


    handleInputChange(event: Event, controlName: string): void {
        const input = event.target as HTMLInputElement;
        let value = input.value;

        // Remove leading spaces
        if (value !== value.trimStart()) {
            const cursorPosition = input.selectionStart || 0;
            const trimmedValue = value.trimStart();
            const removedChars = value.length - trimmedValue.length;

            // Update the input value
            input.value = trimmedValue;

            // Update form control
            if (controlName === 'email' || controlName === 'phoneNumber') {
                this.travelerDetailsForm.patchValue({ [controlName]: trimmedValue }, { emitEvent: false });
            }

            // Adjust cursor position
            const newPosition = Math.max(0, cursorPosition - removedChars);
            input.setSelectionRange(newPosition, newPosition);
        }
    }

    trimInput(event: Event, controlName: string): void {
        const input = event.target as HTMLInputElement;
        const originalValue = input.value;

        // For email, strip ALL whitespace; otherwise trim leading/trailing
        const sanitizedValue = controlName === 'email'
            ? originalValue.replace(/\s+/g, '')
            : originalValue.trim();

        if (sanitizedValue !== originalValue) {
            // Update form control value
            if (controlName === 'email' || controlName === 'phoneNumber') {
                this.travelerDetailsForm.patchValue({ [controlName]: sanitizedValue });
            }

            // Update input field
            input.value = sanitizedValue;
        }
    }

    buyNow(): void {
        this.closeQuote.emit();
         this.router.navigate(['/editquote', -2000]);
    }

}
