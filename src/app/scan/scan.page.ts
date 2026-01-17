import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import {
  equalTo,
  get,
  getDatabase,
  orderByChild,
  query,
  ref,
} from 'firebase/database';
import { MainService } from '../services/main.service';

@Component({
  selector: 'app-scan',
  templateUrl: './scan.page.html',
  styleUrls: ['./scan.page.scss'],
})
export class ScanPage implements OnInit {
  hasValidAppointment = false;
  todayAppointment: any = null;

  constructor(
    private router: Router,
    public main: MainService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    this.validateTodayAppointment();
  }

  /* VALIDATE APPOINTMENT */
  async validateTodayAppointment() {
    const uid = this.auth.getUID();
    if (!uid) {
      this.hasValidAppointment = false;
      this.todayAppointment = null;
      return;
    }

    const today = this.main.getToday();
    const db = getDatabase();
    const q = query(ref(db, 'appointments'), orderByChild('uid'), equalTo(uid));
    const snapshot = await get(q);

    this.hasValidAppointment = false;
    this.todayAppointment = null;

    if (!snapshot.exists()) return;

    snapshot.forEach((child) => {
      const data = child.val();
      const status = (data.status || '').toLowerCase().trim();

      // Allow pending/confirmed
      if (
        data.date === today &&
        (status === 'pending' || status === 'confirmed')
      ) {
        this.hasValidAppointment = true;
        this.todayAppointment = {
          id: child.key,
          ...data,
        };
      }
    });
  }

  /* ALLOW QR SCAN ONLY IF VALID */
  async startScan() {
    await this.main.showToast(
      'No appointment found for today. Please check your appointments.',
      'danger',
      'alert-circle-outline',
      'top',
    );
  }
}
