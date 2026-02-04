import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  query,
  orderByChild,
  equalTo,
} from 'firebase/database';
import {
  ModalController,
  AlertController,
  LoadingController,
  ActionSheetController,
} from '@ionic/angular';
import { MainService } from '../services/main.service';
import { AuthService } from '../services/auth.service';
import { AppointmentDetailModalComponent } from '../appointment-detail-modal/appointment-detail-modal.component';
import { RescheduleModalComponent } from './components/reschedule-modal/reschedule-modal.component';
import { AuthGuard } from '../guards/auth.guard';

export type AppointmentStatus =
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled';

export interface Appointment {
  id: string;
  uid: string;
  appointmentType: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  createdAt?: string;
  symptoms?: string;
  notes?: string;
  // Queue-related fields
  queueKey?: number;
  queueNumberText?: string;
  checkInAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

@Component({
  selector: 'app-appointment-list',
  templateUrl: './appointment-list.page.html',
  styleUrls: ['./appointment-list.page.scss'],
})
export class AppointmentListPage implements OnInit {
  // Segment State
  selectedSegment: 'upcoming' | 'past' | 'cancelled' = 'upcoming';

  // Main Data
  appointments: Appointment[] = [];

  // Filtered Lists
  upcomingAppointments: Appointment[] = [];
  pastAppointments: Appointment[] = [];
  cancelledAppointments: Appointment[] = [];

  // UI State
  loading = true;
  refreshing = false;

  constructor(
    private router: Router,
    public main: MainService,
    private auth: AuthService,
    private authGuard: AuthGuard,
    private modalController: ModalController,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private actionSheetController: ActionSheetController
  ) {
    // this.authGuard.canActivate();
  }

  ngOnInit() {}

  async ionViewWillEnter() {
    await this.loadAppointments();
  }

  async loadAppointments() {
    const loading = await this.loadingController.create({
      message: 'Loading...',
      spinner: 'lines',
    });

    await loading.present();

    const uid = this.auth.getUID();
    const db = getDatabase();

    try {
      const appointmentRef = query(
        ref(db, 'appointments'),
        orderByChild('uid'),
        equalTo(uid)
      );
      const snapshot = await get(appointmentRef);

      this.appointments = [];

      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const data = child.val();

          // ONLY patient's own appointments
          if (data.uid === uid) {
            this.appointments.push({
              id: child.key,
              ...data,
            });
          }
        });
      }

      this.filterAppointments();
    } catch (error) {
      console.error(error);
      await this.main.showToast('Failed to load appointments', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  filterAppointments() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Upcoming: confirmed, checked_in + future or today
    this.upcomingAppointments = this.appointments
      .filter((apt) => {
        const aptDate = new Date(apt.date);
        aptDate.setHours(0, 0, 0, 0);

        return (
          (apt.status === 'confirmed' || apt.status === 'checked_in') &&
          aptDate >= today
        );
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Past: completed OR (confirmed but date passed)
    this.pastAppointments = this.appointments
      .filter((apt) => {
        const aptDate = new Date(apt.date);
        aptDate.setHours(0, 0, 0, 0);

        return (
          apt.status === 'completed' ||
          (apt.status === 'confirmed' && aptDate < today)
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Cancelled
    this.cancelledAppointments = this.appointments
      .filter((apt) => apt.status === 'cancelled')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getDisplayAppointments(): Appointment[] {
    switch (this.selectedSegment) {
      case 'upcoming':
        return this.upcomingAppointments;
      case 'past':
        return this.pastAppointments;
      case 'cancelled':
        return this.cancelledAppointments;
      default:
        return [];
    }
  }

  segmentChanged(event: any) {
    this.selectedSegment = event.detail.value;
  }

  async doRefresh(event: any) {
    this.refreshing = true;
    await this.loadAppointments();
    this.refreshing = false;
    event.target.complete();
  }

  // -------- UI Helpers --------
  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  formatFullDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  formatTime(timestamp: string): string {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  getDaysUntil(dateString: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const apptDate = new Date(dateString);
    apptDate.setHours(0, 0, 0, 0);

    const diff = apptDate.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  getDaysUntilText(dateString: string): string {
    const days = this.getDaysUntil(dateString);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 0) return `${Math.abs(days)} days ago`;
    return `${days} days left`;
  }

  isToday(dateString: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const aptDate = new Date(dateString);
    aptDate.setHours(0, 0, 0, 0);
    return today.getTime() === aptDate.getTime();
  }

  getAppointmentLabel(appt: Appointment): string {
    if (appt.status === 'checked_in') {
      return 'In Queue - Waiting';
    }
    if (this.isToday(appt.date)) {
      return 'Today - Ready to Check-In';
    }
    return 'Confirmed Appointment';
  }

  getStatusColor(status: AppointmentStatus): string {
    switch (status) {
      case 'confirmed':
        return 'primary';
      case 'checked_in':
        return 'warning';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'danger';
      default:
        return 'medium';
    }
  }

  getStatusText(status: AppointmentStatus): string {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'checked_in':
        return 'In Queue';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  getStatusIcon(status: AppointmentStatus): string {
    const icons = {
      confirmed: 'checkmark-circle-outline',
      checked_in: 'hourglass-outline',
      completed: 'checkmark-done',
      cancelled: 'close-circle',
    };
    return icons[status] || 'help-circle';
  }

  // -------- Actions --------

  async viewAppointmentDetails(appt: Appointment) {
    const modal = await this.modalController.create({
      component: AppointmentDetailModalComponent,
      componentProps: {
        appt,
        formatFullDate: (d: string) => this.formatFullDate(d),
        formatTime: (t: string) => this.formatTime(t),
        getStatusText: (s: AppointmentStatus) => this.getStatusText(s),
      },
    });

    await modal.present();
  }

  async showAppointmentOptions(appt: Appointment) {
    const buttons: any[] = [
      {
        text: 'View Details',
        icon: 'information-circle-outline',
        handler: () => this.viewAppointmentDetails(appt),
      },
    ];

    // Only allow cancel for upcoming confirmed appointments (not checked in)
    if (appt.status === 'confirmed' && this.getDaysUntil(appt.date) >= 0) {
      buttons.push({
        text: 'Cancel Appointment',
        icon: 'close-circle-outline',
        role: 'destructive',
        handler: () => this.cancelAppointment(appt),
      });
    }

    buttons.push({
      text: 'Close',
      icon: 'close',
      role: 'cancel',
    });

    const sheet = await this.actionSheetController.create({
      header: 'Appointment Options',
      buttons,
    });

    await sheet.present();
  }

  checkIn(appt: Appointment) {
    // Navigate to scan page
    this.router.navigate(['/scan']);
  }

  viewQueue(appt: Appointment) {
    // Navigate to queue status
    this.router.navigate(['/queue-status']);
  }

  async cancelAppointment(appt: Appointment) {
    const alert = await this.alertController.create({
      header: 'Cancel Appointment?',
      message: 'Are you sure you want to cancel this appointment?',
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Yes, Cancel',
          role: 'destructive',
          handler: async () => {
            await this.processCancellation(appt);
          },
        },
      ],
    });

    await alert.present();
  }

  async processCancellation(appointment: Appointment) {
    const loading = await this.loadingController.create({
      message: 'Cancelling appointment...',
      duration: 1500,
    });

    await loading.present();

    const db = getDatabase();
    const updates: any = {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
    };

    await update(ref(db, `appointments/${appointment.id}`), updates);

    appointment.status = 'cancelled';
    appointment.cancelledAt = updates.cancelledAt;
    this.filterAppointments();

    await loading.dismiss();
    await this.main.showToast(
      'Appointment cancelled',
      'success',
      'checkmark-done-outline'
    );
  }

  bookNewAppointment() {
    this.router.navigate(['/appointment']);
  }

  async openRescheduleModal(appointment: any) {
    const modal = await this.modalController.create({
      component: RescheduleModalComponent,
      componentProps: {
        appointment: appointment,
      },
      cssClass: 'reschedule-modal',
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();

    if (data && data.success) {
      // Refresh appointment list
      this.loadAppointments();
    }
  }
}
