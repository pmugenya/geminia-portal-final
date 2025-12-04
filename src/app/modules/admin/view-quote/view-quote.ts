import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { QuoteService } from '../../../core/services/quote.service';
import { ActivatedRoute, Router } from '@angular/router';
import { QuotesData } from '../../../core/user/user.types';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { UserService } from '../../../core/user/user.service';
import { FuseAlertComponent, FuseAlertService } from '../../../../@fuse/components/alert';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ShareQuoteDialogComponent, ShareChannel } from '../../../shared/share-quote-dialog/share-quote-dialog.component';
import {
    catchError,
    finalize,
    interval,
    of,
    Subscription,
    switchMap,
    takeWhile,
    throwError,
    timeout,
} from 'rxjs';


@Component({
    selector: 'app-quote-details',
    standalone: true,
    templateUrl: './view-quote.html',
    styleUrls: ['./view-quote.css'],
    providers: [DatePipe],
    imports: [
        FuseAlertComponent,
        MatIcon,
        NgClass,
        DatePipe,
        CurrencyPipe,
        CommonModule,
        MatProgressSpinner,
    ],
})
export class ViewQuote implements OnInit,OnDestroy {

    paymentForm: FormGroup;
    quote?: QuotesData;
    quoteId!: string;
    isLoading = true;
    showPayment = false;
    paymentProcessing = false;
    private paymentPollingSub?: Subscription;
    isProcessingStk = false;
    paymentSuccess?: boolean;
    showShareModal = false; // legacy flag, no longer used by UI

    constructor(private datePipe: DatePipe,
                private quoteService: QuoteService,
                private userService: UserService,
                private route: ActivatedRoute,
                private _fuseAlertService: FuseAlertService,
                private router: Router,
                private _snackBar: MatSnackBar,
                private fb: FormBuilder,
                private dialog: MatDialog) {

        this.paymentForm = this.fb.group({
            mpesaNumber: ['', [Validators.required, Validators.pattern(/^07\d{8}$/)]]
        });
    }

    ngOnInit(): void {

        this.quoteId = this.route.snapshot.paramMap.get('quoteId')!;
        this.loadQuote(this.quoteId);
        this._fuseAlertService.dismiss('quoteDownloadError');

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
        this.paymentForm.patchValue({ mpesaNumber: value });
    }

    initiatePayment(): void {
        if (!this.paymentForm.valid || !this.quote) return;


        this.paymentProcessing = true;

        const mpesaNumber = this.paymentForm.get('mpesaNumber')?.value;

        if (!mpesaNumber || mpesaNumber.length !== 10) {
            this._snackBar.open('Please enter a valid M-PESA number', 'Close', {
                duration: 6000,
                panelClass: ['error-snackbar']
            });
            return;
        }
        this.quoteService.stkPush(mpesaNumber, 1, this.quote?.refno,"M").pipe(
            timeout(15000),
            catchError(err => {
                console.error('STK Push error', err);
                this.isProcessingStk = false;
                this.paymentProcessing = false;
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
                        return this.quoteService.validatePayment(merchantRequestId, checkOutRequestId);
                    }),
                    takeWhile(() => attempts <= maxAttempts, true),
                    catchError(err => {
                        console.error('Polling error', err);
                        return of({ resultCode: -1 }); // fail gracefully
                    }),
                    finalize(() => {
                        this.isProcessingStk = false;
                    })
                ).subscribe((statusRes) => {
                    console.log('Payment status', statusRes);

                    if (statusRes.resultCode === 0 && statusRes.mpesaCode) {
                        this.paymentSuccess = true;
                        this.paymentProcessing = false;
                        this._snackBar.open('Payment successful!', 'Close', { duration: 4000 });
                        this.paymentPollingSub?.unsubscribe();
                        this.router.navigate(['/viewmarinequote', this.quote.shippingId]);
                    }

                    else if (statusRes.resultCode !== 0) {
                        this.paymentSuccess = false;
                        this.paymentProcessing = false;
                        this._snackBar.open('Payment failed or cancelled.', 'Close', { duration: 4000 });
                        this.paymentPollingSub?.unsubscribe();
                    }

                    else if (attempts >= maxAttempts) {
                        this.paymentSuccess = false;
                        this.paymentProcessing = false;
                        this._snackBar.open('Payment unsuccessful. Request timed out.', 'Close', { duration: 4000 });
                        this.paymentPollingSub?.unsubscribe();
                    }
                });
            },
            error: (err) => {
                console.error('Error during STK request', err);
                this.isProcessingStk = false;
                this._snackBar.open('STK request failed. Please try again.', 'Close', { duration: 5000 });
            }
        });

    }

    ngOnDestroy(): void {

        this.paymentPollingSub?.unsubscribe();

    }




    loadQuote(quoteId: string) {
        this.isLoading = true;
        this.quoteService.getQuoteById(quoteId).subscribe({
            next: (data) => {
                this.quote = data;
                this.isLoading = false; // 🔹 Stop loading
            },
            error: (err) => {
                console.error('Error loading quote:', err);
                this.isLoading = false; // 🔹 Stop loading even on error
            }
        });
    }

    /** Helper for formatting date */
    formatDate(date: string): string {
        return this.datePipe.transform(date, 'mediumDate') || '';
    }

    /** Helper to style status badge */
    getStatusColor(status: string): string {
        switch (status?.toUpperCase()) {
            case 'PAID':
                return 'bg-green-100 text-green-700';
            case 'STATUS':
                return 'bg-red-100 text-red-700';
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-700';
            case 'DRAFT':
                return 'status-draft-pill';
            default:
                return 'bg-blue-100 text-blue-700';
        }
    }

    goToDashboard(): void {
        this.router.navigate(['/dashboard']);
    }

    openShareModal(): void {
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

    shareViaGmail(): void {
        const ref = this.quote?.refno || this.quoteId || '';
        const subject = encodeURIComponent(`Marine Quote Details - ${ref}`);

        const lines: string[] = [];
        if (this.quote) {
            lines.push('Please find below the marine quote details.');
            lines.push('');
            lines.push(`Reference: ${this.quote.refno}`);
            lines.push(`Customer: ${this.quote.firstName || ''} ${this.quote.lastName || ''}`.trim());
            lines.push(`Email: ${this.quote.email || ''}`);
            lines.push(`Phone: ${this.quote.phoneNo || ''}`);
            lines.push('');
            lines.push(`Sum Assured: KES ${this.quote.sumassured}`);
            lines.push(`Net Premium: KES ${this.quote.netprem}`);
            lines.push('');
            lines.push('You can also attach a screenshot or PDF of the quote details to this email before sending.');
        }

        const body = encodeURIComponent(lines.join('\n'));
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
        window.open(gmailUrl, '_blank');
    }

    private buildShareLines(): string[] {
        const lines: string[] = [];
        if (this.quote) {
            lines.push('Please find below the marine quote details.');
            lines.push('');
            lines.push(`Reference: ${this.quote.refno}`);
            lines.push(`Customer: ${this.quote.firstName || ''} ${this.quote.lastName || ''}`.trim());
            lines.push(`Email: ${this.quote.email || ''}`);
            lines.push(`Phone: ${this.quote.phoneNo || ''}`);
            lines.push('');
            lines.push(`Sum Assured: KES ${this.quote.sumassured}`);
            lines.push(`Net Premium: KES ${this.quote.netprem}`);
            lines.push('');
        }
        lines.push('You can also attach a screenshot or PDF of the quote details before sending.');
        return lines;
    }

    shareViaWhatsApp(): void {
        const lines = this.buildShareLines();
        const text = encodeURIComponent(lines.join('\n'));
        const url = `https://wa.me/?text=${text}`;
        window.open(url, '_blank');
    }

    shareViaOutlook(): void {
        const ref = this.quote?.refno || this.quoteId || '';
        const subject = encodeURIComponent(`Marine Quote Details - ${ref}`);
        const body = encodeURIComponent(this.buildShareLines().join('\n'));
        const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
        window.location.href = mailtoUrl;
    }

    payNow(): void {
        this.showPayment = true;
    }



    downloadQuote(): void {
        if (!this.quoteId) {
            this._fuseAlertService.show('quoteDownloadError');
            return;
        }
        this.userService.downloadQuote(this.quoteId).subscribe({
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
        this.router.navigate(['/editquote', this.quoteId]);
    }

}
