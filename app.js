(function () {
  'use strict';

  // Put your Buy Me a Coffee (or other support) link here.
  // Leave it empty and the popup will just say thank you, with no button.
  var SUPPORT_URL = '';

  var STORAGE_KEY = 'coverkit:v2';
  var COVER_W = 794;   // A4 at 96dpi
  var COVER_H = 1123;

  // form id -> default value
  var fields = {
    name: '',
    studentId: '',
    serial: '',
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
    code: document.getElementById('pvCode'),
    section: document.getElementById('pvSection'),
    faculty: document.getElementById('pvFaculty'),
    dept: document.getElementById('pvDept'),
    deptHeader: document.getElementById('pvDeptHeader')
  };

  var rowSerial = document.getElementById('rowSerial');
  var cover = document.getElementById('cover');
  var scaleEl = document.getElementById('previewScale');
  var holder = document.getElementById('previewHolder');
  var panel = document.getElementById('previewPanel');
  var downloadBtn = document.getElementById('downloadBtn');
  var downloadLabel = document.getElementById('downloadLabel');
  var resetBtn = document.getElementById('resetBtn');
  var resetLabel = document.getElementById('resetLabel');
  var hint = document.getElementById('hint');
  var lockedLayout = window.matchMedia('(min-width: 961px) and (min-height: 640px)');

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

  function onInput() { render(); save(); }

  Object.keys(fields).forEach(function (id) {
    els[id].addEventListener('input', onInput);
    els[id].addEventListener('change', onInput);
  });

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
    Object.keys(fields).forEach(function (id) { els[id].value = fields[id]; });
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    render();
    showHint('');
  });

  // ---------- PDF ----------
  function fileName() {
    var parts = ['Assignment' + (val('docNo') ? val('docNo') : ''), val('courseCode'), val('studentId')]
      .filter(Boolean);
    return parts.join('-').replace(/[^a-z0-9\-_]+/gi, '_') + '.pdf';
  }

  function setBusy(busy) {
    downloadBtn.disabled = busy;
    downloadLabel.textContent = busy ? 'Making PDF...' : 'Download PDF';
  }

  function showHint(msg) { hint.textContent = msg; }

  downloadBtn.addEventListener('click', function () {
    if (!window.html2canvas || !window.jspdf) {
      showHint('PDF libraries failed to load. Check your connection and refresh.');
      return;
    }
    showHint('');
    setBusy(true);

    var ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    ready.then(function () {
      return window.html2canvas(cover, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        onclone: function (doc) {
          var c = doc.getElementById('cover');
          // render at full size (the live preview is scaled and clipped), drop placeholder text
          var hold = doc.getElementById('previewHolder');
          hold.style.width = COVER_W + 'px';
          hold.style.height = COVER_H + 'px';
          hold.style.overflow = 'visible';
          hold.style.boxShadow = 'none';
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
    }).catch(function (err) {
      console.error(err);
      showHint('Could not make the PDF. If you opened index.html straight from a folder, use a local server or the hosted site.');
    }).then(function () { setBusy(false); });
  });

  // ---------- support popup ----------
  var coffeeBtn = document.getElementById('coffeeBtn');
  var modal = document.getElementById('supportModal');
  var supportLink = document.getElementById('supportLink');
  var lastFocus = null;

  if (SUPPORT_URL) {
    supportLink.href = SUPPORT_URL;
    supportLink.hidden = false;
  }

  function openModal() {
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    var first = modal.querySelector('.modal-actions .btn:not([hidden])');
    if (first) first.focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  coffeeBtn.addEventListener('click', openModal);
  modal.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (modal.hidden) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'Tab') {
      // keep focus inside the popup
      var items = modal.querySelectorAll('button, a[href]:not([hidden])');
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // ---------- init ----------
  capturePlaceholders();
  load();
  render();
  fitPreview();
  window.addEventListener('resize', fitPreview);
  if (lockedLayout.addEventListener) lockedLayout.addEventListener('change', fitPreview);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPreview);
})();
