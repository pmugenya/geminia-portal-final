import { MarineQuoteComponent } from '../marine-quote/marine-quote.component';
import { Routes } from '@angular/router';
import { ViewQuote } from './view-quote';

export default [
    {
        path     : '',
        component: ViewQuote,
    },
] as Routes;
