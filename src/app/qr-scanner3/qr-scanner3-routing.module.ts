import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { QrScanner3Page } from './qr-scanner3.page';

const routes: Routes = [
  {
    path: '',
    component: QrScanner3Page
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class QrScanner3PageRoutingModule {}
