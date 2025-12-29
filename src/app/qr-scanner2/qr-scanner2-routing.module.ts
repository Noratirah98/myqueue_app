import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { QrScanner2Page } from './qr-scanner2.page';

const routes: Routes = [
  {
    path: '',
    component: QrScanner2Page
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class QrScanner2PageRoutingModule {}
