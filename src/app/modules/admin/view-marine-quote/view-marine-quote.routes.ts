import { MarineQuoteComponent } from '../marine-quote/marine-quote.component';
import { Routes } from '@angular/router';
import { ViewMarineQuote } from './view-marine-quote';

export default [
    {
        path     : '',
        component: ViewMarineQuote,
    },
] as Routes;
