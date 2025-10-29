import mountRemote from './bootstrap.js';

function main() {
  // mount into the page when running the remote standalone
  mountRemote('remote-root');
}

if (typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', main);
}

export default main;
