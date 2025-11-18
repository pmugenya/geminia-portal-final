import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FuseCardComponent } from '../../../../@fuse/components/card';

@Component({
    selector: 'app-quote-product-dialog',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule, FuseCardComponent],
    templateUrl: './quote-product-dialog.component.html',
    styleUrls: ['./quote-product-dialog.component.scss']
})
export class QuoteProductDialogsComponent {
    products = [
        { name: 'Marine', icon: 'sailing', color: 'text-blue-600' },
        { name: 'Motor', icon: 'directions_car', color: 'text-red-600' },
        { name: 'Travel', icon: 'flight_takeoff', color: 'text-amber-600' }
    ];

    constructor(
        private dialogRef: MatDialogRef<QuoteProductDialogsComponent>
    ) {}

    selectProduct(product: string): void {
        this.dialogRef.close(product);
    }

    close(): void {
        this.dialogRef.close();
    }
}
