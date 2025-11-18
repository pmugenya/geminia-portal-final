import { AfterViewInit, ChangeDetectorRef, Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FuseAlertComponent, FuseAlertService } from '../../../../@fuse/components/alert';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSort } from '@angular/material/sort';
import { PendingQuote, StoredUser } from '../../../core/user/user.types';
import { QuoteService } from '../../../core/services/quote.service';
import { finalize, forkJoin, of } from 'rxjs';
import { UserService } from '../../../core/user/user.service';
import { QuoteProductDialogsComponent } from '../quote-product-dialog/quote-product-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';



@Component({
    selector: 'app-client-quot-listing',
    templateUrl: './quote-listing.component.html',
    styleUrls: ['./quote-listing.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        FuseAlertComponent,
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatProgressBarModule,
        MatTableModule,
        MatCardModule,
        MatDividerModule,
        MatPaginator,
        MatProgressSpinner,
    ],
})
export class ClientQuotListingComponent implements OnInit,AfterViewInit{
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild('myQuotesTable', { read: MatSort }) sort!: MatSort;

    myQuotesDataSource = new MatTableDataSource<PendingQuote>();
    myQuotesTableColumns: string[] = ['refno','clientName', 'prodName','status','netprem','sumassured','expiryDates','actions'];

    totalRecords = 0;
    quotesPage = 0;
    quotesPageSize = 10;
    isLoading: boolean = false;
    pageSizeOptions = [10, 20,50];
    currentPage = 0;
    isInitialLoad = true;
    user:StoredUser = null;


    constructor(private userService: UserService,
                private cdr: ChangeDetectorRef,
                private fuseAlertService: FuseAlertService,
                private dialog: MatDialog,
                private router: Router,) {
    }




    ngOnInit(): void {
        this.fuseAlertService.dismiss('quoteDownloadError');
        this.user = this.userService.getCurrentUser();
        if (this.user.userType === 'A') {
            this.myQuotesTableColumns = ['refno', 'clientName', 'prodName','status','netprem','sumassured','expiryDates','actions'];
        } else {
            this.myQuotesTableColumns = ['refno', 'prodName','status','netprem','sumassured','expiryDates','actions'];
        }
        this.loadQuotesData();
    }

    ngAfterViewInit(): void {
        if( this.myQuotesDataSource) {
            this.myQuotesDataSource.paginator = this.paginator;
            this.myQuotesDataSource.sort = this.sort;
        }
    }


    loadQuotesData(): void {
        this.isLoading = true;
        this.cdr.detectChanges();
        const quotesOffset = this.quotesPage * this.quotesPageSize;
        const quotes$ =
            this.user.userType === 'C'
                ? this.userService.getClientQuotes(quotesOffset, this.quotesPageSize)
                : this.user.userType === 'A'
                    ? this.userService.getAgentQuotes(quotesOffset, this.quotesPageSize)
                    : of({ pageItems: [], totalFilteredRecords: 0 });
        forkJoin({
            quotes: quotes$,
        })
            .pipe(
                finalize(() => {
                    this.isLoading = false;
                    this.isInitialLoad = false;
                    this.cdr.detectChanges();
                })
            ).subscribe({
            next: ({ quotes }) => {
                console.log(quotes);
                this.myQuotesDataSource.data = quotes.pageItems.map((q: any) => ({
                    ...q,
                    clientName: `${q.firstName} ${q.lastName}`,
                    expiryDates: this.toDate(q.expiryDate),
                    prodName: q.prodName === 'MARINE CARGO INSURANCE' ? 'Marine' : q.prodName
                }));

                this.totalRecords = quotes.totalFilteredRecords;
            },
            error: (err) => {
                console.error('Error loading dashboard data', err);
            },
        });
    }

    private toDate(dateArray?: number[]): Date | null {
        if (!dateArray || dateArray.length < 3) return null;
        const [year, month, day] = dateArray;
        return new Date(year, month - 1, day); // month is 0-based in JS
    }

    openProductQuoteDialog(): void {
        const dialogRef = this.dialog.open(QuoteProductDialogsComponent, {
            width: '100%',
            maxWidth: '480px',
            panelClass: ['fuse-dialog'],
            autoFocus: false
        });

        dialogRef.afterClosed().subscribe((selectedProduct) => {
            if (selectedProduct) {
                if(selectedProduct==='Marine'){
                    this.router.navigate(['/marinequote']);
                }
                else{

                }
            }
        });
    }

    getPolicyStatusColor(status: string): string {
        switch (status) {
            case 'PAID':
                return 'bg-green-100 text-green-800 dark:bg-green-600 dark:text-green-50';
            case 'DRAFT':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-50';
            case 'FINAL':
                return 'bg-red-100 text-red-800 dark:bg-red-600 dark:text-red-50';
            case 'PROCESSING':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-600 dark:text-blue-50';
            default:
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-50';
        }
    }

    isExpiringSoon(renewalDate: string): boolean {
        return this.getDaysUntilRenewal(renewalDate) <= 30;
    }

    getDaysUntilRenewal(renewalDate: string): number {
        const today = new Date();
        const renewal = new Date(renewalDate);
        const diffTime = renewal.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    trackByFn(index: number, item: any): any {
        return item.id || index;
    }

    onPageChange(event: PageEvent): void {
        this.quotesPage = event.pageIndex;
        this.quotesPageSize = event.pageSize;
        this.loadQuotesData();
    }

    viewQuote(policy: PendingQuote): void {
        this.router.navigate(['/viewquote', policy.quoteId]);
    }

    downloadQuote(quote: PendingQuote): void {
        if (!quote.quoteId) {
            this.fuseAlertService.show('quoteDownloadError');
            return;
        }
        this.userService.downloadQuote(''+quote.quoteId).subscribe({
            next: (base64String) => {
                try {
                    console.log('Base64 response:', base64String);

                    const base64 = base64String.split(',')[1] || base64String;
                    const byteCharacters = atob(base64);
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
                    this.fuseAlertService.show('quoteDownloadError');
                    setTimeout(() => this.fuseAlertService.dismiss('quoteDownloadError'), 4000);
                }
            },
            error: (err) => {
                console.error('Download request failed:', err);
                this.fuseAlertService.show('quoteDownloadError');
                setTimeout(() => this.fuseAlertService.dismiss('quoteDownloadError'), 4000);
            }
        });
    }
}
