import Vue from 'vue'
import Vuex from 'vuex'
import VueI18n from 'vue-i18n'
import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.min.css'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import { DataExperience, vuetifyOpts, i18nOpts } from '@/main'
import App from './App.vue'

Vue.use(Vuex)
Vue.use(VueI18n)
Vue.use(Vuetify)

const store = new Vuex.Store({})
const i18n = new VueI18n(i18nOpts)
const vuetify = new Vuetify(vuetifyOpts(i18n))
Vue.use(DataExperience, { store })

Vue.config.productionTip = false

new Vue({ i18n, vuetify, store, render: h => h(App) }).$mount('#app')
