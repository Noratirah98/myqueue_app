import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { getAuth, signOut } from 'firebase/auth';
import { getDatabase, ref, onValue } from "firebase/database";
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  userName: string = 'Patient';
  unreadNotifications = 0;

  // Nearest appointment only
  nextAppointment: any = null;

  // Queue State (Phase C)
  hasActiveQueue = false;
  userQueueNumber = '';
  currentServingNumber = '';
  peopleAhead = 0;
  estimatedWaitTime = 0;

  loadingAppointment = true;

  constructor(
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.loadUserProfile();
    this.loadNearestAppointment();
    this.loadQueueStatus(); // future-ready
  }

  /* LOAD USER PROFILE */
  loadUserProfile() {
    const uid = this.auth.getUID();
    const db = getDatabase();

    onValue(ref(db, `patients/${uid}`), snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        this.userName = data.name || 'Patient';
      }
    });
  }

  /* LOAD NEAREST APPOINTMENT */
  loadNearestAppointment() {
    const uid = this.auth.getUID();
    if (!uid) {
      this.loadingAppointment = false;
      return;
    }

    const db = getDatabase();
    const appointmentRef = ref(db, `appointments`);

    onValue(appointmentRef, snapshot => {
      if (!snapshot.exists()) {
        this.nextAppointment = null;
        this.loadingAppointment = false;
        return;
      }

      const list: any[] = [];

      snapshot.forEach(child => {
        const data = child.val();

        if (data.uid === uid && (data.status === 'pending' || data.status === 'confirmed')) {
          list.push({
            id: child.key,
            date: data.date,
            time: data.time,
            appointmentType: data.appointmentType,
            status: data.status,
            createdAt: data.createdAt
          });
        }
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcoming = list
        .filter(a => {
          const d = new Date(a.date);
          d.setHours(0, 0, 0, 0);
          return d >= today;
        })
        .sort((a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

      // ONLY ONE (nearest)
      this.nextAppointment = upcoming.length > 0 ? upcoming[0] : null;
      this.loadingAppointment = false;
    });
  }

  /* QUEUE STATUS (STUB) - FCFS logic applies later */
  loadQueueStatus() {
    // Phase C
    this.hasActiveQueue = false;
  }

  /* UI ACTIONS */
  bookAppointment() {
    this.router.navigate(['/appointment']);
  }

  viewAppointments() {
    this.router.navigate(['/appointment-list']);
  }

  scanQRCode() {
    this.router.navigate(['/scan']);
  }

  refreshQueue() {
    this.loadQueueStatus();
  }

  viewNotifications() {
    // optional
  }

  logout() {
    const auth = getAuth();

    signOut(auth).then(() => {
      this.router.navigateByUrl('/login');
    }).catch(err => {
      console.log(err);
    });
  }

  /* HELPERS */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  // getStatusText(status: string) {
  //   switch (status) {
  //     case 'pending': return 'Pending';
  //     case 'confirmed': return 'Confirmed';
  //     case 'completed': return 'Completed';
  //     default: return status;
  //   }
  // }

  // getStatusColor(status: string) {
  //   switch (status) {
  //     case 'pending': return 'warning';
  //     case 'confirmed': return 'primary';
  //     case 'completed': return 'success';
  //     default: return 'medium';
  //   }
  // }

  /* QUEUE UI HELPERS */
  getQueueStatusText() {
    return 'Waiting';
  }

  getQueueStatusColor() {
    return 'warning';
  }

  getDaysUntil(dateString: string): number {
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
    return `${days} days`;
  }

  getCountdownColor(dateString: string): string {
    const days = this.getDaysUntil(dateString);
    if (days === 0) return 'danger';
    if (days === 1) return 'warning';
    return 'primary';
  }
}
