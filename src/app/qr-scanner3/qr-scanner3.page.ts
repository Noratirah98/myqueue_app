import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { equalTo, get, getDatabase, orderByChild, query, ref, set, update } from 'firebase/database';
import { MainService } from '../services/main.service';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';


@Component({
  selector: 'app-qr-scanner3',
  templateUrl: './qr-scanner3.page.html',
  styleUrls: ['./qr-scanner3.page.scss'],
})
export class QrScanner3Page implements OnInit {
  scanning = false;

  constructor(
    private router: Router,
    public main: MainService,
    private auth: AuthService  
  ) {}

  ngOnInit() {
    
  }

  /* START SCAN */
  async scanQR() {
    // Request permission
    // const permission = await BarcodeScanner.checkPermission({ force: true });

    // if (!permission.granted) {
    //   await this.main.showToast(
    //     'Camera permission is required',
    //     'danger',
    //     'alert-circle-outline'
    //   );
    //   return;
    // }

    // // Hide background
    // BarcodeScanner.hideBackground();

    // const result = await BarcodeScanner.startScan();

    // // Stop scan
    // BarcodeScanner.showBackground();
    // BarcodeScanner.stopScan();

    // if (!result.hasContent) {
    //   await this.main.showToast('Scan cancelled', 'warning', 'close-circle-outline');
    //   return;
    // }

    // if (result.content !== 'MYQUEUE_REGISTRATION') {
    //   await this.main.showToast('Invalid QR Code', 'danger', 'alert-circle-outline');
    //   return;
    // }

    await this.processCheckIn();
  }

  /* ------------------------- CHECK-IN LOGIC --------------------------*/
  async processCheckIn() {
    const uid = this.auth.getUID();
    if (!uid) return;

    const today          = new Date().toISOString().split('T')[0];
    const db             = getDatabase();
    const appointmentRef = query(ref(db, 'appointments'), orderByChild('uid'), equalTo(uid));

    const snapshot = await get(appointmentRef);

    let appointment: any = null;
    let appointmentId    = '';

    snapshot.forEach(child => {
      const data = child.val();
      if (
        data.uid === uid &&
        data.date === today &&
        data.status === 'pending'
      ) {
        appointment   = data;
        appointmentId = child.key!;
      }
    });

    if (!appointment) {
      await this.main.showToast(
        'No valid appointment for today',
        'danger',
        'alert-circle-outline'
      );
      return;
    }

    await this.generateQueue(appointment, appointmentId);
  }

  /* ------------------------- FCFS QUEUE GENERATION --------------------------*/
  async generateQueue(appointment: any, appointmentId: string) {
    const today = new Date().toISOString().split('T')[0];
    const db    = getDatabase();

    const type     = appointment.appointmentType;
    const queueRef = ref(db, `queues/${today}/${type}`);
    const snapshot = await get(queueRef); // Read current queue
    const count    = snapshot.exists() ? snapshot.size : 0; // Count how many people already queued

    const prefixMap: any = {
      general     : 'G',
      dental      : 'D',
      maternal    : 'M',
      child       : 'C',
      vaccination : 'V',
      chronic     : 'K'
    };

    const prefix      = prefixMap[type] || 'Q';
    const queueNumber = `${prefix}${(count + 1).toString().padStart(3, '0')}`; // Next person gets next number

    // Count how many people already queued
    await set(ref(db, `queues/${today}/${type}/${queueNumber}`), {
      uid: appointment.uid,
      appointmentId,
      status: 'waiting',
      createdAt: new Date().toISOString()
    });

    await update(ref(db, `appointments/${appointmentId}`), {
      status: 'checked_in',
      queueNumber
    });

    await this.main.showToast(
      `Check-in successful! Queue: ${queueNumber}`,
      'success',
      'checkmark-circle-outline'
    );

    this.router.navigate(['/home']);
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  ionViewWillLeave() {
    BarcodeScanner.showBackground();
    BarcodeScanner.stopScan();
  }
}
