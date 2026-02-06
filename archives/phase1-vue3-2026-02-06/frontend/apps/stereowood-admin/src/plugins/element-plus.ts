import type { App } from 'vue';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';

export function installElementPlus(app: App) {
  app.use(ElementPlus, { locale: zhCn });
}
