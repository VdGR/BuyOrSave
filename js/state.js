// state.js - Centralized state management
import { DEFAULTS } from './defaults.js';
import { deepClone, getByPath, setByPath } from './utils.js';

export const params = deepClone(DEFAULTS);

export function encodeParamsToHash(p){
  try{
    return btoa(unescape(encodeURIComponent(JSON.stringify(p))));
  }catch(e){
    return encodeURIComponent(JSON.stringify(p));
  }
}

export function decodeParamsFromHash(s){
  try{
    return JSON.parse(decodeURIComponent(escape(atob(s))));
  }catch(e){
    try{ return JSON.parse(decodeURIComponent(s)); }catch(e2){ return null; }
  }
}

export function applyParamsFromHash(){
  const h = location.hash.slice(1);
  if (!h) return false;
  const decoded = decodeParamsFromHash(h);
  if (!decoded) return false;
  Object.keys(params).forEach(k => delete params[k]);
  Object.assign(params, decoded);
  return true;
}

export function getShareUrl(){
  const hash = encodeParamsToHash(params);
  return location.origin + location.pathname + '#' + hash;
}

export function syncInputsFromParams(){
  document.querySelectorAll('[data-path]').forEach((el) => {
    const path = el.dataset.path;
    const v = getByPath(params, path);
    if (el.type === 'checkbox') el.checked = !!v;
    else if (v !== undefined) el.value = v;
  });
}

export function updateParamFromInput(path, el){
  setByPath(params, path, el);
}
