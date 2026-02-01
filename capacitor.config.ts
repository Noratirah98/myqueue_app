import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myqueue.app',
  appName: 'MyQueue Clinic',
  webDir: 'www',
  server: {
    androidScheme: 'https',
  },
};

export default config;
