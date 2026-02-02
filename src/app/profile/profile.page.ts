import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  LoadingController,
  NavController,
  ToastController,
} from '@ionic/angular';
import { getAuth, signOut } from 'firebase/auth';
import { getDatabase, ref, get, update } from 'firebase/database';
import { StorageService } from '../services/storage.service';
import { MainService } from '../services/main.service';

interface EmergencyContact {
  name: string;
  relationship: string;
  phoneNumber: string;
}

interface PatientData {
  email: string;
  fullName: string;
  userName: string;
  icNumber: string;
  phoneNumber: string;
  mrnNumber?: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  emergencyContact?: EmergencyContact;
  createdAt: number;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {
  loading: boolean = true;
  patientData: PatientData | null = null;
  userId: string = '';
  showLogoutConfirm = false;

  // Edit states
  editingAddress: boolean = false;
  editingEmergency: boolean = false;

  // Edited values
  editedAddress: string = '';
  editedEmergencyContact: EmergencyContact = {
    name: '',
    relationship: '',
    phoneNumber: '',
  };

  constructor(
    private router: Router,
    private main: MainService,
    private navCtrl: NavController,
    private storage: StorageService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    this.loadProfile();
  }

  async loadProfile() {
    try {
      this.loading = true;

      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        console.log('No user logged in');
        this.router.navigate(['/login']);
        return;
      }

      this.userId = user.uid;

      // Fetch patient data from Firebase
      const db = getDatabase();
      const patientRef = ref(db, `patients/${this.userId}`);
      const snapshot = await get(patientRef);

      if (snapshot.exists()) {
        this.patientData = snapshot.val() as PatientData;
        console.log('Profile loaded:', this.patientData);
      } else {
        console.log('No patient data found');
        await this.main.showToast('Profile data not found', 'warning');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      await this.main.showToast('Error loading profile', 'danger');
    } finally {
      this.loading = false;
    }
  }

  // ===== ADDRESS EDIT =====
  toggleEditAddress() {
    this.editingAddress = true;
    this.editedAddress = this.patientData?.address || '';
  }

  cancelEditAddress() {
    this.editingAddress = false;
    this.editedAddress = '';
  }

  async saveAddress() {
    if (!this.editedAddress || this.editedAddress.trim() === '') {
      await this.main.showToast('Please enter an address', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Saving address...',
    });
    await loading.present();

    try {
      const db = getDatabase();
      const patientRef = ref(db, `patients/${this.userId}`);

      await update(patientRef, {
        address: this.editedAddress.trim(),
      });

      // Update local data
      if (this.patientData) {
        this.patientData.address = this.editedAddress.trim();
      }

      this.editingAddress = false;
      await this.main.showToast(
        'Address updated successfully',
        'success',
        'checkmark-done-outline'
      );
    } catch (error) {
      console.error('Error saving address:', error);
      await this.main.showToast('Failed to update address', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // ===== EMERGENCY CONTACT EDIT =====
  toggleEditEmergency() {
    this.editingEmergency = true;

    // Pre-fill with existing data
    if (this.patientData?.emergencyContact) {
      this.editedEmergencyContact = {
        name: this.patientData.emergencyContact.name || '',
        relationship: this.patientData.emergencyContact.relationship || '',
        phoneNumber: this.patientData.emergencyContact.phoneNumber || '',
      };
    } else {
      // Reset if no existing data
      this.editedEmergencyContact = {
        name: '',
        relationship: '',
        phoneNumber: '',
      };
    }
  }

  cancelEditEmergency() {
    this.editingEmergency = false;
    this.editedEmergencyContact = {
      name: '',
      relationship: '',
      phoneNumber: '',
    };
  }

  isEmergencyContactValid(): boolean {
    return !!(
      this.editedEmergencyContact.name &&
      this.editedEmergencyContact.name.trim() !== '' &&
      this.editedEmergencyContact.relationship &&
      this.editedEmergencyContact.phoneNumber &&
      this.editedEmergencyContact.phoneNumber.trim() !== '' &&
      this.editedEmergencyContact.phoneNumber.length >= 10
    );
  }

  async saveEmergencyContact() {
    if (!this.isEmergencyContactValid()) {
      await this.main.showToast(
        'Please fill in all emergency contact fields',
        'warning'
      );
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Saving emergency contact...',
    });
    await loading.present();

    try {
      const db = getDatabase();
      const patientRef = ref(db, `patients/${this.userId}`);

      await update(patientRef, {
        emergencyContact: {
          name: this.editedEmergencyContact.name.trim(),
          relationship: this.editedEmergencyContact.relationship,
          phoneNumber: this.editedEmergencyContact.phoneNumber.trim(),
        },
      });

      // Update local data
      if (this.patientData) {
        this.patientData.emergencyContact = {
          name: this.editedEmergencyContact.name.trim(),
          relationship: this.editedEmergencyContact.relationship,
          phoneNumber: this.editedEmergencyContact.phoneNumber.trim(),
        };
      }

      this.editingEmergency = false;
      await this.main.showToast(
        'Emergency contact updated successfully',
        'success',
        'checkmark-done-outline'
      );
    } catch (error) {
      console.error('Error saving emergency contact:', error);
      await this.main.showToast('Failed to update emergency contact', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // ===== UTILITY FUNCTIONS =====
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  }

  formatTimestamp(timestamp: number): string {
    if (!timestamp) return 'N/A';

    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  }

  /* ================= NAVIGATION ================= */
  goBack() {
    this.navCtrl.back();
  }

  // ===== LOGOUT =====
  async logout() {
    this.showLogoutConfirm = true;
  }

  async confirmLogout() {
    this.showLogoutConfirm = false;

    const loading = await this.loadingController.create({
      message: 'Logging out...',
      duration: 1500,
    });
    await loading.present();

    try {
      const auth = getAuth();

      // Clear queue session before logout
      await this.storage.remove('patientName');
      await this.storage.remove('uid');

      // Clear queue localStorage
      localStorage.removeItem('myQueueKey');
      localStorage.removeItem('myQueueNumberText');
      localStorage.removeItem('myQueueType');
      localStorage.removeItem('myQueueDate');

      await signOut(auth);

      console.log('User logged out successfully');
      await this.main.showToast(
        'Logged out successfully',
        'success',
        'checkmark-done-circle'
      );
      this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch (error) {
      console.error('Logout error:', error);
      await this.main.showToast(
        'Error logging out. Please try again.',
        'danger',
        'alert-circle'
      );
    } finally {
      await loading.dismiss();
    }
  }
}
