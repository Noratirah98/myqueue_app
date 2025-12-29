import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { QueueStatusPage } from './queue-status.page';

const routes: Routes = [
  {
    path: '',
    component: QueueStatusPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class QueueStatusPageRoutingModule {}
