import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { installElementPlus } from './plugins/element-plus';
import 'element-plus/dist/index.css';
import './styles/main.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);
installElementPlus(app);

app.mount('#app');
