import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Scan2Page } from './scan2.page';

const routes: Routes = [
  {
    path: '',
    component: Scan2Page
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Scan2PageRoutingModule {}
