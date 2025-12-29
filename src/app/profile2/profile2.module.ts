import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Profile2PageRoutingModule } from './profile2-routing.module';

import { Profile2Page } from './profile2.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Profile2PageRoutingModule
  ],
  declarations: [Profile2Page]
})
export class Profile2PageModule {}
