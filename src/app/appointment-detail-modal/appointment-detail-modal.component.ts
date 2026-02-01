import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

type AppointmentStatus = 'confirmed' | 'checked_in' | 'completed' | 'cancelled';

interface Appointment {
  id: string;
  uid: string;
  appointmentType: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  createdAt?: string;
  symptoms?: string;
  notes?: string;
  queueKey?: number;
  queueNumberText?: string;
  checkInAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

@Component({
  selector: 'app-appointment-detail-modal',
  templateUrl: './appointment-detail-modal.component.html',
  styleUrls: ['./appointment-detail-modal.component.scss'],
})
export class AppointmentDetailModalComponent {
  @Input() appt!: Appointment;
  @Input() formatFullDate!: (date: string) => string;
  @Input() formatTime!: (timestamp: string) => string;
  @Input() getStatusText!: (status: AppointmentStatus) => string;

  constructor(private modalController: ModalController) {}

  dismiss() {
    this.modalController.dismiss();
  }

  formatCreatedDate(date: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  formatFullDateTime(timestamp: string): string {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  getStatusIcon(status: AppointmentStatus): string {
    const iconMap = {
      confirmed: 'checkmark-circle-outline',
      checked_in: 'hourglass-outline',
      completed: 'checkmark-circle',
      cancelled: 'close-circle',
    };
    return iconMap[status] || 'help-circle';
  }
}
