import { Injectable } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})
export class MainService {
  constructor(
    private navCtrl: NavController,
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
}
