import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FuseAlertComponent, FuseAlertService } from '../../../../@fuse/components/alert';
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
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatSelectSearchComponent } from 'ngx-mat-select-search';
import { MatInputModule } from '@angular/material/input';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { ThousandsSeparatorValueAccessor } from '../../../core/directives/thousands-separator-value-accessor';
import { MatCheckbox } from '@angular/material/checkbox';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { MY_DATE_FORMATS } from '../../../core/directives/date-formats';
import {
    catchError, debounceTime, distinctUntilChanged, filter,
    finalize, forkJoin, fromEvent,
    interval, map,
    of, ReplaySubject,
    Subject, Subscription,
    switchMap, take,
    takeUntil,
    takeWhile, tap, throttleTime,
    throwError,
    timeout,
} from 'rxjs';
import { UserService } from '../../../core/user/user.service';
import { QuoteService } from '../../../core/services/quote.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CustomValidators } from '../../../core/validators/custom.validators';
import {
    CargoTypeData,
    Category,
    Country,
    MarineProduct,
    PackagingType,
    Port, PostalCode, QuoteResult,
    QuotesData, UserDocumentData,
} from '../../../core/user/user.types';
import { ActivatedRoute, Router } from '@angular/router';


@Component({
    selector: 'example',
    standalone: true,
    templateUrl: './edit-quote.component.html',
    styleUrls: ['./edit-quote.component.scss'],
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
export class EditMarineQuoteComponent implements OnInit, OnDestroy
{

    private destroy$ = new Subject<void>();
    private paymentPollingSub?: Subscription;
    private scrollSubscription?: Subscription;

    @ViewChild('portSelect') portSelect!: MatSelect;
    @ViewChild('countrySelect') countrySelect!: MatSelect;
    shipmentForm!: FormGroup;
    quote?: QuotesData;
    applicationSubmitted: boolean = false;
    isSubmitting: boolean = false;
    isProcessPayment: boolean = false;
    isProcessingStk = false;
    paymentSuccess?: boolean;
    paymentMethod: 'stk' | 'paybill' = 'stk';
    validatingPayment = false;
    mpesaCodeError: string | null = null;
    mpesaCodeValid = false;
    isMakePaymentNow = false;
    isLoadingCounties = false;
    isLoading = false;
    isLoadingDischargePorts = false;
    isLoadingMarineData = false;
    isLoadingLoadingPorts = false;
    isLoadingCategories = false;
    portLoading = false;
    loading = false;
    isLoadingCargoTypes: boolean = true;
    applicationId: number;
    paymentRefNo: string ='';
    quoteId!: string;
    portOffset = 0;
    offsetLast = 0;
    portHasMore = true;
    hasMoreLast = true;
    limit = 20;
    portCurrentSearchTerm = '';
    currentSearchTerm2 = '';
    loadingPorts: Port[] = [];
    marineProducts: MarineProduct[] = [];
    marinePackagingTypes: PackagingType[] = [];
    marineCategories: Category[] = [];
    marineCargoTypes: CargoTypeData[] = [];
    marineCargoTypess: CargoTypeData[] = [];
    dischargePorts: any[] = [];
    categories: any[] = [];
    counties: any[] = [];
    postalCodes: PostalCode[] = [];
    origincountries: Country[] = [];
    filteredMarineCategories: Category[] = [];
    filteredMarineCargoTypes: CargoTypeData[] = [];
    filteredMarineCargoTypess: CargoTypeData[] = [];
    countySearchCtrl: FormControl = new FormControl();
    countryFilterCtrl2: FormControl = new FormControl();
    dischargePortSearchCtrl: FormControl = new FormControl();
    loadingPortSearchCtrl: FormControl = new FormControl();
    cargoTypeFilterCtrl2: FormControl = new FormControl();
    categoryFilterCtrl2: FormControl = new FormControl();
    categoryFilterCtrl: FormControl = new FormControl();
    cargoTypeSearchCtrl: FormControl = new FormControl();
    cargoTypeFilterCtrl: FormControl = new FormControl();

    dischargePortPage = 0;
    pageSize = 50;
    countyPage = 0;
    today = new Date();
    quoteResult: QuoteResult | null = null;
    duplicateFileErrors: { [key: string]: string } = {};
    userDocs?: UserDocumentData;

    // Document preview modal state (Step 3 uploads)
    showDocumentPreviewModal = false;
    previewDocumentUrl: string | null = null;
    previewSafeUrl: SafeResourceUrl | null = null;
    previewDocumentName = '';
    previewDocumentType = '';

    filteredDischargePorts: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
    filteredCounties: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
    filteredCargoTypes: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
    filteredCategories: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

    constructor(private fb: FormBuilder,
                private quotationService: QuoteService,
                private userService: UserService,
                private datePipe: DatePipe,
                private route: ActivatedRoute,
                private router: Router,
                private _snackBar: MatSnackBar,
                private sanitizer: DomSanitizer) { }


    ngOnDestroy(): void {
        this.scrollSubscription?.unsubscribe();
        this.destroy$.next();
        this.destroy$.complete();
        this.paymentPollingSub?.unsubscribe();
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
        this.setupSearchFilters();
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

    private setupSearchFilters(): void {

        this.fetchCounties();
        this.categoryFilterCtrl2.valueChanges.pipe(
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.filterCategories2();
        });

        this.shipmentForm.get('modeOfShipment')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((mode) => {
                if (mode) {
                    // Preserve the selected country before resetting
                    const selectedCountry = this.shipmentForm.get('countryOfOrigin')?.value;
                    this.countryFilterCtrl2.setValue('');
                    // Keep the selected country in the list if it exists
                    if (selectedCountry) {
                        this.origincountries = [selectedCountry];
                    }
                    this.loadShippingCountries(true);
                }
            });

        this.countryFilterCtrl2.valueChanges
            .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
            .subscribe(term => {
                this.offsetLast = 0;
                // Preserve the currently selected country
                const selectedCountry = this.shipmentForm.get('countryOfOrigin')?.value;
                this.origincountries = selectedCountry ? [selectedCountry] : [];
                this.currentSearchTerm2 = term || '';
                this.hasMoreLast = true;
                this.loadShippingCountries(true);
            });



        this.loadingPortSearchCtrl.valueChanges
            .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
            .subscribe((searchTerm) => {
                console.log('searchTerm...',searchTerm);
                this.portOffset = 0;
                // Preserve the selected port
                const selectedPortId = this.shipmentForm.get('loadingPort')?.value;
                const selectedPort = this.loadingPorts.find(p => p.id === selectedPortId);
                this.loadingPorts = selectedPort ? [selectedPort] : [];
                this.portCurrentSearchTerm = searchTerm || '';
                this.portHasMore = true;
                this.fetchLoadingPorts(true);
            });

        this.dischargePortSearchCtrl.valueChanges
            .pipe(takeUntil(this.destroy$), debounceTime(300))
            .subscribe((searchTerm) => {
                // Preserve the selected discharge port
                const selectedPortId = this.shipmentForm.get('portOfDischarge')?.value;
                const selectedPort = this.dischargePorts.find(p => (p.id || p.portId || p.portid) === selectedPortId);
                this.dischargePortPage = 0;
                // Keep selected port in list
                if (selectedPort) {
                    this.dischargePorts = [selectedPort];
                }
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

    onSubmitPayLater(): void {
        // For now, reuse the same submission flow but allow the user to complete payment later
        this.onSubmit();
    }

    private filterCounties(): void {
        if (!this.counties) {
            this.filteredCounties.next([]);
            return;
        }

        let search = this.countySearchCtrl.value;
        const selectedCountyId = this.shipmentForm.get('finalDestination')?.value;
        const selectedCounty = this.counties.find(c => c.id === selectedCountyId);

        if (!search) {
            // If no search, show all counties (with selected at top if it exists)
            if (selectedCounty) {
                const otherCounties = this.counties.filter(c => c.id !== selectedCountyId);
                this.filteredCounties.next([selectedCounty, ...otherCounties]);
            } else {
                this.filteredCounties.next(this.counties.slice());
            }
            return;
        }

        search = String(search).toLowerCase();

        const filtered = this.counties.filter((county: any) => {
            const name = (county.portName || county.portname || county.name || '').toLowerCase();
            return name.includes(search);
        });

        // Ensure selected county appears in filtered results even if it doesn't match search
        if (selectedCounty && !filtered.find(c => c.id === selectedCountyId)) {
            filtered.unshift(selectedCounty);
        }

        this.filteredCounties.next(filtered);
    }

    private filterCargoTypes(): void {
        if (!this.marineCargoTypes) {
            return;
        }
        let search = this.cargoTypeFilterCtrl.value;
        const selectedCargoValue = this.shipmentForm.get('salesCategory')?.value;
        const selectedCargo = this.filteredMarineCargoTypess.find(c => c.ctname === selectedCargoValue);

        if (!search) {
            // If no search, show all cargo types (with selected at top if it exists)
            if (selectedCargo) {
                const otherCargos = this.marineCargoTypes.filter(c => c.id !== selectedCargo.id);
                this.filteredMarineCargoTypes = [selectedCargo, ...otherCargos];
            } else {
                this.filteredMarineCargoTypes = this.marineCargoTypes.slice();
            }
            return;
        } else {
            search = search.toLowerCase();
        }
        const filtered = this.marineCargoTypes.filter(cargoType =>
            cargoType.ctname.toLowerCase().indexOf(search) > -1
        );

        // Ensure selected cargo appears in filtered results even if it doesn't match search
        if (selectedCargo && !filtered.find(c => c.id === selectedCargo.id)) {
            filtered.unshift(selectedCargo);
        }

        this.filteredMarineCargoTypes = filtered;
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

    private loadQuotDetails(): void {
        this.isLoading = true;
        this.quotationService.getQuoteById(this.quoteId).subscribe({
            next: (res) => {
                console.log(res);
                if( res?.shippingId) {
                    this.applicationId = res?.shippingId;
                    this.applicationSubmitted = true;
                }
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
                // Fetch and set the country FIRST before setting mode (to avoid race condition)
                const setCountryAndMode = (country: Country) => {
                    // Add country to the list first
                    this.origincountries = [
                        country,
                        ...this.origincountries.filter(c => c.id !== country.id)
                    ];
                    // Set the country value
                    this.shipmentForm.get('countryOfOrigin')?.setValue(country, { emitEvent: false });
                    // Now set the mode which will trigger country loading, but preserve our selected country
                    this.shipmentForm.get('modeOfShipment')?.setValue(''+res.shippingmodeId);

                    // Manually trigger port loading since we set country with emitEvent: false
                    this.portOffset = 0;
                    this.loadingPorts = [];
                    this.portHasMore = true;
                    this.fetchLoadingPorts(true);

                    // Also load discharge ports
                    this.dischargePortPage = 0;
                    this.fetchPorts('');
                };

                // Always fetch the country by ID to ensure it's loaded
                this.userService.getCountryById(Number(res.originCountry), String(res.shippingmodeId)).subscribe({
                    next: (country) => {
                        setCountryAndMode(country);
                    },
                    error: (err) => {
                        console.error('Error fetching country:', err);
                        // Fallback: try to find in existing list and set mode anyway
                        let selectedCountry = this.origincountries.find(c => c.id === Number(res.originCountry));
                        if (selectedCountry) {
                            setCountryAndMode(selectedCountry);
                        } else {
                            // Just set the mode if country fetch fails
                            this.shipmentForm.get('modeOfShipment')?.setValue(''+res.shippingmodeId);
                        }
                    }
                });

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
            },
            error: (err) => {
                this.isLoading = false;
               console.error('error occured while loading the quote', err);
            },
        });
    }



    private filterCategories2(): void {
        if (!this.marineCategories) {
            return;
        }
        let search = this.categoryFilterCtrl2.value;
        const selectedCategoryValue = this.shipmentForm.get('selectCategory')?.value;
        const selectedCategory = this.marineCategories.find(c => c.catname === selectedCategoryValue);

        if (!search) {
            // If no search, show all categories (with selected at top if it exists)
            if (selectedCategory) {
                const otherCategories = this.marineCategories.filter(c => c.id !== selectedCategory.id);
                this.filteredMarineCategories = [selectedCategory, ...otherCategories];
            } else {
                this.filteredMarineCategories = this.marineCategories.slice();
            }
            return;
        } else {
            search = search.toLowerCase();
        }
        const filtered = this.marineCategories.filter(category =>
            category.catname.toLowerCase().indexOf(search) > -1
        );

        // Ensure selected category appears in filtered results even if it doesn't match search
        if (selectedCategory && !filtered.find(c => c.id === selectedCategory.id)) {
            filtered.unshift(selectedCategory);
        }

        this.filteredMarineCategories = filtered;
    }

    private initForms(): void {
        this.shipmentForm = this.fb.group({
            // Document Uploads
            idfDocument: [null, Validators.required],
            invoice: [null, Validators.required],
            kraPinCertificate: [null, Validators.required],
            nationalId: [null, Validators.required],
            agreeToTerms: [false, Validators.requiredTrue],

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
    }

    onSubmit(): void {
        if (this.shipmentForm.invalid) {
            // Mark all fields as touched to show validation errors
            this.shipmentForm.markAllAsTouched();

            const invalidFields = Object.keys(this.shipmentForm.controls)
                .filter(key => this.shipmentForm.get(key)?.invalid)
                .map(key => ({
                    field: key,
                    errors: this.shipmentForm.get(key)?.errors
                }));

            console.warn('❌ Invalid form fields:', invalidFields);


            this._snackBar.open('A few fields need your attention. Please review the highlights.', 'Close', {
                duration: 4000,
                horizontalPosition: 'right',
                verticalPosition: 'top',
                panelClass: ['marine-quote-snackbar']
            });
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
            quoteId: this.quoteId,
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

    getCargoProtectionName(): string {
        const selectedId = this.shipmentForm.get('cargoProtection')?.value;
        if (selectedId && this.marineProducts.length > 0) {
            const product = this.marineProducts.find(p => p.id === selectedId);
            return product?.prodname || 'ICC (A) All Risk';
        }
        return 'ICC (A) All Risk';
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

    public getPortDisplayName(port: any): string {
        if (typeof port === 'string') {
            return port; // Manual entry
        }
        if (typeof port === 'object' && port) {
            return port.portname || port.pname || port.name || port.portName || 'Unknown Port';
        }
        return '';
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
                    // When resetting (page 0), preserve the selected port
                    const selectedPortId = this.shipmentForm.get('portOfDischarge')?.value;
                    const selectedPort = this.dischargePorts.find(p => (p.id || p.portId || p.portid) === selectedPortId);
                    if (selectedPort) {
                        // Remove selected port from newPorts if it exists to avoid duplicates
                        const filteredNewPorts = newPorts.filter(p => (p.id || p.portId || p.portid) !== selectedPortId);
                        this.dischargePorts = [selectedPort, ...filteredNewPorts];
                    } else {
                        this.dischargePorts = newPorts;
                    }
                } else {
                    // When appending, avoid duplicates
                    const existingIds = new Set(this.dischargePorts.map(p => p.id || p.portId || p.portid));
                    const uniqueNewPorts = newPorts.filter(p => !existingIds.has(p.id || p.portId || p.portid));
                    this.dischargePorts = [...this.dischargePorts, ...uniqueNewPorts];
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

    onSelectOpenPorts(opened: boolean) {
        console.log(opened);
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
        const countryLoadingVal = this.shipmentForm.get('countryOfOrigin')?.value?.id;
        if (!countryLoadingVal) {
            return; // Don't fetch if no country is selected
        }
        this.portLoading = true;
        this.userService.getPorts(countryLoadingVal,''+modeId,this.portOffset, this.limit, this.portCurrentSearchTerm)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    const newItems = res?.pageItems  || [];
                    if (reset) {
                        // When resetting, preserve the selected port and add new items
                        const selectedPortId = this.shipmentForm.get('loadingPort')?.value;
                        const selectedPort = this.loadingPorts.find(p => p.id === selectedPortId);
                        if (selectedPort) {
                            // Remove selected port from newItems if it exists to avoid duplicates
                            const filteredNewItems = newItems.filter(p => p.id !== selectedPort.id);
                            this.loadingPorts = [selectedPort, ...filteredNewItems];
                        } else {
                            this.loadingPorts = newItems;
                        }
                    } else {
                        // When appending, just add new items (avoiding duplicates)
                        const existingIds = new Set(this.loadingPorts.map(p => p.id));
                        const uniqueNewItems = newItems.filter(p => !existingIds.has(p.id));
                        this.loadingPorts = [...this.loadingPorts, ...uniqueNewItems];
                    }
                    if (newItems.length < this.limit) this.portHasMore = false;
                    this.portOffset += this.limit;
                    this.portLoading = false;
                },
                error: (err) => {
                    this.portLoading = false;
                },
            });
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
                    if (reset) {
                        // When resetting, preserve the selected country and add new items
                        const selectedCountry = this.shipmentForm.get('countryOfOrigin')?.value;
                        if (selectedCountry) {
                            // Remove selected country from newItems if it exists to avoid duplicates
                            const filteredNewItems = newItems.filter(c => c.id !== selectedCountry.id);
                            this.origincountries = [selectedCountry, ...filteredNewItems];
                        } else {
                            this.origincountries = newItems;
                        }
                    } else {
                        // When appending, just add new items (avoiding duplicates)
                        const existingIds = new Set(this.origincountries.map(c => c.id));
                        const uniqueNewItems = newItems.filter(c => !existingIds.has(c.id));
                        this.origincountries = [...this.origincountries, ...uniqueNewItems];
                    }
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

    onScrollLast(event: Event) {
        const panel = event.target as HTMLElement;
        const threshold = 200;
        const reachedBottom = panel.scrollHeight - panel.scrollTop <= panel.clientHeight + threshold;
        if (reachedBottom && this.hasMoreLast && !this.loading) {
            this.loadShippingCountries();
        }
    }

    compareCountries = (c1: Country, c2: Country): boolean => {
        if (!c1 || !c2) {
            return c1 === c2;
        }
        return c1.id === c2.id;
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


    onCategorySelected2(categoryValue: string) {
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

    onIdfNumberInput(event: any): void {
        let value = event.target.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); // Trim spaces, keep only letters and numbers, convert to uppercase

        // Format: 2 digits + NBOIM + 9 digits (e.g. 24NBOIM000002014)
        if (value.length > 16) {
            value = value.substring(0, 16); // Limit to 16 characters
        }

        this.shipmentForm.get('gcrNumber')?.setValue(value);
    }

    onVesselNameInput(event: any): void {
        let value = event.target.value;
        // Allow letters, numbers, and spaces
        value = value.replace(/[^a-zA-Z0-9\s]/g, '');
        // Capitalize first letter of each word
        value = value.replace(/\b\w/g, (char: string) => char.toUpperCase());
        this.shipmentForm.patchValue({ vesselName: value });
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
                'idfDocument': 'IDF Document',
                'invoice': 'Invoice',
                'kraPinCertificate': 'KRA PIN Certificate',
                'nationalId': 'National ID'
            };

            let duplicateFieldName = '';
            const isDuplicate = documentFields.some((fieldName: string) => {
                if (fieldName === controlName) return false; // Skip current field
                const existingFile = this.shipmentForm.get(fieldName)?.value;
                if (!existingFile) return false;

                // Compare file name, size, and last modified date
                const isDupe = existingFile.name === file.name &&
                    existingFile.size === file.size &&
                    existingFile.lastModified === file.lastModified;

                if (isDupe) {
                    duplicateFieldName = fieldNames[fieldName];
                }
                return isDupe;
            });

            if (isDuplicate) {
                // Set shorter, more specific error message
                this.duplicateFileErrors[controlName] = `The file is already uploaded as "${duplicateFieldName}"`;

                // Clear the input
                input.value = '';

                // Clear the form control value
                this.shipmentForm.get(controlName)?.setValue(null);
                return;
            }

            // Set the file if no duplicate found
            this.shipmentForm.get(controlName)?.setValue(file);
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

    onScrollPorts(event: Event) {
        const panel = event.target as HTMLElement;
        const threshold = 200;
        const reachedBottom = panel.scrollHeight - panel.scrollTop <= panel.clientHeight + threshold;
        if (reachedBottom && this.portHasMore && !this.portLoading) {
            this.fetchLoadingPorts();
        }
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

    goToDashboard(): void {
        this.router.navigate(['/dashboard']);
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

    onMpesaCodeInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        // Convert to uppercase and remove spaces
        input.value = input.value.toUpperCase().replace(/\s/g, '');
        // Remove any non-alphanumeric characters
        input.value = input.value.replace(/[^A-Z0-9]/g, '');
        // Limit to 10 characters
        if (input.value.length > 10) {
            input.value = input.value.slice(0, 10);
        }
        this.shipmentForm.get('mpesaCode')?.setValue(input.value);

        // Reset validation states when user is typing
        this.mpesaCodeError = null;
        this.mpesaCodeValid = false;
    }

    validateMpesaPayment(): void {
        if (this.validatingPayment) return;

        const mpesaCode = this.shipmentForm.get('mpesaCode')?.value;
        if (!mpesaCode || mpesaCode.length !== 10) {
            this.mpesaCodeError = 'Please enter a valid 10-character M-PESA transaction code';
            return;
        }

        // Basic format validation for M-PESA codes (typically start with letters)
        if (!/^[A-Z]{2,3}[A-Z0-9]{7,8}$/.test(mpesaCode)) {
            this.mpesaCodeError = 'Invalid M-PESA code format. Please check and try again.';
            return;
        }

        this.validatingPayment = true;
        this.mpesaCodeError = null;
    }

}
