import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { AlertController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-qr-scanner2',
  templateUrl: './qr-scanner2.page.html',
  styleUrls: ['./qr-scanner2.page.scss'],
})

export class QrScanner2Page implements OnInit, OnDestroy {

  scanActive: boolean = false;
  scannedData: string = '';
  hasPermission: boolean | null = null;
  
  // Mock clinic data for demo
  appointmentInfo = {
    appointmentType: 'General Treatment',
    date: '2025-12-22',
    time: '3:30 PM'
  };

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
  ) {}

  async ngOnInit() {
    await this.checkPermission();
  }

  async checkPermission() {
    try {
      const status = await BarcodeScanner.checkPermission({ force: true });
      
      if (status.granted) {
        this.hasPermission = true;
      } else if (status.denied) {
        this.hasPermission = false;
        await this.showPermissionAlert();
      } else {
        // Permission not determined, request it
        const newStatus = await BarcodeScanner.checkPermission({ force: true });
        this.hasPermission = newStatus.granted || false;
      }
    } catch (error) {
      console.error('Permission check error:', error);
      this.hasPermission = false;
    }
  }

  async showPermissionAlert() {
    const alert = await this.alertController.create({
      header: 'Camera Permission Required',
      message: 'MyQueue needs camera access to scan QR codes. Please enable camera permission in your device settings.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Open Settings',
          handler: () => {
            BarcodeScanner.openAppSettings();
          }
        }
      ]
    });

    await alert.present();
  }

  async startScan() {
    if (!this.hasPermission) {
      await this.checkPermission();
      if (!this.hasPermission) {
        return;
      }
    }

    // Hide background to show camera
    document.body.classList.add('scanner-active');
    this.scanActive = true;

    const result = await BarcodeScanner.startScan();

    // Stop scanning
    this.stopScan();

    if (result.hasContent) {
      this.scannedData = result.content || '';
      await this.processQRCode(this.scannedData);
    }
  }

  stopScan() {
    BarcodeScanner.stopScan();
    document.body.classList.remove('scanner-active');
    this.scanActive = false;
  }

  async processQRCode(qrData: string) {
    const loading = await this.loadingController.create({
      message: 'Processing...',
      duration: 1500
    });

    await loading.present();

    // TODO: Validate QR code format and clinic ID
    // Expected format: "MYQUEUE-CLINIC-{clinicId}-{timestamp}"
    
    if (this.isValidQRCode(qrData)) {
      const clinicId = this.extractClinicId(qrData);
      
      // TODO: Check if user has appointment today
      // TODO: Generate queue number from Firebase
      
      setTimeout(async () => {
        await loading.dismiss();
        await this.generateQueueNumber(clinicId);
      }, 1500);
    } else {
      await loading.dismiss();
      await this.showInvalidQRAlert();
    }
  }

  isValidQRCode(qrData: string): boolean {
    // Validate QR code format
    // Expected: "MYQUEUE-CLINIC-001-1234567890"
    const pattern = /^MYQUEUE-CLINIC-\d{3}-\d+$/;
    return pattern.test(qrData);
  }

  extractClinicId(qrData: string): string {
    // Extract clinic ID from QR code
    const parts = qrData.split('-');
    return parts[2]; // Returns "001" from "MYQUEUE-CLINIC-001-1234567890"
  }

  async generateQueueNumber(clinicId: string) {
    // TODO: Firebase logic to generate queue number
    // 1. Get current date
    // 2. Check existing queue numbers for today
    // 3. Generate next number (e.g., Q012)
    // 4. Save to Firebase with status 'waiting'
    
    const mockQueueNumber = 'Q' + Math.floor(Math.random() * 100).toString().padStart(3, '0');
    
    const queueData = {
      queueNumber: mockQueueNumber,
      clinicId: clinicId,
      userId: 'current-user-id', // TODO: Get from auth
      date: new Date().toISOString().split('T')[0],
      checkInTime: new Date().toISOString(),
      status: 'waiting',
      estimatedWaitTime: 20
    };

    // TODO: Save to Firebase
    // await this.firebaseService.createQueue(queueData);

    await this.showSuccessAlert(mockQueueNumber);
  }

  async showSuccessAlert(queueNumber: string) {
    const alert = await this.alertController.create({
      header: '✅ Check-In Successful!',
      message: `
        <div class="success-content">
          <h2>Your Queue Number</h2>
          <div class="queue-number">${queueNumber}</div>
          <p>Please wait for your turn. You will receive a notification when your turn is approaching.</p>
        </div>
      `,
      cssClass: 'success-alert',
      buttons: [
        {
          text: 'OK',
          handler: () => {
            // Navigate to home with queue status
            this.router.navigate(['/home'], { 
              queryParams: { queueNumber: queueNumber } 
            });
          }
        }
      ]
    });

    await alert.present();
  }

  async showInvalidQRAlert() {
    const alert = await this.alertController.create({
      header: '❌ Invalid QR Code',
      message: 'The scanned QR code is not from the MyQueue system. Please scan the QR code provided at the clinic counter.',
      buttons: [
        {
          text: 'Try Again',
          handler: () => {
            this.startScan();
          }
        },
        {
          text: 'Back',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  goBack() {
    if (this.scanActive) {
      this.stopScan();
    }
    this.router.navigate(['/home']);
  }

  ngOnDestroy() {
    // Clean up - stop scanning if active
    if (this.scanActive) {
      this.stopScan();
    }
  }
}
