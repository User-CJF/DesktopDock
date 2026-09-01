import { createApp } from 'vue';
import App from './App.vue';
import './styles.css';

const app = createApp(App);
app.mount('#app');

// The verified interaction controller is loaded after Vue owns the application shell.
// It remains browser-safe and progressively uses the Electron preload bridge when present.
await import('../../final/app.js');
