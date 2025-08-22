<script setup lang="ts">
import { ref, onMounted } from 'vue'
import logoDark from '../assets/logo-dark.png'
import logoLight from '../assets/logo-light.png'

type Theme = 'dark' | 'light'
const current = ref<Theme>('dark')

function apply(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  try { localStorage.setItem('theme', theme) } catch {}
}

function toggle() {
  current.value = current.value === 'dark' ? 'light' : 'dark'
  apply(current.value)
}

onMounted(() => {
  let initial: Theme = 'dark'
  try {
    const saved = localStorage.getItem('theme') as Theme | null
    if (saved === 'light' || saved === 'dark') initial = saved
  } catch {}
  // fallback: use attribute if set
  const attr = document.documentElement.getAttribute('data-theme') as Theme | null
  if (attr === 'light' || attr === 'dark') initial = attr
  current.value = initial
  apply(initial)
})
</script>

<template>
  <header class="header">
    <div class="container header-inner">
      <div class="brand">
        <img :src="current==='dark' ? logoDark : logoLight" alt="Logo" height="48" style="display:block;" />
      </div>
      <div class="controls">
        <div class="switch" :data-checked="current==='light'" @click="toggle" title="Theme wechseln">
          <div class="thumb"></div>
          <div class="icons">
            <span class="sun">☀️</span>
            <span class="moon">🌙</span>
          </div>
        </div>
      </div>
    </div>
  </header>
  <div style="height: 72px;"></div>
  <!-- spacer to avoid content jump under fixed header -->
</template>

<style scoped>
.header {
  position: fixed;
  inset: 0 0 auto 0;
  height: 72px;
  background: var(--bg);
  border-bottom: 1px solid rgba(30,37,43,.5);
  z-index: 900;
}
.header :deep(*) {}
:root[data-theme="light"] .header {
  border-bottom: 1px solid rgba(201, 207, 213, 0.5);
}
.header-inner { display:flex; align-items:center; justify-content:space-between; height:100%; }
.controls { display:flex; align-items:center; gap:12px; }
.switch {
  position: relative; width: 64px; height: 32px; border-radius: 999px;
  background: #0e1317; border: 1px solid #1e252b; cursor: pointer;
}
.switch .thumb {
  position: absolute; top: 2px; left: 2px; width: 28px; height: 28px; border-radius: 50%;
  background: var(--accent); transition: transform .2s ease;
}
.switch[data-checked="true"] .thumb { transform: translateX(32px); }
.switch .icons { position:absolute; inset:0; display:flex; align-items:center; justify-content:space-between; padding: 0 8px; font-size: 14px; opacity:.9; }
.brand img { height: 48px; }
</style>


