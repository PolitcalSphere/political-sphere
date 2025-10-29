async function bootstrap() {
  const root = document.getElementById('host-root') || document.body;
  const container = document.createElement('div');
  container.style.padding = '12px';
  container.style.border = '2px solid #48bb78';
  container.innerText = 'Host app: loading remote...';
  root.appendChild(container);

  try {
    // dynamic import of remote exposed module
    const remote = await import('remoteApp/Widget');
    if (remote && typeof remote === 'function') {
      remote('host-root');
      container.innerText = 'Host app: remote mounted successfully.';
    } else if (remote && remote.default) {
      // in case the remote exported default
      remote.default('host-root');
      container.innerText = 'Host app: remote mounted successfully (default export).';
    }
  } catch (e) {
    container.innerText = 'Host app: failed to load remote: ' + e.message;
    console.error(e);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', bootstrap);
}

export default bootstrap;
