import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'overview',
      component: () => import('@/views/OverviewView.vue'),
    },
    {
      path: '/custom-colors',
      name: 'custom-colors',
      component: () => import('@/views/CustomColorsView.vue'),
    },
    {
      path: '/artworks',
      name: 'artworks',
      component: () => import('@/views/ArtworksView.vue'),
    },
    {
      path: '/dictionary',
      name: 'dictionary',
      component: () => import('@/views/DictionaryView.vue'),
    },
    {
      path: '/formula-calculator',
      name: 'formula-calculator',
      component: () => import('@/views/FormulaCalculatorView.vue'),
    },
    {
      path: '/legacy',
      name: 'legacy',
      component: () => import('@/views/LegacyBridgeView.vue'),
    },
  ],
});

export default router;
