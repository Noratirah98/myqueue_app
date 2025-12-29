import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { QueueStatus2Page } from './queue-status2.page';

const routes: Routes = [
  {
    path: '',
    component: QueueStatus2Page
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class QueueStatus2PageRoutingModule {}
