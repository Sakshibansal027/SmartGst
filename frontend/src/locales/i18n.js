import en from './en.json';
import hi from './hi.json';

export function translate(value, language = localStorage.getItem('smartgst_language') || 'English') {
  if (language !== 'हिन्दी') return en.ui?.[value] || value;
  return hi.ui?.[value] || hi.nav?.[value] || value;
}

export function localeCode(language = localStorage.getItem('smartgst_language') || 'English') {
  return language === 'हिन्दी' ? 'hi-IN' : 'en-IN';
}
