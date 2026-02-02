import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadChildren: () =>
      import('./login/login.module').then((m) => m.LoginPageModule),
  },
  {
    path: 'folder/:id',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./folder/folder.module').then((m) => m.FolderPageModule),
  },
  {
    path: 'home',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./home/home.module').then((m) => m.HomePageModule),
  },
  {
    path: 'notification2',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./notification2/notification2.module').then(
        (m) => m.Notification2PageModule
      ),
  },
  {
    path: 'appointment',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./appointment/appointment.module').then(
        (m) => m.AppointmentPageModule
      ),
  },
  {
    path: 'queue-status',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./queue-status/queue-status.module').then(
        (m) => m.QueueStatusPageModule
      ),
  },
  {
    path: 'appointment-list',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./appointment-list/appointment-list.module').then(
        (m) => m.AppointmentListPageModule
      ),
  },
  {
    path: 'scan',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./scan/scan.module').then((m) => m.ScanPageModule),
  },
  {
    path: 'profile',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./profile/profile.module').then((m) => m.ProfilePageModule),
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
