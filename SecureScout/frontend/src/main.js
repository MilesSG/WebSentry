import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zh from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import './assets/main.css'
// Tailwind CSS 样式直接通过 PostCSS 处理
import App from './App.vue'
import router from './router'

const app = createApp(App)

// 注册所有Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 注册Pinia
app.use(createPinia())

// 注册路由
app.use(router)

// 注册Element Plus
app.use(ElementPlus, {
  locale: zh
})

// 挂载应用
app.mount('#app') 