/* PROMETEO TOUCH-FIRST INTERACTION v1
   Pointer Events unify touch, mouse and pen.
*/
(() => {
  if (window.__PROMETEO_TOUCH_FIRST_V1__) return;
  window.__PROMETEO_TOUCH_FIRST_V1__ = true;

  const root = document.documentElement;
  const indicator = document.createElement('div');
  indicator.className = 'p-contact-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  document.body.appendChild(indicator);

  const touchSelector = '[data-p-touch]';
  let activePointerId = null;

  function moveIndicator(event){
    indicator.style.left = event.clientX + 'px';
    indicator.style.top = event.clientY + 'px';
  }

  function clearPressed(){
    document.querySelectorAll(`${touchSelector}[data-p-pressed="true"]`)
      .forEach(el => el.removeAttribute('data-p-pressed'));
  }

  addEventListener('pointerdown', event => {
    activePointerId = event.pointerId;
    root.dataset.pContact = event.pointerType || 'mouse';
    moveIndicator(event);

    const target = event.target.closest?.(touchSelector);
    if (target && !target.matches(':disabled,[aria-disabled="true"]')) {
      target.dataset.pPressed = 'true';
    }
  }, {capture:true, passive:true});

  addEventListener('pointermove', event => {
    if (event.pointerId !== activePointerId) return;
    moveIndicator(event);
  }, {passive:true});

  function finish(event){
    if (activePointerId !== null && event.pointerId !== activePointerId) return;
    clearPressed();
    root.removeAttribute('data-p-contact');
    activePointerId = null;
  }

  addEventListener('pointerup', finish, {capture:true, passive:true});
  addEventListener('pointercancel', finish, {capture:true, passive:true});
  addEventListener('blur', () => {
    clearPressed();
    root.removeAttribute('data-p-contact');
    activePointerId = null;
  });

  window.PrometeoTouch = Object.freeze({
    version:'1',
    isCoarse:() => matchMedia('(pointer:coarse)').matches,
    isFine:() => matchMedia('(pointer:fine)').matches
  });
})();
