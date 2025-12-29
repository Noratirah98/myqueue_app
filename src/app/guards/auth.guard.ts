import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { getAuth, onAuthStateChanged } from "firebase/auth";


@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router
  ) {}

  canActivate(): Promise<boolean> {
    return new Promise(resolve => {
      const auth = getAuth();

      onAuthStateChanged(auth, (user) => {
        if (user) {
          resolve(true); // user is logged in
        } else {
          this.router.navigateByUrl('/login');
          resolve(false); // user not logged in
        }
      });
    });
  }
}
