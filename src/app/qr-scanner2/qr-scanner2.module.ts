import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { QrScanner2PageRoutingModule } from './qr-scanner2-routing.module';

import { QrScanner2Page } from './qr-scanner2.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    QrScanner2PageRoutingModule
  ],
  declarations: [QrScanner2Page]
})
export class QrScanner2PageModule {}
