import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router'
import LandingView from './views/LandingView.vue'
import ResultsView from './views/ResultsView.vue'
import ImpressumView from './views/ImpressumView.vue'
import DatenschutzView from './views/DatenschutzView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: LandingView },
    { path: '/results', component: ResultsView },
    { path: '/impressum', component: ImpressumView },
    { path: '/datenschutz', component: DatenschutzView },
  ],
})

createApp(App).use(router).mount('#app')
