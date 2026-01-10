import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { MainService } from '../services/main.service';
import { equalTo, getDatabase, onValue, orderByChild, push, query, ref } from 'firebase/database';

@Component({
  selector: 'app-queue',
  templateUrl: './queue.page.html',
  styleUrls: ['./queue.page.scss'],
})
export class QueuePage implements OnInit {
  // Appointment
  todayAppointment: any = null;

  // Queue state
  hasCheckedIn = false;
  myQueueNumber = '';
  currentServing = '';
  peopleAhead = 0;
  status: 'waiting' | 'serving' | 'done' = 'waiting';

  constructor(
    public main: MainService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    this.loadTodayAppointment();
  }

  /* --------------------------------
   🔹 Load today's appointment
  ---------------------------------*/
  loadTodayAppointment() {
    const uid = this.auth.getUID();
    if (!uid) return;

    const today          = new Date().toISOString().split('T')[0];
    const db             = getDatabase();
    const appointmentRef = query(ref(db, 'appointments'), orderByChild('uid'), equalTo(uid));

    onValue(appointmentRef, snapshot => {
      this.todayAppointment = null;

      snapshot.forEach(child => {
      const data = child.val();

      if (
        data.uid === uid &&
        data.date === today &&
        data.status === 'pending'
      ) {
        this.todayAppointment = {
          id: child.key,
          ...data
        };
      }
    });
    });
  }

  /* --------------------------------
   🔹 QR Check-in (FCFS applied)
  ---------------------------------*/
  async checkIn() {
    if (!this.todayAppointment) {
      this.main.showToast('No appointment today', 'danger');
      return;
    }

    const db = getDatabase();
    const queueRef = ref(db, `queues/general`);

    const newQueue = await push(queueRef, {
      uid: this.auth.getUID(),
      appointmentId: this.todayAppointment.id,
      status: 'waiting',
      createdAt: Date.now()
    });

    this.myQueueNumber = newQueue.key!;
    this.hasCheckedIn = true;

    this.listenQueue();
    this.main.showToast('Check-in successful', 'success');
  }

  /* --------------------------------
   🔹 Real-time queue listener
  ---------------------------------*/
  listenQueue() {
    const db = getDatabase();
    const queueRef = ref(db, 'queues/general');

    onValue(queueRef, snapshot => {
      const queueList: any[] = [];

      snapshot.forEach(child => {
        queueList.push({ id: child.key, ...child.val() });
      });

      // FCFS sort
      queueList.sort((a, b) => a.createdAt - b.createdAt);

      const servingIndex = queueList.findIndex(q => q.status === 'serving');
      const myIndex = queueList.findIndex(q => q.id === this.myQueueNumber);

      this.currentServing = servingIndex >= 0 ? queueList[servingIndex].id : '-';

      if (myIndex >= 0) {
        this.peopleAhead = servingIndex >= 0
          ? myIndex - servingIndex
          : myIndex;

        this.status = queueList[myIndex].status;
      }
    });
  }
}
