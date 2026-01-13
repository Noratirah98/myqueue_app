import { Component, OnInit } from '@angular/core';
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { MainService } from '../services/main.service';
import { get, getDatabase, ref } from 'firebase/database';
import { StorageService } from '../services/storage.service';


@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  loginData = {
    email: '',
    password: ''
  };

  showPassword: boolean = false;
  rememberMe: boolean = false;

  constructor(
    private router: Router,
    private main: MainService,
    private storage: StorageService,
    private alertController: AlertController,
    private loadingController: LoadingController,
  ) {}

  ngOnInit() {}

  async login() {
    if (!this.loginData.email || !this.loginData.password) {
      await this.main.showToast('Please enter email and password', 'danger');
      return;
    }

    if (!this.isValidEmail(this.loginData.email)) {
      await this.main.showToast('Invalid email format', 'danger');
      return;
    }

    const loading = await this.loadingController.create({ message: 'Logging in...' });
    await loading.present();

    try {
      const auth = getAuth();

      const email = this.loginData.email.trim();

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        this.loginData.password
      );

      const uid = userCredential.user.uid;

      // Save uid first (so you still can proceed even if patient profile blocked)
      await this.storage.set('uid', uid);

      // Try load patient profile
      try {
        const db          = getDatabase();
        const patientSnap = await get(ref(db, `patients/${uid}`));
        const patient     = patientSnap.exists() ? patientSnap.val() : null;
        const patientName = patient?.username ?? 'Patient';

        await this.storage.set('patientName', patientName);

      } catch (error: any) {
        console.log("LOGIN ERROR FULL:", error);
        console.log("CODE:", error?.code);
        console.log("MESSAGE:", error?.message);
        await loading.dismiss();
        this.handleFirebaseLoginError(error);
      }

      if (this.rememberMe) localStorage.setItem('rememberMe', 'true');

      await loading.dismiss();
      await this.main.showToast('Login successfully', 'success', 'checkmark-done-circle');

      this.router.navigateByUrl('/home');
    } catch (authErr: any) {
      await loading.dismiss();
      console.log('AUTH ERROR:', authErr);
      this.handleFirebaseLoginError(authErr);
    }
  }

  handleFirebaseLoginError(error: any) {
    let message = 'Login failed. Please try again.';

    switch (error?.code) {
      case 'auth/invalid-credential':
        message = 'Incorrect email or password.';
        break;

      case 'auth/user-not-found':
        message = 'Email not found. Please register at the clinic counter.';
        break;

      case 'auth/wrong-password':
        message = 'Incorrect password.';
        break;

      case 'auth/invalid-email':
        message = 'Invalid email format.';
        break;

      case 'auth/user-disabled':
        message = 'Account disabled. Please contact the clinic.';
        break;

      case 'auth/too-many-requests':
        message = 'Too many attempts. Try again later.';
        break;

      case 'auth/operation-not-allowed':
        message = 'Email/Password sign-in is disabled in Firebase.';
        break;
    }

    this.main.showToast(message, 'danger');
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async showHelpInfo() {
    const alert = await this.alertController.create({
      header: 'Login Help',
      cssClass: 'login-help-alert',
      message:
          `No Account?
          Your account will be created by clinic staff during your first visit.

          Forgot Password?
          Please use the email password reset feature.

          Login Issues?
          Make sure your email format is correct.`,
      buttons: ['Close']
    });

    await alert.present();
  }
}
