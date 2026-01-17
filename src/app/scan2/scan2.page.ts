import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { MainService } from '../services/main.service';
import {
  get,
  getDatabase,
  ref,
  runTransaction,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { getAuth } from 'firebase/auth';

type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'checked-in';

@Component({
  selector: 'app-scan2',
  templateUrl: './scan2.page.html',
  styleUrls: ['./scan2.page.scss'],
})
export class Scan2Page implements OnInit {
  hasValidAppointment = false;
  todayAppointment: any = null;

  isScanning = false;
  isGenerating = false;

  scannedType: string = '';
  generatedQueueNumber: string = '';

  constructor(
    private auth: AuthService,
    private main: MainService,
  ) {}

  ngOnInit() {
    this.validateTodayAppointment();
  }

  /* -------------------------------
   STEP 7.1 — VALIDATE TODAY APPOINTMENT
  --------------------------------*/
  async validateTodayAppointment() {
    const uid = this.getUidSafe();
    if (!uid) {
      this.hasValidAppointment = false;
      this.todayAppointment = null;
      return;
    }

    const today = this.main.getToday();

    console.log('Today: ', today);

    const db = getDatabase();
    // IMPORTANT: this query matches your security rules (read by uid)
    const { query, orderByChild, equalTo } = await import('firebase/database');
    const q = query(ref(db, 'appointments'), orderByChild('uid'), equalTo(uid));
    const snapshot = await get(q);

    this.hasValidAppointment = false;
    this.todayAppointment = null;

    if (!snapshot.exists()) return;

    snapshot.forEach((child) => {
      const data = child.val();
      const status = String(data.status || '')
        .toLowerCase()
        .trim();

      // ✅ Today only, allow pending/confirmed
      if (
        data.date === today &&
        (status === 'pending' || status === 'confirmed')
      ) {
        this.hasValidAppointment = true;
        this.todayAppointment = { id: child.key, ...data };
      }
    });
  }

  /* -------------------------------
   STEP 7.2 — START SCAN
  --------------------------------*/
  async startScan() {
    if (!this.hasValidAppointment || !this.todayAppointment?.id) {
      await this.main.showToast(
        'No appointment found for today. Please check your appointments.',
        'danger',
        'alert-circle-outline',
        'top',
      );
      return;
    }

    try {
      this.isScanning = true;

      // Camera permission
      const perm = await BarcodeScanner.checkPermission({ force: true });
      if (!perm.granted) {
        await this.main.showToast(
          'Camera permission is required to scan QR.',
          'warning',
        );
        return;
      }

      // Start scanning
      BarcodeScanner.hideBackground();
      document.body.classList.add('scanner-active');

      const result = await BarcodeScanner.startScan();

      // Stop UI overlay
      BarcodeScanner.showBackground();
      document.body.classList.remove('scanner-active');

      if (!result?.hasContent) {
        await this.main.showToast('Scan cancelled.', 'medium');
        return;
      }

      const raw = String(result.content).trim();
      const type = this.parseQueueTypeFromQR(raw);

      if (!type) {
        await this.main.showToast(
          'Invalid QR code. Please scan the correct clinic QR.',
          'danger',
          'close-circle-outline',
          'top',
        );
        return;
      }

      this.scannedType = type;

      await this.generateQueueNumberFCFS(type);
    } catch (e) {
      console.error(e);
      await this.main.showToast('Scan failed. Please try again.', 'danger');
    } finally {
      this.isScanning = false;
      // Always stop scanning safely
      try {
        await BarcodeScanner.stopScan();
      } catch {}
      BarcodeScanner.showBackground();
      document.body.classList.remove('scanner-active');
    }
  }

  /* FCFS QUEUE NUMBER GENERATION -*/
  async generateQueueNumberFCFS(type: string) {
    if (this.isGenerating) return;

    const uid = this.getUidSafe();
    if (!uid) return;

    const today = this.main.getToday();
    const appointmentId = this.todayAppointment?.id;

    this.isGenerating = true;
    this.generatedQueueNumber = '';

    try {
      const db = getDatabase();

      // Atomic counter (prevents duplicates)
      const counterRef = ref(db, `queueCounters/${today}/${type}/last`);

      const tx = await runTransaction(counterRef, (current) => {
        const last = typeof current === 'number' ? current : 0;
        return last + 1;
      });

      if (!tx.committed) {
        throw new Error('Transaction not committed');
      }

      const nextNumber = tx.snapshot.val() as number;
      const queueNumber = `Q${String(nextNumber).padStart(3, '0')}`;

      // Save queue entry
      const entryRef = ref(db, `queues/${today}/${type}/${queueNumber}`);
      await set(entryRef, {
        appointmentId,
        uid,
        type,
        status: 'waiting',
        checkInAt: serverTimestamp(),
      });

      // update appointment status to checked-in (nice for demo)
      await update(ref(db, `appointments/${appointmentId}`), {
        status: 'checked-in',
      });

      this.generatedQueueNumber = queueNumber;

      await this.main.showToast(
        `Check-in successful! Your queue number: ${queueNumber}`,
        'success',
        'checkmark-circle-outline',
        'top',
      );
    } catch (e: any) {
      console.error(e);
      await this.main.showToast(
        'Failed to generate queue number. Try again.',
        'danger',
      );
    } finally {
      this.isGenerating = false;
    }
  }

  parseQueueTypeFromQR(raw: string): string | null {
    const val = raw.toUpperCase();

    const allowed = [
      'GENERAL',
      'DENTAL',
      'MATERNAL',
      'CHILD',
      'VACCINE',
      'CHRONIC',
    ];

    if (allowed.includes(val)) return val;

    if (val.startsWith('TYPE=')) {
      const t = val.replace('TYPE=', '').trim();
      if (allowed.includes(t)) return t;
    }

    return null;
  }

  private getUidSafe(): string | null {
    const authUser = getAuth().currentUser;
    return authUser?.uid || this.auth.getUID() || null;
  }
}
