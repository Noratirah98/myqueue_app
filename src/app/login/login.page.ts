import { Component, OnInit } from '@angular/core';
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { MainService } from '../services/main.service';


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
    private alertController: AlertController,
    private loadingController: LoadingController,
  ) {}

  ngOnInit() {}

  async login() {
    // Validate input
    if (!this.loginData.email || !this.loginData.password) {
      await this.main.showToast('Please enter email and password', 'danger');
      return;
    }

    if (!this.isValidEmail(this.loginData.email)) {
      await this.main.showToast('Invalid email format', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Logging in...'
    });

    await loading.present();

    try {
      const auth = getAuth();

      const userCredential = await signInWithEmailAndPassword(
        auth,
        this.loginData.email,
        this.loginData.password
      );

      const user = userCredential.user;

      // Optional: remember login
      if (this.rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }

      localStorage.setItem('uid', user.uid);

      await loading.dismiss();
      await this.main.showToast('Login successfully', 'success', 'checkmark-done-circle');

      this.router.navigate(['/home']);

    } catch (error: any) {
      await loading.dismiss();
      this.handleFirebaseLoginError(error);
    }
  }

  handleFirebaseLoginError(error: any) {
    let message = 'Login failed. Please try again.';

    switch (error.code) {
      case 'auth/user-not-found':
        message = 'Email not found. Please contact the clinic counter.';
        break;

      case 'auth/wrong-password':
        message = 'Incorrect password.';
        break;

      case 'auth/invalid-email':
        message = 'Invalid email format.';
        break;

      case 'auth/user-disabled':
        message = 'Account has been disabled. Please contact the clinic.';
        break;

      case 'auth/too-many-requests':
        message = 'Too many attempts. Please try again later.';
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
      message: `
        <div style="text-align: left; line-height: 1.6;">
          <p><strong>No Account?</strong></p>
          <p>Your account will be created by clinic staff during your first visit.</p>
          <br>
          <p><strong>Forgot Password?</strong></p>
          <p>Please contact the clinic counter to reset your password.</p>
          <br>
          <p><strong>Login Issues?</strong></p>
          <p>Make sure your email is in valid format</p>
        </div>
      `,
      buttons: ['Close']
    });

    await alert.present();
  }
}
