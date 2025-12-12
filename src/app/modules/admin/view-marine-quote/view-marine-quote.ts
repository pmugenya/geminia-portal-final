import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarRef, SimpleSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { DatePipe, DecimalPipe, NgClass, NgIf } from '@angular/common';
import { QuoteService } from '../../../core/services/quote.service';
import { MatProgressBar } from '@angular/material/progress-bar';
import { HttpEventType } from '@angular/common/http';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { interval, Subscription, switchMap, takeUntil, timer } from 'rxjs';

// Interfaces matching your Java model
interface ApplicationShippingItemsData {
    id?: number;
    description: string;
    quantity: number;
    value: number;
}

interface ApplicationCargoData {
    id?: number;
    cargoType?: string;
    weight?: number;
    // Add other cargo data fields as needed
}

interface ApplicationShippingData {
    id: number;
    refno: string;
    erprefno: string;
    caAccountCode: string;
    ucrNumber: string;
    financierPin?: string;
    importerPin: string;
    productName: string;
    agentId?: number;
    agnactcode?: number;
    agencyName?: string;
    consignmentNumber: string;
    importerType: string;
    originCountryId: number;
    originCountryName: string;
    originPortId: number;
    originPortName: string;
    originPortNames?: string;
    destCountryId: number;
    destCountryName: string;
    destPortId: number;
    destPortName: string;
    destPortNames?: string;
    shippingModeId: number;
    shippingModeName: string;
    rotationNumber?: string;
    voyageNumber?: string;
    vesselName?: string;
    vesselNumber?: string;
    dateArrival: Date;
    dischageDate: Date;
    sumassured: number;
    premium: number;
    netpremium: number;
    traininglevy: number;
    stampduty: number;
    phf: number;
    premrate: number;
    approvedBy?: string;
    approvedPin?: string;
    approvedStatus: string;
    createdDate: Date;
    approvedDate?: Date;
    clientId: number;
    clienttransid: number;
    batchNo: number;
    firstname: string;
    middlename?: string;
    lastname: string;
    kentradeStatus?: string;
    kentradeEndorseStatus?: string;
    kentradeCancStatus?: string;
    kentradeFailReason?: string;
    description?: string;
    cargoData?: ApplicationCargoData;
    paid: string;
    totalPaid: number;
    countyName?: string;
    countyId?: number;
    transshippingAt?: string;
    transshippingId?: number;
    loadingAtId?: number;
    dischargeId?: number;
    sectCode?: number;
    cargoDescription?: string;
    idfNumber: string;
    error?: string;
    shippingItemsData?: ApplicationShippingItemsData[];
}

@Component({
    selector: 'app-view-marine-details',
    standalone: true,
    templateUrl: './view-marine-quote.component.html',
    imports: [
        MatIcon,
        DatePipe,
        NgClass,
        DecimalPipe,
        MatProgressBar,
        MatProgressSpinner,
        NgIf,
    ],
})
export class ViewMarineQuote implements OnInit {
    // Application Data
    applicationData: ApplicationShippingData | null = null;
    isLoading = false;
    error: string | null = null;
    certificateInlineError: string | null = null;
    private validationToastRef: MatSnackBarRef<SimpleSnackBar> | null = null;
    private pollingSubscription!: Subscription;

    // Individual properties for easy template binding
    id: number;
    refno: string;
    certNo: string;
    certErrorLog: string;
    erprefno: string;
    caAccountCode: string;
    ucrNumber: string;
    financierPin?: string;
    importerPin: string;
    productName: string;
    agentId?: number;
    agnactcode?: number;
    agencyName?: string;
    consignmentNumber: string;
    importerType: string;
    originCountryId: number;
    originCountryName: string;
    originPortId: number;
    originPortName: string;
    originPortNames?: string;
    destCountryId: number;
    destCountryName: string;
    destPortId: number;
    destPortName: string;
    destPortNames?: string;
    shippingModeId: number;
    shippingModeName: string;
    rotationNumber?: string;
    voyageNumber?: string;
    vesselName?: string;
    vesselNumber?: string;
    dateArrival: Date;
    dischageDate: Date;
    sumassured: number;
    premium: number;
    netpremium: number;
    traininglevy: number;
    stampduty: number;
    phf: number;
    premrate: number;
    approvedBy?: string;
    approvedPin?: string;
    approvedStatus: string;
    createdDate: Date;
    approvedDate?: Date;
    clientId: number;
    clienttransid: number;
    progress = -1;
    batchNo: number;
    firstname: string;
    email: string;
    mobile: string;
    pin: string;
    middlename?: string;
    lastname: string;
    kentradeStatus?: string;
    kentradeEndorseStatus?: string;
    kentradeCancStatus?: string;
    kentradeFailReason?: string;
    description?: string;
    cargoData?: ApplicationCargoData;
    paid: string;
    totalPaid: number;
    countyName?: string;
    countyId?: number;
    transshippingAt?: string;
    isProcessing: boolean;
    transshippingId?: number;
    loadingAtId?: number;
    dischargeId?: number;
    sectCode?: number;
    cargoDescription?: string;
    idfNumber: string;
    shippingItemsData?: ApplicationShippingItemsData[];
    quoteId!: string;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private snackBar: MatSnackBar,
        private dialog: MatDialog,
        private quoteService: QuoteService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        const maxPollingTime = 2 * 60 * 1000;
        this.quoteId = this.route.snapshot.paramMap.get('quoteId')!;
        const stopPolling$ = timer(maxPollingTime);
        this.pollingSubscription = interval(500)
            .pipe(
                switchMap(() => this.quoteService.retrieveOneTransaction(Number(this.quoteId))),
                takeUntil(stopPolling$) // stops polling after maxPollingTime
            )
            .subscribe(data => {
                this.setTransactionData(data);
                if (data.erprefno) {
                    console.log('erprefno has arrived:', data.erprefno);
                    this.pollingSubscription.unsubscribe(); // stop polling immediately
                }
            });

        // Alternative: Load data passed via navigation state
        const navigation = this.router.getCurrentNavigation();
        if (navigation?.extras?.state?.['applicationData']) {
            this.setApplicationData(navigation.extras.state['applicationData']);
        }
    }


    setTransactionData(data: any) {
        this.refno = data.refno;
        this.paid = data.paid;
        this.id = data.id;
        this.certNo =data.certNo;
        if(data.certErrorLog){
            this.certErrorLog ='We encountered an issue while trying to generate your certificate. Please click on Generate Cert to retry';
        }
        this.originCountryName = data.originCountryName;
        this.originPortName = data.originPortName;
        this.destCountryName = data.destCountryName;
        this.destPortName = data.destPortName;
        this.shippingModeName = data.shippingModeName;
        this.dateArrival = data.dateArrival;
        this.dischageDate = data.dischageDate;
        this.countyName = data.countyName;
        this.transshippingAt = data.transshippingAt;
        this.idfNumber = data.idfNumber;
        this.vesselName = data.vesselName;
        this.vesselNumber = data.vesselNumber;
        this.rotationNumber = data.rotationNumber;
        this.voyageNumber = data.voyageNumber;
        this.ucrNumber = data.ucrNumber;
        this.productName = 'Marine';
        this.erprefno = data.erprefno;
        this.sumassured = data.sumassured;
        this.premium = data.premium;
        this.traininglevy = data.traininglevy;
        this.premrate  = data.premrate;
        this.phf = data.phf;
        this.stampduty = data.stampduty;
        this.totalPaid = data.totalPaid;
        this.netpremium = data.netpremium;
        this.agencyName = data.agencyName;
        this.approvedStatus = data.approvedStatus;
        this.batchNo = data.batchNo;
        this.email = data.email;
        this.mobile = data.mobile;
        this.pin = data.pin;
        this.firstname = data.firstname;
        this.middlename = data.middlename;
        this.lastname = data.lastname;
    }

    /**
     * Set application data and map to component properties
     */
    setApplicationData(data: ApplicationShippingData): void {
        this.applicationData = data;

        // Map all properties
        this.id = data.id;
        this.refno = data.refno;
        this.erprefno = data.erprefno;
        this.caAccountCode = data.caAccountCode;
        this.ucrNumber = data.ucrNumber;
        this.financierPin = data.financierPin;
        this.importerPin = data.importerPin;
        this.productName = data.productName;
        this.agentId = data.agentId;
        this.agnactcode = data.agnactcode;
        this.agencyName = data.agencyName;
        this.consignmentNumber = data.consignmentNumber;
        this.importerType = data.importerType;
        this.originCountryId = data.originCountryId;
        this.originCountryName = data.originCountryName;
        this.originPortId = data.originPortId;
        this.originPortName = data.originPortName;
        this.originPortNames = data.originPortNames;
        this.destCountryId = data.destCountryId;
        this.destCountryName = data.destCountryName;
        this.destPortId = data.destPortId;
        this.destPortName = data.destPortName;
        this.destPortNames = data.destPortNames;
        this.shippingModeId = data.shippingModeId;
        this.shippingModeName = data.shippingModeName;
        this.rotationNumber = data.rotationNumber;
        this.voyageNumber = data.voyageNumber;
        this.vesselName = data.vesselName;
        this.vesselNumber = data.vesselNumber;
        this.dateArrival = data.dateArrival;
        this.dischageDate = data.dischageDate;
        this.sumassured = data.sumassured;
        this.premium = data.premium;
        this.netpremium = data.netpremium;
        this.traininglevy = data.traininglevy;
        this.stampduty = data.stampduty;
        this.phf = data.phf;
        this.premrate = data.premrate;
        this.approvedBy = data.approvedBy;
        this.approvedPin = data.approvedPin;
        this.approvedStatus = data.approvedStatus;
        this.createdDate = data.createdDate;
        this.approvedDate = data.approvedDate;
        this.clientId = data.clientId;
        this.clienttransid = data.clienttransid;
        this.batchNo = data.batchNo;
        this.firstname = data.firstname;
        this.middlename = data.middlename;
        this.lastname = data.lastname;
        this.kentradeStatus = data.kentradeStatus;
        this.kentradeEndorseStatus = data.kentradeEndorseStatus;
        this.kentradeCancStatus = data.kentradeCancStatus;
        this.kentradeFailReason = data.kentradeFailReason;
        this.description = data.description;
        this.cargoData = data.cargoData;
        this.paid = data.paid;
        this.totalPaid = data.totalPaid;
        this.countyName = data.countyName;
        this.countyId = data.countyId;
        this.transshippingAt = data.transshippingAt;
        this.transshippingId = data.transshippingId;
        this.loadingAtId = data.loadingAtId;
        this.dischargeId = data.dischargeId;
        this.sectCode = data.sectCode;
        this.cargoDescription = data.cargoDescription;
        this.idfNumber = data.idfNumber;
        this.shippingItemsData = data.shippingItemsData;
    }

    generateCert() {
        this.isProcessing = true;

        this.quoteService.generateCertificate(this.id).subscribe({
            next: (res) => {
                console.log('Certificate Response:', res);

                this.validationToastRef = this.showToast(
                    ' Certificate Generated successfully. Cert No '+res.certNo
                );
                this.quoteService.retrieveOneTransaction(Number(this.quoteId)).subscribe({
                    next: (data) => {
                        this.setTransactionData(data);
                        // Update certNo if available
                        if (data.erprefno) {
                            this.certNo = data.erprefno;
                        }
                    },
                    error: (err) => {
                        console.error('Error retrieving transaction data:', err);
                    }
                });
                this.isProcessing = false;
            },
            error: (err) => {
                console.error('Error generating certificate:', err);
                this.certificateInlineError =
                    'We encountered an issue while trying to generate your certificate. Please click on "Generate Cert" to retry.';

                // Auto-hide inline message after 4 seconds
                setTimeout(() => {
                    this.certificateInlineError = null;
                    this.cdr.markForCheck();
                }, 4000);

                this.isProcessing = false;
            }
        });
    }

    private showToast(message: string, duration: number = 4000): MatSnackBarRef<SimpleSnackBar> {
        const snackRef = this.snackBar.open(message, undefined, {
            horizontalPosition: 'right',
            verticalPosition: 'top',
            duration,
            panelClass: ['marine-quote-snackbar']
        });

        return snackRef;
    }



    printCertificate(){
        if(this.error){
            this.showError('An Error Occured while trying to retrieve certificate '+this.error);
            return;
        }


        this.quoteService.downloadDigitalCert(this.id).subscribe({
            next: (event) => {
                switch (event.type) {
                    case HttpEventType.DownloadProgress:
                        if (event.total) {
                            this.progress = Math.round((100 * event.loaded) / event.total);
                        }
                        break;

                    case HttpEventType.Response:
                        const blob = event.body!;
                        const filename = this.getFileNameFromHeaders(event.headers) || 'digital_cert.pdf';

                        const link = document.createElement('a');
                        link.href = window.URL.createObjectURL(blob);
                        link.download = filename;
                        link.click();
                        window.URL.revokeObjectURL(link.href);
                        this.progress = -1; // reset progress
                        break;
                }
            },
            error: (err) => {
                this.certificateInlineError = 'The certificate is currently being processed. Please try again shortly.';
                this.progress = -1;

                // Auto-hide inline message after 4 seconds
                setTimeout(() => {
                    this.certificateInlineError = null;
                }, 4000);
            }
        });

    }

    private getFileNameFromHeaders(headers: any): string | null {
        const contentDisposition = headers.get('Content-Disposition');
        if (!contentDisposition) return null;

        const matches = /filename="(.+)"/.exec(contentDisposition);
        return matches && matches.length > 1 ? matches[1] : null;
    }

    /**
     * Download application as PDF
     */
    downloadApplication(): void {
        // TODO: Implement PDF download
        this.showInfo('Downloading application...');

        // Example implementation:
        // this.marineService.downloadApplicationPDF(this.id).subscribe({
        //     next: (blob) => {
        //         const url = window.URL.createObjectURL(blob);
        //         const link = document.createElement('a');
        //         link.href = url;
        //         link.download = `Marine_Application_${this.refno}.pdf`;
        //         link.click();
        //         window.URL.revokeObjectURL(url);
        //     },
        //     error: (error) => {
        //         this.showError('Failed to download application');
        //     }
        // });
    }

    /**
     * Print application
     */
    printApplication(): void {
        window.print();
    }

    /**
     * Edit application
     */
    editApplication(): void {
        if (this.approvedStatus === 'APPROVED') {
            this.showWarning('Cannot edit an approved application');
            return;
        }

        // Navigate to edit page
        this.router.navigate(['/marine/edit', this.id]);
    }

    /**
     * Cancel application
     */
    cancelApplication(): void {
        if (this.paid === 'YES') {
            this.showWarning('Cannot cancel a paid application. Please contact support.');
            return;
        }

        // TODO: Show confirmation dialog and cancel application
        this.showInfo('Cancel functionality to be implemented');

        // Example implementation:
        // const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        //     data: {
        //         title: 'Cancel Application',
        //         message: 'Are you sure you want to cancel this application?'
        //     }
        // });
        //
        // dialogRef.afterClosed().subscribe(result => {
        //     if (result) {
        //         this.marineService.cancelApplication(this.id).subscribe({
        //             next: () => {
        //                 this.showSuccess('Application cancelled successfully');
        //                 this.router.navigate(['/marine/applications']);
        //             },
        //             error: (error) => {
        //                 this.showError('Failed to cancel application');
        //             }
        //         });
        //     }
        // });
    }

    /**
     * Send notification
     */
    sendNotification(): void {
        // TODO: Implement send notification
        this.showInfo('Sending notification...');

        // Example implementation:
        // this.marineService.sendNotification(this.id).subscribe({
        //     next: () => {
        //         this.showSuccess('Notification sent successfully');
        //     },
        //     error: (error) => {
        //         this.showError('Failed to send notification');
        //     }
        // });
    }

    /**
     * Make payment
     */
    makePayment(): void {
        // Navigate to payment page
        this.router.navigate(['/marine/payment', this.id]);
    }

    /**
     * Get full name
     */
    getFullName(): string {
        return [this.firstname, this.middlename, this.lastname]
            .filter(name => name)
            .join(' ');
    }

    /**
     * Check if application is editable
     */
    isEditable(): boolean {
        return this.approvedStatus !== 'APPROVED' && this.paid !== 'YES';
    }

    /**
     * Check if application is cancellable
     */
    isCancellable(): boolean {
        return this.paid !== 'YES';
    }

    // Utility methods for snackbar notifications
    showSuccess(message: string): void {
        this.snackBar.open(message, 'Close', {
            duration: 5000,
            panelClass: ['success-snackbar'],
            horizontalPosition: 'end',
            verticalPosition: 'top'
        });
    }

    showError(message: string): void {
        this.snackBar.open(message, 'Close', {
            duration: 7000,
            panelClass: ['error-snackbar'],
            horizontalPosition: 'end',
            verticalPosition: 'top'
        });
    }

    showWarning(message: string): void {
        this.snackBar.open(message, 'Close', {
            duration: 6000,
            panelClass: ['warning-snackbar'],
            horizontalPosition: 'end',
            verticalPosition: 'top'
        });
    }

    showInfo(message: string): void {
        this.snackBar.open(message, 'Close', {
            duration: 4000,
            panelClass: ['info-snackbar'],
            horizontalPosition: 'end',
            verticalPosition: 'top'
        });
    }
}
