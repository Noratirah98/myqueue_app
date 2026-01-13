import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActionSheetController, AlertController, LoadingController, ModalController } from '@ionic/angular';
import { getDatabase, ref, get, set, query, orderByChild, equalTo } from "firebase/database";
import { AuthService } from '../services/auth.service';
import { MainService } from '../services/main.service';
import { AppointmentDetailModalComponent } from '../appointment-detail-modal/appointment-detail-modal.component';

// type AppointmentStatus = 'pending' | 'completed' | 'cancelled';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
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
    private main: MainService,
    private auth: AuthService,
    private modalController:ModalController,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private actionSheetController: ActionSheetController,
  ) {}

  handleRefresh(event: any) {
    setTimeout(() => {
      // Any calls to load data go here
      event.target.complete();
      this.ionViewWillEnter();
    }, 2000);
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
    const db  = getDatabase();

    try {
      const appointmentRef = query(ref(db, 'appointments'), orderByChild('uid'), equalTo(uid));
      const snapshot       = await get(appointmentRef);

      this.appointments = [];

      if (snapshot.exists()) {
        snapshot.forEach(child => {
          const data = child.val();

          // ONLY patient’s own appointments
          if (data.uid === uid) {
            this.appointments.push({
              id: child.key,
              ...data
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

    this.upcomingAppointments = this.appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return apt.status === 'pending' && aptDate >= today;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    this.pastAppointments = this.appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return apt.status === 'completed' || (apt.status === 'pending' && aptDate < today);
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    this.cancelledAppointments = this.appointments.filter(
      apt => apt.status === 'cancelled'
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getDisplayAppointments(): Appointment[] {
    switch (this.selectedSegment) {
      case 'upcoming': return this.upcomingAppointments;
      case 'past': return this.pastAppointments;
      case 'cancelled': return this.cancelledAppointments;
      default: return [];
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
      year: 'numeric'
    });
  }

  formatFullDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
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

  getStatusColor(status: AppointmentStatus): string {
    switch (status) {
      case 'pending': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'danger';
      default: return 'medium';
    }
  }

  getStatusText(status: AppointmentStatus): string {
    switch (status) {
      case 'pending': return 'Confirmed';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }

  async viewAppointmentDetails(appt: Appointment) {
    const modal = await this.modalController.create({
      component: AppointmentDetailModalComponent,
      componentProps: {
        appt,
        formatFullDate: (d: string) => this.formatFullDate(d),
        getStatusText: (s: AppointmentStatus) => this.getStatusText(s),
      }
    });

    await modal.present();
  }

  async showAppointmentOptions(appt: Appointment) {
    const buttons: any[] = [
      {
        text: 'View Details',
        icon: 'information-circle-outline',
        handler: () => this.viewAppointmentDetails(appt)
      }
    ];

    // Only allow cancel for upcoming confirmed appointments
    if (appt.status === 'pending' && this.getDaysUntil(appt.date) >= 0) {
      buttons.push({
        text: 'Cancel Appointment',
        icon: 'close-circle-outline',
        role: 'destructive',
        handler: () => this.cancelAppointment(appt)
      });
    }

    buttons.push({
      text: 'Close',
      icon: 'close',
      role: 'cancel'
    });

    const sheet = await this.actionSheetController.create({
      header: 'Appointment Options',
      buttons
    });

    await sheet.present();
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
          }
        }
      ]
    });

    await alert.present();
  }

  async processCancellation(appointment: any) {
    const loading = await this.loadingController.create({
      message: 'Cancelling appointment...',
      duration: 1500
    });

    await loading.present();

    const db = getDatabase();

    await set(ref(db, `appointments/${appointment.id}/status`), 'cancelled');

    appointment.status = 'cancelled';
    this.filterAppointments();

    await loading.dismiss();
    await this.main.showToast('Appointment cancelled', 'success');
  }

  // rescheduleAppointment(appointment: any) {
  //   this.router.navigate(['/appointment'], {
  //     queryParams: {
  //       appointmentId: appointment.id,
  //       reschedule: true
  //     }
  //   });
  // }

  bookNewAppointment() {
    this.router.navigate(['/appointment']);
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
