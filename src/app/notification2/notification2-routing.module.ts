import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Notification2Page } from './notification2.page';

const routes: Routes = [
  {
    path: '',
    component: Notification2Page
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Notification2PageRoutingModule {}
