import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.couples.sharedwishlist',
  appName: 'Couples Shared Wishlist',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
