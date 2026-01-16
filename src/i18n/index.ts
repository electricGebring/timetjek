import { createI18n } from 'vue-i18n'
import en from './en.json'
import sv from './sv.json'

const i18n = createI18n({
  legacy: false,
  locale: 'sv',
  fallbackLocale: 'en',
  messages: {
    en,
    sv
  }
})

export default i18n