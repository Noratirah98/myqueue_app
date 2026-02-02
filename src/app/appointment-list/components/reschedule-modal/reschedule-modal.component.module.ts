import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RescheduleModalComponent } from './reschedule-modal.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule],
  declarations: [RescheduleModalComponent],
  exports: [RescheduleModalComponent],
})
export class RescheduleModalComponentModule {}
