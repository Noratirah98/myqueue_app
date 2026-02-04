import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { getAuth, signOut } from 'firebase/auth';
import {
  equalTo,
  get,
  getDatabase,
  onValue,
  orderByChild,
  query,
  ref,
  off,
} from 'firebase/database';
import { AuthService } from '../services/auth.service';
import { StorageService } from '../services/storage.service';
import { MainService } from '../services/main.service';
import { AlertController, LoadingController } from '@ionic/angular';
import { AuthGuard } from '../guards/auth.guard';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  userName: string = 'Patient';
  userId: any;
  unreadNotifications = 0;

  nextAppointment: any = null;

  // Queue State
  hasActiveQueue = false;
  userQueueNumber = '';
  currentServingNumber = '-';
  peopleAhead = 0;
  estimatedWaitTime = 0;
  loadingAppointment = true;
  showLogoutConfirm = false;

  // Track actual queue status
  myQueueStatus: string = 'waiting';

  // Store listener references for cleanup
  private queueListener: any = null;
  private currentServingListener: any = null;
  private myQueueKey: number = 0;
  private myClinicType: string = '';
  private myQueueDate: string = '';

  constructor(
    private router: Router,
    private main: MainService,
    private auth: AuthService,
    private authGuard: AuthGuard,
    private storage: StorageService,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {}

  ngOnDestroy() {
    // IMPORTANT: Clean up listeners when leaving page
    this.stopQueueListeners();
  }

  async ionViewWillEnter() {
    this.loadUserProfile();
    this.loadNearestAppointment();
  }

  ionViewWillLeave() {
    // Clean up when navigating away
    this.stopQueueListeners();
  }

  async loadUserProfile() {
    const authUser = getAuth().currentUser;
    const uid = authUser?.uid || this.auth.getUID();

    if (!uid) {
      this.userName = 'Patient';
      return;
    }

    const cachedName = await this.storage.get<string>('patientName');

    if (cachedName) {
      this.userName = cachedName;
    } else {
      try {
        const db = getDatabase();
        const patientSnap = await get(ref(db, `patients/${uid}`));
        const patient = patientSnap.exists() ? patientSnap.val() : null;
        const patientName = patient?.username ?? 'Patient';

        this.userName = patientName;
        await this.storage.set('patientName', patientName);
      } catch (e) {
        console.error('Failed to load patient profile:', e);
        this.userName = 'Patient';
      }
    }
  }

  loadNearestAppointment() {
    const uid = this.auth.getUID();
    if (!uid) {
      this.loadingAppointment = false;
      return;
    }

    const db = getDatabase();
    const appointmentRef = query(
      ref(db, 'appointments'),
      orderByChild('uid'),
      equalTo(uid)
    );

    onValue(appointmentRef, (snapshot) => {
      if (!snapshot.exists()) {
        this.nextAppointment = null;
        this.loadingAppointment = false;
        this.hasActiveQueue = false;
        return;
      }

      const list: any[] = [];

      snapshot.forEach((child) => {
        const data = child.val();

        if (
          data.uid === uid &&
          (data.status === 'confirmed' || data.status === 'checked_in')
        ) {
          list.push({
            id: child.key,
            date: data.date,
            time: data.time,
            appointmentType: data.appointmentType,
            status: data.status,
            createdAt: data.createdAt,
            queueNumberText: data.queueNumberText,
            queueKey: data.queueKey,
          });
        }
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcoming = list
        .filter((a) => {
          const d = new Date(a.date);
          d.setHours(0, 0, 0, 0);
          return d >= today;
        })
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

      this.nextAppointment = upcoming.length > 0 ? upcoming[0] : null;
      this.loadingAppointment = false;

      if (this.nextAppointment && this.isCheckedIn(this.nextAppointment)) {
        this.loadQueueStatus();
      } else {
        this.hasActiveQueue = false;
        this.stopQueueListeners(); // Stop if no active queue
      }
    });
  }

  /* ✅ UPDATED: Load Queue Status with Real-Time Monitoring */
  loadQueueStatus() {
    const uid = this.auth.getUID();
    if (!uid || !this.nextAppointment) {
      this.hasActiveQueue = false;
      return;
    }

    const db = getDatabase();
    const today = this.getToday();

    const rawType = this.nextAppointment.appointmentType?.toLowerCase() || '';
    const clinicType = this.normalizeAppointmentType(rawType);

    if (!clinicType) {
      this.hasActiveQueue = false;
      return;
    }

    // Store for later use
    this.myQueueKey = this.nextAppointment.queueKey;
    this.myClinicType = clinicType;
    this.myQueueDate = today;

    // Stop previous listeners
    this.stopQueueListeners();

    console.log('🔥 Starting real-time queue monitoring...');

    // 1. Listen to queue changes
    const queuePath = `queues/${today}/${clinicType}`;
    const queueRef = ref(db, queuePath);

    this.queueListener = onValue(queueRef, (snapshot) => {
      if (!snapshot.exists()) {
        this.hasActiveQueue = false;
        return;
      }

      const queueData = snapshot.val();
      const myQueueKey = this.nextAppointment.queueKey;

      if (!myQueueKey) {
        this.hasActiveQueue = false;
        return;
      }

      const myQueue = queueData[myQueueKey];

      if (!myQueue) {
        console.log('✅ Queue entry removed');
        this.hasActiveQueue = false;
        this.stopQueueListeners();
        return;
      }

      if (myQueue.status === 'completed') {
        console.log('✅ Service completed!');
        this.handleServiceCompleted();
        return;
      }

      // ✅ FIX: Store the actual queue status
      this.myQueueStatus = myQueue.status || 'waiting';

      // Update queue info
      this.hasActiveQueue = true;
      this.userQueueNumber = myQueue.queueNumberText || '';

      // ✅ FIX: Calculate people ahead - ONLY count "waiting" entries
      let ahead = 0;
      for (const [key, value] of Object.entries(queueData)) {
        const queue: any = value;
        // Only count entries with status "waiting" (not "serving")
        if (queue.status === 'waiting' && parseInt(key) < myQueueKey) {
          ahead++;
        }
      }

      this.peopleAhead = ahead;
      this.estimatedWaitTime = ahead * 5;

      console.log(
        `📊 People ahead: ${ahead}, Queue: ${this.userQueueNumber}, Status: ${this.myQueueStatus}`
      );
    });

    // 2. Listen to current serving (REAL-TIME!)
    this.loadCurrentServingRealTime(today, clinicType);
  }

  /* Real-time current serving with YOUR TURN detection */
  loadCurrentServingRealTime(date: string, type: string) {
    const db = getDatabase();
    const currentPath = `currentQueue/${date}/${type}`;
    const currentRef = ref(db, currentPath);

    this.currentServingListener = onValue(currentRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const servingKey = data.currentNumber || data.currentKey;

        // Format display number
        this.currentServingNumber = this.formatQueueNumberFromKey(
          servingKey,
          type
        );

        console.log('📢 Current serving:', this.currentServingNumber);

        if (
          servingKey === this.myQueueKey &&
          this.myQueueStatus === 'serving'
        ) {
          this.showYourTurnNotification();
        }
      } else {
        this.currentServingNumber = '-';
      }
    });
  }

  /* Format queue number from key */
  formatQueueNumberFromKey(queueKey: number, type: string): string {
    const letters: any = {
      general: 'G',
      dental: 'D',
      maternal: 'M',
      child: 'C',
      vaccination: 'V',
      chronic: 'K',
    };

    const letter = letters[type] || 'Q';
    return `${letter}${String(queueKey).padStart(3, '0')}`;
  }

  /* Show YOUR TURN notification */
  async showYourTurnNotification() {
    // Vibrate
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // Show alert
    const alert = await this.alertController.create({
      header: "It's Your Turn! 🎉",
      message: `Queue ${this.userQueueNumber}. Please proceed to the counter now.`,
      cssClass: 'your-turn-alert',
      buttons: [
        {
          text: 'OK',
          role: 'confirm',
          cssClass: 'alert-button-confirm',
        },
      ],
      backdropDismiss: false,
    });

    await alert.present();
  }

  /* Handle service completed */
  async handleServiceCompleted() {
    const alert = await this.alertController.create({
      header: '✅ Service Completed',
      message:
        'Thank you for using MyQueue! We hope you had a pleasant experience. 😊',
      buttons: ['OK'],
      cssClass: 'service-completed-alert',
      backdropDismiss: false,
    });

    await alert.present();

    // Clear queue state after 2 seconds
    setTimeout(() => {
      this.hasActiveQueue = false;
      this.userQueueNumber = '';
      this.currentServingNumber = '-';
      this.peopleAhead = 0;
      this.estimatedWaitTime = 0;
      this.myQueueStatus = 'waiting';
      this.stopQueueListeners();
    }, 2000);
  }

  /* Stop all queue listeners */
  stopQueueListeners() {
    const db = getDatabase();

    if (this.queueListener && this.myQueueDate && this.myClinicType) {
      const queuePath = `queues/${this.myQueueDate}/${this.myClinicType}`;
      const queueRef = ref(db, queuePath);
      off(queueRef, 'value', this.queueListener);
      this.queueListener = null;
      console.log('🔥 Queue listener stopped');
    }

    if (this.currentServingListener && this.myQueueDate && this.myClinicType) {
      const currentPath = `currentQueue/${this.myQueueDate}/${this.myClinicType}`;
      const currentRef = ref(db, currentPath);
      off(currentRef, 'value', this.currentServingListener);
      this.currentServingListener = null;
      console.log('🔥 Current serving listener stopped');
    }
  }

  normalizeAppointmentType(type: string): string {
    const mapping: any = {
      'general treatment': 'general',
      general: 'general',
      dental: 'dental',
      'maternal health': 'maternal',
      maternal: 'maternal',
      'child health': 'child',
      child: 'child',
      vaccination: 'vaccination',
      'chronic disease': 'chronic',
      chronic: 'chronic',
    };
    return mapping[type] || type.replace(/\s+/g, '_');
  }

  getToday(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  isToday(dateString: string): boolean {
    if (!dateString) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkDate = new Date(dateString);
    checkDate.setHours(0, 0, 0, 0);

    return checkDate.getTime() === today.getTime();
  }

  isCheckedIn(appointment: any): boolean {
    return appointment && appointment.status === 'checked_in';
  }

  bookAppointment() {
    this.router.navigate(['/appointment']);
  }

  viewAppointments() {
    this.router.navigate(['/appointment-list']);
  }

  scanQRCode() {
    this.router.navigate(['/scan']);
  }

  viewFullQueueStatus() {
    // Update localStorage before navigating
    if (this.nextAppointment && this.nextAppointment.queueKey) {
      const today = this.getToday();
      const rawType = this.nextAppointment.appointmentType?.toLowerCase() || '';
      const clinicType = this.normalizeAppointmentType(rawType);

      console.log('📊 Navigating to queue status:', {
        queueKey: this.nextAppointment.queueKey,
        queueNumber: this.nextAppointment.queueNumberText,
        clinicType: clinicType,
      });

      localStorage.setItem('myQueueKey', String(this.nextAppointment.queueKey));
      localStorage.setItem(
        'myQueueNumberText',
        this.nextAppointment.queueNumberText || ''
      );
      localStorage.setItem('myQueueType', clinicType);
      localStorage.setItem('myQueueDate', today);
    }

    this.router.navigate(['/queue-status']);
  }

  viewAppointmentDetails(appointment: any) {
    this.router.navigate(['/appointment-list']);
  }

  async cancelAppointment(appointment: any) {
    const confirm = await this.main.presentConfirm(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      'Yes, Cancel',
      'No',
      async () => {
        try {
          const db = getDatabase();
          await get(ref(db, `appointments/${appointment.id}/status`)).then(
            async (snap) => {
              if (snap.exists()) {
                const appointmentRef = ref(
                  db,
                  `appointments/${appointment.id}`
                );
                await get(appointmentRef).then(async (snapshot) => {
                  if (snapshot.exists()) {
                    const updates: any = {};
                    updates[`appointments/${appointment.id}/status`] =
                      'cancelled';

                    const dbRef = ref(db);
                    await get(dbRef).then(() => {
                      this.main.showToast(
                        'Appointment cancelled',
                        'success',
                        'checkmark-done-outline'
                      );
                    });
                  }
                });
              }
            }
          );
        } catch (error) {
          console.error('Error cancelling appointment:', error);
          this.main.showToast(
            'Error cancelling appointment',
            'danger',
            'alert-circle'
          );
        }
      }
    );
  }

  refreshQueue() {
    console.log('🔄 Refreshing queue...');
    this.loadQueueStatus();
    this.main.showToast('Refreshed', 'success', 'refresh');
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  async logout(event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    this.showLogoutConfirm = true;

    // Force change detection
    setTimeout(() => {
      console.log('🔍 Modal state:', this.showLogoutConfirm);
    }, 100);
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
      await this.storage.remove('uid');
      await this.storage.remove('isLoggedIn');
      await this.storage.remove('patientName');

      // Clear queue localStorage
      localStorage.removeItem('myQueueKey');
      localStorage.removeItem('myQueueNumberText');
      localStorage.removeItem('myQueueType');
      localStorage.removeItem('myQueueDate');

      await signOut(auth);

      // Stop listeners before logout
      this.stopQueueListeners();

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

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  formatShortDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  }

  getClinicIcon(type: string): string {
    const normalized = type?.toLowerCase() || '';
    const icons: any = {
      general: '🩺',
      'general treatment': '🩺',
      dental: '🦷',
      maternal: '🤰',
      'maternal health': '🤰',
      child: '👶',
      'child health': '👶',
      vaccination: '💉',
      chronic: '💊',
      'chronic disease': '💊',
    };
    return icons[normalized] || '🏥';
  }

  getCounterLetter(type: string): string {
    const normalized = type?.toLowerCase() || '';
    const letters: any = {
      general: 'G',
      'general treatment': 'G',
      dental: 'D',
      maternal: 'M',
      'maternal health': 'M',
      child: 'C',
      'child health': 'C',
      vaccination: 'V',
      chronic: 'K',
      'chronic disease': 'K',
    };
    return letters[normalized] || '';
  }

  /* ✅ UPDATED: Queue UI helpers - Check actual status */
  getQueueStatusText() {
    // Check actual queue status first
    if (this.myQueueStatus === 'serving') {
      return 'YOUR TURN! 🎉';
    } else if (this.peopleAhead === 0) {
      return 'Next in line';
    } else if (this.peopleAhead === 1) {
      return '1 person ahead';
    } else {
      return 'Waiting';
    }
  }

  getQueueStatusColor() {
    // Check actual status
    if (this.myQueueStatus === 'serving') {
      return 'success';
    } else if (this.peopleAhead === 0) {
      return 'warning'; // Next in line
    } else if (this.peopleAhead <= 2) {
      return 'primary';
    } else {
      return 'medium';
    }
  }

  getDaysUntil(dateString: string): number {
    if (!dateString) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const aptDate = new Date(dateString);
    aptDate.setHours(0, 0, 0, 0);

    const diff = aptDate.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  getCountdownText(dateString: string): string {
    const days = this.getDaysUntil(dateString);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 7) return `${days} days`;
    return `${Math.ceil(days / 7)} week${days >= 14 ? 's' : ''}`;
  }

  getCountdownColor(dateString: string): string {
    const days = this.getDaysUntil(dateString);
    if (days === 0) return 'danger';
    if (days === 1) return 'warning';
    if (days <= 3) return 'primary';
    return 'medium';
  }

  handleRefresh(event: any) {
    setTimeout(() => {
      this.ionViewWillEnter();
      event.target.complete();
    }, 1500);
  }
}
