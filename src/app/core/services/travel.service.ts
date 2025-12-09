import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Country, TravelDuration, TravelPolicyData, TravelQuoteData, TravelRatesData } from '../user/user.types';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TravelService {

    private baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) {}

    getTravelDurations(): Observable<TravelDuration[]> {
        return this.http.get<TravelDuration[]>(`${this.baseUrl}/travel/durations`);
    }

    getRatesByDuration(durationId: number): Observable<TravelRatesData[]> {
        return this.http.get<TravelRatesData[]>(`${this.baseUrl}/travel/rates/${durationId}`);
    }

    checkPassport(passportNo: string): Observable<{ found: boolean }> {
        const params = new HttpParams().set('passportNo', passportNo);

        return this.http.get<{ found: boolean }>(`${this.baseUrl}/travelquote/passportcheck`, { params });
    }

    getPolicy(policyId: string): Observable<TravelPolicyData> {
        return this.http.get<TravelPolicyData>(`${this.baseUrl}/travelquote/policy/${policyId}`);
    }

    submitPolicy(
        travelersJson: any,
        kraFile: File | null,
        idFile: File | null,
        documents: File[]
    ):Observable<any> {
        const formData = new FormData();
        if (kraFile) {
            formData.append("kraPinUpload", kraFile, kraFile.name);
        }
        else{
            formData.append("kraPinUpload", "");
        }
        if (idFile) {
            formData.append("nationalIdUpload", idFile, idFile.name);
        }
        else{
            formData.append("nationalIdUpload","");
        }
        formData.append("json", JSON.stringify(travelersJson));
        documents.forEach(doc => {
            formData.append("documents", doc, doc.name);
        });

        return this.http.post(`${this.baseUrl}/travelquote/policy`, formData);
    }


    saveTravelQuote(requestBody: any): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });
        return this.http.post(`${this.baseUrl}/quote/saveTravelQuote`, JSON.stringify(requestBody), { headers });
    }

    getSingleQuote(quoteId: number): Observable<TravelQuoteData> {
        return this.http.get<TravelQuoteData>(`${this.baseUrl}/travelquote/singlequote/${quoteId}`);
    }

    getCountries(): Observable<Country[]> {
        return this.http.get<Country[]>(`${this.baseUrl}/travelquote/countries`);
    }
}
