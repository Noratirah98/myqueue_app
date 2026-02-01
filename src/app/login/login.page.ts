import {
  Component,
  ElementRef,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import {
  getAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { Router } from '@angular/router';
import {
  AlertController,
  LoadingController,
  ToastController,
} from '@ionic/angular';
import { MainService } from '../services/main.service';
import { get, getDatabase, ref } from 'firebase/database';
import { StorageService } from '../services/storage.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  @ViewChildren('codeInput') codeInputs!: QueryList<ElementRef>;

  loginData = {
    email: '',
    password: '',
  };

  showPassword = false;
  rememberMe = false;

  showForgotPassword = false;
  resetEmail = '';
  isSendingReset = false;

  constructor(
    private router: Router,
    private main: MainService,
    private storage: StorageService,
    private alertController: AlertController,
    private loadingController: LoadingController,
  ) {}

  ngOnInit() {
    this.checkRememberedUser();
  }

  // ============================================
  // LOGIN METHODS
  // ============================================

  checkRememberedUser() {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      this.loginData.email = rememberedEmail;
      this.rememberMe = true;
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async login() {
    if (!this.loginData.email || !this.loginData.password) {
      await this.main.showToast('Please enter email and password', 'danger');
      return;
    }

    if (!this.isValidEmail(this.loginData.email)) {
      await this.main.showToast('Invalid email format', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Logging in...',
    });
    await loading.present();

    try {
      const auth = getAuth();
      const email = this.loginData.email.trim();

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        this.loginData.password,
      );

      const uid = userCredential.user.uid;

      // Save uid first (so you still can proceed even if patient profile blocked)
      await this.storage.set('uid', uid);

      // Try load patient profile
      try {
        const db = getDatabase();
        const patientSnap = await get(ref(db, `patients/${uid}`));
        const patient = patientSnap.exists() ? patientSnap.val() : null;
        const patientName = patient?.userName ?? 'Patient';

        await this.storage.set('patientName', patientName);
      } catch (error: any) {
        console.log('LOGIN ERROR FULL:', error);
        console.log('CODE:', error?.code);
        console.log('MESSAGE:', error?.message);
        await loading.dismiss();
        this.handleFirebaseLoginError(error);
      }

      // Handle remember me
      if (this.rememberMe) {
        localStorage.setItem('rememberedEmail', this.loginData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      await loading.dismiss();
      await this.main.showToast(
        'Login successfully',
        'success',
        'checkmark-done-circle',
      );

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
        message =
          'This email is not registered in our system. Please visit the clinic counter to register or update your account during your first visit.';
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

  // Helper Methods
  async showHelpInfo() {
    const alert = await this.alertController.create({
      header: 'Login Help',
      cssClass: 'login-help-alert',
      message: `No Account?
          Your account will be created by clinic staff during your first visit.

          Forgot Password?
          Please use the email password reset feature.

          Login Issues?
          Make sure your email format is correct.

          <p><strong>Support:</strong></p>
          <p>Email: support@myqueue.com<br>
          Phone: 1-800-MY-QUEUE</p>`,
      buttons: ['Close'],
    });

    await alert.present();
  }

  openForgotPassword() {
    this.showForgotPassword = true;
    this.resetEmail = (this.loginData.email || '').trim();
  }

  closeForgotPassword() {
    this.showForgotPassword = false;
    this.resetEmail = '';
  }

  async sendResetLink() {
    const email = (this.resetEmail || '').trim();

    if (!email || !this.isValidEmail(email)) {
      await this.main.showToast(
        'Please enter a valid email address',
        'warning',
        'alert-circle-outline',
        'top',
      );
      return;
    }

    this.isSendingReset = true;

    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);

      await this.main.showToast(
        'Reset link sent. Please check your email.',
        'success',
        'mail-outline',
        'top',
      );

      // optional: auto close modal
      this.closeForgotPassword();
    } catch (error: any) {
      let msg = 'Failed to send reset email. Please try again.';
      if (error.code === 'auth/user-not-found')
        msg = 'No account found with this email.';
      if (error.code === 'auth/invalid-email') msg = 'Invalid email format.';
      if (error.code === 'auth/too-many-requests')
        msg = 'Too many attempts. Try again later.';

      await this.main.showToast(msg, 'danger', 'alert-circle-outline', 'top');
    } finally {
      this.isSendingReset = false;
    }
  }

  // async forgotPassword() {
  //   const email = (this.loginData.email || '').trim();

  //   if (!email) {
  //     await this.main.showToast('Please enter your email first', 'warning', 'mail-outline', 'top');
  //     return;
  //   }

  //   if (!this.isValidEmail(email)) {
  //     await this.main.showToast('Invalid email format', 'danger', 'alert-circle-outline', 'top');
  //     return;
  //   }

  //   const loading = await this.loadingController.create({
  //     message: 'Sending reset email...'
  //   });
  //   await loading.present();

  //   try {
  //     const auth = getAuth();
  //     await sendPasswordResetEmail(auth, email);

  //     await loading.dismiss();

  //     const alert = await this.alertController.create({
  //       header: 'Reset Email Sent',
  //       message: `We/'ve sent a password reset link to <b>${email}</b>. Please check your inbox (and spam folder).`,
  //       buttons: ['OK']
  //     });
  //     await alert.present();

  //   } catch (error: any) {
  //     await loading.dismiss();

  //     let msg = 'Failed to send reset email. Please try again.';
  //     if (error.code === 'auth/user-not-found') msg = 'Email not found. Please contact the clinic counter.';
  //     if (error.code === 'auth/invalid-email') msg = 'Invalid email format.';
  //     if (error.code === 'auth/too-many-requests') msg = 'Too many attempts. Try again later.';

  //     await this.main.showToast(msg, 'danger', 'alert-circle-outline', 'top');
  //   }
  // }
}
