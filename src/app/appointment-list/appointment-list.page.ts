import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActionSheetController, AlertController, LoadingController } from '@ionic/angular';
import { getDatabase, ref, get, set, query, orderByChild, equalTo } from "firebase/database";
import { AuthService } from '../services/auth.service';
import { MainService } from '../services/main.service';

type AppointmentStatus = 'pending' | 'completed' | 'cancelled';

interface Appointment {
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
    private alertController: AlertController,
    private loadingController: LoadingController,
    private actionSheetController: ActionSheetController,
  ) {}

  async ngOnInit() {
    await this.loadAppointments();
  }

  async loadAppointments() {
    this.loading = true;

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
    }

    this.loading = false;
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

  // -------- Actions --------

  async viewAppointmentDetails(appt: Appointment) {
    const alert = await this.alertController.create({
      header: 'Appointment Details',
      cssClass: 'appointment-detail-alert',
      message: `
        <div class="detail-content">
          <div class="detail-item">
            <strong>Appointment Type</strong>
            <p>${appt.appointmentType}</p>
          </div>
          <div class="detail-item">
            <strong>Date & Time</strong>
            <p>${this.formatFullDate(appt.date)}</p>
            <p class="sub">${appt.time}</p>
          </div>
          ${appt.symptoms ? `
            <div class="detail-item">
              <strong>Symptoms</strong>
              <p>${appt.symptoms}</p>
            </div>
          ` : ''}
          ${appt.notes ? `
            <div class="detail-item">
              <strong>Notes</strong>
              <p>${appt.notes}</p>
            </div>
          ` : ''}
          <div class="detail-item">
            <strong>Status</strong>
            <p>${this.getStatusText(appt.status)}</p>
          </div>
        </div>
      `,
      buttons: ['Close']
    });

    await alert.present();
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
