export interface User {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatar?: string;
    status?: string;
}


export interface StoredUser {
    username: string;
    userType: 'I' | 'A'| 'C';
    loginTime: number;
    name: string;
    email: string;
    phoneNumber?: string;
    dateOfBirth: Date
}


export interface CreateUserObject {
    firstName: string,
    password: string,
    passwordConfirm: string,
    clientType: string,
    docnumber: string,
    kraPin: string,
    pinNumber: string,
    mobileno: string,
    email: string,
}



export interface QuotesData {
    refno: string;
    catId: number;
    category: string;
    prodId: number;
    prodName: string;
    cargotypeId: number;
    originId: string;
    cargotype: string;
    firstName: string;
    lastName: string;
    vesselName: string;
    idfNumber: string;
    destination: string;
    countyName: string;
    originCountry: string;
    shippingmodeId: number;
    countyId: number;
    shippingId: number;
    originPortId: number;
    dischargePortId: number;
    shippingmode: string;
    packagingtypeId: number;
    packagingtype: string;
    sumassured: number;
    premium: number;
    traininglevy: number;
    phcf: number;
    sd: number;
    netprem: number;
    createDate: string;
    expiryDate: string;
    dateArrival: string;
    dateDispatch: string;
    invoiceIdExists: boolean;
    idfDocumentExists: boolean;
    kraDocumentExists: boolean;
    idDocumentExists: boolean;
    description: string;
    status: string;
    quoteId: number;
    pinNumber: string;
    idNumber: string;
    phoneNo: string;
    postalCode: string;
    postalAddress: string;
    prospectId: number;
    email: string;
    daysToExpiry: number;
}


export interface QuoteResult {
    result: number,
    premium: number,
    phcf: number,
    tl: number,
    sd: number,
    netprem: number,
    id: number
}

export interface MarineProduct {
    id: number
    prodshtdesc: string;
    prodname: string;
    productid: number;
    productdisplay: number;
}

export interface Country {
    id: number;
    countryname:string;
}

export interface County {
    id: number;
    portName:string;
}

export interface Port {
    id: number;
    portName:string;
    portid:string;
    shtdesc:string;
}

export interface PackagingType {
    id: number;
    packingtype: string
}


export interface Category {
    id: number;
    catname: string
}

export interface CargoTypeData {
    id: number;
    ctname: string
}



export interface PendingQuote {
    quoteId: number;
    shippingmodeId: number;
    daysToExpiry: number;
    id: string;
    prodName: string;
    phoneNo: string;
    refno: string;
    status: string;
    createDate: string;
    description: string;
    vesselName: string;
    pinNumber: string;
    idNumber: string;
    originCountry: any;
    sumassured:number;
    netprem: number;
    expiryDates: Date;
}

export  interface PortData {
    id: number,
    portName:string
}

export interface PolicyRecord {
    id: number;
    refno: string;
    erprefno: string;
    sumassured: number;
    netpremium: number;
    dateArrival: string;
    dischageDate: string;
    productName: string;
    shippingModeName:string;
    importerType:string;
    vesselName:string;
    originPortName:string;
    destPortName:string;
    ucrNumber:string;
    coverFrom: Date;
    coverTo: Date;
    error: string;
    batchNo: number;
}


export interface UserDocumentData {
    kraDocumentExists: boolean;
    idfDocumentExists: boolean;
    firstName: string;
    lastName: string;
    pinNo: string;
    idNo: string;
    emailAddress: string;
    phoneNumber: string;
    postalAddress: string;
    postalCode: string;
    dateOfBirth: Date
}

export interface RecentActivity {
    type: string;
    description: string;
    dateCreated: string;
    amount?: number;
}

export interface CoverageData {
    type: string;
    amount: number;
    percentage: number;
}

export interface PostalCode {
    id: number,
    postalCode: string;
    postalTown: string;
}


export interface YTDAnalysis {
    ytdPremium: number;
    ytdSumAssured: number;
}


export interface QuotesAnalysis {
    totalQuotes: number;
    totalPremium: number;
    totalConvertedQuotes: number;
}

export interface GrowthDTO {
    month: string;
    growthPercentage: number;
}


export interface TravelDuration {
    id: number;
    durationDesc: string;
    durationVal:number
}

export interface TravelBenefitsData {
    id: number;
    benefitName: string;
    benefitIncluded: string;
    currencySymbol: string;
    currency: string;
    status: string;
    frequency: string;
    notes: string;
    benefitLimit: number;
}

export interface TravelPlanTagsData {
    id: number;
    tag: string;
}

export interface TravelCoversData {
    id: number;
    coverDesc: string;
}

export interface TravelPlansData {
    id: number;
    coverId: number;
    planShtDesc: string;
    planName: string;
    planType: string;
    planPopular: string;
}

export interface TravelRatesData {
    id: number;
    planId: number;
    rateAmount: number;
    exchangeRate: number;
    plansData: TravelPlansData;
    benefitsData: TravelBenefitsData[];
    planTagsData: TravelPlanTagsData[];
    travelCoversData: TravelCoversData;
}

export interface TravellersData {
    id: number;
    travellerName: string;
    passportNo: string;
    passportFileName: string;
    dob: Date;
}

export interface TravelQuoteData {
    travelQuoteId: number;
    planName: string;
    durationDesc: string;
    countryFrom: string;
    countryTo: string;
    fromDate: Date;
    toDate: Date;
    travellersCnt: number;
    email: string;
    mobile: string;
    travelBenefits: TravelBenefitsData[];
    travellers: TravellersData[];
    premium: number;
    phcf: number;
    tl: number;
    sd: number;
    netPrem: number;
    winterPrem: number;
    discount: number;
    surcharge: number;
    prsCode: number;
}
