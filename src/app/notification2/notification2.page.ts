import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActionSheetController, AlertController } from '@ionic/angular';
import { MainService } from '../services/main.service';

interface Notification {
  id: string;
  type: 'queue' | 'appointment' | 'system' | 'reminder';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  icon: string;
  color: string;
  data?: any;
}

@Component({
  selector: 'app-notification2',
  templateUrl: './notification2.page.html',
  styleUrls: ['./notification2.page.scss'],
})
export class Notification2Page implements OnInit {
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  selectedFilter: string = 'all'; // all, unread, queue, appointment
  
  loading: boolean = true;
  hasUnread: boolean = false;
  unreadCount: number = 0;

  constructor(
    private router: Router,
    private main: MainService,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController,
  ) {}

  async ngOnInit() {
    await this.loadNotifications();
  }

  async loadNotifications() {
    this.loading = true;

    // TODO: Load from Firebase
    // const userId = this.authService.currentUserId;
    // const notifications = await this.firebaseService.getUserNotifications(userId);

    // Mock notifications data
    this.notifications = [
      {
        id: 'notif001',
        type: 'queue',
        title: 'Giliran Hampir Tiba!',
        message: 'Nombor Q012. 3 orang di hadapan. Sila bersiap untuk giliran anda.',
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(), // 5 min ago
        read: false,
        icon: 'people',
        color: 'warning',
        data: { queueNumber: 'Q012', peopleAhead: 3 }
      },
      {
        id: 'notif002',
        type: 'reminder',
        title: 'Peringatan Temujanji',
        message: 'Temujanji anda di Klinik Kesihatan Subang esok pada 10:00 AM.',
        timestamp: new Date(Date.now() - 60 * 60000).toISOString(), // 1 hour ago
        read: false,
        icon: 'calendar',
        color: 'primary',
        actionUrl: '/appointments-list',
        data: { appointmentId: 'apt001' }
      },
      {
        id: 'notif003',
        type: 'queue',
        title: 'Check-In Berjaya',
        message: 'Anda berjaya check-in. Nombor giliran: Q012. Anggaran masa: 20 minit.',
        timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
        read: true,
        icon: 'checkmark-circle',
        color: 'success',
        data: { queueNumber: 'Q012' }
      },
      {
        id: 'notif004',
        type: 'appointment',
        title: 'Temujanji Disahkan',
        message: 'Temujanji anda pada 15 Dis 2024, 10:00 AM telah disahkan.',
        timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), // 1 day ago
        read: true,
        icon: 'calendar-outline',
        color: 'success',
        actionUrl: '/appointments-list'
      },
      {
        id: 'notif005',
        type: 'system',
        title: 'Kemas Kini Sistem',
        message: 'MyQueue telah dikemas kini dengan ciri-ciri baharu. Lihat apa yang baharu!',
        timestamp: new Date(Date.now() - 2 * 24 * 3600000).toISOString(), // 2 days ago
        read: true,
        icon: 'information-circle',
        color: 'medium'
      },
      {
        id: 'notif006',
        type: 'queue',
        title: 'Giliran Anda Selesai',
        message: 'Terima kasih kerana menggunakan MyQueue di Klinik Kesihatan Subang.',
        timestamp: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), // 3 days ago
        read: true,
        icon: 'checkmark-done',
        color: 'success'
      },
      {
        id: 'notif007',
        type: 'reminder',
        title: 'Temujanji Esok',
        message: 'Jangan lupa! Temujanji pergigian anda esok pada 2:00 PM.',
        timestamp: new Date(Date.now() - 4 * 24 * 3600000).toISOString(), // 4 days ago
        read: true,
        icon: 'alarm',
        color: 'primary'
      }
    ];

    this.updateUnreadCount();
    this.applyFilter();
    this.loading = false;
  }

  updateUnreadCount() {
    this.unreadCount = this.notifications.filter(n => !n.read).length;
    this.hasUnread = this.unreadCount > 0;
  }

  applyFilter() {
    switch(this.selectedFilter) {
      case 'unread':
        this.filteredNotifications = this.notifications.filter(n => !n.read);
        break;
      case 'queue':
        this.filteredNotifications = this.notifications.filter(n => n.type === 'queue');
        break;
      case 'appointment':
        this.filteredNotifications = this.notifications.filter(n => 
          n.type === 'appointment' || n.type === 'reminder'
        );
        break;
      default:
        this.filteredNotifications = [...this.notifications];
    }
  }

  filterChanged(event: any) {
    this.selectedFilter = event.detail.value;
    this.applyFilter();
  }

  async doRefresh(event: any) {
    await this.loadNotifications();
    event.target.complete();
  }

  formatTimestamp(timestamp: string): string {
    const now = new Date();
    const notifDate = new Date(timestamp);
    const diffMs = now.getTime() - notifDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Baru sahaja';
    if (diffMins < 60) return `${diffMins} minit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays === 1) return 'Semalam';
    if (diffDays < 7) return `${diffDays} hari lalu`;
    
    return notifDate.toLocaleDateString('ms-MY', { 
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  async onNotificationClick(notification: Notification) {
    // Mark as read
    if (!notification.read) {
      await this.markAsRead(notification.id);
    }

    // Navigate if has action URL
    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
    } else {
      // Show details
      await this.showNotificationDetails(notification);
    }
  }

  async showNotificationDetails(notification: Notification) {
    const alert = await this.alertController.create({
      header: notification.title,
      message: `
        <div class="notification-detail">
          <p>${notification.message}</p>
          <p class="timestamp">${this.formatTimestamp(notification.timestamp)}</p>
        </div>
      `,
      buttons: ['Tutup']
    });

    await alert.present();
  }

  async showNotificationOptions(notification: Notification, event: Event) {
    event.stopPropagation();

    const buttons: any[] = [];

    // Mark as read/unread
    if (notification.read) {
      buttons.push({
        text: 'Tandakan Belum Dibaca',
        icon: 'mail-unread-outline',
        handler: () => {
          this.markAsUnread(notification.id);
        }
      });
    } else {
      buttons.push({
        text: 'Tandakan Sudah Dibaca',
        icon: 'mail-open-outline',
        handler: () => {
          this.markAsRead(notification.id);
        }
      });
    }

    // Delete option
    buttons.push({
      text: 'Padam',
      icon: 'trash-outline',
      role: 'destructive',
      handler: () => {
        this.deleteNotification(notification.id);
      }
    });

    buttons.push({
      text: 'Batal',
      icon: 'close',
      role: 'cancel'
    });

    const actionSheet = await this.actionSheetController.create({
      header: 'Pilihan Notifikasi',
      buttons: buttons
    });

    await actionSheet.present();
  }

  async markAsRead(notificationId: string) {
    // TODO: Update in Firebase
    // await this.firebaseService.updateNotification(notificationId, { read: true });

    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.updateUnreadCount();
      this.applyFilter();
    }
  }

  async markAsUnread(notificationId: string) {
    // TODO: Update in Firebase
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = false;
      this.updateUnreadCount();
      this.applyFilter();
    }
  }

  async deleteNotification(notificationId: string) {
    const alert = await this.alertController.create({
      header: 'Padam Notifikasi?',
      message: 'Adakah anda pasti untuk memadam notifikasi ini?',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Padam',
          role: 'destructive',
          handler: async () => {
            // TODO: Delete from Firebase
            // await this.firebaseService.deleteNotification(notificationId);

            this.notifications = this.notifications.filter(n => n.id !== notificationId);
            this.updateUnreadCount();
            this.applyFilter();
            await this.main.showToast('Notifikasi dipadam', 'success');
          }
        }
      ]
    });

    await alert.present();
  }

  async markAllAsRead() {
    const alert = await this.alertController.create({
      header: 'Tandakan Semua Sudah Dibaca?',
      message: `Tandakan ${this.unreadCount} notifikasi sebagai sudah dibaca?`,
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Ya',
          handler: async () => {
            // TODO: Update all in Firebase
            this.notifications.forEach(n => n.read = true);
            this.updateUnreadCount();
            this.applyFilter();
            await this.main.showToast('Semua notifikasi ditandakan sudah dibaca', 'success');
          }
        }
      ]
    });

    await alert.present();
  }

  async clearAll() {
    const alert = await this.alertController.create({
      header: 'Kosongkan Semua Notifikasi?',
      message: 'Adakah anda pasti untuk memadam SEMUA notifikasi? Tindakan ini tidak boleh dibatalkan.',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Padam Semua',
          role: 'destructive',
          handler: async () => {
            // TODO: Delete all from Firebase
            this.notifications = [];
            this.updateUnreadCount();
            this.applyFilter();
            await this.main.showToast('Semua notifikasi dipadam', 'success');
          }
        }
      ]
    });

    await alert.present();
  }

  goBack() {
    this.router.navigate(['/home2']);
  }
}
