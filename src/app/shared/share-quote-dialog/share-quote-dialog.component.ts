import { Component, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatDialogRef } from '@angular/material/dialog';

export type ShareChannel = 'whatsapp' | 'gmail' | 'outlook' | 'otherEmail';

@Component({
  selector: 'app-share-quote-dialog',
  standalone: true,
  imports: [MatIcon],
  templateUrl: './share-quote-dialog.component.html',
  styleUrls: ['./share-quote-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ShareQuoteDialogComponent {
  @Output() readonly choose = new EventEmitter<ShareChannel>();

  constructor(private dialogRef: MatDialogRef<ShareQuoteDialogComponent>) {}

  onChoose(channel: ShareChannel): void {
    this.choose.emit(channel);
  }

  close(): void {
    this.dialogRef.close();
  }
}
