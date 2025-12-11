import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app.config';
import { AppComponent } from './app.component';

(window as any)['CESIUM_BASE_URL'] = '/assets/cesium/';

bootstrapApplication(AppComponent, appConfig).catch((err) => { throw err; });
