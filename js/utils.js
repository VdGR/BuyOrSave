// utils.js
import { getLocale } from './i18n.js';

export function deepClone(obj){
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const fmt = (n) => new Intl.NumberFormat(getLocale(), { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);

export function getByPath(obj, path){
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

export function setByPath(obj, path, value){
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
  target[last] = value;
}

export function coerceInputValue(el){
  if (el.type === 'checkbox') return !!el.checked;
  const v = Number(el.value);
  return Number.isFinite(v) ? v : 0;
}

export function debounce(fn, delay){
  let timeoutId = null;
  return function(...args){
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function memoize(fn){
  const cache = new Map();
  return function(...args){
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}
