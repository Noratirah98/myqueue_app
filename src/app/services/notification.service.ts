import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { PushNotifications, Token } from '@capacitor/push-notifications';
import { getDatabase, ref, set } from 'firebase/database';
import { getAuth } from 'firebase/auth';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notifAudio?: HTMLAudioElement;
  private audioPrimed = false;

  constructor(private platform: Platform) {}

  /**
   * Initialize push notifications
   * Call this after user logs in
   */
  async initPushNotifications() {
    console.log('🔔 Initializing push notifications...');

    // Check if running on mobile device (not browser)
    if (!this.platform.is('capacitor')) {
      console.log(
        '⚠️ Push notifications only work on mobile devices (not browser)'
      );
      return;
    }

    try {
      // Request permission to receive push notifications
      const permission = await PushNotifications.requestPermissions();

      if (permission.receive !== 'granted') {
        console.log('❌ Push notification permission denied by user');
        return;
      }

      console.log('✅ Push notification permission granted');

      // Register with FCM to get token
      await PushNotifications.register();

      // Set up listeners
      this.setupListeners();
    } catch (error) {
      console.error('❌ Error initializing push notifications:', error);
    }
  }

  /**
   * Set up all push notification listeners
   */
  private setupListeners() {
    // Listener 1: Registration success - FCM token received
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('✅ FCM Token received:', token.value);
      await this.saveFCMToken(token.value);
    });

    // Listener 2: Registration error
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('❌ FCM Registration Error:', error);
    });

    // handle errors
    PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration error:', err);
    });

    PushNotifications.addListener('pushNotificationReceived', (notif) => {
      console.log('Push received:', notif);
    });

    // user tapped notification
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action) => {
        console.log('Push tapped:', action);
      }
    );
  }

  /**
   * Save FCM token to Firebase Realtime Database
   */
  private async saveFCMToken(token: string) {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        console.log('⚠️ No user logged in, cannot save FCM token');
        return;
      }

      const db = getDatabase();
      const tokenRef = ref(db, `patients/${user.uid}/fcmToken`);

      // Determine device platform
      const devicePlatform = this.platform.is('ios') ? 'ios' : 'android';

      // Save token to database
      await set(tokenRef, {
        token: token,
        platform: devicePlatform,
        updatedAt: new Date().toISOString(),
      });

      console.log('✅ FCM Token saved to Firebase:', {
        uid: user.uid,
        platform: devicePlatform,
        tokenPreview: token.substring(0, 20) + '...',
      });
    } catch (error) {
      console.error('❌ Error saving FCM token:', error);
    }
  }

  /**
   * Remove FCM token from database
   * Call this when user logs out
   */
  async removeFCMToken() {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        console.log('⚠️ No user logged in');
        return;
      }

      const db = getDatabase();
      const tokenRef = ref(db, `patients/${user.uid}/fcmToken`);

      // Remove token from database
      await set(tokenRef, null);

      console.log('✅ FCM Token removed from Firebase');
    } catch (error) {
      console.error('❌ Error removing FCM token:', error);
    }
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  private getToday(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Check if push notifications are available on this device
   */
  async isPushAvailable(): Promise<boolean> {
    if (!this.platform.is('capacitor')) {
      return false;
    }

    try {
      const permission = await PushNotifications.checkPermissions();
      return permission.receive !== 'denied';
    } catch (error) {
      console.error('Error checking push availability:', error);
      return false;
    }
  }

  /**
   * Request permission again (if previously denied)
   */
  async requestPermissionAgain(): Promise<boolean> {
    try {
      const permission = await PushNotifications.requestPermissions();
      return permission.receive === 'granted';
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  }

  async primeAudioOnce() {
    if (this.audioPrimed) return;

    this.notifAudio = new Audio('assets/sounds/notification.mp3');
    this.notifAudio.volume = 0.5;

    try {
      await this.notifAudio.play();
      this.notifAudio.pause();
      this.notifAudio.currentTime = 0;
      this.audioPrimed = true;
      console.log('✅ Audio primed');
    } catch (e) {
      console.log('❌ Audio prime blocked until user interaction', e);
    }
  }

  playSound() {
    try {
      if (!this.notifAudio)
        this.notifAudio = new Audio('assets/sounds/notification.mp3');
      this.notifAudio.volume = 0.5;
      this.notifAudio.currentTime = 0;
      this.notifAudio
        .play()
        .catch((err) => console.log('Could not play sound:', err));
    } catch {
      console.log('Audio not supported');
    }
  }
}
