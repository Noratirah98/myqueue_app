import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Profile2Page } from './profile2.page';

const routes: Routes = [
  {
    path: '',
    component: Profile2Page
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Profile2PageRoutingModule {}
