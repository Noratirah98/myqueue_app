import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { getDatabase, ref, onValue, off } from 'firebase/database';

@Component({
  selector: 'app-queue-status',
  templateUrl: './queue-status.page.html',
  styleUrls: ['./queue-status.page.scss'],
})
export class QueueStatusPage implements OnInit {
  private hasShownYourTurnAlert = false;
  myQueueKey = 0;
  myQueueNumberText = '—';
  myQueueType = '';
  myQueueDate = '';

  // live UI state
  currentServingKey = 0;
  currentServingText = '—';
  peopleAhead = 0;
  status: 'waiting' | 'serving' | 'completed' = 'waiting';

  // estimate
  estimatedWaitMinutes = 0;
  readonly AVG_SERVICE_MIN = 5;

  // TV Display - upcoming queue (3-5 items)
  upcomingQueue: Array<{
    key: number;
    numberText: string;
    isYou: boolean;
    isServing: boolean;
  }> = [];

  // firebase refs
  private db = getDatabase();
  private queueListRefPath = '';
  private currentRefPath = '';

  constructor(
    private router: Router,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.loadQueueIdentity();
    this.startRealtimeListeners();
  }

  ngOnDestroy(): void {
    // cleanup listeners
    if (this.queueListRefPath) off(ref(this.db, this.queueListRefPath));
    if (this.currentRefPath) off(ref(this.db, this.currentRefPath));
  }

  private clearQueueSession() {
    localStorage.removeItem('myQueueKey');
    localStorage.removeItem('myQueueNumberText');
    localStorage.removeItem('myQueueType');
    localStorage.removeItem('myQueueDate');
  }

  private loadQueueIdentity() {
    const keyStr = localStorage.getItem('myQueueKey');
    const type = localStorage.getItem('myQueueType');
    const date = localStorage.getItem('myQueueDate');
    const numText = localStorage.getItem('myQueueNumberText');

    if (!keyStr || !type || !date) {
      console.log('❌ No queue session found, redirecting to home');
      this.clearQueueSession();
      this.router.navigateByUrl('/home', { replaceUrl: true });
      return;
    }

    this.myQueueKey = Number(keyStr);
    this.myQueueType = type;
    this.myQueueDate = date;
    this.myQueueNumberText =
      numText || `Q${String(this.myQueueKey).padStart(3, '0')}`;

    console.log('✅ Queue session loaded:', {
      key: this.myQueueKey,
      type: this.myQueueType,
      number: this.myQueueNumberText,
    });
  }

  private startRealtimeListeners() {
    if (!this.myQueueKey || !this.myQueueType || !this.myQueueDate) return;

    this.queueListRefPath = `queues/${this.myQueueDate}/${this.myQueueType}`;
    this.currentRefPath = `currentQueue/${this.myQueueDate}/${this.myQueueType}`;

    const queueRef = ref(this.db, this.queueListRefPath);
    const currentRef = ref(this.db, this.currentRefPath);

    console.log('🔥 Starting queue status listeners...');

    // LIVE current serving
    onValue(currentRef, (snap) => {
      if (!snap.exists()) {
        this.currentServingKey = 0;
        this.currentServingText = '—';
        return;
      }

      const val = snap.val() || {};
      const key = Number(val.currentNumber ?? val.currentKey ?? 0);
      this.currentServingKey = isNaN(key) ? 0 : key;
      this.currentServingText =
        this.currentServingKey > 0
          ? this.formatQueueNumber(this.currentServingKey)
          : '—';

      if (this.currentServingKey === this.myQueueKey) {
        this.status = 'serving';
        console.log('🎉 YOUR TURN!');

        // Show notification only once
        if (!this.hasShownYourTurnAlert) {
          this.showYourTurnNotification();
          this.hasShownYourTurnAlert = true;
        }
      }
    });

    // LIVE queue list
    onValue(queueRef, (snap) => {
      if (!snap.exists()) {
        console.log('Queue deleted - service completed');
        this.status = 'completed';
        this.peopleAhead = 0;
        this.estimatedWaitMinutes = 0;
        this.upcomingQueue = [];

        // Queue deleted = service completed, clear session
        this.clearQueueSession();
        return;
      }

      let myEntry: any = null;
      let ahead = 0;
      const allQueue: Array<{ key: number; data: any }> = [];

      snap.forEach((child) => {
        const key = Number(child.key);
        const data = child.val();

        if (!isNaN(key)) {
          allQueue.push({ key, data });
        }

        if (key === this.myQueueKey) {
          myEntry = data;
        }

        // Only count "waiting" entries ahead
        if (
          !isNaN(key) &&
          key < this.myQueueKey &&
          data?.status === 'waiting'
        ) {
          ahead++;
        }
      });

      this.peopleAhead = ahead;
      this.estimatedWaitMinutes = ahead * this.AVG_SERVICE_MIN;

      if (!myEntry) {
        // My entry deleted = completed
        console.log('✅ My queue entry deleted - completed');
        this.status = 'completed';
        this.clearQueueSession();
      } else {
        const s = String(myEntry.status || '')
          .toLowerCase()
          .trim();

        if (s === 'completed') {
          console.log('✅ Service completed');
          this.status = 'completed';

          // Show completion notification
          this.showServiceCompletedNotification();

          // Service completed, clear after 3 seconds
          setTimeout(() => {
            this.clearQueueSession();
            this.router.navigateByUrl('/home', { replaceUrl: true });
          }, 3000);
        } else if (s === 'serving') {
          this.status = 'serving';

          // Show notification if not shown yet
          if (!this.hasShownYourTurnAlert) {
            this.showYourTurnNotification();
            this.hasShownYourTurnAlert = true;
          }
        } else {
          if (this.currentServingKey === this.myQueueKey) {
            this.status = 'serving';

            if (!this.hasShownYourTurnAlert) {
              this.showYourTurnNotification();
              this.hasShownYourTurnAlert = true;
            }
          } else {
            this.status = 'waiting';
          }
        }

        if (myEntry.queueNumberText) {
          this.myQueueNumberText = myEntry.queueNumberText;
        }
      }

      // Build TV upcoming queue (current + next 4)
      this.buildUpcomingQueue(allQueue);
    });
  }

  // NEW: Show YOUR TURN notification with multiple alerts
  private async showYourTurnNotification() {
    console.log('🎉 Showing YOUR TURN notification');

    // 1. Vibrate (3 short bursts)
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // 2. Play sound (optional - uncomment if you want)
    this.playNotificationSound();

    // 3. Show Alert Popup
    const alert = await this.alertController.create({
      header: "🎉 It's Your Turn!",
      message: `Queue ${this.myQueueNumberText}. Please proceed to the ${this.myQueueType} counter now. Thank you for your patience! 😊`,
      cssClass: 'your-turn-alert',
      buttons: [
        {
          text: 'OK, Going Now!',
          role: 'confirm',
          cssClass: 'alert-button-confirm',
          handler: () => {
            console.log('✅ User acknowledged YOUR TURN');
          },
        },
      ],
      backdropDismiss: false, // Can't dismiss by tapping outside
    });

    await alert.present();
  }

  // Show service completed notification
  private async showServiceCompletedNotification() {
    const alert = await this.alertController.create({
      header: '✅ Service Completed',
      message: `Thank you for using MyQueue! We hope you had a pleasant experience. 😊`,
      cssClass: 'service-completed-alert',
      buttons: ['OK'],
      backdropDismiss: false,
    });

    await alert.present();
  }

  // Play notification sound
  private playNotificationSound() {
    try {
      const audio = new Audio('assets/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch((err) => {
        console.log('Could not play sound:', err);
      });
    } catch (error) {
      console.log('Audio not supported');
    }
  }

  private buildUpcomingQueue(allQueue: Array<{ key: number; data: any }>) {
    // Sort by key
    allQueue.sort((a, b) => a.key - b.key);

    // Filter only waiting and serving
    const active = allQueue.filter(
      (q) => q.data?.status === 'waiting' || q.data?.status === 'serving'
    );

    // Get current serving + next 4
    const upcoming: Array<{
      key: number;
      numberText: string;
      isYou: boolean;
      isServing: boolean;
    }> = [];

    // Add current serving if exists
    if (this.currentServingKey > 0) {
      const servingEntry = allQueue.find(
        (q) => q.key === this.currentServingKey
      );
      if (servingEntry) {
        upcoming.push({
          key: servingEntry.key,
          numberText: this.getQueueNumberText(servingEntry),
          isYou: servingEntry.key === this.myQueueKey,
          isServing: true,
        });
      }
    }

    // Add next 4 waiting
    const waiting = active.filter((q) => q.data?.status === 'waiting');
    const nextFour = waiting.slice(0, 4);

    nextFour.forEach((q) => {
      if (q.key !== this.currentServingKey) {
        upcoming.push({
          key: q.key,
          numberText: this.getQueueNumberText(q),
          isYou: q.key === this.myQueueKey,
          isServing: false,
        });
      }
    });

    this.upcomingQueue = upcoming.slice(0, 5);
  }

  private getQueueNumberText(entry: { key: number; data: any }): string {
    if (entry.data?.queueNumberText) return entry.data.queueNumberText;
    return this.formatQueueNumber(entry.key);
  }

  private formatQueueNumber(key: number): string {
    // Get prefix from queue type
    const prefixMap: any = {
      general: 'G',
      dental: 'D',
      maternal: 'M',
      child: 'C',
      vaccination: 'V',
      chronic: 'K',
    };

    const prefix = prefixMap[this.myQueueType] || 'Q';
    return `${prefix}${String(key).padStart(3, '0')}`;
  }

  getStatusLabel() {
    if (this.status === 'waiting') {
      if (this.peopleAhead === 0) return 'Next in Line';
      return 'Waiting';
    }
    if (this.status === 'serving') return 'Your Turn! 🎉';
    return 'Completed';
  }

  getStatusColor() {
    if (this.status === 'waiting') {
      if (this.peopleAhead === 0) return 'warning';
      return 'primary';
    }
    if (this.status === 'serving') return 'success';
    return 'medium';
  }

  refreshQueue() {
    // Firebase already real-time, just visual feedback
    console.log('🔄 Queue refreshed');
  }

  // Don't clear session when going back to home
  backHome() {
    console.log('⬅️ Going back to home (session preserved)');
    this.router.navigateByUrl('/home', { replaceUrl: true });
  }
}
