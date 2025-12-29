import { Injectable } from '@angular/core';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  uid: string = "";

  constructor() {
    const auth = getAuth();

    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.uid = user.uid;
        localStorage.setItem("uid", user.uid);
      } else {
        this.uid = "";
        localStorage.removeItem("uid");
      }
    });
  }

  getUID() {
    return this.uid || localStorage.getItem("uid");
  }
}
