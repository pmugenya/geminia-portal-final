import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FuseAlertComponent } from '../../../../@fuse/components/alert';
import { MatIcon } from '@angular/material/icon';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDatepickerModule, MatDatepickerToggle } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
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
import { MY_DATE_FORMATS } from '../../../core/directives/date-formats';
import { ActivatedRoute, Router } from '@angular/router';
import {
    CargoTypeData,
    Category,
    Country,
    MarineProduct,
    PackagingType, Port,
    PostalCode,
    QuoteResult,
    QuotesData, UserDocumentData,
} from '../../../core/user/user.types';
import { CustomValidators } from '../../../core/validators/custom.validators';
import {
    debounceTime,
    distinctUntilChanged,
    filter,
    forkJoin, fromEvent,
    map,
    of,
    ReplaySubject,
    Subject, Subscription,
    take,
    takeUntil,
    tap, throttleTime,
} from 'rxjs';
import { QuoteService } from '../../../core/services/quote.service';
import { UserService } from '../../../core/user/user.service';
import { MatSnackBar, MatSnackBarRef, SimpleSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'example',
    standalone: true,
    templateUrl: './edit-marine-quote.component.html',
    styleUrls: ['./edit-marine-quote.component.scss'],
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
export class EditMarineQuoteDetailsComponent implements OnInit, OnDestroy
{
    private destroy$ = new Subject<void>();
    private scrollSubscription?: Subscription;

    @ViewChild('countrySelect') countrySelect!: MatSelect;
    filteredDischargePorts: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
    private validationToastRef: MatSnackBarRef<SimpleSnackBar> | null = null;
    isLoading = false;
    quote?: QuotesData;
    shipmentForm!: FormGroup;
    applicationSubmitted: boolean = false;
    isSubmitting: boolean = false;
    isSaving: boolean = false;
    isLoadingMarineData = false;
    isLoadingCargoTypes: boolean = true;
    postalCodes: PostalCode[] = [];
    marineProducts: MarineProduct[] = [];
    marinePackagingTypes: PackagingType[] = [];
    marineCategories: Category[] = [];
    filteredMarineCategories: Category[] = [];
    marineCargoTypess: CargoTypeData[] = [];
    filteredMarineCargoTypess: CargoTypeData[] = [];
    marineCargoTypes: CargoTypeData[] = [];
    filteredMarineCargoTypes: CargoTypeData[] = [];
    loadingPorts: Port[] = [];
    origincountries: Country[] = [];
    loading = false;
    hasMoreLast = true;
    offsetLast = 0;
    currentSearchTerm2 = '';
    limit = 20;
    quoteId!: string;
    quoteResult: QuoteResult | null = null;
    userDocs?: UserDocumentData;
    cargoTypeFilterCtrl2: FormControl = new FormControl();
    categoryFilterCtrl2: FormControl = new FormControl();
    countryFilterCtrl2: FormControl = new FormControl();

    constructor(private router: Router,
                private fb: FormBuilder,
                private route: ActivatedRoute,
                private quotationService: QuoteService,
                private _snackBar: MatSnackBar,
                private userService: UserService) {
    }

    ngOnDestroy(): void {
        this.scrollSubscription?.unsubscribe();
        this.destroy$.next();
        this.destroy$.complete();
    }

    ngOnInit(): void {
        this.initForms();
        forkJoin({
            products: this.userService.getMarineProducts(),
            packagingTypes: this.userService.getMarinePackagingTypes(),
            categories: this.userService.getMarineCategories(),
            postalcodes: this.quotationService.getPostalCodes()
        }).subscribe({
            next: (data) => {
                this.marineProducts = data.products || [];
                this.marinePackagingTypes = data.packagingTypes || [];
                this.marineCategories = data.categories ?? [];
                // Initialize filtered arrays
                this.filteredMarineCategories = [...this.marineCategories];
                this.postalCodes = data.postalcodes;

                if (this.marineCategories.length === 0) {
                    console.warn("⚠ Marine categories returned empty list from API.");
                }

                if(this.quoteId){
                    this.loadQuotDetails();
                }

                this.isLoadingMarineData = false;
            },
            error: (err) => {
                console.error('Error loading marine data:', err);
                this.isLoadingMarineData = false;
                this.marineCategories = [];
                this.filteredMarineCategories = [];
            },
        });
        this.initializeAllData();
        this.listenForSumInsuredChanges();
        this.quoteId = this.route.snapshot.paramMap.get('quoteId')!;
        this.isLoadingMarineData = true;
    }

    private initializeAllData(): void {
        // Initialize all required data from backend APIs
        this.fetchMarineProducts();
        this.loadShippingCountries(true);

        this.loadingPorts = [];
        this.filteredDischargePorts.next([]);

    }

    listenForSumInsuredChanges(): void {
        this.shipmentForm.get('sumInsured')?.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe((sumInsured) => {
            if (sumInsured && sumInsured > 0) {
                const formValue = this.shipmentForm.getRawValue();
                const modeOfShipment =  formValue.modeOfShipment;
                const  marineCargoType = formValue.salesCategory;
                const selectedCategory = this.filteredMarineCargoTypess.find(c => c.ctname === marineCargoType);
                console.log('marineCargoType:', marineCargoType,'selectedCategory:', selectedCategory);
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

    onSaveAndPayNow(): void {
        // For now, reuse existing submission logic
        this.isSubmitting = true;
        this.shipmentForm.markAllAsTouched();

        if (!this.shipmentForm.valid) {
            this.logAllFormErrors(this.shipmentForm);
            this.scrollToFirstError();
            this.validationToastRef = this.showToast(
                `A few fields need your attention. Please review the highlights.`,
            );
            this.isSubmitting = false;
            return;
        }
        const kycFormValue = this.shipmentForm.getRawValue();
        const packagingType = this.shipmentForm.get('commodityType')?.value;
        const category = this.shipmentForm.get('selectCategory')?.value;
        const cargoType = this.shipmentForm.get('salesCategory')?.value;
        console.log(cargoType);
        console.log(this.filteredMarineCargoTypess);
        const selectedCategory = this.marineCategories.find(c => c.catname === category);
        const selectedCargoType = this.filteredMarineCargoTypess.find(p => p.ctname === cargoType);
        const selectedOriginCountry = this.shipmentForm.get('countryOfOrigin')?.value?.id;

        const metadata = {
            suminsured: this.shipmentForm.get('sumInsured')?.value,
            kraPin: kycFormValue.kraPin,
            firstName: kycFormValue.firstName,
            lastName: kycFormValue.lastName,
            phoneNumber: kycFormValue.phoneNumber,
            emailAddress: kycFormValue.emailAddress,
            idNumber: kycFormValue.idNumber,
            postalAddress: kycFormValue.streetAddress,
            postalCode: kycFormValue.postalCode,
            shippingid: this.shipmentForm.get('modeOfShipment')?.value,
            tradeType: this.shipmentForm.get('tradeType')?.value,
            countryOrigin: selectedOriginCountry,
            destination: this.shipmentForm.get('finalDestination')?.value,
            dateFormat: 'dd MMM yyyy',
            locale: 'en_US',
            productId: 2416,
            packagetypeid: packagingType,
            categoryid: selectedCategory?.id,
            cargoId: selectedCargoType?.id,
            quoteId: this.quoteId
        };

        const formData = new FormData();
        formData.append('metadata', JSON.stringify(metadata));


        this.quotationService.updateNewQuote(formData).subscribe({
            next: (res) => {
                this.isSubmitting = false;
                this.quoteResult = res;
                this.validationToastRef = this.showToast(
                    ' Quote Updated Successfully.Fill in more details to complete the payment'
                );
                this.router.navigate(['/editquote', this.quoteId]);
            },
            error: (err) => {
                console.log(err);
                // this.submissionError = err?.error?.message || 'An unexpected error occurred. Please try again.';
                this.validationToastRef = this.showToast(
                    err?.error?.message || 'An unexpected error occurred. Please try again.',
                );
                this.isSubmitting = false;
            },
        });

    }

    onSaveAndPayLater(): void {
        // TODO: implement separate save-later behaviour if backend supports it
        this.onSubmit();
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

    private initForms(): void {
        this.shipmentForm = this.fb.group({
            modeOfShipment: ['', Validators.required], // 1 = Sea, 2 = Air
            tradeType: ['Marine Cargo Import'], // Readonly field - always Marine Cargo Import
            product: ['Marine Cargo Import'], // Readonly field
            commodityType: ['1', Validators.required], // 1 = Containerized, 2 = Non-Containerized
            selectCategory: ['', Validators.required], // Category ID
            salesCategory: ['', Validators.required], // Cargo Type ID
            countryOfOrigin: ['', Validators.required],
            finalDestination: ['Kenya'],
            sumInsured: ['', [Validators.required, Validators.min(1)]],
            firstName: ['', [Validators.required, CustomValidators.firstName]],
            lastName: ['', [Validators.required, CustomValidators.lastName]],
            emailAddress: ['', [Validators.required, CustomValidators.email]],
            phoneNumber: ['', [Validators.required, CustomValidators.phoneNumber]],
            kraPin: ['', [Validators.required, CustomValidators.kraPin]],
            idNumber: ['', [Validators.required, CustomValidators.idNumber]],
            streetAddress: ['', Validators.required],
            postalCode: ['', Validators.required],
        });
    }

    goToDashboard(): void {
        this.router.navigate(['/dashboard']);
    }

    private loadQuotDetails(): void {
        this.isLoading = true;
        this.quotationService.getQuoteById(this.quoteId).subscribe({
            next: (res) => {
                console.log(res);
                this.isLoading = false;
                this.quote = res;
                this.quoteResult =this.quoteResult = {
                    result: 0,
                    premium: res.premium,
                    phcf: res.phcf,
                    tl: res.traininglevy,
                    sd: res.sd,
                    netprem: res.netprem,
                    id: res.quoteId
                };
                const authUser =  this.userService.getCurrentUser();
                if(authUser){
                    const userType = authUser.userType;
                    if(userType==='C'){
                        this.fetchProspectDocuments(res.prospectId);
                    }
                    else if(userType==='A'){
                        this.fetchProspectDocuments(res.prospectId);
                    }
                }
                this.shipmentForm.get('modeOfShipment')?.setValue(''+res.shippingmodeId);
                const selectedCategory = this.marineCategories.find(c => c.id === res.catId);
                this.shipmentForm.get('selectCategory')?.setValue(selectedCategory.catname);

                this.onCategorySelectedVal(selectedCategory.catname)
                    .pipe(
                        filter(() => this.filteredMarineCargoTypess?.length > 0),
                        take(1) // only once
                    )
                    .subscribe(() => {
                        const selectedCargo = this.filteredMarineCargoTypess
                            .find(c => c.id === res.cargotypeId);
                        console.log('selectedCargo ',selectedCargo);

                        if (selectedCargo) {
                            this.shipmentForm.get('salesCategory')?.setValue(selectedCargo.ctname);
                        }
                        this.shipmentForm.get('sumInsured')?.setValue(res.sumassured);
                    });
                this.shipmentForm.get('agreeToTerms')?.setValue(true, { emitEvent: false });
                // this.onDropdownOpen('categories');


                let selectedCountry = this.origincountries.find(c => c.id === Number(res.originCountry));
                const setCountryAndProceed = (country: Country) => {
                    this.origincountries = [
                        country,
                        ...this.origincountries.filter(c => c.id !== country.id)
                    ];
                    this.shipmentForm.get('countryOfOrigin')?.setValue(country);
                };

                if (selectedCountry) {
                    setCountryAndProceed(selectedCountry);
                } else {
                    this.userService.getCountryById( Number(res.originCountry), String(res.shippingmodeId)).subscribe({
                        next: (country) => {
                            setCountryAndProceed(country);
                        },
                        error: (err) => {
                        }
                    });
                }
            },
            error: (err) => {
                this.isLoading = false;
                console.error('error occured while loading the quote', err);
            },
        });
    }

    onScrollLast(event: Event) {
        const panel = event.target as HTMLElement;
        const threshold = 200;
        const reachedBottom = panel.scrollHeight - panel.scrollTop <= panel.clientHeight + threshold;
        if (reachedBottom && this.hasMoreLast && !this.loading) {
            this.loadShippingCountries();
        }
    }

    fetchProspectDocuments(prospectId: number): void {
        this.isLoadingMarineData = true;
        this.userService.checkProspectDocument(prospectId).subscribe({
            next: (data) => {
                console.log(data);
                console.log('prospectId ',prospectId);
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
            },
            error: (err) => {
                this.isLoadingMarineData = false;
            }
        });
    }

    onCategorySelected2(categoryValue: string) {
        const selectedCategory = this.marineCategories.find(c => c.catname === categoryValue);
        console.log(selectedCategory);
        if (selectedCategory) {
            this.isLoadingCargoTypes = true;
            this.userService.getCargoTypesByCategory(selectedCategory.id)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (cargoTypes) => {
                        this.marineCargoTypes = cargoTypes || [];
                        this.filteredMarineCargoTypes = this.marineCargoTypes.slice();
                        this.filteredMarineCargoTypess = this.marineCargoTypes.slice();
                        this.cargoTypeFilterCtrl2.setValue(''); // Reset search
                        this.isLoadingCargoTypes = false;
                        this.shipmentForm.get('salesCategory')?.setValue('', { emitEvent: false });
                    },
                    error: (err) => {
                        console.error('Error loading marine cargo types:', err);
                        this.marineCargoTypes = [];
                        this.filteredMarineCargoTypes = [];
                        this.filteredMarineCargoTypess = [];
                        this.isLoadingCargoTypes = false;
                    },
                });
        } else {
            this.marineCargoTypes = [];
            this.filteredMarineCargoTypes = [];
            this.filteredMarineCargoTypess = [];
            this.shipmentForm.get('selectCategory')?.setValue('', { emitEvent: false });
        }
    }

    onCategorySelectedVal(categoryValue: string) {
        const selectedCategory = this.marineCategories.find(c => c.catname === categoryValue);
        if (!selectedCategory) return of([]);

        return this.userService.getCargoTypesByCategory(selectedCategory.id).pipe(
            tap(cargoTypes => {
                this.marineCargoTypess = cargoTypes || [];
                this.filteredMarineCargoTypess = [...this.marineCargoTypess];
            }),
            // IMPORTANT: return the cargoTypes to the subscriber
            map(cargoTypes => cargoTypes || [])
        );
    }

    onCategoryTypeSelected2(categoryValue: string) {
        console.log(categoryValue);
        const selectedCategory = this.filteredMarineCargoTypes.find(c => c.ctname === categoryValue);
        const formValue = this.shipmentForm.getRawValue();
        const modeOfShipment =  formValue.modeOfShipment;
        const  sumInsured = formValue.sumInsured;
        console.log(modeOfShipment,sumInsured);
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

    compareCountries = (c1: Country, c2: Country): boolean => {
        if (!c1 || !c2) {
            return c1 === c2;
        }
        return c1.id === c2.id;
    }

    getCargoProtectionName(): string {
        const selectedId = this.shipmentForm.get('cargoProtection')?.value;
        if (selectedId && this.marineProducts.length > 0) {
            const product = this.marineProducts.find(p => p.id === selectedId);
            return product?.prodname || 'ICC (A) All Risk';
        }
        return 'ICC (A) All Risk';
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

    private showToast(message: string, duration: number = 4000): MatSnackBarRef<SimpleSnackBar> {
        const snackRef = this._snackBar.open(message, undefined, {
            horizontalPosition: 'right',
            verticalPosition: 'top',
            duration,
            panelClass: ['marine-quote-snackbar']
        });

        return snackRef;
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

    private logAllFormErrors(formGroup: FormGroup, parentKey: string = ''): void {
        Object.keys(formGroup.controls).forEach(key => {
            const control = formGroup.get(key);
            const controlPath = parentKey ? `${parentKey}.${key}` : key;

            if (control instanceof FormGroup) {
                this.logAllFormErrors(control, controlPath);
            } else {
                if (control?.errors) {
                    console.error(
                        `❌ Error in: ${controlPath}`,
                        control.errors
                    );
                }
            }
        });
    }


    onSubmit(): void {
        this.isSubmitting = true;
        this.shipmentForm.markAllAsTouched();

        if (!this.shipmentForm.valid) {
            this.logAllFormErrors(this.shipmentForm);
            this.scrollToFirstError();
            this.validationToastRef = this.showToast(
                `A few fields need your attention. Please review the highlights.`,
            );
            this.isSubmitting = false;
            return;
        }
        const kycFormValue = this.shipmentForm.getRawValue();
        const packagingType = this.shipmentForm.get('commodityType')?.value;
        const category = this.shipmentForm.get('selectCategory')?.value;
        const cargoType = this.shipmentForm.get('salesCategory')?.value;
        console.log(cargoType);
        console.log(this.filteredMarineCargoTypess);
        const selectedCategory = this.marineCategories.find(c => c.catname === category);
        const selectedCargoType = this.filteredMarineCargoTypess.find(p => p.ctname === cargoType);
        const selectedOriginCountry = this.shipmentForm.get('countryOfOrigin')?.value?.id;

        const metadata = {
            suminsured: this.shipmentForm.get('sumInsured')?.value,
            kraPin: kycFormValue.kraPin,
            firstName: kycFormValue.firstName,
            lastName: kycFormValue.lastName,
            phoneNumber: kycFormValue.phoneNumber,
            emailAddress: kycFormValue.emailAddress,
            idNumber: kycFormValue.idNumber,
            postalAddress: kycFormValue.streetAddress,
            postalCode: kycFormValue.postalCode,
            shippingid: this.shipmentForm.get('modeOfShipment')?.value,
            tradeType: this.shipmentForm.get('tradeType')?.value,
            countryOrigin: selectedOriginCountry,
            destination: this.shipmentForm.get('finalDestination')?.value,
            dateFormat: 'dd MMM yyyy',
            locale: 'en_US',
            productId: 2416,
            packagetypeid: packagingType,
            categoryid: selectedCategory?.id,
            cargoId: selectedCargoType?.id,
            quoteId: this.quoteId
        };

        const formData = new FormData();
        formData.append('metadata', JSON.stringify(metadata));


        this.quotationService.updateNewQuote(formData).subscribe({
            next: (res) => {
                this.isSubmitting = false;
                this.quoteResult = res;
                this.validationToastRef = this.showToast(
                   ' Quote Updated Successfully.'
                );
                this.loadQuotDetails();
            },
            error: (err) => {
                console.log(err);
                // this.submissionError = err?.error?.message || 'An unexpected error occurred. Please try again.';
                this.validationToastRef = this.showToast(
                    err?.error?.message || 'An unexpected error occurred. Please try again.',
                );
                this.isSubmitting = false;
            },
        });
    }



}
