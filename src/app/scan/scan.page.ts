import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { get, getDatabase, ref } from 'firebase/database';
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
    private main: MainService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    this.validateTodayAppointment();
  }

  /* -------------------------------
   STEP 7.1 — VALIDATE APPOINTMENT
  --------------------------------*/
  async validateTodayAppointment() {
    const uid = this.auth.getUID();
    if (!uid) return;

    const today = new Date().toISOString().split('T')[0];
    const db = getDatabase();

    const snapshot = await get(ref(db, 'appointments'));

    if (!snapshot.exists()) return;

    snapshot.forEach(child => {
      const data = child.val();

      if (
        data.uid === uid &&
        data.date === today &&
        data.status === 'pending'
      ) {
        this.hasValidAppointment = true;
        this.todayAppointment = {
          id: child.key,
          ...data
        };
      }
    });
  }

  /* -------------------------------
   ALLOW QR SCAN ONLY IF VALID
  --------------------------------*/
  async startScan() {
    if (!this.hasValidAppointment) {
      await this.main.showToast(
        'No confirmed appointment for today. Please check your appointment.',
        'danger'
      );
      return;
    }

    // Step 7.2 will be here
    this.router.navigate(['/qr-scanner3']);
  }
}
