/* =============================================
   ROUTER.JS — Yeshua Educational Platform
   ============================================= */

const Router = (() => {
  const routes = {};

  function register(name, fn) { routes[name] = fn; }

  function go(page, params = {}) {
    window.history.pushState({ page, params }, '', '#' + page);
    _render(page, params);
  }

   function _render(page, params = {}) {
     const fn = routes[page] || routes['login'];
     if (fn) {
       const result = fn(params);
       // If render function returns a Promise, it's async – await it
       if (result && typeof result.then === 'function') {
         result.catch(err => console.error('Route render error:', err));
       }
     }
   }

  function init() {
    window.addEventListener('popstate', e => {
      const page = e.state?.page || _fromHash();
      _render(page, e.state?.params || {});
    });
    _render(_fromHash());
  }

  function _fromHash() {
    return window.location.hash.slice(1) || 'login';
  }

  return { register, go, init, routes };
})();
