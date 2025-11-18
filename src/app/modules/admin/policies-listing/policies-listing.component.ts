import { AfterViewInit, ChangeDetectorRef, Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FuseAlertComponent, FuseAlertService } from '../../../../@fuse/components/alert';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { PolicyRecord, StoredUser } from '../../../core/user/user.types';
import { UserService } from '../../../core/user/user.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { finalize, forkJoin } from 'rxjs';
import { MatSort } from '@angular/material/sort';


@Component({
    selector: 'app-client-policies-listing',
    templateUrl: './policies-listing.component.html',
    styleUrls: ['./policies-listing.component.scss'],
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
export class ClientPoliciesListingComponent implements OnInit,AfterViewInit{

    @ViewChild(MatPaginator) policyPaginator!: MatPaginator;
    @ViewChild('myPoliciesTable', { read: MatSort }) myPoliciesSort!: MatSort;


    myPolicyDataSource = new MatTableDataSource<PolicyRecord>();
    myPolicyTableColumns: string[] = ['erprefno','productName','netpremium','coverFrom','coverTo','actions'];

    pageSizeOptions = [10, 20,50];
    currentPage = 0;

    isLoading = false;
    isInitialLoad = true;

    policiesTotalRecords = 0;
    policiesPage = 0;
    policiesPageSize = 10;
    user:StoredUser = null;

    constructor(private userService: UserService,
                private cdr: ChangeDetectorRef,
                private router: Router,
                private fuseAlertService: FuseAlertService,) {
    }

    ngOnInit(): void {
        this.loadPolicyData();
        this.user = this.userService.getCurrentUser();
        if (this.user.userType === 'A') {
            this.myPolicyTableColumns = ['erprefno','clientName','productName','netpremium','coverFrom','coverTo','actions'];
        }
        else{
            this.myPolicyTableColumns = ['erprefno','productName','netpremium','coverFrom','coverTo','actions'];
        }
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
            policies: this.userService.getClientPolicies(policiesOffset, this.policiesPageSize)
        })
            .pipe(
                finalize(() => {
                    this.isLoading = false;
                    this.isInitialLoad = false;
                    this.cdr.detectChanges();
                })
            ).subscribe({
            next: ({ policies }) => {

                console.log(policies);
                const policiesData = policies.pageItems.map((p: any) => ({
                    ...p,
                    coverFrom: this.toDate(p.dischageDate),
                    clientName: `${p.firstname} ${p.lastname}`,
                    coverTo: this.toDate(p.dateArrival),
                }));
                this.myPolicyDataSource.data =  policiesData;
                this.policiesTotalRecords = policies.totalFilteredRecords;

            },
            error: (err) => {
                console.error('Error loading dashboard data', err);
            },
        });
    }


    trackByFn(index: number, item: any): any {
        return item.id || index;
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

    onPoliciesPageChange(event: PageEvent): void {
        this.policiesPage = event.pageIndex;
        this.policiesPageSize = event.pageSize;
        this.loadPolicyData();
    }

}
