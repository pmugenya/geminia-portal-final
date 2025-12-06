import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
    CargoTypeData,
    Category,
    Country,
    MarineProduct,
    PackagingType, Port, PostalCode,
    QuoteResult, QuotesData, StoredUser,
    User, UserDocumentData,
} from '../../../core/user/user.types';
import { UserCrudService } from '../../../core/user/user-crud.service';
import { MatIcon } from '@angular/material/icon';
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
import { MatFormField, MatOption, MatSelect, MatSelectChange } from '@angular/material/select';
import { CustomValidators } from '../../../core/validators/custom.validators';
import { UserService } from '../../../core/user/user.service';
import {
    catchError,
    debounceTime,
    distinctUntilChanged, finalize,
    forkJoin,
    fromEvent, interval, of, ReplaySubject,
    Subject,
    Subscription, switchMap,
    takeUntil, takeWhile,
    throttleTime, throwError, timeout,
} from 'rxjs';
import { MatSelectSearchComponent } from 'ngx-mat-select-search';
import { MatInput, MatInputModule } from '@angular/material/input';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { ThousandsSeparatorValueAccessor } from '../../../core/directives/thousands-separator-value-accessor';
import { QuoteService } from '../../../core/services/quote.service';
import { FuseAlertComponent, FuseAlertService } from '../../../../@fuse/components/alert';
import { MatSnackBar, MatSnackBarRef, SimpleSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { FuseAlertType } from '@fuse/components/alert';
import { MatCheckbox } from '@angular/material/checkbox';
import {
    MatDatepicker,
    MatDatepickerInput,
    MatDatepickerModule,
    MatDatepickerToggle,
} from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MY_DATE_FORMATS } from '../../../core/directives/date-formats';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { Router } from '@angular/router';
import { ShareQuoteDialogComponent, ShareChannel } from '../../../shared/share-quote-dialog/share-quote-dialog.component';

@Component({
    selector: 'example',
    standalone: true,
    templateUrl: './marine-quote.component.html',
    styleUrls: ['./marine-quote.component.scss'],
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
export class MarineQuoteComponent implements OnInit, OnDestroy
{

    @ViewChild('stepper') stepper!: MatStepper;
    @ViewChild('countrySelect') countrySelect!: MatSelect;
    @ViewChild('countrySelect2') countrySelect2!: MatSelect;
    @ViewChild('categorySelect') categorySelect!: MatSelect;
    @ViewChild('categorySelect2') categorySelect2!: MatSelect;
    @ViewChild('cargoTypeSelect') cargoTypeSelect!: MatSelect;
    @ViewChild('cargoTypeSelect2') cargoTypeSelect2!: MatSelect;

    // Stepper Form Groups
    quotationForm!: FormGroup;
    coverageFormGroup!: FormGroup;
    shipmentForm!: FormGroup;
    quote?: QuotesData;
    postalCodes: PostalCode[] = [];
    isLoading = true;
    isLoadingMarineData: boolean = true;
    isLoadingCargoTypes: boolean = true;
    selectedCategoryId: number;
    selectedCargoTypeId: number;
    marineProducts: MarineProduct[] = [];
    marinePackagingTypes: PackagingType[] = [];
    marineCategories: Category[] = [];
    marineCargoTypes: CargoTypeData[] = [];
    filteredMarineCategories: Category[] = [];
    filteredMarineCargoTypes: CargoTypeData[] = [];
    duplicateFileErrors: { [key: string]: string } = {};
    today = new Date();

    // Document preview modal state (Step 3 uploads)
    showDocumentPreviewModal = false;
    previewDocumentUrl: string | null = null;
    previewSafeUrl: SafeResourceUrl | null = null;
    previewDocumentName = '';
    previewDocumentType = '';

    userDocs?: UserDocumentData;
    private destroy$ = new Subject<void>();
    countryFilterCtrl: FormControl = new FormControl();
    countryFilterCtrl2: FormControl = new FormControl();
    countySearchCtrl: FormControl = new FormControl();
    categoryFilterCtrl: FormControl = new FormControl();
    categoryFilterCtrl2: FormControl = new FormControl();
    cargoTypeFilterCtrl: FormControl = new FormControl();
    cargoTypeFilterCtrl2: FormControl = new FormControl();
    loadingPortSearchCtrl: FormControl = new FormControl();
    dischargePortSearchCtrl: FormControl = new FormControl();
    categorySearchCtrl: FormControl = new FormControl();
    cargoTypeSearchCtrl: FormControl = new FormControl();
    @ViewChild('portSelect') portSelect!: MatSelect;
    private scrollSubscription?: Subscription;
    isLoadingLoadingPorts = false;
    loading = false;
    hasMore = true;
    hasMoreLast = true;
    offset = 0;
    offsetLast = 0;
    limit = 20;
    portLoading = false;
    loadingPorts: Port[] = [];
    portOffset = 0;
    portHasMore = true;
    portCurrentSearchTerm = '';
    currentSearchTerm = '';
    currentSearchTerm2 = '';
    countries: Country[] = [];
    origincountries: Country[] = [];
    quoteResult: QuoteResult | null = null;
    selectedCountry: string = '';
    isLoadingDischargePorts = false;
    loadingPortPage = 0;
    dischargePortPage = 0;
    countyPage = 0;
    isLoadingCounties = false;
    pageSize = 50;
    isLoadingCategories = false;
    isSearching = false;
    categories: any[] = [];
    counties: any[] = [];
    isSaving = false;
    submissionError: string | null = null;
    dischargePorts: any[] = [];
    cargoTypes: any[] = [];
    user: StoredUser;
    filteredDischargePorts: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
    filteredCounties: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
    filteredCargoTypes: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
    filteredCategories: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

    isMakePaymentNow = false;
    applicationId: number;
    paymentRefNo: string ='';
    applicationSubmitted: boolean = false;
    isSubmitting: boolean = false;
    isProcessPayment: boolean = false;
    isProcessingStk = false;
    paymentSuccess?: boolean;

    private paymentPollingSub?: Subscription;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private validationToastRef: MatSnackBarRef<SimpleSnackBar> | null = null;

    // Inline modals for Terms of Use & Data Privacy
    showTermsModal = false;
    showDataPrivacyModal = false;

    constructor(private fb: FormBuilder,
                private userService: UserService,
                private quotationService: QuoteService,
                private _fuseAlertService: FuseAlertService,
                private datePipe: DatePipe,
                private router: Router,
                private _snackBar: MatSnackBar,
                private dialog: MatDialog,
                private sanitizer: DomSanitizer) { }

    ngOnInit(): void {
        this._fuseAlertService.dismiss('quoteDownloadError');
        this.initForms();
        this.setupFormSubscriptions();
        this.isLoadingMarineData = true;

        this.userService.currentUser$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: StoredUser) => {
                this.user = user;
                console.log(user);
                // Mark for check
            });


        // Add this call to setup search filters
        this.setupSearchFilters();

        this.listenForSumInsuredChanges();

        // Update your existing forkJoin to initialize filtered arrays
        forkJoin({
            products: this.userService.getMarineProducts(),
            packagingTypes: this.userService.getMarinePackagingTypes(),
            categories: this.userService.getMarineCategories(),
            postalcodes: this.quotationService.getPostalCodes()
        }).subscribe({
            next: (data) => {
                this.marineProducts = data.products || [];
                this.marinePackagingTypes = data.packagingTypes || [];
                this.marineCategories = data.categories || [];
                this.postalCodes = data.postalcodes;

                // Initialize filtered arrays
                this.filteredMarineCategories = this.marineCategories.slice();

                this.isLoadingMarineData = false;
            },
            error: (err) => {
                console.error('Error loading marine data:', err);
                this.isLoadingMarineData = false;
            },
        });

        this.setupDateValidation();

        const authUser = this.userService.getCurrentUser();
        if (authUser) {
            const userType = authUser.userType;
            if (userType === 'A') {
                this.toggleRequiredFields(true);
            } else {
                this.toggleRequiredFields(false);
            }
        }

        this.setupSearchableDropdowns();

    }

    openShareDialog(): void {
        const ref = this.dialog.open(ShareQuoteDialogComponent, {
            panelClass: 'share-quote-dialog-panel'
        });

        ref.componentInstance.choose.subscribe((channel: ShareChannel) => {
            if (channel === 'whatsapp') {
                this.shareViaWhatsApp();
            } else if (channel === 'gmail') {
                this.shareViaGmail();
            } else if (channel === 'outlook' || channel === 'otherEmail') {
                this.shareViaOutlook();
            }
            ref.close();
        });
    }

    normalizeName(controlName: 'firstName' | 'lastName'): void {
        if (!this.quotationForm) {
            return;
        }

        const control = this.quotationForm.get(controlName);
        if (!control) {
            return;
        }

        let value: string = (control.value || '').toString();
        if (!value) {
            return;
        }

        // Trim leading/trailing spaces and collapse multiple spaces
        value = value.trim().replace(/\s+/g, ' ');

        // Capitalize first letter, keep the rest as-is but trimmed
        if (value.length > 0) {
            value = value.charAt(0).toUpperCase() + value.slice(1);
        }

        control.setValue(value, { emitEvent: true });
    }

    onStep1PhoneNumberInput(event: any): void {
        if (!this.quotationForm) {
            return;
        }

        let value: string = (event.target.value || '').toString().trim();
        // Keep digits only
        value = value.replace(/[^0-9]/g, '');

        if (value.length > 0 && !value.startsWith('0')) {
            value = '0' + value;
        }

        if (value.length > 10) {
            value = value.substring(0, 10);
        }

        this.quotationForm.patchValue({ phoneNumber: value });
    }

    private buildStructuredShareLines(): string[] {
        const lines: string[] = [];

        lines.push('Please find below the marine quote details.');
        lines.push('');

        // Customer section
        const firstName = this.quotationForm?.get('firstName')?.value || '';
        const lastName = this.quotationForm?.get('lastName')?.value || '';
        const email = this.quotationForm?.get('email')?.value || '';
        const phone = this.quotationForm?.get('phoneNumber')?.value || '';

        lines.push('Customer');
        lines.push(`Name: ${`${firstName} ${lastName}`.trim()}`);
        lines.push(`Email: ${email}`);
        lines.push(`Phone: ${phone}`);
        lines.push('');

        // Shipping & Cargo section
        const cargoType = this.quotationForm?.get('marineCargoType')?.value || '';
        const modeOfShipment = this.quotationForm?.get('modeOfShipment')?.value;
        const packagingType = this.quotationForm?.get('marinePackagingType')?.value;
        const originId = this.quotationForm?.get('origin')?.value;
        const destination = this.quotationForm?.get('destination')?.value || '';

        const modeLabel = modeOfShipment === '1' || modeOfShipment === 1 ? 'Sea' : modeOfShipment === '2' || modeOfShipment === 2 ? 'Air' : '';
        const packagingLabel = packagingType === '1' || packagingType === 1
            ? 'Containerized'
            : packagingType === '2' || packagingType === 2
                ? 'Non-Containerized'
                : '';

        let originCountryName = '';
        if (originId && this.countries && this.countries.length) {
            const found = this.countries.find(c => c.id === originId);
            originCountryName = found?.countryname || '';
        }

        lines.push('Shipping & Cargo Details');
        lines.push(`Cargo Type: ${cargoType}`);
        lines.push(`Shipping Mode: ${modeLabel}`);
        lines.push(`Packaging Type: ${packagingLabel}`);
        lines.push(`Origin Country: ${originCountryName}`);
        lines.push(`Destination: ${destination}`);
        lines.push('');

        // Premium details
        const sumInsured = this.quotationForm?.get('sumInsured')?.value || '';

        lines.push('Premium Details');
        lines.push(`Sum Assured: KES ${sumInsured}`);

        if (this.quoteResult) {
            lines.push(`Premium: KES ${this.quoteResult.premium}`);
            lines.push(`PHCF: KES ${this.quoteResult.phcf}`);
            lines.push(`Training Levy: KES ${this.quoteResult.tl}`);
            lines.push(`Stamp Duty: KES ${this.quoteResult.sd}`);
            lines.push(`Net Premium: KES ${this.quoteResult.netprem}`);
        }

        lines.push('');
        lines.push('You may also attach a screenshot or PDF of the quote details before sending.');

        return lines;
    }

    shareViaGmail(): void {
        const subject = encodeURIComponent('Marine Quote Details');
        const body = encodeURIComponent(this.buildStructuredShareLines().join('\n'));
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
        window.open(gmailUrl, '_blank');
    }

    shareViaWhatsApp(): void {
        const text = encodeURIComponent(this.buildStructuredShareLines().join('\n'));
        const url = `https://wa.me/?text=${text}`;
        window.open(url, '_blank');
    }

    shareViaOutlook(): void {
        const subject = encodeURIComponent('Marine Quote Details');
        const body = encodeURIComponent(this.buildStructuredShareLines().join('\n'));
        const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
        window.location.href = mailtoUrl;
    }

    fetchUserDocuments(): void {
        this.isLoadingMarineData = true;
        this.userService.getUserDocuments().subscribe({
            next: (data) => {
                this.userDocs = data;
                this.isLoadingMarineData = false;
                this.shipmentForm.get('idNumber')?.setValue(data.idNo);
                this.shipmentForm.get('streetAddress')?.setValue(data.postalAddress);
                this.shipmentForm.get('postalCode')?.setValue(data.postalCode);
                this.shipmentForm.get('firstName')?.setValue(data.firstName);
                this.shipmentForm.get('lastName')?.setValue(data.lastName);
                this.shipmentForm.get('emailAddress')?.setValue(data.emailAddress);
                this.shipmentForm.get('phoneNumber')?.setValue(this.extractPhoneNumber(data.phoneNumber));
                this.shipmentForm.get('kraPin')?.setValue(data.pinNo);
                this.onDropdownOpen('categories');
                if (data.idfDocumentExists) {
                    this.shipmentForm.get('nationalId')?.clearValidators();
                    this.shipmentForm.get('nationalId')?.updateValueAndValidity();
                } else {
                    this.shipmentForm.get('nationalId')?.setValidators(Validators.required);
                    this.shipmentForm.get('nationalId')?.updateValueAndValidity();
                }
                if (data.kraDocumentExists) {
                    this.shipmentForm.get('kraPinCertificate')?.clearValidators();
                    this.shipmentForm.get('kraPinCertificate')?.updateValueAndValidity();
                } else {
                    this.shipmentForm.get('kraPinCertificate')?.setValidators(Validators.required);
                    this.shipmentForm.get('kraPinCertificate')?.updateValueAndValidity();
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

    onScrollPorts(event: Event) {
        const panel = event.target as HTMLElement;
        const threshold = 200;
        const reachedBottom = panel.scrollHeight - panel.scrollTop <= panel.clientHeight + threshold;
        if (reachedBottom && this.portHasMore && !this.portLoading) {
            this.fetchLoadingPorts();
        }
    }


    openTermsModal(): void {
        console.log('openTermsModal clicked');
        this.showTermsModal = true;
    }

    openPrivacyModal(): void {
        console.log('openPrivacyModal clicked');
        this.showDataPrivacyModal = true;
    }

    closeTermsModal(): void {
        this.showTermsModal = false;
    }

    closeDataPrivacyModal(): void {
        this.showDataPrivacyModal = false;
    }

    getCurrentDate(): string {
        return new Date().toLocaleDateString();
    }


    private showToast(message: string, duration: number = 4000): MatSnackBarRef<SimpleSnackBar> {
        const snackRef = this._snackBar.open(message, undefined, {
            horizontalPosition: 'right',
            verticalPosition: 'top',
            duration,
            panelClass: ['marine-quote-snackbar']
        });

        return snackRef;
    }


    private initForms(): void {
        // Step 1: Basic Details
        this.quotationForm = this.fb.group({
            modeOfShipment: ['', Validators.required],
            marineProduct: ['ICC (A) All Risks'],
            marineCategory: ['ICC (A) All Risks', Validators.required],
            marineCargoType: ['', Validators.required],
            marinePackagingType: ['', Validators.required],
            tradeType: ['', Validators.required],
            origin: ['', Validators.required],
            destination: ['Kenya'],
            selfAsImporter: [false],
            sumInsured: [null, [Validators.required, Validators.min(1)]],
            termsAndPolicyConsent: [false, Validators.requiredTrue],
            firstName: ['', [Validators.required, CustomValidators.firstName]],
            lastName: ['', [Validators.required, CustomValidators.lastName]],
            email: ['', [Validators.required, CustomValidators.email]],
            phoneNumber: ['', [Validators.required, CustomValidators.phoneNumber]],
            searchPin: ['', [ CustomValidators.kraPin]],
        });

        // Step 2: Coverage Details (example fields)
        this.coverageFormGroup = this.fb.group({
        });

        this.shipmentForm = this.fb.group({

            // Document Uploads
            idfDocument: [null, Validators.required],
            invoice: [null, Validators.required],
            kraPinCertificate: [null, Validators.required],
            nationalId: [null, Validators.required],

            // Personal Details & KYC
            firstName: ['', [Validators.required, CustomValidators.firstName]],
            lastName: ['', [Validators.required, CustomValidators.lastName]],
            emailAddress: ['', [Validators.required, CustomValidators.email]],
            phoneNumber: ['', [Validators.required, CustomValidators.phoneNumber]],
            kraPin: ['', [Validators.required, CustomValidators.kraPin]],
            idNumber: ['', [Validators.required, CustomValidators.idNumber]],
            streetAddress: ['', Validators.required],
            postalCode: ['', Validators.required],

            // Shipment Details
            modeOfShipment: ['', Validators.required], // 1 = Sea, 2 = Air
            tradeType: ['Marine Cargo Import'], // Readonly field - always Marine Cargo Import
            product: ['Marine Cargo Import'], // Readonly field
            // cargoProtection: ['', Validators.required], // Marine Product ID (ICC A, B, or C)
            commodityType: ['1', Validators.required], // 1 = Containerized, 2 = Non-Containerized
            selectCategory: ['', Validators.required], // Category ID
            salesCategory: ['', Validators.required], // Cargo Type ID
            countryOfOrigin: ['', Validators.required],
            gcrNumber: ['', [Validators.required, CustomValidators.idfNumber]],
            loadingPort: ['', Validators.required],
            portOfDischarge: ['', Validators.required],
            vesselName: ['', CustomValidators.vesselName],
            finalDestination: ['', Validators.required],
            dateOfDispatch: ['', Validators.required],
            estimatedArrival: ['', Validators.required],
            sumInsured: ['', [Validators.required, Validators.min(1)]],
            goodsDescription: ['', Validators.required],
            mpesaNumber: ['', [ CustomValidators.mpesaNumber]],

            // Payment
            paymentMethod: ['mpesa', Validators.required]
        });

        // Automatically hide validation toast once all Shipment Details fields become valid
        this.quotationForm.statusChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(status => {
                if (status === 'VALID' && this.validationToastRef) {
                    this.validationToastRef.dismiss();
                    this.validationToastRef = null;
                }
            });

        // Automatically hide validation toast once all Step 3 (shipmentForm) fields become valid
        this.shipmentForm.statusChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(status => {
                if (status === 'VALID' && this.validationToastRef) {
                    this.validationToastRef.dismiss();
                    this.validationToastRef = null;
                }
            });
    }

    // Convenience getters for form controls
    get quoteControls() {
        return this.quotationForm.controls;
    }

    get coverageControls() {
        return this.coverageFormGroup.controls;
    }

    getCargoProtectionName(): string {
        const selectedId = this.shipmentForm.get('cargoProtection')?.value;
        if (selectedId && this.marineProducts.length > 0) {
            const product = this.marineProducts.find(p => p.id === selectedId);
            return product?.prodname || 'ICC (A) All Risk';
        }
        return 'ICC (A) All Risk';
    }

    private initializeAllData(): void {
    // Initialize all required data from backend APIs
    this.fetchMarineProducts();
    this.fetchCategories();
    this.loadCountries(true);
    this.loadShippingCountries(true);

    this.loadingPorts = [];
    this.filteredDischargePorts.next([]);

   }

    toggleRequiredFields(isRequired: boolean) {

        const fields = ['firstName', 'lastName', 'email', 'phoneNumber'];

        fields.forEach(field => {
            const control = this.quotationForm.get(field);

            if (isRequired) {
                control?.addValidators(Validators.required);
            } else {
                control?.removeValidators(Validators.required);
            }

            control?.updateValueAndValidity();
        });
    }

    searchClientByPin(): void {
        const pin = this.quotationForm.get('searchPin')?.value;

        if (!pin || pin.trim() === '') {
            this.submissionError = 'Please enter a KRA PIN to search.';
            return;
        }

        this.isSearching = true;
        this.submissionError = null;

        this.quotationService.searchByPin(pin).subscribe({
            next: (client) => {
                this.isSearching = false;
                console.log(client);

                if (!client) {
                    this.submissionError = 'Client not found.';
                    return;
                }

                // Auto-fill form fields
                this.quotationForm.patchValue({
                    firstName: client.firstName,
                    lastName: client.lastName,
                    email: client.email,
                    phoneNumber: client.mobile
                });
            },
            error: (err) => {
                this.isSearching = false;
                this.submissionError = err?.message || 'Unable to fetch client details.';
            }
        });
    }

    private fetchMarineProducts(): void {
        this.userService.getMarineProducts().subscribe({
            next: (response: any) => {
                this.marineProducts = Array.isArray(response) ? response : (response?.data || []);

                // Find ICC(A) All Risk and set as default
                const iccA = this.marineProducts.find(p =>
                    p.prodname?.toLowerCase().includes('icc') &&
                    p.prodname?.toLowerCase().includes('a')
                );

                if (iccA) {
                    this.shipmentForm.patchValue({
                        cargoProtection: iccA.id
                    }, { emitEvent: false });
                } else {
                    console.warn('ICC(A) All Risk product not found in marine products');
                }
            },
            error: (err) => {
                console.error('Error fetching marine products:', err);
                this.marineProducts = [];
                // Show user-friendly error message
            }
        });
    }

    private setupSearchableDropdowns(): void {
        // Initialize all data sources from backend
        this.initializeAllData();

        // Setup client-side filtering for counties (no API needed)
        this.fetchCounties();

        // Listen for mode of shipment changes to load countries
        this.shipmentForm.get('modeOfShipment')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((mode) => {
                if (mode) {
                    this.countryFilterCtrl2.setValue('');
                    this.loadShippingCountries(true);
                    this.countryFilterCtrl.setValue('');
                    this.loadCountries(true);
                }
            });



        // Listen for search changes with debounce
        this.categorySearchCtrl.valueChanges
            .pipe(takeUntil(this.destroy$), debounceTime(300))
            .subscribe(() => {
                this.fetchCategories(this.categorySearchCtrl.value);
            });

        this.countryFilterCtrl.valueChanges
            .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
            .subscribe(term => {
                this.offset = 0;
                this.countries = [];
                this.currentSearchTerm = term || '';
                this.hasMore = true;
                this.loadCountries(true);
            });

        this.countryFilterCtrl2.valueChanges
            .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
            .subscribe(term => {
                this.offsetLast = 0;
                this.origincountries = [];
                this.currentSearchTerm2 = term || '';
                this.hasMoreLast = true;
                this.loadShippingCountries(true);
            });



        this.loadingPortSearchCtrl.valueChanges
            .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
            .subscribe((searchTerm) => {
                this.portOffset = 0;
                this.loadingPorts = [];
                this.portCurrentSearchTerm = searchTerm || '';
                this.portHasMore = true;
                this.fetchLoadingPorts(true);
            });

        this.dischargePortSearchCtrl.valueChanges
            .pipe(takeUntil(this.destroy$), debounceTime(300))
            .subscribe((searchTerm) => {
                this.dischargePortPage = 0;
                this.fetchPorts( searchTerm || '');
            });

        this.countySearchCtrl.valueChanges
            .pipe(takeUntil(this.destroy$), debounceTime(300))
            .subscribe(() => {
                this.filterCounties();
            });

        this.cargoTypeSearchCtrl.valueChanges
            .pipe(takeUntil(this.destroy$), debounceTime(300))
            .subscribe(() => {
                this.filterCargoTypes();
            });

        // Listen for category selection changes to fetch cargo types
        // this.shipmentForm.get('selectCategory')?.valueChanges
        //     .pipe(takeUntil(this.destroy$))
        //     .subscribe((categoryId) => {
        //         const selectedCategory = this.marineCategories.find(c => c.catname === categoryId);
        //         console.log('selectedCategory ',selectedCategory);
        //         if (selectedCategory) {
        //             this.fetchCargoTypes(selectedCategory.id);
        //             this.shipmentForm.get('salesCategory')?.setValue('');
        //         }
        //     });

        // Listen for country selection changes to fetch ports
        this.shipmentForm.get('countryOfOrigin')?.valueChanges
            .pipe(
                takeUntil(this.destroy$),
                distinctUntilChanged()
            )
            .subscribe((countryId) => {
                if (countryId) {
                    this.portOffset = 0;
                    this.fetchLoadingPorts(true);
                    this.dischargePortPage = 0;
                    this.fetchPorts('discharge');
                } else {
                    // Clear ports when no country is selected
                    this.loadingPorts = [];
                    this.dischargePorts = [];
                    this.filteredDischargePorts.next([]);
                }
            });
    }

    private fetchCounties(): void {
        // Load all counties from the API once, then apply client-side filtering

        this.isLoadingCounties = true;
        this.userService.getCounties(this.countyPage, this.pageSize).subscribe({
            next: (response) => {
                const newCounties = response?.pageItems || response?.data || [];

                // Append to existing if pagination, otherwise replace
                if (this.countyPage === 0) {
                    this.counties = newCounties;
                } else {
                    this.counties = [...this.counties, ...newCounties];
                }

                this.filterCounties();
                this.isLoadingCounties = false;
            },
            error: (err) => {
                console.error('Error fetching countries:', err);
                this.counties = [];
                this.filteredCounties.next([]);
                this.isLoadingCounties = false;
            }
        });
    }

    private filterCounties(): void {
        if (!this.counties) {
            this.filteredCounties.next([]);
            return;
        }

        let search = this.countySearchCtrl.value;
        if (!search) {
            this.filteredCounties.next(this.counties.slice());
            return;
        }

        search = String(search).toLowerCase();

        const filtered = this.counties.filter((county: any) => {
            const name = (county.portName || county.portname || county.name || '').toLowerCase();
            return name.includes(search);
        });

        this.filteredCounties.next(filtered);
    }

    private setupDateValidation(): void {
        // Watch for changes in Date of Dispatch
        this.shipmentForm.get('dateOfDispatch')?.valueChanges.subscribe(dispatchDate => {
            if (dispatchDate) {
                const arrivalControl = this.shipmentForm.get('estimatedArrival');
                const arrivalDate = arrivalControl?.value;

                // If arrival date exists and is before dispatch date, clear it
                if (arrivalDate && new Date(arrivalDate) < new Date(dispatchDate)) {
                    arrivalControl?.setValue('');
                    arrivalControl?.setErrors({ beforeDispatch: true });
                }
            }
        });

        // Watch for changes in Date of Arrival
        this.shipmentForm.get('estimatedArrival')?.valueChanges.subscribe(arrivalDate => {
            if (arrivalDate) {
                const dispatchDate = this.shipmentForm.get('dateOfDispatch')?.value;

                // Validate that arrival date is not before dispatch date
                if (dispatchDate && new Date(arrivalDate) < new Date(dispatchDate)) {
                    this.shipmentForm.get('estimatedArrival')?.setErrors({ beforeDispatch: true });
                } else {
                    // Clear the error if dates are valid
                    const arrivalControl = this.shipmentForm.get('estimatedArrival');
                    if (arrivalControl?.hasError('beforeDispatch')) {
                        arrivalControl.setErrors(null);
                    }
                }
            }
        });
    }


    private fetchCargoTypes(categoryId: any): void {
        if (!categoryId) {
            this.cargoTypes = [];
            this.filteredCargoTypes.next([]);
            return;
        }
        const selectedCategory = this.marineCategories.find(c => c.catname === categoryId);
        if(selectedCategory && selectedCategory.id) {
            categoryId = selectedCategory.id;
            this.shipmentForm.get('selectCategory')?.setValue(selectedCategory.catname);
            this.isLoadingCargoTypes = true;
            this.userService.getCargoTypesByCategory(categoryId).subscribe({
                next: (response: any) => {
                    this.cargoTypes = Array.isArray(response) ? response : (response?.data || []);
                    this.filteredCargoTypes.next(this.cargoTypes.slice());
                    this.isLoadingCargoTypes = false;
                },
                error: (err) => {
                    console.error('Error fetching cargo types for category', categoryId, ':', err);
                    this.cargoTypes = [];
                    this.filteredCargoTypes.next([]);
                    this.isLoadingCargoTypes = false;
                }
            });
        }
    }

    private fetchCategories(searchTerm: string = ''): void {
        if (this.categories.length === 0 && !this.isLoadingCategories) {
            this.isLoadingCategories = true;
            this.userService.getMarineCategories().subscribe({
                next: (response: any) => {
                    this.categories = Array.isArray(response) ? response : (response?.data || []);
                    this.filterCategories();
                    this.isLoadingCategories = false;
                },
                error: (err) => {
                    this.categories = [];
                    this.filteredCategories.next([]);
                    this.isLoadingCategories = false;
                }
            });
        } else {
            // Client-side filtering
            this.filterCategories();
        }
    }

    onCategoryTypeSelected(categoryValue: string) {
        const selectedCategory = this.filteredMarineCargoTypes.find(c => c.ctname === categoryValue);
        this.selectedCargoTypeId = selectedCategory.id;
    }



    onCategorySelected(categoryValue: string) {
        const selectedCategory = this.marineCategories.find(c => c.catname === categoryValue);
        this.selectedCategoryId = selectedCategory.id;
        if (selectedCategory) {
            this.isLoadingCargoTypes = true;
            this.userService.getCargoTypesByCategory(selectedCategory.id)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (cargoTypes) => {
                        this.marineCargoTypes = cargoTypes || [];
                        this.filteredMarineCargoTypes = this.marineCargoTypes.slice();
                        this.cargoTypeFilterCtrl.setValue(''); // Reset search
                        this.isLoadingCargoTypes = false;

                        const currentCargoType = this.quotationForm.get('marineCargoType')?.value;
                        if (currentCargoType && !this.marineCargoTypes.some(ct => ct.ctname === currentCargoType)) {
                            this.quotationForm.get('marineCargoType')?.setValue('', { emitEvent: false });
                        }
                    },
                    error: (err) => {
                        this.marineCargoTypes = [];
                        this.filteredMarineCargoTypes = [];
                        this.isLoadingCargoTypes = false;
                    },
                });
        } else {
            this.marineCargoTypes = [];
            this.filteredMarineCargoTypes = [];
            this.quotationForm.get('marineCargoType')?.setValue('', { emitEvent: false });
        }
    }

    onCategoryTypeSelected2(categoryValue: string) {
            console.log(categoryValue);
            const selectedCategory = this.filteredMarineCargoTypes.find(c => c.ctname === categoryValue);
            const formValue = this.shipmentForm.getRawValue();
            const modeOfShipment =  formValue.modeOfShipment;
            const  sumInsured = formValue.sumInsured;
            if(selectedCategory && modeOfShipment) {
                this.quotationService.computePremium(sumInsured, selectedCategory.id, modeOfShipment).subscribe({
                    next: (res) => {
                        this.quoteResult.phcf  = res.phcf;
                        this.quoteResult.tl  = res.tl;
                        this.quoteResult.sd  = res.sd;
                        this.quoteResult.netprem  = res.netprem;
                        this.quoteResult.premium  = res.premium;
                        console.log(this.quoteResult);
                    },
                    error: (err) => {
                        console.error('Error computing premium:', err);
                    }
                });
            }
    }


    onCategorySelected2(categoryValue: string) {
        console.log('categoryValue ',categoryValue);
        const selectedCategory = this.marineCategories.find(c => c.catname === categoryValue);
        if (selectedCategory) {
            this.isLoadingCargoTypes = true;
            this.userService.getCargoTypesByCategory(selectedCategory.id)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (cargoTypes) => {
                        this.marineCargoTypes = cargoTypes || [];
                        this.filteredMarineCargoTypes = this.marineCargoTypes.slice();
                        this.cargoTypeFilterCtrl2.setValue(''); // Reset search
                        this.isLoadingCargoTypes = false;
                        this.shipmentForm.get('salesCategory')?.setValue('', { emitEvent: false });
                    },
                    error: (err) => {
                        console.error('Error loading marine cargo types:', err);
                        this.marineCargoTypes = [];
                        this.filteredMarineCargoTypes = [];
                        this.isLoadingCargoTypes = false;
                    },
                });
        } else {
            this.marineCargoTypes = [];
            this.filteredMarineCargoTypes = [];
            this.shipmentForm.get('selectCategory')?.setValue('', { emitEvent: false });
        }
    }


    ngOnDestroy(): void {
        this.scrollSubscription?.unsubscribe();
        this.destroy$.next();
        this.destroy$.complete();
        this.paymentPollingSub?.unsubscribe();
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    onSelectOpen(opened: boolean) {
        if (opened) {
            setTimeout(() => {
                const panel = this.countrySelect2.panel?.nativeElement as HTMLElement;
                if (!panel) {
                    console.warn('No panel found');
                    return;
                }

                const scrollContainer =
                    panel.querySelector('.mat-mdc-select-panel .mdc-list') ||
                    panel.querySelector('.mdc-list') ||
                    panel;

                this.scrollSubscription?.unsubscribe();

                this.scrollSubscription = fromEvent(scrollContainer!, 'scroll')
                    .pipe(throttleTime(150))
                    .subscribe((event: any) => {
                        const el = event.target as HTMLElement;
                        const scrollTop = el.scrollTop;
                        const scrollHeight = el.scrollHeight;
                        const clientHeight = el.clientHeight;
                        const scrollRatio = (scrollTop + clientHeight) / scrollHeight;
                        if (scrollRatio > 0.75 && !this.loading) {
                            this.loadCountries(false);
                        }
                    });
            }, 200); // wait for panel to render

        } else {
            // Cleanup
            this.scrollSubscription?.unsubscribe();
        }
    }

    onSelectOpen2(opened: boolean) {
        if (opened) {
            setTimeout(() => {
                const panel = this.countrySelect.panel?.nativeElement as HTMLElement;
                if (!panel) {
                    console.warn('No panel found');
                    return;
                }

                const scrollContainer =
                    panel.querySelector('.mat-mdc-select-panel .mdc-list') ||
                    panel.querySelector('.mdc-list') ||
                    panel;


                this.scrollSubscription?.unsubscribe();

                this.scrollSubscription = fromEvent(scrollContainer!, 'scroll')
                    .pipe(throttleTime(150))
                    .subscribe((event: any) => {
                        const el = event.target as HTMLElement;
                        const scrollTop = el.scrollTop;
                        const scrollHeight = el.scrollHeight;
                        const clientHeight = el.clientHeight;
                        const scrollRatio = (scrollTop + clientHeight) / scrollHeight;


                        if (scrollRatio > 0.75 && !this.loading) {
                            this.loadShippingCountries(false);
                        }
                    });
            }, 200); // wait for panel to render

        } else {
            // Cleanup
            this.scrollSubscription?.unsubscribe();
        }
    }

    onOriginChange(event: MatSelectChange) {
        this.selectedCountry = event.source.triggerValue;
        // your logic here
    }

    listenForSumInsuredChanges(): void {
        this.shipmentForm.get('dateOfDispatch')?.valueChanges.subscribe((dispatchDate: Date) => {
            if (dispatchDate) {
                const arrivalDate = new Date(dispatchDate);
                arrivalDate.setMonth(arrivalDate.getMonth() + 3);

                this.shipmentForm.get('estimatedArrival')?.setValue(arrivalDate);
            }
        });
        this.shipmentForm.get('sumInsured')?.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe((sumInsured) => {
            if (sumInsured && sumInsured > 0) {
                const formValue = this.shipmentForm.getRawValue();
                const modeOfShipment =  formValue.modeOfShipment;
                const  marineCargoType = formValue.salesCategory;
                const selectedCategory = this.filteredMarineCargoTypes.find(c => c.ctname === marineCargoType);
                if(selectedCategory && modeOfShipment) {
                    this.quotationService.computePremium(sumInsured, selectedCategory.id, modeOfShipment).subscribe({
                        next: (res) => {
                            this.quoteResult.phcf  = res.phcf;
                            this.quoteResult.tl  = res.tl;
                            this.quoteResult.sd  = res.sd;
                            this.quoteResult.netprem  = res.netprem;
                            this.quoteResult.premium  = res.premium;
                            console.log(this.quoteResult);
                        },
                        error: (err) => {
                            console.error('Error computing premium:', err);
                        }
                    });
                }
            }
        });
    }

    onScroll(event: Event) {
        const panel = event.target as HTMLElement;
        const threshold = 200;
        const reachedBottom = panel.scrollHeight - panel.scrollTop <= panel.clientHeight + threshold;
        if (reachedBottom && this.hasMore && !this.loading) {
            this.loadCountries();
        }
    }

    onScrollLast(event: Event) {
        const panel = event.target as HTMLElement;
        const threshold = 200;
        const reachedBottom = panel.scrollHeight - panel.scrollTop <= panel.clientHeight + threshold;
        if (reachedBottom && this.hasMoreLast && !this.loading) {
            this.loadShippingCountries();
        }
    }

    public onDropdownOpen(dropdownType:'countries' |  'categories' | 'loadingPorts' | 'dischargePorts'): void {
        switch (dropdownType) {
            case 'dischargePorts':
                const countryIdDischarge = this.shipmentForm.get('countryOfOrigin')?.value;
                if (countryIdDischarge && this.dischargePorts.length === 0 && !this.isLoadingDischargePorts) {
                    this.fetchPorts( '');
                }
                break;
        }
    }

    public getPortDisplayName(port: any): string {
        if (typeof port === 'string') {
            return port; // Manual entry
        }
        if (typeof port === 'object' && port) {
            return port.portname || port.pname || port.name || port.portName || 'Unknown Port';
        }
        return '';
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
        this.shipmentForm.patchValue({ mpesaNumber: value });
    }

    public getPortId(port: any): any {
        if (typeof port === 'string') {
            return port; // Manual entry
        }
        if (typeof port === 'object' && port) {
            return port.id || port.portId || port.portid;
        }
        return port;
    }

    onDischargePortScroll(): void {
        if (!this.isLoadingDischargePorts) {
            this.dischargePortPage++;
            this.fetchPorts( this.dischargePortSearchCtrl.value);
        }
    }

    private fetchPorts( searchTerm: string = ''): void {
        this.isLoadingDischargePorts = true;
        const formValue = this.shipmentForm.getRawValue();
        const modeOfShipment =  formValue.modeOfShipment;

        const countryId = modeOfShipment==='1'?116:43;

        this.userService.getPorts(countryId, modeOfShipment, this.dischargePortPage, this.pageSize, searchTerm).subscribe({
            next: (response) => {
                const newPorts = response?.pageItems || response?.data || [];
                if (this.dischargePortPage === 0) {
                    this.dischargePorts = newPorts;
                } else {
                    this.dischargePorts = [...this.dischargePorts, ...newPorts];
                }
                this.filteredDischargePorts.next(this.dischargePorts.slice());
                this.isLoadingDischargePorts = false;
            },
            error: (err) => {
                this.dischargePorts = [];
                this.filteredDischargePorts.next([]);
                this.isLoadingLoadingPorts = false;

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
                this.shipmentForm.get(controlName)?.setValue(null);
                return;
            }

            // Validate file size (500KB = 500 * 1024 bytes)
            const maxSize = 500 * 1024; // 500KB in bytes
            if (file.size > maxSize) {
                this.duplicateFileErrors[controlName] = 'File size must be less than 500KB';
                input.value = '';
                this.shipmentForm.get(controlName)?.setValue(null);
                return;
            }

            // Check if this file is already uploaded in another field
            const documentFields = ['idfDocument', 'invoice', 'kraPinCertificate', 'nationalId'];
            const fieldNames: { [key: string]: string } = {
                idfDocument: 'IDF Document',
                invoice: 'Invoice',
                kraPinCertificate: 'KRA PIN Certificate',
                nationalId: 'National ID'
            };

            let duplicateFieldName: string | null = null;
            const isDuplicate = documentFields.some((fieldName: string) => {
                if (fieldName === controlName) return false; // Skip current field
                const existingFile = this.shipmentForm.get(fieldName)?.value;
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
                this.shipmentForm.get(controlName)?.setValue(null);
                return;
            }

            // Store the valid, non-duplicate file on the form control
            this.shipmentForm.get(controlName)?.setValue(file);
        }
    }

    clearDuplicateError(fieldName: string): void {
        if (this.duplicateFileErrors && this.duplicateFileErrors[fieldName]) {
            delete this.duplicateFileErrors[fieldName];
        }
    }


    openDocumentPreview(controlName: string, event?: Event): void {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const file: File | null = this.shipmentForm.get(controlName)?.value;
        if (!file) {
            return;
        }

        // Clean up any previous object URL
        if (this.previewDocumentUrl) {
            URL.revokeObjectURL(this.previewDocumentUrl);
        }

        const objectUrl = URL.createObjectURL(file);
        this.previewDocumentUrl = objectUrl;
        this.previewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl);
        this.previewDocumentName = file.name;
        this.previewDocumentType = file.type;
        this.showDocumentPreviewModal = true;
    }


    closeDocumentPreview(): void {
        if (this.previewDocumentUrl) {
            URL.revokeObjectURL(this.previewDocumentUrl);
            this.previewDocumentUrl = null;
        }
        this.previewSafeUrl = null;
        this.showDocumentPreviewModal = false;
        this.previewDocumentName = '';
        this.previewDocumentType = '';
    }

    openTermsOfUse(event: Event): void {
        event.preventDefault();
        // const dialogRef = this.dialog.open(TermsModalComponent, {
        //     width: '600px',
        //     maxWidth: '90vw',
        //     maxHeight: '80vh',
        //     panelClass: 'terms-modal'
        // });
    }

    openPrivacyPolicy(event: Event): void {
        event.preventDefault();
        // const dialogRef = this.dialog.open(PrivacyModalComponent, {
        //     width: '600px',
        //     maxWidth: '90vw',
        //     maxHeight: '80vh',
        //     panelClass: 'privacy-modal'
        // });
    }

    onIdNumberInput(event: any): void {
        let value = event.target.value.trim().replace(/\D/g, ''); // Remove non-digits, trim spaces
        if (value.length > 9) {
            value = value.substring(0, 9); // Limit to 9 digits (8-9 digits allowed)
        }
        this.shipmentForm.get('idNumber')?.setValue(value);
    }

    onKraPinInput(event: any): void {
        let value = event.target.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); // Trim spaces, keep only letters and numbers, convert to uppercase

        // Format: 1 letter + 9 digits + 1 letter (e.g. A123456789B)
        if (value.length > 11) {
            value = value.substring(0, 11); // Limit to 11 characters
        }

        this.shipmentForm.get('kraPin')?.setValue(value);
    }

    onIdfNumberInput(event: any): void {
        let value = event.target.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); // Trim spaces, keep only letters and numbers, convert to uppercase

        // Format: 2 digits + NBOIM + 9 digits (e.g. 24NBOIM000002014)
        if (value.length > 16) {
            value = value.substring(0, 16); // Limit to 16 characters
        }

        this.shipmentForm.get('gcrNumber')?.setValue(value);
    }

    onFirstNameInput(event: any): void {
        let value = event.target.value.trim();
        value = value.replace(/[^a-zA-Z]/g, '');
        if (value.length > 0) {
            value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        }
        this.shipmentForm.patchValue({ firstName: value });
    }

    onLastNameInput(event: any): void {
        let value = event.target.value.trim();
        value = value.replace(/[^a-zA-Z]/g, '');
        if (value.length > 0) {
            value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        }
        this.shipmentForm.patchValue({ lastName: value });
    }

    onVesselNameInput(event: any): void {
        let value = event.target.value;
        // Allow letters, numbers, and spaces
        value = value.replace(/[^a-zA-Z0-9\s]/g, '');
        // Capitalize first letter of each word
        value = value.replace(/\b\w/g, (char: string) => char.toUpperCase());
        this.shipmentForm.patchValue({ vesselName: value });
    }

    onSelectOpenPorts(opened: boolean) {
        if (opened) {
            setTimeout(() => {
                // ✅ get the rendered panel
                const panel = this.portSelect.panel?.nativeElement as HTMLElement;
                if (!panel) {
                    console.warn('No panel found');
                    return;
                }

                // ✅ The scrollable element in Angular Material 19 (MDC)
                const scrollContainer =
                    panel.querySelector('.mat-mdc-select-panel .mdc-list') ||
                    panel.querySelector('.mdc-list') ||
                    panel;


                // Remove previous listener if any
                this.scrollSubscription?.unsubscribe();

                // Attach scroll listener
                this.scrollSubscription = fromEvent(scrollContainer!, 'scroll')
                    .pipe(throttleTime(150))
                    .subscribe((event: any) => {
                        const el = event.target as HTMLElement;
                        const scrollTop = el.scrollTop;
                        const scrollHeight = el.scrollHeight;
                        const clientHeight = el.clientHeight;
                        const scrollRatio = (scrollTop + clientHeight) / scrollHeight;


                        if (scrollRatio > 0.75 && !this.portLoading) {
                            this.fetchLoadingPorts(false);
                        }
                    });
            }, 200); // wait for panel to render

        } else {
            // Cleanup
            this.scrollSubscription?.unsubscribe();
        }
    }

    private fetchLoadingPorts(reset = false): void {
        const modeValue = this.shipmentForm.get('modeOfShipment')?.value;
        const modeId = modeValue === '1' ? 1 : modeValue === '2' ? 2 : 1;
        const countryLoadingVal = this.shipmentForm.get('countryOfOrigin')?.value.id;
        this.portLoading = true;
        this.userService.getPorts(countryLoadingVal,''+modeId,this.portOffset, this.limit, this.portCurrentSearchTerm)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    const newItems = res?.pageItems  || [];
                    this.loadingPorts = reset ? newItems : [...this.loadingPorts, ...newItems];
                    if (newItems.length < this.limit) this.portHasMore = false;
                    this.portOffset += this.limit;
                    this.portLoading = false;
                },
                error: (err) => {
                    this.portLoading = false;
                },
            });
    }


    onEmailInput(event: any): void {
        const value = event.target.value.trim();
        this.shipmentForm.patchValue({ emailAddress: value });
    }

    onPhoneNumberInput(event: any): void {
        let value = event.target.value.trim();
        value = value.replace(/[^0-9]/g, '');
        if (value.length > 10) {
            value = value.substring(0, 10);
        }
        this.shipmentForm.patchValue({ phoneNumber: value });
    }

    onPostalAddressInput(event: any): void {
        const value = event.target.value.trim();
        this.shipmentForm.patchValue({ streetAddress: value });
    }

    onPostalCodeInput(event: any): void {
        const value = event.target.value.trim();
        this.shipmentForm.patchValue({ postalCode: value });
    }

    private setupFormSubscriptions(): void {
        // Update the modeOfShipment subscription to reset countries
        this.quotationForm.get('modeOfShipment')?.valueChanges.subscribe((mode: number) => {
            if (mode) {

                // Reset countries and load first page
                this.countryFilterCtrl.setValue('');
                this.loadCountries(true);

                // Load first page of countries
            }
        });
    }

    private setupSearchFilters(): void {
        // Country search with debounce for server-side filtering

        this.countryFilterCtrl.valueChanges
            .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
            .subscribe(term => {
                this.offset = 0;
                this.countries = [];
                this.currentSearchTerm = term || '';
                this.hasMore = true;
                this.loadCountries(true);
            });

        this.countryFilterCtrl2.valueChanges
            .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
            .subscribe(term => {
                this.offsetLast = 0;
                this.origincountries = [];
                this.currentSearchTerm2 = term || '';
                this.hasMoreLast = true;
                this.loadShippingCountries(true);
            });


        // Category search (local filtering)
        this.categoryFilterCtrl.valueChanges.pipe(
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.filterCategories();
        });

        // Category search (local filtering)
        this.categoryFilterCtrl2.valueChanges.pipe(
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.filterCategories2();
        });

        // Cargo type search (local filtering)
        this.cargoTypeFilterCtrl.valueChanges.pipe(
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.filterCargoTypes();
        });

        this.cargoTypeFilterCtrl2.valueChanges.pipe(
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.filterCargoTypes2();
        });
    }

    private filterCategories(): void {
        if (!this.marineCategories) {
            return;
        }
        let search = this.categoryFilterCtrl.value;
        if (!search) {
            this.filteredMarineCategories = this.marineCategories.slice();
            return;
        } else {
            search = search.toLowerCase();
        }
        this.filteredMarineCategories = this.marineCategories.filter(category =>
            category.catname.toLowerCase().indexOf(search) > -1
        );
    }


    private filterCategories2(): void {
        if (!this.marineCategories) {
            return;
        }
        let search = this.categoryFilterCtrl2.value;
        if (!search) {
            this.filteredMarineCategories = this.marineCategories.slice();
            return;
        } else {
            search = search.toLowerCase();
        }
        this.filteredMarineCategories = this.marineCategories.filter(category =>
            category.catname.toLowerCase().indexOf(search) > -1
        );
    }


    private filterCargoTypes(): void {
        if (!this.marineCargoTypes) {
            return;
        }
        let search = this.cargoTypeFilterCtrl.value;
        if (!search) {
            this.filteredMarineCargoTypes = this.marineCargoTypes.slice();
            return;
        } else {
            search = search.toLowerCase();
        }
        this.filteredMarineCargoTypes = this.marineCargoTypes.filter(cargoType =>
            cargoType.ctname.toLowerCase().indexOf(search) > -1
        );
    }

    private filterCargoTypes2(): void {
        if (!this.marineCargoTypes) {
            return;
        }
        let search = this.cargoTypeFilterCtrl2.value;
        if (!search) {
            this.filteredMarineCargoTypes = this.marineCargoTypes.slice();
            return;
        } else {
            search = search.toLowerCase();
        }
        this.filteredMarineCargoTypes = this.marineCargoTypes.filter(cargoType =>
            cargoType.ctname.toLowerCase().indexOf(search) > -1
        );
    }

    closePrivacyModal(): void {
    }


    private loadShippingCountries(reset = false) {
        if (this.loading || !this.hasMoreLast) return;
        const shippingMode = this.shipmentForm.get('modeOfShipment')?.value;
        if(!shippingMode){
            return;
        }
        this.loading = true;
        this.userService
            .getCountries(this.offsetLast, this.limit, shippingMode, this.currentSearchTerm2)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    const newItems = res?.pageItems  || [];
                    this.origincountries = reset ? newItems : [...this.origincountries, ...newItems];
                    if (newItems.length < this.limit) this.hasMoreLast = false;
                    this.offsetLast += this.limit;
                    this.loading = false;
                },
                error: (err) => {
                    console.error('Error fetching countries:', err);
                    this.loading = false;
                },
            });
    }


    private loadCountries(reset = false) {
        if (this.loading || !this.hasMore) return;
        const shippingMode = this.quotationForm.get('modeOfShipment')?.value;
        if(!shippingMode){
            return;
        }
        this.loading = true;
        this.userService
            .getCountries(this.offset, this.limit, shippingMode, this.currentSearchTerm)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    const newItems = res?.pageItems  || [];
                    this.countries = reset ? newItems : [...this.countries, ...newItems];
                    if (newItems.length < this.limit) this.hasMore = false;
                    this.offset += this.limit;
                    this.loading = false;
                },
                error: (err) => {
                    console.error('Error fetching countries:', err);
                    this.loading = false;
                },
            });
    }

    scrollToFirstError(): void {
        const firstInvalidControl: HTMLElement | null = document.querySelector(
            'form .ng-invalid'
        );
        if (firstInvalidControl) {
            firstInvalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstInvalidControl.focus({ preventScroll: true });
        }
    }

    preventSpaceInEmail(event: KeyboardEvent): void {
        // Prevent space key from being entered in email fields
        if (event.key === ' ' || event.code === 'Space' || event.keyCode === 32) {
            event.preventDefault();
        }
    }

    checkIfUserIsAgent():boolean {
        const val = this.user && this.user.userType==='A';
        console.log(val,this.user);
        return val;
    }

    formatAmount(value: number): string {
        if (!value && value !== 0) return '0';

        // Check if the number is a whole number
        if (value % 1 === 0) {
            // Return without decimals, with thousand separators
            return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        } else {
            // Return with 2 decimal places, with thousand separators
            return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    }

    getInvalidControls(form: FormGroup, parentKey: string = ''): string[] {
        let invalidFields: string[] = [];

        Object.keys(form.controls).forEach(key => {
            const control = form.get(key);
            const fieldPath = parentKey ? `${parentKey}.${key}` : key;

            if (control instanceof FormGroup) {
                invalidFields = invalidFields.concat(
                    this.getInvalidControls(control, fieldPath)
                );
            } else if (control && control.invalid) {
                invalidFields.push(key);
            }
        });

        return invalidFields;
    }


    // Submit final quotation
    submitQuotation(): void {
        this.isSaving = true;
        this.quotationForm.markAllAsTouched();

        if (!this.quotationForm.valid) {
            this.scrollToFirstError();
            this.validationToastRef = this.showToast(
                `A few fields need your attention. Please review the highlights.`,
            );
            this.isSaving = false;
            return;
        }

        const marineProductValue = this.quotationForm.get('marineProduct')?.value;
        const packagingType = this.quotationForm.get('marinePackagingType')?.value;
        const category = this.quotationForm.get('marineCategory')?.value;
        const cargoType = this.quotationForm.get('marineCargoType')?.value;
        const selectedProduct = this.marineProducts.find(p => p.productdisplay === marineProductValue);
        const selectedCategory = this.marineCategories.find(c => c.catname === category);
        const selectedCargoType = this.marineCargoTypes.find(p => p.ctname === cargoType);

        const metadata = {
            suminsured: this.quotationForm.get('sumInsured')?.value,
            firstName: this.quotationForm.get('firstName')?.value,
            lastName: this.quotationForm.get('lastName')?.value,
            email: (this.quotationForm.get('email')?.value || '').toString().replace(/\s+/g, ''),
            phoneNumber: this.quotationForm.get('phoneNumber')?.value,
            shippingid: this.quotationForm.get('modeOfShipment')?.value,
            tradeType: this.quotationForm.get('tradeType')?.value,
            countryOrigin: this.quotationForm.get('origin')?.value,
            destination: this.quotationForm.get('destination')?.value,
            dateFormat: 'dd MMM yyyy',
            locale: 'en_US',
            productId: 2416,
            packagetypeid: packagingType,
            categoryid: selectedCategory?.id,
            cargoId: selectedCargoType?.id,
        };

        const formData = new FormData();
        formData.append('metadata', JSON.stringify(metadata));


        this.quotationService.createQuote(formData).subscribe({
            next: (res) => {
                this.isSaving = false;
                this.quoteResult = res;
                const formValue = this.quotationForm.getRawValue();
                const tradeType = formValue.tradeType ? 'Import' : 'Export'
                this.shipmentForm.get('modeOfShipment')?.setValue(formValue.modeOfShipment);
                this.shipmentForm.get('tradeType')?.setValue(tradeType);
                this.shipmentForm.get('commodityType')?.setValue(formValue.marinePackagingType);
                this.shipmentForm.get('sumInsured')?.setValue(formValue.sumInsured);
                this.shipmentForm.get('selectCategory')?.setValue(formValue.marineCategory);
                this.shipmentForm.get('salesCategory')?.setValue(formValue.marineCargoType);
                const originCountryId = Number(formValue.origin);
                let selectedCountry = this.origincountries.find(c => c.id === originCountryId);
                const setCountryAndProceed = (country: Country) => {
                    this.origincountries = [
                        country,
                        ...this.origincountries.filter(c => c.id !== country.id)
                    ];
                    this.shipmentForm.get('countryOfOrigin')?.setValue(country);
                    // this.countryFilterCtrl2.setValue('', { emitEvent: false });
                    // this.currentSearchTerm2 = '';

                };

                if (selectedCountry) {
                    setCountryAndProceed(selectedCountry);
                } else {
                    this.userService.getCountryById(originCountryId, String(formValue.modeOfShipment)).subscribe({
                        next: (country) => {
                            setCountryAndProceed(country);
                        },
                        error: (err) => {
                        }
                    });
                }

                this.isLoading = true;
                this.quotationService.getQuoteById(''+this.quoteResult.id).subscribe({
                    next: (data) => {
                        this.quote = data;
                        const authUser =  this.userService.getCurrentUser();
                        if(authUser){
                            const userType = authUser.userType;
                            if(userType==='C'){
                                this.fetchProspectDocuments(data.prospectId);
                            }
                            else if(userType==='A'){
                                this.fetchProspectDocuments(data.prospectId);
                            }
                        }
                        this.isLoading = false;
                    },
                    error: (err) => {
                        console.error('Error fetching transaction:', err);
                        this.isLoading = false;
                    }
                });

                this.stepper.next();
            },
            error: (err) => {
                this.submissionError = err?.error?.message || 'An unexpected error occurred. Please try again.';

                this.isSaving = false;
            },
        });
    }

    fetchProspectDocuments(prospectId: number): void {
        this.isLoadingMarineData = true;
        this.userService.checkProspectDocument(prospectId).subscribe({
            next: (data) => {
                this.userDocs = data;
                this.isLoadingMarineData = false;
                this.shipmentForm.get('idNumber')?.setValue(data.idNo);
                if (data.idNo) {
                    this.shipmentForm.get('idNumber')?.disable();
                } else {
                    this.shipmentForm.get('idNumber')?.enable();
                }
                this.shipmentForm.get('streetAddress')?.setValue(data.postalAddress);
                this.shipmentForm.get('postalCode')?.setValue(data.postalCode);
                this.shipmentForm.get('firstName')?.setValue(data.firstName);
                this.shipmentForm.get('lastName')?.setValue(data.lastName);
                this.shipmentForm.get('emailAddress')?.setValue(data.emailAddress);
                if (data.emailAddress) {
                    this.shipmentForm.get('emailAddress')?.disable();
                } else {
                    this.shipmentForm.get('emailAddress')?.enable();
                }
                this.shipmentForm.get('phoneNumber')?.setValue(this.extractPhoneNumber(data.phoneNumber));
                this.shipmentForm.get('kraPin')?.setValue(data.pinNo);
                if (data.pinNo) {
                    this.shipmentForm.get('kraPin')?.disable();
                } else {
                    this.shipmentForm.get('kraPin')?.enable();
                }
                if (data.idfDocumentExists) {
                    this.shipmentForm.get('nationalId')?.clearValidators();
                    this.shipmentForm.get('nationalId')?.updateValueAndValidity();
                } else {
                    this.shipmentForm.get('nationalId')?.setValidators(Validators.required);
                    this.shipmentForm.get('nationalId')?.updateValueAndValidity();
                }
                if (data.kraDocumentExists) {
                    this.shipmentForm.get('kraPinCertificate')?.clearValidators();
                    this.shipmentForm.get('kraPinCertificate')?.updateValueAndValidity();
                } else {
                    this.shipmentForm.get('kraPinCertificate')?.setValidators(Validators.required);
                    this.shipmentForm.get('kraPinCertificate')?.updateValueAndValidity();
                }
            },
            error: (err) => {
                this.isLoadingMarineData = false;
            }
        });
    }

    getStatusColor(status: string): string {
        switch (status?.toLowerCase()) {
            case 'active':
                return 'bg-green-100 text-green-700';
            case 'expired':
                return 'bg-red-100 text-red-700';
            case 'pending':
                return 'bg-yellow-100 text-yellow-700';
            case 'draft':
                return 'status-draft-pill';
            default:
                return 'bg-blue-100 text-blue-700';
        }
    }

    compareCountries = (c1: Country, c2: Country): boolean => {
        if (!c1 || !c2) {
            return c1 === c2;
        }
        return c1.id === c2.id;
    }

    onStepChange(event: any): void {
        if (event.selectedIndex === 2) {
            const selectedCountry = this.shipmentForm.get('countryOfOrigin')?.value;

            if (selectedCountry) {
                const countryExists = this.origincountries.some(c => c.id === selectedCountry.id);

                if (!countryExists) {
                    this.origincountries = [selectedCountry, ...this.origincountries];
                }
                this.countryFilterCtrl2.setValue('', { emitEvent: false });
                this.currentSearchTerm2 = '';
            }
        }
    }

    onSubmit(): void {
        const termsControl = this.quotationForm.get('termsAndPolicyConsent');
        if (termsControl && !termsControl.value) {
            termsControl.markAsTouched();
            this.validationToastRef = this.showToast(
                `To submit your application, please agree to the Terms of Use and Data Privacy Policy.`,
            );
            return;
        }
        if (this.shipmentForm.invalid) {
            // Mark all fields as touched to show validation errors
            this.shipmentForm.markAllAsTouched();

            const invalidFields = Object.keys(this.shipmentForm.controls)
                .filter(key => this.shipmentForm.get(key)?.invalid)
                .map(key => ({
                    field: key,
                    errors: this.shipmentForm.get(key)?.errors
                }));

            console.log('invalid fields...',invalidFields);

            this.validationToastRef = this.showToast(
                `A few fields need your attention. Please review the highlights.`,
            );
            return;
        }

        this.isSubmitting = true;
        const kycFormValue = this.shipmentForm.getRawValue(); // Use getRawValue to include disabled fields


        // First, create the shipping application
        const formData = new FormData();
        const kycDocs = this.shipmentForm.value;
        formData.append('kraPinUpload', kycDocs.kraPinCertificate);
        formData.append('nationalIdUpload', kycDocs.nationalId);
        formData.append('invoiceUpload', kycDocs.invoice);
        formData.append('idfUpload', kycDocs.idfDocument);

        const updatedMetadata = {
            quoteId: this.quoteResult.id,
            suminsured: kycFormValue.sumInsured,
            kraPin: kycFormValue.kraPin,
            firstName: kycFormValue.firstName,
            lastName: kycFormValue.lastName,
            phoneNumber: kycFormValue.phoneNumber,
            emailAddress: kycFormValue.emailAddress,
            idNumber: kycFormValue.idNumber,
            postalAddress: kycFormValue.streetAddress,
            postalCode: kycFormValue.postalCode,
            ucrnumber: kycFormValue.ucrNumber,
            idfnumber: kycFormValue.gcrNumber,
            selectCategory: kycFormValue.selectCategory,
            salesCategory: kycFormValue.salesCategory,
            modeOfShipment: kycFormValue.modeOfShipment,
            tradeType: kycFormValue.tradeType,
            vesselname: kycFormValue.vesselName,
            loadingPort: kycFormValue.loadingPort,
            portOfDischarge: kycFormValue.portOfDischarge,
            finalDestinationCounty: kycFormValue.finalDestination,
            dateOfDispatch: this.datePipe.transform(kycFormValue.dateOfDispatch, 'dd MMM yyyy'),
            estimatedArrivalDate: this.datePipe.transform(kycFormValue.estimatedArrival, 'dd MMM yyyy'),
            description: kycFormValue.goodsDescription,
            // shippingItems: kycFormValue.shippingItems,
            dateFormat: 'dd MMM yyyy',
            locale: 'en_US',
        };
        formData.append('metadata', JSON.stringify(updatedMetadata));
        console.log('Creating shipping application...');

        // Create the shipping application first
        this.quotationService.createApplication(formData).pipe(
            takeUntil(this.destroy$)
        ).subscribe({
            next: (applicationResponse) => {
                console.log('Shipping application created successfully:', applicationResponse);

                // Generate reference number for M-Pesa payment
                const refNo = applicationResponse?.transactionId;
                this.applicationId = applicationResponse?.commandId;
                this.isMakePaymentNow = true;
                this.paymentRefNo = refNo;
                this.isSubmitting = false;
                this.applicationSubmitted = true;
            },
            error: (applicationError) => {
                this.isSubmitting = false;
                const errorMessage = applicationError?.error?.errors[0]?.developerMessage ||
                    'Failed to create shipping application. Please try again.';

                this._snackBar.open(errorMessage, 'Close', {
                    duration: 8000,
                    panelClass: ['error-snackbar']
                });
            }
        });
    }

     initiatePayment(): void {
         const mpesaNumber = this.shipmentForm.get('mpesaNumber')?.value?.slice(-10); // last 10 digits

         if (!mpesaNumber || mpesaNumber.length !== 10) {
             this._snackBar.open('Please enter a valid M-PESA number', 'Close', {
                 duration: 6000,
                 panelClass: ['error-snackbar']
             });
             return;
         }

         this.isProcessPayment = true;
         this.isProcessingStk = true;

         this.quotationService.stkPush(mpesaNumber, 1, this.paymentRefNo,"M").pipe(
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


    goToDashboard(): void {
        this.router.navigate(['/dashboard']);
    }


    downloadQuote(): void {
        if (!this.quoteResult.id) {
            this._fuseAlertService.show('quoteDownloadError');
            return;
        }
        this.userService.downloadQuote(''+this.quoteResult.id).subscribe({
            next: (base64String) => {
                try {
                    console.log('Base64 response:', base64String);

                    const base64 = base64String.split(',')[1] || base64String;
                    const byteCharacters = atob(base64); // ⚠️ can throw
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }

                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'application/pdf' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'quote.pdf';
                    a.click();
                    window.URL.revokeObjectURL(url);

                    // Optional: show success
                } catch (error) {
                    console.error('Error decoding base64:', error);
                    this._fuseAlertService.show('quoteDownloadError');
                    setTimeout(() => this._fuseAlertService.dismiss('quoteDownloadError'), 4000);
                }
            },
            error: (err) => {
                console.error('Download request failed:', err);
                this._fuseAlertService.show('quoteDownloadError');
                setTimeout(() => this._fuseAlertService.dismiss('quoteDownloadError'), 4000);
            }
        });


    }
}
