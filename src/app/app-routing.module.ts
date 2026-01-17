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
    loadChildren: () => import('./login/login.module').then( m => m.LoginPageModule)
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
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: 'qr-scanner2',
    canActivate: [AuthGuard],
    loadChildren: () => import('./qr-scanner2/qr-scanner2.module').then( m => m.QrScanner2PageModule)
  },
  {
    path: 'notification2',
    canActivate: [AuthGuard],
    loadChildren: () => import('./notification2/notification2.module').then( m => m.Notification2PageModule)
  },
  {
    path: 'profile2',
    canActivate: [AuthGuard],
    loadChildren: () => import('./profile2/profile2.module').then( m => m.Profile2PageModule)
  },
  {
    path: 'queue-status2',
    canActivate: [AuthGuard],
    loadChildren: () => import('./queue-status2/queue-status2.module').then( m => m.QueueStatus2PageModule)
  },
  {
    path: 'appointment',
    canActivate: [AuthGuard],
    loadChildren: () => import('./appointment/appointment.module').then( m => m.AppointmentPageModule)
  },
  {
    path: 'qr-scanner',
    canActivate: [AuthGuard],
    loadChildren: () => import('./qr-scanner/qr-scanner.module').then( m => m.QrScannerPageModule)
  },
  {
    path: 'queue-status',
    canActivate: [AuthGuard],
    loadChildren: () => import('./queue-status/queue-status.module').then( m => m.QueueStatusPageModule)
  },
  {
    path: 'appointment-list',
    canActivate: [AuthGuard],
    loadChildren: () => import('./appointment-list/appointment-list.module').then( m => m.AppointmentListPageModule)
  },
  {
    path: 'qr-scanner3',
    canActivate: [AuthGuard],
    loadChildren: () => import('./qr-scanner3/qr-scanner3.module').then( m => m.QrScanner3PageModule)
  },
  {
    path: 'scan',
    canActivate: [AuthGuard],
    loadChildren: () => import('./scan/scan.module').then( m => m.ScanPageModule)
  },
  {
    path: 'queue',
    loadChildren: () => import('./queue/queue.module').then( m => m.QueuePageModule)
  },
  {
    path: 'scan2',
    loadChildren: () => import('./scan2/scan2.module').then( m => m.Scan2PageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
