import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { getDatabase, onValue, ref } from 'firebase/database';

@Component({
  selector: 'app-queue-status',
  templateUrl: './queue-status.page.html',
  styleUrls: ['./queue-status.page.scss'],
})
export class QueueStatusPage implements OnInit {
  myQueueNumber: string = "";
  currentNumber: string = "";
  peopleAhead: number = 0;
  status: string = "waiting";

  constructor(
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.loadQueueStatus();
  }

  loadQueueStatus() {
    const uid = this.auth.getUID();
    const db = getDatabase();
    const today = new Date().toISOString().split("T")[0];

    // 1️⃣ Get patient queue number
    const queueRef = ref(db, "queue/" + today);

    onValue(queueRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const allQueues = snapshot.val();
      const queueKeys = Object.keys(allQueues);

      // Find queue number belonging to this user
      for (let key of queueKeys) {
        if (allQueues[key].uid === uid) {
          this.myQueueNumber = key;
          this.status = allQueues[key].status;
        }
      }

      // 2️⃣ Get current number serving
      const currentRef = ref(db, "currentQueue/" + today);

      onValue(currentRef, (snap) => {
        if (snap.exists()) {
          this.currentNumber = "Q" + snap.val().number.toString().padStart(3, '0');
        }

        // 3️⃣ Count how many people ahead
        const myNum = Number(this.myQueueNumber.replace("Q", ""));
        const curNum = Number(this.currentNumber.replace("Q", ""));

        this.peopleAhead = myNum - curNum;
      });
    });
  }
}
