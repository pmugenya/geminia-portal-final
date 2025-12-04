import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FuseAlertComponent, FuseAlertService } from '../../../../@fuse/components/alert';
import { MatIcon } from '@angular/material/icon';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDatepickerModule, MatDatepickerToggle } from '@angular/material/datepicker';
import {
    DateAdapter,
    MAT_DATE_FORMATS,
    MAT_DATE_LOCALE,
    MatDateFormats,
    MatNativeDateModule,
} from '@angular/material/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import {
    AsyncPipe,
    CurrencyPipe, DatePipe,
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
import { AuthService } from '../../../core/auth/auth.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TravelService } from '../../../core/services/travel.service';
import { Country, TravelDuration, TravelQuoteData, TravelRatesData } from '../../../core/user/user.types';
import { noWhitespaceValidator } from '../../../core/validators/white-space-validator';
import { kenyanPhoneNumberValidator } from '../../../core/validators/kenyan-phone-validator';
import { duplicateTravelerValidator } from '../../../core/validators/duplicator-traveller-validator';
import { map, startWith, Subject, takeUntil } from 'rxjs';
import { fullNameValidator } from '../../../core/validators/full-name-validator';
import { dobValidator } from '../../../core/validators/dob-validator';
import { UserService } from '../../../core/user/user.service';
import { CustomValidators } from '../../../core/validators/custom.validators';

// @ts-ignore
export const MY_DATE_FORMATS: MatDateFormats = {
    parse: {
        dateInput: 'DD-MMM-YYYY',
    },
    display: {
        dateInput: 'DD-MMM-YYYY',
        monthYearLabel: 'MMM YYYY',
        dateA11yLabel: 'DD-MMM-YYYY',
        monthYearA11yLabel: 'MMMM YYYY',
    },
};

@Component({
    selector: 'travel',
    standalone: true,
    templateUrl: './travel-quote.component.html',
    styleUrls: ['./travel-quote.component.scss'],
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
export class TravelQuoteComponent implements OnInit, OnDestroy
{

    @ViewChild('stepper') stepper!: MatStepper;
    private unsubscribe$ = new Subject<void>();
    quoteForm: FormGroup;
    paymentForm: FormGroup;
    travelerDetailsForm: FormGroup;
    durations: TravelDuration[] = [];
    rates: TravelRatesData[] = [];
    quoteDetails: TravelQuoteData;
    submissionError: string | null = null;
    countries: Country[] = [];
    destCountries: Country[] = [];
    applicationSubmitted: boolean = false;
    isSubmitting: boolean = false;
    isProcessPayment: boolean = false;
    isProcessingStk = false;
    paymentSuccess?: boolean;
    paymentRefNo: string ='';
    today = new Date();
    totalDays: number = 0;
    filteredCountries$;
    filteredDestCountries$;
    searchCtrl = new FormControl('');
    searchDestCtrl = new FormControl('');
    isLoadingData: boolean;
    quotId: number;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private dialog: MatDialog,
        private datePipe: DatePipe,
        private _fuseAlertService: FuseAlertService,
        private travelService: TravelService,
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

        });


    }

    ngOnDestroy(): void {
        this.unsubscribe$.next(); this.unsubscribe$.complete();
    }

    ngOnInit(): void {
        const authUser =  this.userService.getCurrentUser();
        if(authUser.userType==='C'){
            this.travelerDetailsForm.get('phoneNumber')?.disable();
            this.travelerDetailsForm.get('email')?.disable();
             this.fetchProspectDocuments();
        }
        else{
            this.travelerDetailsForm.get('phoneNumber')?.enable();
            this.travelerDetailsForm.get('email')?.enable();
        }
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
        console.log('calc days...');
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

    get tdf() { return this.travelerDetailsForm.controls; }

    get travelers() { return this.travelerDetailsForm.get('travelers') as FormArray; }

    moveToNext(): void {

        if (!this.quoteForm.valid) {
            this.submissionError =
                `Please Select Cover Period and Plan to continue...`;
            return;
        }
        this.stepper.next();
    }

    buyNow(): void
    {
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
        const travellers = this.travelerDetailsForm.get('travelers')?.value;

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
            dob: ['', [Validators.required, dobValidator]]
        });
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

    fetchProspectDocuments(): void {
        this.isLoadingData = true;
        this.userService.getUserDetails().subscribe({
            next: (data) => {
                this.isLoadingData = false;
                this.travelerDetailsForm.patchValue({
                    phoneNumber: data.phoneNumber,
                    email: data.emailAddress,
                });
            },
            error: (err) => {
                this.isLoadingData = false;
            }
        });
    }


}
