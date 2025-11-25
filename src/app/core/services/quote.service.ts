import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GrowthDTO, PostalCode, QuotesAnalysis, QuotesData, RecentActivity, YTDAnalysis } from '../user/user.types';

@Injectable({ providedIn: 'root' })
export class QuoteService {

    private baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) {}

    createQuote(
        formData:FormData
    ): Observable<any> {
        return this.http.post(`${this.baseUrl}/quote`, formData);
    }

    getRecentActivities(): Observable<RecentActivity[]> {
        return this.http.get<RecentActivity[]>(`${this.baseUrl}/recentactivity`);
    }

    getAgencyCoverage(): Observable<YTDAnalysis> {
        return this.http.get<YTDAnalysis>(`${this.baseUrl}/dashboard/agencycoverage`);
    }

    getQuotAnalysis(): Observable<QuotesAnalysis> {
        return this.http.get<QuotesAnalysis>(`${this.baseUrl}/dashboard/quotanalysis`);
    }

    getGrowthAnalysis(months: number) {
        return this.http.get<GrowthDTO[]>(`${this.baseUrl}/dashboard/growthanalysis/${months}`);

    }

    getPostalCodes(): Observable<PostalCode[]> {
        return this.http.get<PostalCode[]>(`${this.baseUrl}/self/countries/postalcodes`);
    }

    searchByPin(pin: string): Observable<any> {
        return this.http.get(`${this.baseUrl}/self/prospects/prospectByPin`, {
            params: { pinNo: pin }
        });
    }

    createApplication(
        formData:FormData
    ): Observable<any> {
        return this.http.post(`${this.baseUrl}/shippingapplication`, formData);
    }

    downloadDigitalCert(id: number): Observable<HttpEvent<Blob>> {
        const params = new HttpParams().set('id', id);

        return this.http.get(`${this.baseUrl}/shippingapplication/coredigitalCert`, {
            params,
            responseType: 'blob',
            observe: 'events',      // observe events for progress
            reportProgress: true   // enables progress tracking
        });
    }


    retrieveOneTransaction(applicationId: number, queryParams?: any): Observable<any> {
        let params = new HttpParams();

        if (queryParams) {
            Object.keys(queryParams).forEach(key => {
                params = params.set(key, queryParams[key]);
            });
        }

        return this.http.get(`${this.baseUrl}/shippingapplication/${applicationId}`, { params });
    }

    computePremium(sumInsured: number, cargoType: number, shipping: number): Observable<any> {
        const payload = {
            suminsured: sumInsured,
            cargotype: cargoType,
            shipping: shipping,
            locale: 'en_US'
        };

        return this.http.post<any>(`${this.baseUrl}/compute`, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    stkPush(phone: string, amount: number, refNo: string): Observable<any> {
        const params = new HttpParams()
            .set('phone', phone)
            .set('amount', amount.toString())
            .set('refNo', refNo);

        return this.http.get(`${this.baseUrl}/payments/stkpush`, { params });
    }

    validatePayment(merchantId: string, requestId: string): Observable<any> {
        const params = new HttpParams()
            .set('merchantId', merchantId)
            .set('requestId', requestId);

        return this.http.get<any>(`${this.baseUrl}/payments/validate`, { params });
    }

    /**
     * Fetches a quote by its ID
     * @param quoteId The ID of the quote to fetch
     * @returns Observable with the quote data
     */
    getQuoteById(quoteId: string): Observable<QuotesData> {
        return this.http.get<any>(`${this.baseUrl}/quote/singlequote/${quoteId}`);
    }


    getClientCoverage(): Observable<any> {
        return this.http.get(`${this.baseUrl}/dashboard/clientcoverage`);
    }

    /**
     * Updates an existing quote
     * @param quoteId The ID of the quote to update
     * @param formData The updated quote data
     * @returns Observable with the updated quote data
     */
    updateQuote(quoteId: string, formData: FormData): Observable<any> {
        return this.http.put(`${this.baseUrl}/quote/${quoteId}`, formData);
    }

    /**
     * Fetches shipment details by shipping ID.
     * @param shippingId The ID of the shipping details to fetch.
     * @returns Observable with the shipment data.
     */
    getShipmentDetails(shippingId: number): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/shippingapplication/${shippingId}`);
    }

    /**
     * Updates existing shipment details.
     * @param shippingId The ID of the shipping details to update.
     * @param details The updated shipment data.
     * @returns Observable with the updated shipment data.
     */
    updateShipmentDetails(shippingId: number, details: any): Observable<any> {
        // Try POST method as an alternative to PUT
        return this.http.post(`${this.baseUrl}/shippingapplication/${shippingId}`, details);
    }

    /**
     * Recalculates the premium for a marine quote.
     * @param quoteId The ID of the quote.
     * @param sumInsured The new sum insured value.
     * @returns Observable with the new premium details.
     */
    recalculateMarinePremium(quoteId: string, sumInsured: number): Observable<any> {
        return this.http.post(`${this.baseUrl}/quote/${quoteId}/recalculate`, { sumInsured });
    }
}
