import { Component, OnInit, ViewEncapsulation, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MatDivider } from '@angular/material/divider';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { PolicyRecord, QuotesAnalysis, YTDAnalysis } from '../../../core/user/user.types';
import { UserService } from '../../../core/user/user.service';
import { finalize, forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { QuoteService } from '../../../core/services/quote.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { QuoteProductDialogsComponent } from '../quote-product-dialog/quote-product-dialog.component';
import { MatDialog } from '@angular/material/dialog';

// Chart options interface
interface ApexChartOptions {
    chart: any;
    colors: string[];
    fill: any;
    series: any[];
    stroke: any;
    tooltip: any;
    xaxis: any;
}


// Dashboard data interface
interface DashboardData {
    activePolicies: {
        total: number;
        annualPremium: number;
        coverageValue: number;
        renewalCount: number;
    };
    claimsOverview: {
        total: number;
        pending: number;
        approved: number;
        totalPayout: number;
    };
    policyPerformance: {
        premiumGrowth: number;
        claimFrequency: number;
    };
    recentPolicies: {
        active: number;
        expiring: number;
    };
    portfolio: {
        totalProducts: number;
        totalCoverage: number;
        property: number;
        health: number;
        auto: number;
        other: number;
    };
}

@Component({
    selector: 'app-insurance-dashboard',
    templateUrl: './dashboard.component.html',
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatProgressBarModule,
        MatTableModule,
        NgApexchartsModule,
        MatDivider,
        MatPaginator,
        MatProgressSpinner,
    ],
})
export class InsuranceDashboardComponent implements OnInit,AfterViewInit {
    @ViewChild(MatPaginator) policyPaginator!: MatPaginator;
    @ViewChild('myPoliciesTable', { read: MatSort }) myPoliciesSort!: MatSort;

    // Dashboard data
    data: DashboardData = {
        activePolicies: {
            total: 24,
            annualPremium: 18500,
            coverageValue: 2500000,
            renewalCount: 3
        },
        claimsOverview: {
            total: 156,
            pending: 8,
            approved: 132,
            totalPayout: 450000
        },
        policyPerformance: {
            premiumGrowth: 12.5,
            claimFrequency: 4.2
        },
        recentPolicies: {
            active: 18,
            expiring: 2
        },
        portfolio: {
            totalProducts: 6,
            totalCoverage: 2500000,
            property: 1125000, // 45%
            health: 750000,    // 30%
            auto: 625000,      // 25%
            other: 0
        }
    };

    // Recent policies table
    myPolicyDataSource = new MatTableDataSource<PolicyRecord>();
    myPolicyTableColumns: string[] = ['erprefno','clientName','productName','netpremium','coverFrom','coverTo','actions'];

    pageSizeOptions = [10, 20,50];
    currentPage = 0;

    isLoading = false;
    isInitialLoad = true;

    progress = -1;

    policiesTotalRecords = 0;
    policiesPage = 0;
    policiesPageSize = 10;

    ytd!: YTDAnalysis;
    quot!: QuotesAnalysis;

    // Policy Performance Chart Options
    policyPerformanceOptions: ApexChartOptions;

    constructor(private userService: UserService,
                private cdr: ChangeDetectorRef,
                private quoteService: QuoteService,
                private snackBar: MatSnackBar,
                private dialog: MatDialog,
                private router: Router,) {
        // Initialize the data source for recent policies

        // Initialize chart options
        this.policyPerformanceOptions = {
            chart: {
                type: 'line',
                height: '100%',
                parentHeightOffset: 0,
                fontFamily: 'inherit',
                toolbar: { show: false },
                animations: { enabled: false },
                zoom: { enabled: false }
            },
            colors: ['#3B82F6'],
            fill: { opacity: 0.5, type: 'solid' },

            series: [], // will be filled dynamically

            stroke: {
                width: 2,
                curve: 'smooth'
            },

            tooltip: {
                theme: 'dark',
                shared: true,
                intersect: false,
                y: {
                    formatter: (value: number) => `${value}%`
                }
            },

            xaxis: {
                categories: [],
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: { style: { colors: '#6B7280' } }
            }
        };

    }



    ngOnInit(): void {
        this.loadPolicyData();
    }

    ngAfterViewInit(): void {

        if(this.myPolicyDataSource){
            this.myPolicyDataSource.paginator = this.policyPaginator;
            this.myPolicyDataSource.sort = this.myPoliciesSort;
        }
    }


    loadPolicyData(): void {
        this.isLoading = true;
        this.cdr.detectChanges();

        const policiesOffset = this.policiesPage * this.policiesPageSize;

        forkJoin({
            policies: this.userService.getClientPolicies(policiesOffset, this.policiesPageSize),
            ytd: this.quoteService.getAgencyCoverage(),
            quot: this.quoteService.getQuotAnalysis(),
            growthData: this.quoteService.getGrowthAnalysis(3)
        })
            .pipe(
                finalize(() => {
                    this.isLoading = false;
                    this.isInitialLoad = false;
                    this.cdr.detectChanges();
                })
            )
            .subscribe({
                next: ({ policies, ytd,quot,growthData }) => {
                    const policiesData = policies.pageItems.map((p: any) => ({
                        ...p,
                        coverFrom: this.toDate(p.dischageDate),
                        clientName: `${p.firstname} ${p.lastname}`,
                        coverTo: this.toDate(p.dateArrival),
                    }));

                    this.myPolicyDataSource.data = policiesData;
                    this.policiesTotalRecords = policies.totalFilteredRecords;
                    this.ytd = ytd;
                    this.quot = quot;

                    const labels = growthData.map(d => d.month);   // e.g. ["Jan 2025", "Feb 2025"]
                    const values = growthData.map(d => d.growthPercentage);

                    this.policyPerformanceOptions = {
                        ...this.policyPerformanceOptions,

                        xaxis: {
                            categories: labels
                        },

                        series: [
                            {
                                name: 'Premium Growth',
                                type: 'line',
                                data: values
                            }
                        ]
                    };
                },
                error: (err) => {
                    console.error('Dashboard Load Error:', err);
                }
            });
    }


    loadGrowthChart(months: number) {
        this.quoteService.getGrowthAnalysis(months).subscribe(data => {

            const labels = data.map(d => d.month);   // e.g. ["Jan 2025", "Feb 2025"]
            const values = data.map(d => d.growthPercentage);
            console.log(labels);
            console.log(values);

            this.policyPerformanceOptions = {
                ...this.policyPerformanceOptions,

                xaxis: {
                    categories: labels
                },

                series: [
                    {
                        name: 'Premium Growth',
                        type: 'line',
                        data: values
                    }
                ]
            };
        });
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



    private toDate(dateArray?: number[]): Date | null {
        if (!dateArray || dateArray.length < 3) return null;
        const [year, month, day] = dateArray;
        return new Date(year, month - 1, day); // month is 0-based in JS
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

    viewPolicy(policy: PolicyRecord): void {
        this.router.navigate(['/viewmarinequote', policy.id]);
    }

    gotoPolicies(): void {
        this.router.navigate(['/clientpolicies']);
    }

    gotoQuotes(): void {
        this.router.navigate(['/clientquotes']);
    }

    downloadPolicy(policy: PolicyRecord): void {
        if(policy.error){
            this.showError('An Error Occured while trying to retrieve certificate '+policy.error);
            return;
        }


        this.quoteService.downloadDigitalCert(policy.id).subscribe({
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
                this.showError('Unable to get Certificate to Download the certificate');
                this.progress = -1;
            }
        });
    }


    private getFileNameFromHeaders(headers: any): string | null {
        const contentDisposition = headers.get('Content-Disposition');
        if (!contentDisposition) return null;

        const matches = /filename="(.+)"/.exec(contentDisposition);
        return matches && matches.length > 1 ? matches[1] : null;
    }

    showError(message: string): void {
        this.snackBar.open(message, 'Close', {
            duration: 7000,
            panelClass: ['error-snackbar'],
            horizontalPosition: 'end',
            verticalPosition: 'top'
        });
    }

    onPoliciesPageChange(event: PageEvent): void {
        this.policiesPage = event.pageIndex;
        this.policiesPageSize = event.pageSize;
        this.loadPolicyData();
    }

    /**
     * Track by function for ngFor loops
     *
     * @param index
     * @param item
     */
    trackByFn(index: number, item: any): any {
        return item.id || index;
    }



    /**
     * Get status color class
     *
     * @param status
     */
    getStatusColor(status: string): string {
        switch (status) {
            case 'active':
                return 'bg-green-200 text-green-800 dark:bg-green-600 dark:text-green-50';
            case 'pending':
                return 'bg-yellow-200 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-50';
            case 'expired':
                return 'bg-red-200 text-red-800 dark:bg-red-600 dark:text-red-50';
            case 'renewal':
                return 'bg-blue-200 text-blue-800 dark:bg-blue-600 dark:text-blue-50';
            default:
                return 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-50';
        }
    }

    /**
     * Calculate percentage for progress bars
     *
     * @param value
     * @param total
     */
    calculatePercentage(value: number, total: number): number {
        return total > 0 ? (value / total) * 100 : 0;
    }

    /**
     * Format currency with proper symbols
     *
     * @param value
     * @param currency
     */
    formatCurrency(value: number, currency: string = 'USD'): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    }

    /**
     * Format large numbers with K/M suffixes
     *
     * @param value
     */
    formatNumber(value: number): string {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'K';
        }
        return value.toString();
    }

    /**
     * Handle new policy creation
     */
    createNewPolicy(): void {
        // Implement new policy creation logic
        console.log('Creating new policy...');
        // This would typically open a dialog or navigate to policy creation page
    }

    /**
     * Handle view all policies
     */
    viewAllPolicies(): void {
        // Implement navigation to policies list
        console.log('Navigating to all policies...');
    }

    /**
     * Handle view all claims
     */
    viewAllClaims(): void {
        // Implement navigation to claims list
        console.log('Navigating to all claims...');
    }

    /**
     * Generate reports
     */
    generateReports(): void {
        // Implement report generation logic
        console.log('Generating reports...');
    }

    /**
     * Refresh dashboard data
     */
    refreshData(): void {
        // Implement data refresh logic
        console.log('Refreshing dashboard data...');
        // This would typically call your API service to fetch updated data
    }

    /**
     * Export dashboard data
     */
    exportData(): void {
        // Implement export logic
        console.log('Exporting dashboard data...');
    }

    /**
     * Get portfolio distribution
     */
    getPortfolioDistribution(): { type: string; value: number; percentage: number; color: string }[] {
        const total = this.data.portfolio.totalCoverage;
        return [
            {
                type: 'Property',
                value: this.data.portfolio.property,
                percentage: this.calculatePercentage(this.data.portfolio.property, total),
                color: 'bg-blue-500'
            },
            {
                type: 'Health',
                value: this.data.portfolio.health,
                percentage: this.calculatePercentage(this.data.portfolio.health, total),
                color: 'bg-green-500'
            },
            {
                type: 'Auto',
                value: this.data.portfolio.auto,
                percentage: this.calculatePercentage(this.data.portfolio.auto, total),
                color: 'bg-purple-500'
            }
        ];
    }
}
