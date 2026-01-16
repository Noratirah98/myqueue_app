import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

type AppointmentStatus = 'pending' | 'completed' | 'cancelled';

@Component({
  selector: 'app-appointment-detail-modal',
  templateUrl: './appointment-detail-modal.component.html',
  styleUrls: ['./appointment-detail-modal.component.scss'],
})

export class AppointmentDetailModalComponent {
  @Input() appt!: any;
  @Input() formatFullDate!: (date: string) => string;
  @Input() getStatusText!: (status: string) => string;

  constructor(private modalController: ModalController) {}

  close() {
    this.modalController.dismiss();
  }

  dismiss() {
    this.modalController.dismiss();
  }

  formatCreatedDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getStatusIcon(status: AppointmentStatus): string {
    const iconMap = {
      'pending'  : 'hourglass-outline',
      'completed': 'checkmark-circle',
      'cancelled': 'close-circle'
    };

    return iconMap[status] || 'help-circle';
  }
}
