import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { get, getDatabase, onValue, push, ref, set } from 'firebase/database';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController, NavController, ToastController } from '@ionic/angular';
import { MainService } from '../services/main.service';

interface TimeSlot {
  time: string;
  display: string;
  available: boolean;
}

interface AppointmentType {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

@Component({
  selector: 'app-appointment',
  templateUrl: './appointment.page.html',
  styleUrls: ['./appointment.page.scss'],
})

export class AppointmentPage implements OnInit {

  currentStep = 1;
  appointmentForm: FormGroup;

  appointmentTypes: AppointmentType[] = [
    { 
      id: 'general', 
      name: 'General Treatment', 
      icon: '🩺',
      description: 'General health checkup' 
    },
    { 
      id: 'dental', 
      name: 'Dental', 
      icon: '🦷',
      description: 'Dental treatment and examination' 
    },
    { 
      id: 'maternal', 
      name: 'Maternal Health', 
      icon: '🤰',
      description: 'Pregnancy and postnatal care' 
    },
    { 
      id: 'child', 
      name: 'Child Health', 
      icon: '👶',
      description: 'Child development checkup' 
    },
    { 
      id: 'vaccination', 
      name: 'Vaccination', 
      icon: '💉',
      description: 'Immunization and vaccine shots' 
    },
    { 
      id: 'chronic', 
      name: 'Chronic Disease', 
      icon: '💊',
      description: 'Chronic disease follow-up' 
    }
  ];

  selectedType: AppointmentType | null = null;
  selectedSlot: TimeSlot | null = null;

  selectedDateObj!: Date;
  displayDate = '';
  minDate = '';
  maxDate = '';

  timeSlots: TimeSlot[] = [];
  showConfirm = false;

  // Loading state
  isLoading = false;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private auth: AuthService,
    private main: MainService,
    private navCtrl: NavController,
    private alertController: AlertController,
  ) {
    this.appointmentForm = this.fb.group({
      appointmentType: ['', Validators.required],
      date: ['', Validators.required],
      time: ['', Validators.required],
      symptoms: ['', Validators.maxLength(500)],
      notes: ['', Validators.maxLength(500)]
    });
  }

  ngOnInit() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Set max date to 3 months from now
    const maxDate = new Date(today);
    maxDate.setMonth(maxDate.getMonth() + 3);

    this.selectedDateObj = today;
    this.updateDisplayDate();
    this.minDate = today.toISOString().split('T')[0];
    this.maxDate = maxDate.toISOString().split('T')[0];
  }

  /* ================= NAVIGATION ================= */
  goBack() {
    if (this.currentStep > 1 && !this.showConfirm) {
      this.currentStep--;
    } else {
      this.navCtrl.back();
    }
  }

  /* ================= STEP 1: TYPE SELECTION ================= */
  selectType(type: AppointmentType) {
    this.selectedType = type;
    this.appointmentForm.patchValue({ appointmentType: type.id });
    
    // Animate transition
    setTimeout(() => {
      this.currentStep = 2;
      this.loadTimeSlots();
    }, 200);
  }

  /* ================= STEP 2: DATE & TIME SELECTION ================= */
  previousDate() {
    const d = new Date(this.selectedDateObj);
    d.setDate(d.getDate() - 1);
    
    if (this.isBlockedDate(d)) {
      this.main.showToast('This date is not available', 'warning');
      return;
    }

    this.selectedDateObj = d;
    this.updateDisplayDate();
    this.loadTimeSlots();
  }

  nextDate() {
    const d = new Date(this.selectedDateObj);
    d.setDate(d.getDate() + 1);
    
    // Check if exceeds max date
    const maxDateObj = new Date(this.maxDate);
    if (d > maxDateObj) {
      this.main.showToast('Cannot book more than 3 months ahead', 'warning');
      return;
    }
    
    if (this.isBlockedDate(d)) {
      this.main.showToast('This date is not available', 'warning');
      return;
    }

    this.selectedDateObj = d;
    this.updateDisplayDate();
    this.loadTimeSlots();
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
    
    const maxDateObj = new Date(this.maxDate);
    const day = date.getDay();
    
    // Block: past dates, weekends, dates beyond max
    return date < today || day === 0 || day === 6 || date > maxDateObj;
  }

  isDateEnabled = (dateStr: string): boolean => {
    return !this.isBlockedDate(new Date(dateStr));
  };

  updateDisplayDate() {
    this.displayDate = this.selectedDateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    this.appointmentForm.patchValue({
      date: this.selectedDateObj.toISOString().split('T')[0]
    });
  }

  getDateDay(): string {
    return this.selectedDateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    }).toUpperCase();
  }

  loadTimeSlots() {
    // In production, fetch from backend based on date and type
    const morningSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
    const afternoonSlots = ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
    
    const allSlots = [...morningSlots, ...afternoonSlots];
    
    this.timeSlots = allSlots.map(t => ({
      time: t,
      display: this.formatTime(t),
      available: Math.random() > 0.3 // Random availability for demo
    }));
  }

  getMorningSlots(): TimeSlot[] {
    return this.timeSlots.filter(slot => {
      const hour = parseInt(slot.time.split(':')[0]);
      return hour < 12;
    });
  }

  getAfternoonSlots(): TimeSlot[] {
    return this.timeSlots.filter(slot => {
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
    this.appointmentForm.patchValue({ time: slot.time });
    
    // Animate transition
    setTimeout(() => {
      this.currentStep = 3;
    }, 200);
  }

  /* ================= STEP 3: NOTES ================= */
  addSymptom(symptom: string) {
    const currentSymptoms = this.appointmentForm.get('symptoms')?.value || '';
    
    // Check if symptom already exists
    if (currentSymptoms.includes(symptom)) {
      return;
    }
    
    const newSymptoms = currentSymptoms 
      ? `${currentSymptoms}, ${symptom}` 
      : symptom;
    
    // Check character limit
    if (newSymptoms.length > 500) {
      this.main.showToast('Symptoms exceed 500 character limit', 'warning');
      return;
    }
    
    this.appointmentForm.patchValue({ symptoms: newSymptoms });
  }

  goToConfirmation() {
    this.showConfirm = true;
  }

  /* ================= STEP 4: CONFIRMATION ================= */
  async confirmAppointment() {
    if (this.isLoading) return;
    
    this.isLoading = true;

    try {
      const uid = this.auth.getUID();

      if (!uid) {
        await this.main.showToast('User not logged in', 'danger');
        return;
      }
      
      const selectedDate  = this.appointmentForm.value.date; 

      /* CHECK EXISTING APPOINTMENT */
      const alreadyExists = await this.hasAppointmentOnDate(uid, selectedDate);

      if (alreadyExists) {
        await this.main.showToast(
          'You already have an appointment on this date',
          'warning',
          'alert-circle-outline',
          'top'
        );
        return;
      }
      
      const db          = getDatabase();
      const patientSnap = await get(ref(db, `patients/${uid}`)); // Get patient name

      if (!patientSnap.exists()) {
        throw new Error('Patient profile not found');
      }

      const patientName = patientSnap.val().name;

      /* SAVE NEW APPOINTMENT */
      const appointmentData = {
          uid: uid,
          patientName: patientName,
          appointmentType: this.selectedType?.name,
          date: selectedDate,
          time: this.selectedSlot?.display,
          symptoms: this.appointmentForm.value.symptoms || '',
          notes: this.appointmentForm.value.notes || '',
          status: 'pending',
          createdAt: new Date().toISOString()
      };

      await push(ref(db, `appointments`), appointmentData);

      // Show success alert
      await this.showSuccessAlert();

    } catch (error) {
      console.error('Error booking appointment:', error);
      await this.showErrorAlert();
    } finally {
      this.isLoading = false;
    }
  }

  async hasAppointmentOnDate(uid: string, date: string): Promise<boolean> {
    const db      = getDatabase();
    const snapshot = await get(ref(db, 'appointments'));

    if (!snapshot.exists()) return false;

    let found = false;

    snapshot.forEach(child => {
      const data = child.val();

      if (
        data.uid === uid &&
        data.date === date &&
        data.status !== 'cancelled'
      ) {
        found = true;
      }
    });

    return found;
  }

  async showSuccessAlert() {
    const alert = await this.alertController.create({
      header: '✅ Success!',
      message: `
        <div style="text-align: left; padding: 10px 0;">
          <p><strong>Your appointment has been successfully booked.</strong></p>
          <br>
          <p>📅 <strong>Date:</strong> ${this.displayDate}</p>
          <p>⏰ <strong>Time:</strong> ${this.selectedSlot?.display}</p>
          <p>🏥 <strong>Type:</strong> ${this.selectedType?.name}</p>
          <br>
          <p style="font-size: 13px; color: #666;">You will receive a reminder notification 1 day before your appointment.</p>
        </div>
      `,
      buttons: [
        {
          text: 'OK',
          role: 'confirm',
          handler: () => {
            this.router.navigate(['/appointment-list']);
          }
        }
      ],
      cssClass: 'success-alert'
    });

    await alert.present();
  }

  async showErrorAlert() {
    const alert = await this.alertController.create({
      header: '❌ Error',
      message: 'Sorry, there was a problem making your appointment. Please try again.',
      buttons: ['OK'],
      cssClass: 'error-alert'
    });

    await alert.present();
  }

  /* ================= UTILITIES ================= */
  formatTime(time: string): string {
    const [h, m] = time.split(':');
    const hour = Number(h);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${m} ${suffix}`;
  }

  resetFlow() {
    this.showConfirm = false;
    this.currentStep = 1;
    this.appointmentForm.reset();
    this.selectedType = null;
    this.selectedSlot = null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.selectedDateObj = today;
    this.updateDisplayDate();
  }

  /* ================= VALIDATION HELPERS ================= */
  get canProceedToStep2(): boolean {
    return !!this.selectedType;
  }

  get canProceedToStep3(): boolean {
    return !!this.selectedSlot && !!this.appointmentForm.get('date')?.value;
  }

  get canConfirm(): boolean {
    return this.appointmentForm.valid && !!this.selectedType && !!this.selectedSlot;
  }
}
