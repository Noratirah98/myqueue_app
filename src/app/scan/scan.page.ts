import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { getAuth } from 'firebase/auth';
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  query,
  orderByChild,
  equalTo,
  runTransaction,
} from 'firebase/database';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { MainService } from '../services/main.service';
import { AuthService } from '../services/auth.service';
import { AuthGuard } from '../guards/auth.guard';
import { NotificationService } from '../services/notification.service';

type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed' | 'checked_in';

@Component({
  selector: 'app-scan',
  templateUrl: './scan.page.html',
  styleUrls: ['./scan.page.scss'],
})
export class ScanPage implements OnInit, OnDestroy {
  hasValidAppointment = false;
  todayAppointment: any = null;

  isScanning = false;
  isGenerating = false;

  scannedType = '';
  content_visibility = '';
  generatedQueueNumber = '';

  // Prefix mapping
  private readonly QUEUE_PREFIX: Record<string, string> = {
    general: 'G',
    dental: 'D',
    maternal: 'M',
    child: 'C',
    vaccination: 'V',
    chronic: 'K',
  };

  // AppointmentType normalization
  private readonly mapApptToQr: Record<string, string> = {
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

  constructor(
    private router: Router,
    public main: MainService,
    private auth: AuthService,
    private pushNotifService: NotificationService
  ) {}

  ngOnInit() {
    this.validateTodayAppointment();
  }

  ngOnDestroy(): void {
    this.stopScan();
  }

  /* ------------------------------- VALIDATE TODAY APPOINTMENT --------------------------------*/
  async validateTodayAppointment() {
    const authUser = getAuth().currentUser;
    const uid = authUser?.uid || this.auth.getUID();

    this.hasValidAppointment = false;
    this.todayAppointment = null;

    if (!uid) return;

    const today = this.main.getToday();
    const db = getDatabase();
    const q = query(ref(db, 'appointments'), orderByChild('uid'), equalTo(uid));
    const snapshot = await get(q);

    if (!snapshot.exists()) return;

    snapshot.forEach((child) => {
      const data = child.val();
      const status = String(data.status || '')
        .toLowerCase()
        .trim();

      // today only + allow ending/confirmed
      if (data.date === today && status === 'confirmed') {
        this.hasValidAppointment = true;
        this.todayAppointment = { id: child.key, ...data };
      }
    });
  }

  /* ------------------------------- START SCAN --------------------------------*/
  async startScan() {
    if (!this.hasValidAppointment || !this.todayAppointment?.id) {
      await this.main.showToast(
        'No appointment found for today',
        'danger',
        'alert-circle-outline'
      );
      return;
    }

    if (this.isScanning || this.isGenerating) return;

    try {
      this.isScanning = true;

      // Check camera permission
      const perm = await BarcodeScanner.checkPermission({ force: false });

      if (!perm.granted) {
        // Request permission first time
        const requested = await BarcodeScanner.checkPermission({ force: true });

        if (!requested.granted) {
          await this.main.showToast(
            'Camera permission required to scan QR code',
            'warning'
          );
          this.isScanning = false;
          return;
        }
      }

      // Start scanning
      BarcodeScanner.hideBackground();
      document.body.classList.add('scanner-active');
      this.content_visibility = 'hidden';

      const result = await BarcodeScanner.startScan();

      // Cleanup
      BarcodeScanner.showBackground();
      document.body.classList.remove('scanner-active');
      this.content_visibility = '';

      if (!result?.hasContent) {
        return; // User cancelled
      }

      await this.handleQRResult(result.content ?? '');
    } catch (e) {
      console.error('Scan error:', e);
      await this.main.showToast('Scan failed. Please try again.', 'danger');
    } finally {
      await BarcodeScanner.stopScan();
      BarcodeScanner.showBackground();
      document.body.classList.remove('scanner-active');
      this.content_visibility = '';
      this.isScanning = false;
    }
  }

  stopScan() {
    BarcodeScanner.showBackground();
    BarcodeScanner.stopScan();
    document.body.classList.remove('scanner-active');
    this.content_visibility = '';
    this.isScanning = false;
  }

  /* ------------------------------- Handle QR Result + validate type --------------------------------*/
  async handleQRResult(qrText: string) {
    const prefix = 'MYQUEUE:TREATMENT=';

    if (!qrText || !qrText.startsWith(prefix)) {
      await this.main.showToast(
        'Invalid clinic QR code',
        'danger',
        'close-circle-outline',
        'top'
      );
      return;
    }

    const treatmentType = (qrText.substring(prefix.length) || '')
      .trim()
      .toLowerCase();

    if (!treatmentType) {
      await this.main.showToast(
        'Invalid clinic QR code',
        'danger',
        'close-circle-outline',
        'top'
      );
      return;
    }

    // normalize appointmentType to match QR
    const apptTypeRaw = (this.todayAppointment?.appointmentType || '')
      .trim()
      .toLowerCase();
    const expectedQr = this.mapApptToQr[apptTypeRaw] || apptTypeRaw;

    if (expectedQr !== treatmentType) {
      await this.main.showToast(
        'Invalid QR code. Please scan the correct clinic counter QR.',
        'danger',
        'alert-circle-outline',
        'top'
      );
      return;
    }

    this.scannedType = treatmentType;

    // proceed to FCFS generation
    await this.generateQueueNumber(this.scannedType);
  }

  /* ------------------------------- FCFS QUEUE GENERATION --------------------------------*/
  async generateQueueNumber(type: string) {
    if (this.isGenerating) return;
    this.isGenerating = true;

    const db = getDatabase();

    try {
      const uid = getAuth().currentUser?.uid || this.auth.getUID();
      const appointmentId = this.todayAppointment?.id;
      const today = this.main.getToday();
      const safeType = (type || '').trim().toLowerCase().replace(/\s+/g, '_');

      if (!uid || !appointmentId || !today || !safeType) {
        await this.main.showToast(
          'Missing data for queue generation.',
          'danger'
        );
        return;
      }

      // Check if already checked in
      const queueTypeRef = ref(db, `queues/${today}/${safeType}`);
      const existingSnap = await get(queueTypeRef);

      if (existingSnap.exists()) {
        let existingKey: string | null = null;

        existingSnap.forEach((child) => {
          const q = child.val();
          if (q?.appointmentId === appointmentId && q?.uid === uid) {
            existingKey = child.key;
          }
        });

        if (existingKey) {
          await this.main.showToast('You already checked in.', 'warning');
          localStorage.setItem('myQueueKey', existingKey);
          localStorage.setItem('myQueueType', safeType);
          localStorage.setItem('myQueueDate', today);
          this.router.navigate(['/queue-status']);
          return;
        }
      }

      // Generate queue number using transaction
      const counterRef = ref(
        db,
        `queueCounters/${today}/${safeType}/lastIssued`
      );

      const txn = await runTransaction(
        counterRef,
        (current) => (current || 0) + 1
      );

      if (!txn.committed) {
        await this.main.showToast(
          'Queue counter transaction failed.',
          'danger'
        );
        return;
      }

      const nextNumber = txn.snapshot.val() as number;

      // Prefix display format (G001, V001, …)
      const prefix = this.QUEUE_PREFIX[safeType] || 'Q';
      const queueNumberText = `${prefix}${String(nextNumber).padStart(3, '0')}`;

      // Store queue entry
      await set(ref(db, `queues/${today}/${safeType}/${nextNumber}`), {
        uid,
        appointmentId,
        appointmentType: safeType,
        queueNumberText,
        status: 'waiting',
        checkInAt: new Date().toISOString(),
      });

      // Update appointment
      await update(ref(db, `appointments/${appointmentId}`), {
        status: 'checked_in',
        queueKey: nextNumber,
        queueNumberText,
        checkInAt: new Date().toISOString(),
      });

      // Cache for queue status page
      localStorage.setItem('myQueueKey', String(nextNumber));
      localStorage.setItem('myQueueNumberText', queueNumberText);
      localStorage.setItem('myQueueType', safeType);
      localStorage.setItem('myQueueDate', today);

      // Show success
      this.generatedQueueNumber = queueNumberText;

      await this.pushNotifService.primeAudioOnce();

      await this.main.showToast(
        `Check-in successful! Queue: ${queueNumberText}`,
        'success',
        'checkmark-done-circle'
      );

      // Auto-redirect after 3 seconds
      setTimeout(() => {
        this.router.navigate(['/queue-status']);
      }, 3000);
    } catch (e: any) {
      console.error('FCFS generateQueueNumber FAILED:', e);
      await this.main.showToast(
        'Permission denied / failed to generate queue.',
        'danger'
      );
    } finally {
      this.isGenerating = false;
    }
  }

  /* ------------------------------- HELPER METHODS --------------------------------*/
  getScanButtonText(): string {
    if (this.isGenerating) return 'Generating Queue...';
    if (this.isScanning) return 'Scanning...';
    return 'Scan QR Code';
  }

  getCounterLetter(): string {
    const type = this.todayAppointment?.appointmentType?.toLowerCase();
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
    return letters[type] || '';
  }

  getClinicName(type: string): string {
    const names: any = {
      general: 'General Treatment',
      dental: 'Dental',
      maternal: 'Maternal Health',
      child: 'Child Health',
      vaccination: 'Vaccination',
      chronic: 'Chronic Disease',
    };
    return names[type] || type;
  }
}
