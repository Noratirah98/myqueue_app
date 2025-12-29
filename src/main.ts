import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

import { initializeApp } from "firebase/app";
import { firebaseConfig } from "./app/firebase";

// Initialize Firebase first
const app = initializeApp(firebaseConfig);

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));
