import { defineStore } from 'pinia';

interface AppState {
  ready: boolean;
  buildVersion: string;
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    ready: false,
    buildVersion: 'dev',
  }),
  actions: {
    markReady(version: string) {
      this.ready = true;
      this.buildVersion = version;
    },
  },
});
