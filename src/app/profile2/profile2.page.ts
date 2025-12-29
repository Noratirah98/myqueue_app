import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { MainService } from '../services/main.service';

@Component({
  selector: 'app-profile2',
  templateUrl: './profile2.page.html',
  styleUrls: ['./profile2.page.scss'],
})
export class Profile2Page implements OnInit {
  // User Data
  user = {
    id: 'user_123',
    name: 'Ahmad bin Abdullah',
    email: 'ahmad@example.com',
    phone: '+60123456789',
    icNumber: '901234-01-1234',
    dateOfBirth: '1990-12-34',
    gender: 'Lelaki',
    address: 'Subang Jaya, Selangor',
    memberSince: '2024-01-15'
  };

  // Settings
  settings = {
    notifications: {
      queueAlerts: true,
      appointmentReminders: true,
      systemNotifications: true,
      emailNotifications: false
    },
    preferences: {
      language: 'ms',
      darkMode: false,
      autoCheckIn: false,
      locationServices: true
    },
    privacy: {
      shareHealthData: false,
      allowAnalytics: true
    }
  };

  // Stats
  stats = {
    totalAppointments: 12,
    completedAppointments: 8,
    cancelledAppointments: 2,
    upcomingAppointments: 2,
    totalQueues: 15,
    averageWaitTime: 18 // minutes
  };

  // UI State
  loading: boolean = true;
  editMode: boolean = false;
  editedUser: any = {};

  constructor(
    private router: Router,
    private main: MainService,
    private alertController: AlertController,
    private loadingController: LoadingController,
  ) {}

  async ngOnInit() {
    await this.loadUserProfile();
  }

  async loadUserProfile() {
    this.loading = true;

    // TODO: Load from Firebase
    // const userId = this.authService.currentUserId;
    // const userData = await this.firebaseService.getUser(userId);
    // const userSettings = await this.firebaseService.getUserSettings(userId);
    // const userStats = await this.firebaseService.getUserStats(userId);

    // Mock data already set above
    this.editedUser = { ...this.user };
    
    this.loading = false;
  }

  getInitials(): string {
    if (!this.user.name) return '?';
    
    const names = this.user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return this.user.name.substring(0, 2).toUpperCase();
  }

  toggleEditMode() {
    if (this.editMode) {
      // Cancel editing
      this.editedUser = { ...this.user };
      this.editMode = false;
    } else {
      // Enter edit mode
      this.editMode = true;
    }
  }

  async saveProfile() {
    const loading = await this.loadingController.create({
      message: 'Menyimpan...',
      duration: 1500
    });

    await loading.present();

    // TODO: Update in Firebase
    // await this.firebaseService.updateUser(this.user.id, this.editedUser);

    setTimeout(async () => {
      this.user = { ...this.editedUser };
      this.editMode = false;
      
      await loading.dismiss();
      await this.main.showToast('Profil dikemas kini', 'success');
    }, 1500);
  }

  async updateUserProfile(updates: any) {
    // TODO: Update specific fields in Firebase
    // await this.firebaseService.updateUser(this.user.id, updates);
  }

  async toggleNotificationSetting(setting: string) {
    // Update locally
    (this.settings.notifications as any)[setting] = !(this.settings.notifications as any)[setting];
    
    // TODO: Update in Firebase
    // await this.firebaseService.updateUserSettings(this.user.id, {
    //   notifications: this.settings.notifications
    // });

    await this.main.showToast('Tetapan dikemas kini', 'success');
  }

  async togglePreferenceSetting(setting: string) {
    (this.settings.preferences as any)[setting] = !(this.settings.preferences as any)[setting];
    
    // Special handling for dark mode
    if (setting === 'darkMode') {
      document.body.classList.toggle('dark', this.settings.preferences.darkMode);
    }

    // TODO: Update in Firebase
    await this.main.showToast('Tetapan dikemas kini', 'success');
  }

  async togglePrivacySetting(setting: string) {
    (this.settings.privacy as any)[setting] = !(this.settings.privacy as any)[setting];
    
    // TODO: Update in Firebase
    await this.main.showToast('Tetapan dikemas kini', 'success');
  }

  async changePassword() {
    const alert = await this.alertController.create({
      header: 'Tukar Kata Laluan',
      inputs: [
        {
          name: 'currentPassword',
          type: 'password',
          placeholder: 'Kata laluan semasa'
        },
        {
          name: 'newPassword',
          type: 'password',
          placeholder: 'Kata laluan baharu'
        },
        {
          name: 'confirmPassword',
          type: 'password',
          placeholder: 'Sahkan kata laluan baharu'
        }
      ],
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Tukar',
          handler: async (data) => {
            if (data.newPassword !== data.confirmPassword) {
              await this.main.showToast('Kata laluan tidak sepadan', 'danger');
              return false;
            }
            
            if (data.newPassword.length < 6) {
              await this.main.showToast('Kata laluan minimum 6 aksara', 'danger');
              return false;
            }

            // TODO: Update password in Firebase Auth
            // await this.authService.updatePassword(data.currentPassword, data.newPassword);
            
            await this.main.showToast('Kata laluan berjaya ditukar', 'success');
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async deleteAccount() {
    const alert = await this.alertController.create({
      header: 'Padam Akaun?',
      message: 'Adakah anda pasti untuk memadam akaun ini? Tindakan ini tidak boleh dibatalkan dan semua data anda akan dipadam secara kekal.',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Padam Akaun',
          role: 'destructive',
          handler: async () => {
            const confirmAlert = await this.alertController.create({
              header: 'Pengesahan Terakhir',
              message: 'Taip "PADAM" untuk mengesahkan',
              inputs: [
                {
                  name: 'confirmation',
                  type: 'text',
                  placeholder: 'Taip PADAM'
                }
              ],
              buttons: [
                {
                  text: 'Batal',
                  role: 'cancel'
                },
                {
                  text: 'Sahkan',
                  handler: async (data) => {
                    if (data.confirmation === 'PADAM') {
                      await this.processAccountDeletion();
                      return true;
                    } else {
                      await this.main.showToast('Pengesahan tidak tepat', 'danger');
                      return false;
                    }
                  }
                }
              ]
            });
            
            await confirmAlert.present();
          }
        }
      ]
    });

    await alert.present();
  }

  async processAccountDeletion() {
    const loading = await this.loadingController.create({
      message: 'Memadam akaun...',
      duration: 2000
    });

    await loading.present();

    // TODO: Delete user data from Firebase
    // await this.firebaseService.deleteUser(this.user.id);
    // await this.authService.deleteAccount();

    setTimeout(async () => {
      await loading.dismiss();
      await this.main.showToast('Akaun berjaya dipadam', 'success');
      this.router.navigate(['/login']);
    }, 2000);
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Log Keluar?',
      message: 'Adakah anda pasti untuk log keluar?',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Log Keluar',
          handler: async () => {
            // TODO: Logout from Firebase Auth
            // await this.authService.logout();
            
            await this.main.showToast('Berjaya log keluar', 'success');
            this.router.navigate(['/login']);
          }
        }
      ]
    });

    await alert.present();
  }

  viewAppointmentHistory() {
    this.router.navigate(['/appointments-list2']);
  }

  formatMemberSince(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      month: 'long',
      year: 'numeric'
    };
    return date.toLocaleDateString('ms-MY', options);
  }

  goBack() {
    this.router.navigate(['/home2']);
  }

}
