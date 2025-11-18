import { Component, EventEmitter, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
    CargoTypeData,
    Category,
    Country,
    MarineProduct,
    PackagingType, Port,
    QuoteResult, QuotesData,
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
import { MatSnackBar } from '@angular/material/snack-bar';
import { FuseAlertType } from '@fuse/components/alert';
import { MatCheckbox } from '@angular/material/checkbox';
import {
    MatDatepicker,
    MatDatepickerInput,
    MatDatepickerModule,
    MatDatepickerToggle,
} from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MY_DATE_FORMATS } from '../../../core/directives/date-formats';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { Router } from '@angular/router';

@Component({
    selector: 'marine-quick-quote',
    standalone: true,
    templateUrl: './marine-quick-quote.html',
    styleUrls: ['./marine-quick-quote.component.scss'],
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
export class MarineQuickQuoteComponent implements OnInit, OnDestroy
{

    @ViewChild('stepper') stepper!: MatStepper;
    @ViewChild('countrySelect') countrySelect!: MatSelect;
    @ViewChild('countrySelect2') countrySelect2!: MatSelect;
    @ViewChild('categorySelect') categorySelect!: MatSelect;
    @ViewChild('categorySelect2') categorySelect2!: MatSelect;
    @ViewChild('cargoTypeSelect') cargoTypeSelect!: MatSelect;
    @ViewChild('cargoTypeSelect2') cargoTypeSelect2!: MatSelect;
    @Output() closeQuote = new EventEmitter<void>();

    // Stepper Form Groups
    quotationForm!: FormGroup;
    coverageFormGroup!: FormGroup;
    quote?: QuotesData;
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
    today = new Date();

    private destroy$ = new Subject<void>();
    countryFilterCtrl: FormControl = new FormControl();
    categoryFilterCtrl: FormControl = new FormControl();
    categoryFilterCtrl2: FormControl = new FormControl();
    cargoTypeFilterCtrl: FormControl = new FormControl();
    cargoTypeFilterCtrl2: FormControl = new FormControl();
    categorySearchCtrl: FormControl = new FormControl();
    cargoTypeSearchCtrl: FormControl = new FormControl();
    @ViewChild('portSelect') portSelect!: MatSelect;
    private scrollSubscription?: Subscription;
    loading = false;
    hasMore = true;
    offset = 0;
    limit = 20;
    loadingPorts: Port[] = [];
    currentSearchTerm = '';
    countries: Country[] = [];
    quoteResult: QuoteResult | null = null;
    selectedCountry: string = '';
    isLoadingCategories = false;
    categories: any[] = [];
    isSaving = false;
    submissionError: string | null = null;
    filteredDischargePorts: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
    filteredCategories: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);


    private paymentPollingSub?: Subscription;




    constructor(private fb: FormBuilder,
                private userService: UserService,
                private quotationService: QuoteService,
                private _fuseAlertService: FuseAlertService,
                private datePipe: DatePipe,
                private router: Router,
                private _snackBar: MatSnackBar) { }

    ngOnInit(): void {
        this._fuseAlertService.dismiss('quoteDownloadError');
        this.initForms();
        this.setupFormSubscriptions();
        this.isLoadingMarineData = true;

        // Add this call to setup search filters
        this.setupSearchFilters();

        // Update your existing forkJoin to initialize filtered arrays
        forkJoin({
            products: this.userService.getMarineProducts(),
            packagingTypes: this.userService.getMarinePackagingTypes(),
            categories: this.userService.getMarineCategories(),
        }).subscribe({
            next: (data) => {
                this.marineProducts = data.products || [];
                this.marinePackagingTypes = data.packagingTypes || [];
                this.marineCategories = data.categories || [];

                // Initialize filtered arrays
                this.filteredMarineCategories = this.marineCategories.slice();

                this.isLoadingMarineData = false;
            },
            error: (err) => {
                console.error('Error loading marine data:', err);
                this.isLoadingMarineData = false;
            },
        });


        this.setupSearchableDropdowns();

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
        });

        // Step 2: Coverage Details (example fields)
        this.coverageFormGroup = this.fb.group({
        });

    }

    // Convenience getters for form controls
    get quoteControls() {
        return this.quotationForm.controls;
    }

    get coverageControls() {
        return this.coverageFormGroup.controls;
    }


    private initializeAllData(): void {
        // Initialize all required data from backend APIs
        this.fetchMarineProducts();
        this.fetchCategories();
        this.loadCountries(true);

        this.loadingPorts = [];
        this.filteredDischargePorts.next([]);

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


    ngOnDestroy(): void {
        this.scrollSubscription?.unsubscribe();
        this.destroy$.next();
        this.destroy$.complete();
        this.paymentPollingSub?.unsubscribe();
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


    onOriginChange(event: MatSelectChange) {
        this.selectedCountry = event.source.triggerValue;
        // your logic here
    }


    onScroll(event: Event) {
        const panel = event.target as HTMLElement;
        const threshold = 200;
        const reachedBottom = panel.scrollHeight - panel.scrollTop <= panel.clientHeight + threshold;
        if (reachedBottom && this.hasMore && !this.loading) {
            this.loadCountries();
        }
    }


    openTermsModal(event?: Event): void {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
    }


    closeTermsModal(): void {
    }

    openPrivacyModal(event?: Event): void {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
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

    onFirstNameInput(event: any): void {
        let value = event.target.value.trim();
        value = value.replace(/[^a-zA-Z]/g, '');
        if (value.length > 0) {
            value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        }
        this.quotationForm.patchValue({ firstName: value });
    }

    onLastNameInput(event: any): void {
        let value = event.target.value.trim();
        value = value.replace(/[^a-zA-Z]/g, '');
        if (value.length > 0) {
            value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        }
        this.quotationForm.patchValue({ lastName: value });
    }

    preventSpaceInEmail(event: KeyboardEvent): void {
        // Prevent space key from being entered in email fields
        if (event.key === ' ' || event.code === 'Space' || event.keyCode === 32) {
            event.preventDefault();
        }
    }

    onEmailInput(event: any): void {
        const value = event.target.value.trim();
        this.quotationForm.patchValue({ email: value });
    }


    onPhoneNumberInput(event: any): void {
        let value = event.target.value.trim();
        value = value.replace(/[^0-9]/g, '');
        if (value.length > 10) {
            value = value.substring(0, 10);
        }
        this.quotationForm.patchValue({ phoneNumber: value });
    }


    // Submit final quotation
    submitQuotation(): void {
        this.isSaving = true;
        this.quotationForm.markAllAsTouched();

        if (!this.quotationForm.valid) {
            this.scrollToFirstError();



            // Join them into a readable string
            this.submissionError = `Please fill in the following required fields correctly`;
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
                this.isLoading = true;
                this.quotationService.getQuoteById(''+this.quoteResult.id).subscribe({
                    next: (data) => {
                        console.log(data);
                        this.quote = data;
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

    getStatusColor(status: string): string {
        switch (status?.toLowerCase()) {
            case 'active':
                return 'bg-green-100 text-green-700';
            case 'expired':
                return 'bg-red-100 text-red-700';
            case 'pending':
                return 'bg-yellow-100 text-yellow-700';
            case 'draft':
                return 'bg-gray-100 text-gray-700';
            default:
                return 'bg-blue-100 text-blue-700';
        }
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

    buyNow(): void {
        this.closeQuote.emit();
        this.router.navigate(['/editquote', this.quoteResult.id]);
    }




}
