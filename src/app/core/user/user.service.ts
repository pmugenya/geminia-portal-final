import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
    CargoTypeData,
    Category,
    MarineProduct,
    PackagingType,
    StoredUser,
    User,
    UserDocumentData,
} from 'app/core/user/user.types';
import { BehaviorSubject, catchError, map, Observable, ReplaySubject, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {
    private _httpClient = inject(HttpClient);
    private _user: ReplaySubject<User> = new ReplaySubject<User>(1);
    private readonly STORAGE_KEYS = {
        USER_DATA: 'geminia_user_data'
    };
    private currentUserSubject = new BehaviorSubject<StoredUser | null>(this.getStoredUser());
    public currentUser$ = this.currentUserSubject.asObservable();
    private baseUrl = environment.apiUrl;

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    constructor() {
        const userData = sessionStorage.getItem(this.STORAGE_KEYS.USER_DATA);
        // console.log(userData);
        if (userData) {
            this.currentUserSubject.next(JSON.parse(userData));
        }
    }


    setCurrentUser(user: any, accessToken: string): void {
        this.currentUserSubject.next(user);
        sessionStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(user));
        sessionStorage.setItem('accessToken', accessToken);
    }


    getCurrentUser(): StoredUser | null {
        return this.currentUserSubject.value;
    }

    getStoredUser(): StoredUser | null {
        try {
            const userData = sessionStorage.getItem(this.STORAGE_KEYS.USER_DATA);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            return null;
        }
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    getMarineProducts(): Observable<MarineProduct[]> {
        return this._httpClient.get<MarineProduct[]>(`${this.baseUrl}/products`);
    }

    getMarinePackagingTypes(): Observable<PackagingType[]> {
        return this._httpClient.get<PackagingType[]>(`${this.baseUrl}/packagingtypes`);
    }

    getMarineCategories(): Observable<Category[]> {
        return this._httpClient.get<Category[]>(`${this.baseUrl}/categories`);
    }

    getCargoTypesByCategory(categoryId: number): Observable<CargoTypeData[]> {
        return this._httpClient.get<CargoTypeData[]>(`${this.baseUrl}/cargotypes/${categoryId}`);
    }

    getClientQuotes(offset: number, limit: number): Observable<any> {
        let params = new HttpParams()
            .set('offset', offset.toString())
            .set('limit', limit.toString());

        return this._httpClient.get<any>(`${this.baseUrl}/quote/clientquotes`, { params });
    }

    getAgentQuotes(offset: number, limit: number): Observable<any> {
        let params = new HttpParams()
            .set('offset', offset.toString())
            .set('limit', limit.toString());

        return this._httpClient.get<any>(`${this.baseUrl}/quote/agentquotes`, { params });
    }

    getSingleQuote(quoteId: string): Observable<any> {
        return this._httpClient.get<any>(`${this.baseUrl}/quote/singlequote/${quoteId}`);
    }

    getQuoteStatus(quoteId: number): Observable<string> {
        return this._httpClient.get<string>(`${this.baseUrl}/quote/quoteStatus/${quoteId}`);
    }

    getShippingData(applicationId: number): Observable<any> {
        return this._httpClient.get<any>(`${this.baseUrl}/shippingapplication/${applicationId}`);
    }

    getClientPolicies(offset: number, limit: number): Observable<any> {
        let params = new HttpParams()
            .set('offset', offset.toString())
            .set('limit', limit.toString());

        return this._httpClient.get<any>(`${this.baseUrl}/shippingapplication/approvedapplications`, { params });
    }

    downloadCertificate(id: number): Observable<Blob> {
        return this._httpClient.get(`${this.baseUrl}/shippingapplication/coredigitalCert?id=${id}`, {
            responseType: 'blob'  // very important for binary files
        });
    }

    getCountries(offset: number, limit: number,type: number, sqlSearch?: string): Observable<any> {
        let params = new HttpParams()
            .set('offset', offset.toString())
            .set('limit', limit.toString())
            .set('type', type.toString());

        if (sqlSearch) {
            params = params.set('sqlSearch', sqlSearch);
        }

        return this._httpClient.get<any>(`${this.baseUrl}/self/countries`, { params });
    }

    getCountryById(countryId: number, type?: string): Observable<any> {
        let params = new HttpParams();
        if (type) {
            params = params.set('type', type);
        }

        return this._httpClient.get<any>(`${this.baseUrl}/self/countries/countryById/${countryId}`, { params });
    }

    getCounties(offset: number, limit: number): Observable<any> {
        let params = new HttpParams()
            .set('offset', offset.toString())
            .set('limit', limit.toString());

        return this._httpClient.get<any>(`${this.baseUrl}/ports/counties`, { params });
    }

    downloadQuote(quoteId: string) {
        return this._httpClient.get(`${this.baseUrl}/quote/download/${quoteId}`, {
            responseType: 'text'
        });
    }
    //the save quote method is embedded here where we can call actual API
    getSingleQuoteForEditing(quoteId: string): Observable<any> {
        return this._httpClient.get(`${this.baseUrl}/quotes/${quoteId}/edit`);
    }

    getPorts(countryId: number, type: string, offset: number, limit: number, sqlSearch?: string
    ): Observable<any> {
        let params = new HttpParams()
            .set('type', type)
            .set('offset', offset.toString())
            .set('limit', limit.toString())
            .set('sqlSearch', sqlSearch || ''); // Always include sqlSearch, even if empty

        return this._httpClient.get<any>(
            `${this.baseUrl}/ports/${countryId}`,
            { params }
        );
    }

    /**
     * Recalculates the premium for a marine quote when user edits sum insured.
     * @param quoteId The ID of the quote.
     * @param sumInsured The new sum insured value.
     * @returns Observable with the new premium details (premium, tax, total).
     */
    recalculateMarinePremium(quoteId: string, sumInsured: number): Observable<any> {
        return this._httpClient.post(`${this.baseUrl}/quote/${quoteId}/recalculate`, { sumInsured });
    }

    clearSession(): void {
        try {
            this.currentUserSubject.next(null);
        } catch (error) {
            console.error('Failed to clear stored data:', error);
        }
    }


    getUserDocuments(): Observable<UserDocumentData> {
        return this._httpClient.get<UserDocumentData>(`${this.baseUrl}/users/userdocuments`).pipe(
            catchError(this.handleError)
        );
    }

    checkProspectDocument(prospectId: number): Observable<UserDocumentData> {
        return this._httpClient.get<any>(`${this.baseUrl}/users/prospectdocuments/${prospectId}`);
    }

    private handleError(error: HttpErrorResponse) {
        let errorMessage = 'An unknown error occurred.';
        if (error.error instanceof ErrorEvent) {
            errorMessage = `Client error: ${error.error.message}`;
        } else {
            errorMessage = `Server error (${error.status}): ${error.message}`;
        }
        console.error('UserDocumentService error:', errorMessage);
        return throwError(() => new Error(errorMessage));
    }
}
