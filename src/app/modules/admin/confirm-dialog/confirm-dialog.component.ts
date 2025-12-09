// confirm-dialog.component.ts
import { Component, Inject } from '@angular/core';
import {
    MAT_DIALOG_DATA,
    MatDialogActions,
    MatDialogContent,
    MatDialogRef,
    MatDialogTitle,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';

@Component({
    selector: 'app-confirm-dialog',
    standalone: true,
    template: `
        <h2 mat-dialog-title>{{ data.title || 'Confirm' }}</h2>
        <mat-dialog-content>
            <p>{{ data.message || 'Are you sure?' }}</p>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-stroked-button (click)="onCancel()">Cancel</button>
            <button mat-flat-button color="warn" (click)="onConfirm()">Yes</button>
        </mat-dialog-actions>
    `,
    imports: [
        MatDialogActions,
        MatDialogContent,
        MatButton,
        MatDialogTitle,
    ],
})
export class ConfirmDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<ConfirmDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {}

    onConfirm() {
        this.dialogRef.close(true);
    }

    onCancel() {
        this.dialogRef.close(false);
    }
}
