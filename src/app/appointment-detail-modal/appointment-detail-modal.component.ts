import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

// type AppointmentStatus = 'pending' | 'completed' | 'cancelled';
type AppointmentStatus = 'pending' | 'completed' | 'cancelled';

// interface Appointment {
//   id: string;
//   uid: string;
//   appointmentType: string; 
//   date: string;            
//   time: string;          
//   status: AppointmentStatus;
//   createdAt?: string;
//   symptoms?: string;
//   notes?: string;
// }

@Component({
  selector: 'app-appointment-detail-modal',
  templateUrl: './appointment-detail-modal.component.html',
  styleUrls: ['./appointment-detail-modal.component.scss'],
})

export class AppointmentDetailModalComponent {
//   @Input() appointment!: Appointment; 

//   constructor(
//     private modalController: ModalController
//   ) {}

//   dismiss() {
//     this.modalController.dismiss();
//   }

//   formatFullDate(date: string) {
//     return new Date(date).toLocaleDateString('en-US', { 
//       weekday: 'long', 
//       year: 'numeric', 
//       month: 'long', 
//       day: 'numeric' 
//     });
//   }

//   getStatusText(status: AppointmentStatus): string {
//     const statusMap = {
//       'pending': 'Pending',
//       'completed': 'Completed',
//       'cancelled': 'Cancelled'
//     };
//     return statusMap[status] || status;
//   }

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
      'pending': 'hourglass-outline',
      'completed': 'checkmark-circle',
      'cancelled': 'close-circle'
    };

    return iconMap[status] || 'help-circle';
  }
}
