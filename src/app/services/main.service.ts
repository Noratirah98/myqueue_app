import { Injectable } from '@angular/core';
import { AlertController, NavController, ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})
export class MainService {
  constructor(
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private toastController: ToastController
  ) {}

  navigateForward(page: any, data: any = null) {
    if (data) {
      this.navCtrl.navigateForward(page, data);
    } else {
      this.navCtrl.navigateForward(page);
    }
  }

  navigateBack() {
    this.navCtrl.pop();
  }

  async showToast(
    message: string,
    color: string = 'primary',
    icon: string = 'alert-circle-outline',
    position: 'top' | 'bottom' | 'middle' = 'top'
  ) {
    const toast = await this.toastController.create({
      message,
      duration: 5000,
      color,
      position,
      icon,
      buttons: [
        {
          text: 'Close',
          role: 'Ok',
        },
      ],
    });
    await toast.present();
  }

  async presentConfirm(header: string, message: string, confirmText: string, cancelText: string, onConfirm: () => void) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancelText,
          role: 'cancel',
          cssClass: 'alert-cancel-btn',
        },
        {
          text: confirmText,
          cssClass: 'alert-confirm-btn',
          handler: () => {
            if (onConfirm) onConfirm();
          }
        }
      ]
    });

    await alert.present();

    const msgEl = document.querySelector('.alert-message');
    if (msgEl) {
      msgEl.innerHTML = message;
    }
  }
}
