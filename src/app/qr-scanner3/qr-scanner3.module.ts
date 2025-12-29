import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { QrScanner3PageRoutingModule } from './qr-scanner3-routing.module';

import { QrScanner3Page } from './qr-scanner3.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    QrScanner3PageRoutingModule
  ],
  declarations: [QrScanner3Page]
})
export class QrScanner3PageModule {}
