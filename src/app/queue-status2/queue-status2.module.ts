import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { QueueStatus2PageRoutingModule } from './queue-status2-routing.module';

import { QueueStatus2Page } from './queue-status2.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    QueueStatus2PageRoutingModule
  ],
  declarations: [QueueStatus2Page]
})
export class QueueStatus2PageModule {}
