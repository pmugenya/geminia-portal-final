import { Component, OnInit } from '@angular/core';
import { QuoteService } from '../../../core/services/quote.service';
import { TravelService } from '../../../core/services/travel.service';
import { ActivatedRoute } from '@angular/router';
import { TravelPolicyData } from '../../../core/user/user.types';
import { DatePipe, DecimalPipe, NgClass, NgForOf, NgIf } from '@angular/common';

@Component({
    selector: 'app-travel-policy-details',
    templateUrl: './view-travel-quote.component.html',
    standalone: true,
    styleUrls: ['./view-travel-quote.component.scss'],
    imports: [
        DecimalPipe,
        NgClass,
        DatePipe,
        NgForOf,
        NgIf,
    ],
    providers: [DatePipe]
})
export class ViewTravelQuoteComponent implements OnInit {


    policyId!: string;
    policy: TravelPolicyData;
    loading: boolean;
    activeTab = 'details';

    constructor( private travelService: TravelService,
                 private route: ActivatedRoute,
                 private datePipe: DatePipe) {
    }

    ngOnInit(): void {
        this.policyId = this.route.snapshot.paramMap.get('policyId')!;
        this.loadPolicy();
    }

    loadPolicy() {
        this.loading = true;
        this.travelService.getPolicy(this.policyId).subscribe({
            next: (data) => {
                this.policy = data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading policy', err);
                this.loading = false;
            }
        });
    }

    get policyFields() {
        if (!this.policy) return [];

        return [
            { label: 'Policy No', value: this.policy.policyNo },
            { label: 'Origin Country', value: this.policy.originCountry },
            { label: 'Destination Country', value: this.policy.destinationCountry },
            { label: 'Period', value: `${this.formatDate(this.policy.coverFrom)} → ${this.formatDate(this.policy.coverTo)}` },
            { label: 'Plan Name', value: this.policy.planName },
            { label: 'Duration', value: `${this.policy.duration} days` },
            { label: 'Net Premium', value: `KES ${this.policy.netPrem?.toLocaleString()}` },
            { label: 'Total Paid Premium', value: `KES ${this.policy.paidPrem?.toLocaleString()}` },
            { label: 'Discount', value: this.policy.discount },
            { label: 'Surcharge', value: this.policy.surchargeAmount },
            { label: 'Older Surcharge', value: this.policy.olderSurchargeAmount },
            { label: 'Winter Sport Premium', value: this.policy.winterSportPrem },
            { label: 'PHCF', value: this.policy.phcf },
            { label: 'TL', value: this.policy.tl },
            { label: 'Stamp Duty', value: this.policy.sd },
        ];
    }

    formatDate(date: string): string {
        return this.datePipe.transform(date, 'dd-MMM-yyyy') ?? '';
    }

}
