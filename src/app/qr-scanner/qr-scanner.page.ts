import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { get, getDatabase, ref, set } from 'firebase/database';

@Component({
  selector: 'app-qr-scanner',
  templateUrl: './qr-scanner.page.html',
  styleUrls: ['./qr-scanner.page.scss'],
})
export class QrScannerPage implements OnInit {
  queueNumber: string = "";
  scanning: boolean = false;

  constructor(
    private auth: AuthService
  ) {}

  ngOnInit() {}

  async scanQR() {
    // Request camera permission
    const permission = await BarcodeScanner.checkPermission({ force: true });

    if (!permission.granted) {
      alert("Camera permission denied.");
      return;
    }

    // Hide background for better scanning
    BarcodeScanner.hideBackground();

    this.scanning = true;
    document.body.classList.add("scanner-active");

    const result = await BarcodeScanner.startScan(); // Wait for scan

    BarcodeScanner.showBackground();
    document.body.classList.remove("scanner-active");
    this.scanning = false;

    if (result.hasContent) {
      console.log("Scanned content:", result.content);

      const clinicID = result.content;

      // (Optional) validate QR content
      if (clinicID !== "MYCLINIC01") {
        alert("Invalid QR Code");
        return;
      }

      this.generateQueueNumber();
    } else {
      alert("Scan cancelled.");
    }

    BarcodeScanner.stopScan();
  }

  async generateQueueNumber() {
    const uid = this.auth.getUID();
    const db  = getDatabase();

    const today = new Date().toISOString().split("T")[0];

    // Path: queue/YYYY-MM-DD
    const queueRef = ref(db, "queue/" + today);
    const snapshot = await get(queueRef);

    let nextNumber = 1;

    if (snapshot.exists()) {
      nextNumber = Object.keys(snapshot.val()).length + 1;
    }

    const formatted = "Q" + nextNumber.toString().padStart(3, '0');
    this.queueNumber = formatted;

    // Save queue entry
    const newEntryRef = ref(db, `queue/${today}/${formatted}`);

    set(newEntryRef, {
      uid: uid,
      name: "", // optional: fill later with patient profile
      status: "waiting"
    });

    alert("Your Queue Number: " + formatted);
  }
}
