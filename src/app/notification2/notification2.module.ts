import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Notification2PageRoutingModule } from './notification2-routing.module';

import { Notification2Page } from './notification2.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Notification2PageRoutingModule
  ],
  declarations: [Notification2Page]
})
export class Notification2PageModule {}
