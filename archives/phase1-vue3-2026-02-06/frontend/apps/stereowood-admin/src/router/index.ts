import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/custom-colors',
      name: 'custom-colors',
      component: () => import('@/views/CustomColorsView.vue'),
    },
    {
      path: '/dictionary',
      name: 'color-dictionary',
      component: () => import('@/views/ColorDictionaryView.vue'),
    },
    {
      path: '/artworks',
      name: 'artworks',
      component: () => import('@/views/ArtworksView.vue'),
    },
    {
      path: '/materials',
      name: 'materials',
      component: () => import('@/views/MaterialsView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

export default router;
