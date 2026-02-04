import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { AuthService } from '../services/auth.service';
import { StorageService } from '../services/storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router, private storageService: StorageService) {}

  // canActivate(): Promise<boolean> {
  //   return new Promise(resolve => {
  //     const auth = getAuth();

  //     onAuthStateChanged(auth, (user) => {
  //       if (user) {
  //         resolve(true); // user is logged in
  //       } else {
  //         this.router.navigateByUrl('/login');
  //         resolve(false); // user not logged in
  //       }
  //     });
  //   });
  // }

  async canActivate(): Promise<boolean> {
    const isLoggedIn = await this.storageService.get('isLoggedIn');

    console.log('AuthGuard isLoggedIn:', isLoggedIn);

    if (isLoggedIn === true) {
      console.log('✅ Auth Guard: User authenticated');
      return true;
    }

    console.log('❌ Auth Guard: User not authenticated');
    await this.router.navigate(['/login']);
    return false;
  }
}
