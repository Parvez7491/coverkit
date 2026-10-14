(function () {
  'use strict';

  // ---------- Links you can edit ----------
  // Buy Me a Coffee (or other support) link. Leave empty to hide that button.
  var SUPPORT_URL = '';
  // Optional external feedback link. Leave empty to use the built-in feedback popup.
  var FEEDBACK_URL = '';
  // Your GitHub repository. Leave empty to hide the "Star on GitHub" button.
  var REPO_URL = 'https://github.com/Parvez7491/coverkit';
  // Cloudflare Turnstile SITE key (public). Leave empty to skip the spam-check widget.
  var TURNSTILE_SITEKEY = '';
  var FEEDBACK_ENDPOINT = '/api/feedback';

  var STORAGE_KEY = 'coverkit:v2';
  var THEME_KEY = 'coverkit:theme';
  var COVER_W = 794;   // A4 at 96dpi
  var COVER_H = 1123;

  // form id -> default value
  var fields = {
    name: '',
    studentId: '',
    serial: '',
    submissionDate: '',
    courseName: '',
    courseCode: '',
    section: '',
    docNo: '',
    faculty: '',
    department: ''
  };

  var els = {};
  Object.keys(fields).forEach(function (id) { els[id] = document.getElementById(id); });

  var pv = {
    title: document.getElementById('pvTitle'),
    course: document.getElementById('pvCourse'),
    name: document.getElementById('pvName'),
    id: document.getElementById('pvId'),
    serial: document.getElementById('pvSerial'),
    date: document.getElementById('pvDate'),
    code: document.getElementById('pvCode'),
    section: document.getElementById('pvSection'),
    faculty: document.getElementById('pvFaculty'),
    dept: document.getElementById('pvDept'),
    deptHeader: document.getElementById('pvDeptHeader')
  };

  var root = document.documentElement;
  var rowSerial = document.getElementById('rowSerial');
  var rowDate = document.getElementById('rowDate');
  var cover = document.getElementById('cover');
  var scaleEl = document.getElementById('previewScale');
  var holder = document.getElementById('previewHolder');
  var panel = document.getElementById('previewPanel');
  var downloadBtn = document.getElementById('downloadBtn');
  var downloadLabel = document.getElementById('downloadLabel');
  var resetBtn = document.getElementById('resetBtn');
  var resetLabel = document.getElementById('resetLabel');
  var hint = document.getElementById('hint');
  var toastEl = document.getElementById('toast');
  var lockedLayout = window.matchMedia('(min-width: 961px) and (min-height: 640px)');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ---------- toast ----------
  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  }

  // ---------- theme (light / dark) ----------
  // The saved choice is applied by a tiny script in <head> before first paint (no flash).
  var themeBtn = document.getElementById('themeBtn');
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var THEME_COLORS = { light: '#fdfcf7', dark: '#14131b' };

  function currentTheme() { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }

  function applyTheme(theme, persist) {
    var label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    root.setAttribute('data-theme', theme);
    if (themeMeta) themeMeta.setAttribute('content', THEME_COLORS[theme]);
    themeBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    themeBtn.setAttribute('aria-label', label);
    themeBtn.title = label;
    if (persist) {
      try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
    }
  }

  var themeTimer = null;
  themeBtn.addEventListener('click', function () {
    root.classList.add('theme-anim');
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
    clearTimeout(themeTimer);
    themeTimer = setTimeout(function () { root.classList.remove('theme-anim'); }, 420);
  });

  // follow the system setting until the visitor picks one themselves
  var systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  if (systemDark.addEventListener) {
    systemDark.addEventListener('change', function (e) {
      var saved = null;
      try { saved = localStorage.getItem(THEME_KEY); } catch (err) { /* ignore */ }
      if (!saved) applyTheme(e.matches ? 'dark' : 'light', false);
    });
  }
  applyTheme(currentTheme(), false);

  // ---------- feedback ----------
  var feedbackLink = document.getElementById('feedbackLink');
  if (FEEDBACK_URL) {
    feedbackLink.href = FEEDBACK_URL;
    feedbackLink.target = '_blank';
    feedbackLink.rel = 'noopener';
  } else {
    feedbackLink.addEventListener('click', function (e) {
      e.preventDefault();
      openFeedback();
    });
  }

  // ---------- helpers ----------
  function val(id) { return (els[id].value || '').trim(); }

  // Placeholder text lives in index.html. Capture it once at startup so there is
  // a single place to edit it (the text inside each preview element).
  function capturePlaceholders() {
    var nodes = [pv.course, pv.name, pv.id, pv.code, pv.section, pv.faculty, pv.dept, pv.deptHeader];
    nodes.forEach(function (n) { n.setAttribute('data-ph', n.textContent); });
  }

  // sets text; falls back to a grey placeholder (removed from the PDF)
  function setText(node, value) {
    if (value) {
      node.textContent = value;
      node.classList.remove('is-empty');
    } else {
      node.textContent = node.getAttribute('data-ph');
      node.classList.add('is-empty');
    }
  }

  // "2026-10-14" -> "14 October 2026" (parsed by hand so time zones can never shift the day)
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  function formatDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return '';
    var month = MONTHS[parseInt(m[2], 10) - 1];
    if (!month) return '';
    return parseInt(m[3], 10) + ' ' + month + ' ' + m[1];
  }

  // ---------- preview ----------
  function render() {
    var no = val('docNo');
    pv.title.textContent = 'ASSIGNMENT' + (no ? ' ' + no : '');

    setText(pv.course, val('courseName'));
    setText(pv.name, val('name'));
    setText(pv.id, val('studentId'));
    setText(pv.code, val('courseCode'));
    setText(pv.section, val('section'));
    setText(pv.faculty, val('faculty'));

    var dept = val('department');
    setText(pv.dept, dept ? 'Department of ' + dept : '');
    setText(pv.deptHeader, dept ? 'DEPARTMENT OF ' + dept.toUpperCase() : '');

    // optional row only shows when filled
    var serial = val('serial');
    pv.serial.textContent = serial;
    rowSerial.style.display = serial ? '' : 'none';

    var date = formatDate(val('submissionDate'));
    pv.date.textContent = date;
    rowDate.style.display = date ? '' : 'none';
  }

  // scales the A4 cover to fit the preview panel (width and, on desktop, height)
  function fitPreview() {
    var cs = getComputedStyle(panel);
    var availW = panel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var s = availW / COVER_W;
    if (lockedLayout.matches) {
      var availH = panel.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      s = Math.min(s, availH / COVER_H);
    }
    s = Math.max(0.1, Math.min(1, s));
    scaleEl.style.transform = 'scale(' + s + ')';
    holder.style.width = Math.floor(COVER_W * s) + 'px';
    holder.style.height = Math.floor(COVER_H * s) + 'px';
  }

  // one resize handler per frame is plenty
  var fitQueued = false;
  function queueFit() {
    if (fitQueued) return;
    fitQueued = true;
    window.requestAnimationFrame(function () {
      fitQueued = false;
      fitPreview();
      zoomFit();
    });
  }

  // ---------- storage ----------
  function save() {
    try {
      var data = {};
      Object.keys(fields).forEach(function (id) { data[id] = els[id].value; });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* storage blocked, ignore */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      Object.keys(fields).forEach(function (id) {
        if (typeof data[id] === 'string') els[id].value = data[id];
      });
    } catch (e) { /* ignore */ }
  }

  // preview updates instantly; saving waits until typing pauses
  var saveTimer = null;
  function onInput() {
    render();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 200);
  }

  Object.keys(fields).forEach(function (id) {
    els[id].addEventListener('input', onInput);
    els[id].addEventListener('change', onInput);
  });
  window.addEventListener('pagehide', function () { clearTimeout(saveTimer); save(); });

  // ---------- reset (asks for a second click) ----------
  var resetArmed = false;
  var resetTimer = null;

  function disarm() {
    resetArmed = false;
    clearTimeout(resetTimer);
    resetLabel.textContent = 'Reset';
  }

  resetBtn.addEventListener('click', function () {
    if (!resetArmed) {
      resetArmed = true;
      resetLabel.textContent = 'Click again to confirm';
      resetTimer = setTimeout(disarm, 3000);
      return;
    }
    disarm();
    clearTimeout(saveTimer);
    Object.keys(fields).forEach(function (id) { els[id].value = fields[id]; });
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    render();
    showHint('');
    toast('Form cleared');
  });

  // ---------- PDF ----------
  function fileName() {
    var parts = ['Assignment' + (val('docNo') ? val('docNo') : ''), val('courseCode'), val('studentId')]
      .filter(Boolean);
    return parts.join('-').replace(/[^a-z0-9\-_]+/gi, '_') + '.pdf';
  }

  function setBusy(busy) {
    downloadBtn.disabled = busy;
    downloadBtn.classList.toggle('is-busy', busy);
    downloadLabel.textContent = busy ? 'Making PDF...' : 'Download PDF';
  }

  var doneTimer = null;
  function flashDone() {
    downloadBtn.classList.remove('is-done');
    void downloadBtn.offsetWidth; // restart the animation if clicked again quickly
    downloadBtn.classList.add('is-done');
    downloadLabel.textContent = 'Saved';
    clearTimeout(doneTimer);
    doneTimer = setTimeout(function () {
      downloadBtn.classList.remove('is-done');
      if (!downloadBtn.disabled) downloadLabel.textContent = 'Download PDF';
    }, 1600);
  }

  function showHint(msg) { hint.textContent = msg; }

  downloadBtn.addEventListener('click', function () {
    if (!window.html2canvas || !window.jspdf) {
      showHint('PDF libraries failed to load. Check your connection and refresh.');
      return;
    }
    clearTimeout(doneTimer);
    downloadBtn.classList.remove('is-done');
    showHint('');
    setBusy(true);

    var ok = false;
    var ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    ready.then(function () {
      return window.html2canvas(cover, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        onclone: function (doc) {
          var c = doc.getElementById('cover');
          // no entrance animations or transitions in the capture
          var freeze = doc.createElement('style');
          freeze.textContent = '*,*::before,*::after{animation:none !important;transition:none !important;}';
          doc.head.appendChild(freeze);
          // render at full size (the live preview is scaled and clipped), drop placeholder text
          var hold = doc.getElementById('previewHolder');
          hold.style.width = COVER_W + 'px';
          hold.style.height = COVER_H + 'px';
          hold.style.overflow = 'visible';
          hold.style.boxShadow = 'none';
          hold.style.outline = 'none';
          hold.style.transform = 'none';
          var sc = doc.getElementById('previewScale');
          sc.style.transform = 'none';
          sc.style.boxShadow = 'none';
          var empties = c.querySelectorAll('.is-empty');
          for (var i = 0; i < empties.length; i++) empties[i].textContent = '';
        }
      });
    }).then(function (canvas) {
      var jsPDF = window.jspdf.jsPDF;
      var pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
      pdf.save(fileName());
      ok = true;
    }).catch(function (err) {
      console.error(err);
      showHint('Could not make the PDF. If you opened index.html straight from a folder, use a local server or the hosted site.');
    }).then(function () {
      setBusy(false);
      if (ok) {
        flashDone();
        toast('PDF saved to your device');
      }
    });
  });

  // ---------- popups (support + enlarged preview) ----------
  var coffeeBtn = document.getElementById('coffeeBtn');
  var supportModal = document.getElementById('supportModal');
  var supportLink = document.getElementById('supportLink');
  var starLink = document.getElementById('starLink');
  var zoomBtn = document.getElementById('zoomBtn');
  var zoomModal = document.getElementById('zoomModal');
  var zoomBody = document.getElementById('zoomBody');
  var feedbackModal = document.getElementById('feedbackModal');
  var zoomHolder = null;
  var zoomScale = null;
  var activeModal = null;
  var lastFocus = null;
  var closeTimer = null;

  if (SUPPORT_URL) {
    supportLink.href = SUPPORT_URL;
    supportLink.hidden = false;
  }
  if (REPO_URL) {
    starLink.href = REPO_URL;
    starLink.hidden = false;
  }

  function openModal(m) {
    clearTimeout(closeTimer);
    if (!activeModal) lastFocus = document.activeElement;
    activeModal = m;
    m.classList.remove('is-closing');
    m.hidden = false;
    document.body.style.overflow = 'hidden';
    var first = m.querySelector('.modal-actions .btn:not([hidden])') || m.querySelector('.modal-x');
    if (first) first.focus();
  }

  function closeModal(m) {
    if (!m || m.hidden || m.classList.contains('is-closing')) return;
    m.classList.add('is-closing');
    closeTimer = setTimeout(function () {
      m.hidden = true;
      m.classList.remove('is-closing');
      document.body.style.overflow = '';
      activeModal = null;
      if (m === zoomModal) { zoomBody.innerHTML = ''; zoomHolder = null; zoomScale = null; }
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }, reducedMotion.matches ? 0 : 160);
  }

  // enlarged preview: a copy of the cover, scaled to fit the screen (or to a readable
  // size you can pan around on phones)
  function zoomFit() {
    if (!zoomScale || zoomModal.hidden) return;
    var narrow = window.innerWidth < 961;
    var availW = Math.max(200, window.innerWidth - 68);
    var availH = Math.max(200, window.innerHeight - 120);
    var s = narrow
      ? Math.min(1, Math.max(0.72, availW / COVER_W))
      : Math.min(1, availW / COVER_W, availH / COVER_H);
    zoomScale.style.transform = 'scale(' + s + ')';
    zoomHolder.style.width = Math.floor(COVER_W * s) + 'px';
    zoomHolder.style.height = Math.floor(COVER_H * s) + 'px';
  }

  function openZoom() {
    var clone = cover.cloneNode(true);
    var withIds = clone.querySelectorAll('[id]');
    clone.removeAttribute('id');
    for (var i = 0; i < withIds.length; i++) withIds[i].removeAttribute('id');

    zoomBody.innerHTML = '';
    zoomHolder = document.createElement('div');
    zoomHolder.className = 'zoom-holder';
    zoomScale = document.createElement('div');
    zoomScale.className = 'zoom-scale';
    zoomScale.appendChild(clone);
    zoomHolder.appendChild(zoomScale);
    zoomBody.appendChild(zoomHolder);

    openModal(zoomModal);
    zoomFit();
  }

  coffeeBtn.addEventListener('click', function () { openModal(supportModal); });
  zoomBtn.addEventListener('click', openZoom);
  holder.addEventListener('click', openZoom);

  [supportModal, zoomModal, feedbackModal].forEach(function (m) {
    m.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) closeModal(m);
    });
  });

  // the star link opens GitHub in a new tab; close the popup and say thanks
  starLink.addEventListener('click', function () {
    setTimeout(function () {
      closeModal(supportModal);
      toast('Thank you, that means a lot');
    }, 150);
  });

  document.addEventListener('keydown', function (e) {
    if (!activeModal) return;
    if (e.key === 'Escape') { closeModal(activeModal); return; }
    if (e.key === 'Tab') {
      // keep focus inside the popup
      var items = Array.prototype.filter.call(activeModal.querySelectorAll('button, a[href], input:not(.fb-hp), textarea, [tabindex="0"]'), function (n) { return n.offsetParent !== null && !n.disabled; });
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // ---------- feedback popup ----------
  var fbForm = document.getElementById('fbForm');
  var fbDone = document.getElementById('fbDone');
  var fbMsg = document.getElementById('fbMsg');
  var fbCount = document.getElementById('fbCount');
  var fbContact = document.getElementById('fbContact');
  var fbHp = document.getElementById('fbWebsite');
  var fbHint = document.getElementById('fbHint');
  var fbSend = document.getElementById('fbSend');
  var fbSendLabel = document.getElementById('fbSendLabel');
  var fbStarsEl = document.getElementById('fbStars');
  var stars = fbStarsEl.querySelectorAll('.fb-star');
  var fbRating = 0, fbToken = '', fbTsId = null, fbTsLoading = false;

  function showFb(msg) { fbHint.textContent = msg; }
  function shake(node) {
    var f = node.closest('.field') || node;
    f.classList.remove('is-shake'); void f.offsetWidth; f.classList.add('is-shake');
  }
  function paintStars(n) {
    for (var i = 0; i < stars.length; i++) stars[i].classList.toggle('on', i < n);
  }
  Array.prototype.forEach.call(stars, function (b, i) {
    b.addEventListener('click', function () {
      fbRating = fbRating === i + 1 ? 0 : i + 1; // tap the same star again to clear
      paintStars(fbRating);
      b.classList.remove('pop'); void b.offsetWidth;
      if (fbRating) b.classList.add('pop');
    });
    b.addEventListener('mouseenter', function () { paintStars(i + 1); });
  });
  fbStarsEl.addEventListener('mouseleave', function () { paintStars(fbRating); });
  fbMsg.addEventListener('input', function () { fbCount.textContent = fbMsg.value.length + ' / 1000'; });

  // Cloudflare Turnstile loads only when a site key is set, and only when the popup opens
  function renderTs() {
    if (fbTsId !== null) { window.turnstile.reset(fbTsId); fbToken = ''; return; }
    fbTsId = window.turnstile.render('#fbTurnstile', {
      sitekey: TURNSTILE_SITEKEY,
      theme: currentTheme(),
      callback: function (t) { fbToken = t; },
      'expired-callback': function () { fbToken = ''; },
      'error-callback': function () { fbToken = ''; }
    });
  }
  function loadTurnstile() {
    if (!TURNSTILE_SITEKEY) return;
    if (window.turnstile) { renderTs(); return; }
    if (fbTsLoading) return;
    fbTsLoading = true;
    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = renderTs;
    document.head.appendChild(s);
  }

  function openFeedback() {
    fbForm.hidden = false;
    fbDone.hidden = true;
    showFb('');
    openModal(feedbackModal);
    loadTurnstile();
    setTimeout(function () { fbMsg.focus(); }, 60);
  }

  function setSending(on) {
    fbSend.disabled = on;
    fbSend.classList.toggle('is-busy', on);
    fbSendLabel.textContent = on ? 'Sending...' : 'Send';
  }

  fbForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var message = fbMsg.value.trim();
    var contact = fbContact.value.trim();
    if (message.length < 5) { showFb('Write a few words so I know what you mean.'); shake(fbMsg); fbMsg.focus(); return; }
    if (contact && !/^\S+@\S+\.\S+$/.test(contact)) { showFb('That email does not look right. Fix it or leave it empty.'); shake(fbContact); fbContact.focus(); return; }
    if (TURNSTILE_SITEKEY && !fbToken) { showFb('Wait a second for the spam check to finish, then send again.'); return; }

    showFb('');
    setSending(true);
    fetch(FEEDBACK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: fbForm.querySelector('input[name="fbCat"]:checked').value,
        rating: fbRating || null,
        message: message,
        contact: contact,
        website: fbHp.value,
        token: fbToken
      })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.error || 'Could not send. Try again in a moment.');
      });
    }).then(function () {
      fbForm.reset(); fbRating = 0; paintStars(0); fbCount.textContent = '0 / 1000';
      fbForm.hidden = true;
      fbDone.hidden = false;
      var b = fbDone.querySelector('.btn'); if (b) b.focus();
    }).catch(function (err) {
      showFb(err.message || 'Could not send. Check your connection and try again.');
      if (window.turnstile && fbTsId !== null) { window.turnstile.reset(fbTsId); fbToken = ''; }
    }).then(function () { setSending(false); });
  });

  // ---------- init ----------
  capturePlaceholders();
  load();
  render();
  fitPreview();
  window.addEventListener('resize', queueFit);
  if (lockedLayout.addEventListener) lockedLayout.addEventListener('change', queueFit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPreview);
})();
