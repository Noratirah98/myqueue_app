import { Component, Input, OnInit } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth.service';
import { MainService } from 'src/app/services/main.service';
import {
  equalTo,
  get,
  getDatabase,
  orderByChild,
  query,
  ref,
  update,
} from 'firebase/database';

interface TimeSlot {
  time: string;
  display: string;
  available: boolean;
}

@Component({
  selector: 'app-reschedule-modal',
  templateUrl: './reschedule-modal.component.html',
  styleUrls: ['./reschedule-modal.component.scss'],
})
export class RescheduleModalComponent implements OnInit {
  @Input() appointment: any; // Current appointment data

  selectedDateObj!: Date;
  displayDate = '';
  minDate = '';
  maxDate = '';

  timeSlots: TimeSlot[] = [];
  selectedSlot: TimeSlot | null = null;

  constructor(
    private main: MainService,
    private auth: AuthService,
    private modalController: ModalController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    // Set min date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    // Set max date to 3 months from now
    const maxDate = new Date(tomorrow);
    maxDate.setMonth(maxDate.getMonth() + 3);

    this.selectedDateObj = this.getNextWorkingDay(tomorrow);
    this.updateDisplayDate();
    this.minDate = tomorrow.toISOString().split('T')[0];
    this.maxDate = maxDate.toISOString().split('T')[0];

    this.loadTimeSlots();
  }

  /* ================= DATE SELECTION ================= */

  getNextWorkingDay(date: Date): Date {
    const nextDate = new Date(date);
    nextDate.setHours(0, 0, 0, 0);

    // Skip weekends
    while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
  }

  onCalendarSelected(value: string | string[] | null | undefined) {
    if (!value) return;

    const dateStr = Array.isArray(value) ? value[0] : value;
    const date = new Date(dateStr);

    if (this.isBlockedDate(date)) {
      this.main.showToast('Selected date is not available', 'warning');
      return;
    }

    this.selectedDateObj = date;
    this.updateDisplayDate();
    this.loadTimeSlots();
  }

  isBlockedDate(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);

    const maxDateObj = new Date(this.maxDate);
    maxDateObj.setHours(0, 0, 0, 0);

    const day = selectedDate.getDay();

    return (
      selectedDate <= today || // Block today & past
      day === 0 ||
      day === 6 || // Block weekends
      selectedDate > maxDateObj // Block beyond max date
    );
  }

  isDateEnabled = (dateStr: string): boolean => {
    return !this.isBlockedDate(new Date(dateStr));
  };

  updateDisplayDate() {
    this.displayDate = this.selectedDateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  getDateDay(): string {
    return this.selectedDateObj
      .toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
      .toUpperCase();
  }

  /* ================= TIME SELECTION ================= */

  loadTimeSlots() {
    const morningSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
    const afternoonSlots = [
      '14:00',
      '14:30',
      '15:00',
      '15:30',
      '16:00',
      '16:30',
    ];

    const allSlots = [...morningSlots, ...afternoonSlots];

    this.timeSlots = allSlots.map((t) => ({
      time: t,
      display: this.formatTime(t),
      available: Math.random() > 0.3, // Random availability for demo
    }));
  }

  getMorningSlots(): TimeSlot[] {
    return this.timeSlots.filter((slot) => {
      const hour = parseInt(slot.time.split(':')[0]);
      return hour < 12;
    });
  }

  getAfternoonSlots(): TimeSlot[] {
    return this.timeSlots.filter((slot) => {
      const hour = parseInt(slot.time.split(':')[0]);
      return hour >= 12;
    });
  }

  selectSlot(slot: TimeSlot) {
    if (!slot.available) {
      this.main.showToast('This time slot is full', 'warning');
      return;
    }

    this.selectedSlot = slot;
  }

  formatTime(time: string): string {
    const [h, m] = time.split(':');
    const hour = Number(h);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${m} ${suffix}`;
  }

  /* ================= SAVE RESCHEDULE ================= */

  canSave(): boolean {
    return !!this.selectedSlot;
  }

  async saveReschedule() {
    if (!this.canSave()) {
      this.main.showToast('Please select a new date and time', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Rescheduling appointment...',
    });
    await loading.present();

    try {
      const uid = this.auth.getUID();

      if (!uid) {
        await loading.dismiss();
        await this.main.showToast('User not logged in', 'danger');
        return;
      }

      const newDate = this.formatLocalDate(this.selectedDateObj);
      const newTime = this.selectedSlot!.display;

      // Pass appointment ID to exclude from checking
      const alreadyExists = await this.hasAppointmentOnDate(
        uid,
        newDate,
        this.appointment.id // Exclude current appointment
      );

      if (alreadyExists) {
        await loading.dismiss();
        await this.main.showToast(
          'You already have another appointment on this date',
          'warning',
          'alert-circle-outline',
          'top'
        );
        return;
      }

      const db = getDatabase();
      const appointmentRef = ref(db, `appointments/${this.appointment.id}`);

      await update(appointmentRef, {
        date: newDate,
        time: newTime,
        updatedAt: Date.now(),
      });

      await loading.dismiss();
      await this.main.showToast(
        'Appointment rescheduled successfully!',
        'success',
        'checkmark-done-outline'
      );

      // Close modal with success flag
      this.modalController.dismiss({
        success: true,
        newDate: newDate,
        newTime: newTime,
      });
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      await loading.dismiss();
      await this.main.showToast('Failed to reschedule appointment', 'danger');
    }
  }

  async hasAppointmentOnDate(
    uid: string,
    date: string,
    excludeAppointmentId?: string
  ): Promise<boolean> {
    const db = getDatabase();
    const q = query(ref(db, 'appointments'), orderByChild('uid'), equalTo(uid));

    const snapshot = await get(q);

    if (!snapshot.exists()) return false;

    let found = false;

    snapshot.forEach((child) => {
      const appointmentId = child.key;
      const data = child.val();

      if (
        data.date === date &&
        data.status !== 'cancelled' &&
        appointmentId !== excludeAppointmentId
      ) {
        found = true;
      }
    });

    return found;
  }

  /* ================= UTILITIES ================= */
  formatLocalDate(dateInput: Date | string): string {
    const d =
      typeof dateInput === 'string'
        ? new Date(dateInput + 'T00:00:00')
        : new Date(dateInput);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  formatDisplayDate(dateStr: string): string {
    if (!dateStr) return 'N/A';

    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  dismiss() {
    this.modalController.dismiss();
  }
}
