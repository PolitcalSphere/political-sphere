// Simple remote module exported for Module Federation (ESM)
export default function mountRemote(elId = 'remote-root') {
  const el = typeof document !== 'undefined' ? document.getElementById(elId) || document.body : null;
  if (!el) return;
  const container = document.createElement('div');
  container.style.padding = '12px';
  container.style.border = '2px dashed #2b6cb0';
  container.innerText = 'Hello from remote module! (exposed as ./Widget)';
  el.appendChild(container);
}
