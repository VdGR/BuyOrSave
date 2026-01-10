// handlers.js - Event binding and user interaction
import { coerceInputValue, debounce } from './utils.js';
import { updateParamFromInput } from './state.js';

let renderCallback = null;

export function setRenderCallback(fn){
  renderCallback = fn;
}

const debouncedRender = debounce(() => {
  if (renderCallback) renderCallback();
}, 300);

export function bindInputs(){
  document.querySelectorAll('[data-path]').forEach((el) => {
    const path = el.dataset.path;
    const handler = () => {
      updateParamFromInput(path, coerceInputValue(el));
      debouncedRender();
    };
    el.addEventListener('input', handler);
    el.addEventListener('change', handler);
  });
}

export function bindResetButton(){
  const resetBtn = document.querySelector('#resetBtn');
  if (resetBtn){
    resetBtn.addEventListener('click', () => {
      if (renderCallback) renderCallback();
    });
  }
}

export function bindCopyLinkButton(){
  const copyLinkBtn = document.querySelector('#copyLinkBtn');
  if (copyLinkBtn){
    copyLinkBtn.addEventListener('click', () => {
      // Will be called by main.js
    });
  }
}

export function bindExportCsvButton(){
  const exportCsvBtn = document.querySelector('#exportCsvBtn');
  if (exportCsvBtn){
    exportCsvBtn.addEventListener('click', () => {
      // Will be called by main.js
    });
  }
}
