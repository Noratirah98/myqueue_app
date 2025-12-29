import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { QueueStatusPageRoutingModule } from './queue-status-routing.module';

import { QueueStatusPage } from './queue-status.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    QueueStatusPageRoutingModule
  ],
  declarations: [QueueStatusPage]
})
export class QueueStatusPageModule {}
