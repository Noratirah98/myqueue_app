import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { MainService } from '../services/main.service';

@Component({
  selector: 'app-queue-status2',
  templateUrl: './queue-status2.page.html',
  styleUrls: ['./queue-status2.page.scss'],
})
export class QueueStatus2Page implements OnInit {

  // Queue Data
  myQueue = {
    queueNumber: 'Q012',
    clinicId: '1',
    clinicName: 'Klinik Kesihatan Subang',
    clinicAddress: 'Subang Jaya, Selangor',
    date: '2024-12-09',
    checkInTime: '09:30 AM',
    status: 'waiting', // waiting, serving, completed
    currentServing: 'Q008',
    peopleAhead: 4,
    estimatedWaitTime: 20, // minutes
    position: 9 // position in queue
  };

  // Queue List
  queueList: any[] = [];
  
  // Animation State
  showAlert: boolean = false;
  alertMessage: string = '';
  pulseAnimation: boolean = false;
  
  // Timer
  private updateInterval: any;
  private firebaseListener: any;
  
  loading: boolean = true;

  constructor(
    private router: Router,
    private main: MainService,
    private route: ActivatedRoute,
    private alertController: AlertController,
  ) {}

  async ngOnInit() {
    // Get queue number from route params
    this.route.queryParams.subscribe(params => {
      if (params['queueNumber']) {
        this.myQueue.queueNumber = params['queueNumber'];
      }
    });

    await this.loadQueueStatus();
    this.startRealTimeUpdates();
  }

  ngOnDestroy() {
    // Clean up
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // TODO: Remove Firebase listener
    // if (this.firebaseListener) {
    //   this.firebaseListener.off();
    // }
  }

  async loadQueueStatus() {
    this.loading = true;

    // TODO: Load from Firebase
    // const queueData = await this.firebaseService.getQueueStatus(
    //   this.myQueue.clinicId,
    //   this.myQueue.date,
    //   this.myQueue.queueNumber
    // );

    // Mock queue list
    this.queueList = [
      { number: 'Q001', status: 'completed' },
      { number: 'Q002', status: 'completed' },
      { number: 'Q003', status: 'completed' },
      { number: 'Q004', status: 'completed' },
      { number: 'Q005', status: 'completed' },
      { number: 'Q006', status: 'completed' },
      { number: 'Q007', status: 'completed' },
      { number: 'Q008', status: 'serving' },
      { number: 'Q009', status: 'waiting' },
      { number: 'Q010', status: 'waiting' },
      { number: 'Q011', status: 'waiting' },
      { number: 'Q012', status: 'waiting' }, // Current user
      { number: 'Q013', status: 'waiting' },
      { number: 'Q014', status: 'waiting' },
      { number: 'Q015', status: 'waiting' }
    ];

    this.calculatePosition();
    this.loading = false;
  }

  startRealTimeUpdates() {
    // TODO: Replace with Firebase real-time listener
    // this.firebaseListener = firebase.database()
    //   .ref(`queues/${this.myQueue.clinicId}/${this.myQueue.date}`)
    //   .on('value', (snapshot) => {
    //     this.handleQueueUpdate(snapshot.val());
    //   });

    // Simulate real-time updates (for demo)
    this.updateInterval = setInterval(() => {
      this.simulateQueueUpdate();
    }, 10000); // Update every 10 seconds
  }

  simulateQueueUpdate() {
    // Simulate queue progression
    const currentNum = parseInt(this.myQueue.currentServing.substring(1));
    
    if (currentNum < 12) { // Don't go past user's number
      const newNum = currentNum + 1;
      const oldServing = this.myQueue.currentServing;
      this.myQueue.currentServing = 'Q' + newNum.toString().padStart(3, '0');
      
      // Update queue list
      const oldIndex = this.queueList.findIndex(q => q.number === oldServing);
      if (oldIndex !== -1) {
        this.queueList[oldIndex].status = 'completed';
      }
      
      const newIndex = this.queueList.findIndex(q => q.number === this.myQueue.currentServing);
      if (newIndex !== -1) {
        this.queueList[newIndex].status = 'serving';
      }
      
      this.calculatePosition();
      this.checkAlerts();
    }
  }

  calculatePosition() {
    const myNum = parseInt(this.myQueue.queueNumber.substring(1));
    const servingNum = parseInt(this.myQueue.currentServing.substring(1));
    
    this.myQueue.peopleAhead = myNum - servingNum - 1;
    this.myQueue.estimatedWaitTime = this.myQueue.peopleAhead * 5; // 5 min per person
    
    // Find position in queue
    this.myQueue.position = this.queueList.findIndex(q => q.number === this.myQueue.queueNumber) + 1;
    
    // Update status
    if (this.myQueue.peopleAhead < 0) {
      this.myQueue.status = 'completed';
    } else if (this.myQueue.peopleAhead === 0) {
      this.myQueue.status = 'serving';
    } else {
      this.myQueue.status = 'waiting';
    }
  }

  checkAlerts() {
    // Alert when 3 people ahead
    if (this.myQueue.peopleAhead === 3) {
      this.showNotification('Giliran hampir tiba! 3 orang di hadapan.');
      this.pulseAnimation = true;
      setTimeout(() => this.pulseAnimation = false, 3000);
    }
    
    // Alert when it's your turn
    if (this.myQueue.peopleAhead === 0) {
      this.showNotification('Giliran anda sekarang! Sila ke kaunter.');
      this.pulseAnimation = true;
    }
  }

  async showNotification(message: string) {
    this.alertMessage = message;
    this.showAlert = true;
    
    // Auto hide after 5 seconds
    setTimeout(() => {
      this.showAlert = false;
    }, 5000);

    // Also show toast
    await this.main.showToast(message, 'warning');
  }

  getStatusColor(status: string): string {
    switch(status) {
      case 'waiting': return 'warning';
      case 'serving': return 'success';
      case 'completed': return 'medium';
      default: return 'primary';
    }
  }

  getStatusText(status: string): string {
    switch(status) {
      case 'waiting': return 'Menunggu';
      case 'serving': return 'Sedang Dilayan';
      case 'completed': return 'Selesai';
      default: return status;
    }
  }

  getProgressPercentage(): number {
    const total = this.queueList.length;
    const completed = this.queueList.filter(q => q.status === 'completed').length;
    return Math.round((completed / total) * 100);
  }

  isMyQueue(queueNumber: string): boolean {
    return queueNumber === this.myQueue.queueNumber;
  }

  async cancelQueue() {
    const alert = await this.alertController.create({
      header: 'Batalkan Giliran?',
      message: 'Adakah anda pasti untuk membatalkan giliran ini? Anda perlu ambil nombor baharu jika ingin kembali.',
      buttons: [
        {
          text: 'Tidak',
          role: 'cancel'
        },
        {
          text: 'Ya, Batalkan',
          role: 'destructive',
          handler: async () => {
            // TODO: Update status in Firebase
            // await this.firebaseService.updateQueue(this.myQueue.queueNumber, {
            //   status: 'cancelled'
            // });
            
            await this.main.showToast('Giliran dibatalkan', 'success');
            this.router.navigate(['/home2']);
          }
        }
      ]
    });

    await alert.present();
  }

  async refreshQueue() {
    await this.loadQueueStatus();
    await this.main.showToast('Status dikemas kini', 'success');
  }

  viewClinicLocation() {
    // TODO: Open maps with clinic location
    const address = encodeURIComponent(this.myQueue.clinicAddress);
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
  }

  goBack() {
    this.router.navigate(['/home2']);
  }

  formatTime(timeString: string): string {
    return timeString;
  }
}
