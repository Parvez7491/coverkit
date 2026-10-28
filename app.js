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
  var DOWNLOADS_ENDPOINT = '/api/downloads';
  var MAX_MEMBERS = 5; // submitted-by people on one (group) cover
  var DOC_TYPES = ['Assignment', 'Lab Report', 'Project Report', 'Term Paper', 'Report'];
  var TEMPLATES = [
    { id: 'classic', name: 'Classic', desc: 'The original CoverKit layout with the familiar bordered box and black course band.' },
    { id: 'minimal', name: 'Minimal', desc: 'A lighter open layout with clean rules, more white space, and left-aligned headings.' },
    { id: 'formal', name: 'Formal', desc: 'Serif headings inside a fine double frame for a more traditional academic cover.' },
    { id: 'academic', name: 'Academic', desc: 'Colored header with ruled title block and the faculty and student details side by side.' },
    { id: 'frame', name: 'Frame', desc: 'Left-aligned and airy, with a large title and fine line-art corners.' },
    { id: 'arch', name: 'Arch', desc: 'A serif title, a soft rounded course box, and tinted arches in the corners.' }
  ];

  // Color modes. ink = body text, head = title/university, acc = bands and rules,
  // acc2 = lighter accent, tint = soft fills. They become CSS variables on the cover.
  var THEMES = [
    { id: 'mono', name: 'Black & white', ink: '#000000', head: '#000000', acc: '#000000', acc2: '#444444', tint: '#ececec', sw: 'linear-gradient(135deg,#000 50%,#fff 50%)' },
    { id: 'nsu', name: 'NSU blue', ink: '#16143a', head: '#201B4E', acc: '#201B4E', acc2: '#2BA0DA', tint: '#d8eefa' },
    { id: 'forest', name: 'Forest green', ink: '#10261b', head: '#0f5c3a', acc: '#0f5c3a', acc2: '#2e9e6b', tint: '#d9efe3' },
    { id: 'maroon', name: 'Maroon', ink: '#2a1014', head: '#7a1f2b', acc: '#7a1f2b', acc2: '#c2575f', tint: '#f4dcde' },
    { id: 'teal', name: 'Teal', ink: '#0b2a30', head: '#0b5563', acc: '#0b5563', acc2: '#3fa7a0', tint: '#d6eeec' }
  ];
  var LOGO = window.COVERKIT_LOGO || {};
  function themeById(id) {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i];
    return THEMES[0];
  }

  // Line-art / arch decorations for the newer templates, drawn as an SVG
  // background (html2canvas cannot do CSS masks, so colors are baked in).
  var decoCache = {};
  function decoUri(tpl, th) {
    var key = tpl + th.id;
    if (decoCache[key] !== undefined) return decoCache[key];
    var a = th.acc, b = th.acc2, t = th.tint, g = '';
    function arcs(cx, cy, radii, fn) { return radii.map(fn).join(''); }
    if (tpl === 'academic') {
      g = '<rect width="794" height="16" fill="' + a + '"/><rect y="22" width="794" height="3" fill="' + b + '"/>' +
        '<rect y="1107" width="794" height="16" fill="' + a + '"/><rect y="1098" width="794" height="3" fill="' + b + '"/>';
    } else if (tpl === 'frame') {
      g = '<g fill="none" stroke="' + a + '" stroke-width="1.5">' +
        '<path d="M56 330V56H330"/><path d="M738 206V330"/><path d="M738 800V1067H470"/><path d="M56 917V790"/>' +
        arcs(738, 56, [70, 110, 150], function (r) { return '<path d="M' + (738 - r) + ' 56A' + r + ' ' + r + ' 0 0 0 738 ' + (56 + r) + '"/>'; }) +
        arcs(56, 1067, [70, 110, 150], function (r) { return '<path d="M56 ' + (1067 - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (56 + r) + ' 1067"/>'; }) +
        '<circle cx="738" cy="372" r="9"/><circle cx="56" cy="748" r="9"/>' +
        '<path d="M377 50v14M397 50v14M417 50v14M377 1059v14M397 1059v14M417 1059v14"/>' +
        '<path d="M42 470h16M42 484h16M42 498h16M736 640h16M736 654h16M736 668h16"/></g>';
    } else if (tpl === 'arch') {
      var dots = function (pts) { return pts.map(function (p, i) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i % 3 === 2 ? 4 : 5.5) + '" fill="' + (i % 3 === 2 ? b : a) + '"/>'; }).join(''); };
      g = '<g fill="' + t + '" stroke="' + b + '" stroke-width="1.6">' +
        '<path d="M0 0H104V120A52 52 0 0 1 0 120Z"/><path d="M690 1123V1003A52 52 0 0 1 794 1003V1123Z"/>' +
        '<path d="M794 0V130A130 130 0 0 1 664 0Z" stroke="none"/><path d="M0 993A130 130 0 0 1 130 1123H0Z" stroke="none"/></g>' +
        '<g fill="none" stroke="' + b + '" stroke-width="1.6"><path d="M0 260A260 260 0 0 0 260 0"/><path d="M794 863A260 260 0 0 0 534 1123"/></g>' +
        '<g fill="none" stroke="' + b + '" stroke-width="0.9" opacity="0.6"><path d="M26 0V122M52 0V170M78 0V122M716 1123V1001M742 1123V951M768 1123V1001"/></g>' +
        dots([[742, 36], [706, 22], [770, 74], [724, 78], [684, 46], [750, 108]]) +
        dots([[52, 1086], [92, 1100], [30, 1050], [74, 1052], [112, 1076], [20, 1096]]);
    }
    var out = g ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123">' + g + '</svg>') : '';
    decoCache[key] = out;
    return out;
  }

  // Full NSU course catalog from courses.js: [code, title] pairs (title ''
  // where only the code could be verified). Codes are matched without spaces
  // ('CSE 115' and 'cse115' both hit CSE115). Anything a student types in
  // once is also remembered in their own browser, on top of this list.
  var catalogList = [];
  var catalogByCode = {};
  (window.COVERKIT_COURSES || []).forEach(function (pair) {
    var code = String((pair && pair[0]) || '').toUpperCase().replace(/[\s-]+/g, '');
    var title = String((pair && pair[1]) || '');
    if (!code || catalogByCode[code]) return;
    var item = { code: code, title: title };
    catalogByCode[code] = item;
    catalogList.push(item);
  });

  var STORAGE_KEY = 'coverkit:v2';
  var THEME_KEY = 'coverkit:theme';
  var COURSES_KEY = 'coverkit:courses';
  var COVER_W = 794;   // A4 at 96dpi
  var COVER_H = 1123;

  // form id -> default value
  var fields = {
    docType: 'Assignment',
    template: 'classic',
    theme: 'mono',
    logoMode: 'auto',
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
  var dateEcho = document.getElementById('dateEcho');
  var docNoLabel = document.getElementById('docNoLabel');
  var templateStack = document.getElementById('templateStack');
  var templateGallery = document.getElementById('templateGallery');
  var seeAllTemplatesBtn = document.getElementById('seeAllTemplatesBtn');
  var templateModal = document.getElementById('templateModal');
  var groupMembersEl = document.getElementById('groupMembers');
  var addMemberBtn = document.getElementById('addMemberBtn');
  var groupNote = document.getElementById('groupNote');
  var courseCodeList = document.getElementById('courseCodeList');
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

  // ---------- toast (optionally with one action, e.g. Undo) ----------
  var toastMsg = document.getElementById('toastMsg');
  var toastAction = document.getElementById('toastAction');
  var toastTimer = null;
  var toastActionCb = null;
  function hideToast() {
    toastEl.classList.remove('show');
    toastActionCb = null;
  }
  function toast(msg, actionLabel, actionCb, ms) {
    toastMsg.textContent = msg;
    toastActionCb = actionCb || null;
    if (actionLabel && actionCb) {
      toastAction.textContent = actionLabel;
      toastAction.hidden = false;
    } else {
      toastAction.hidden = true;
    }
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, ms || 2400);
  }
  toastAction.addEventListener('click', function () {
    var cb = toastActionCb;
    clearTimeout(toastTimer);
    hideToast();
    if (cb) cb();
  });

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

  // "ELECTRICAL & COMPUTER ENGINEERING" -> "Electrical and Computer Engineering".
  // Mixed-case typing is respected as deliberate; only & and spacing are fixed.
  function normalizeDept(raw) {
    var spaced = (raw || '').trim().replace(/\s+/g, ' ');
    if (!spaced) return '';
    // judge "all one case" before & becomes a lowercase "and"
    var uniform = spaced === spaced.toLowerCase() || spaced === spaced.toUpperCase();
    var d = spaced.replace(/\s*&\s*/g, ' and ');
    if (uniform) {
      var small = { and: 1, of: 1, the: 1 };
      d = d.toLowerCase().split(' ').map(function (w, i) {
        if (i && small[w]) return w;
        return w.replace(/(^|-)([a-z])/g, function (m, sep, ch) { return sep + ch.toUpperCase(); });
      }).join(' ');
    }
    return d;
  }

  function normalizeCode(v) { return (v || '').toUpperCase().replace(/[\s-]+/g, ''); }

  // ---------- cover templates (three across in the form, all in the gallery) ----------
  function templateById(id) {
    for (var i = 0; i < TEMPLATES.length; i++) {
      if (TEMPLATES[i].id === id) return TEMPLATES[i];
    }
    return null;
  }

  function selectedTemplate() {
    return templateById(val('template')) || TEMPLATES[0];
  }

  function makeSpan(className, text) {
    var node = document.createElement('span');
    node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  var thumbs = []; // one entry per preview card: { thumb, scaleEl, clone }

  function fitThumb(t) {
    var w = t.thumb.clientWidth;
    if (w) t.scaleEl.style.transform = 'scale(' + (w / COVER_W) + ')';
  }

  function createTemplateThumb(template) {
    var thumb = makeSpan('template-thumb template-thumb--' + template.id);
    thumb.setAttribute('aria-hidden', 'true');
    var scaleEl = document.createElement('div');
    scaleEl.className = 'template-thumb-scale';
    var clone = cover.cloneNode(true);
    clone.removeAttribute('id');
    Array.prototype.forEach.call(clone.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); });
    clone.setAttribute('data-template', template.id);
    scaleEl.appendChild(clone);
    thumb.appendChild(scaleEl);
    var entry = { thumb: thumb, scaleEl: scaleEl, clone: clone };
    thumbs.push(entry);
    if (window.ResizeObserver) new ResizeObserver(function () { fitThumb(entry); }).observe(thumb);
    return thumb;
  }

  // copies the live cover's text, classes and inline styles into every preview
  // clone (same DOM order, so index i matches index i)
  function syncThumbs() {
    if (!thumbs.length) return;
    var src = cover.querySelectorAll('*');
    for (var t = 0; t < thumbs.length; t++) {
      var clone = thumbs[t].clone;
      var dst = clone.querySelectorAll('*');
      clone.className = cover.className;
      clone.style.cssText = cover.style.cssText;
      clone.setAttribute('data-members', cover.getAttribute('data-members') || '1');
      for (var i = 0; i < src.length && i < dst.length; i++) {
        if (src[i].tagName === 'IMG') {
          var k = src[i].getAttribute('data-k');
          if (k && dst[i].getAttribute('data-k') !== k) { dst[i].src = src[i].src; dst[i].setAttribute('data-k', k); }
          continue;
        }
        if (dst[i].classList.contains('cover-deco') || src[i].classList.contains('cover-deco')) {
          var d = decoUri(clone.getAttribute('data-template'), themeById(val('theme')));
          dst[i].style.backgroundImage = d ? 'url("' + d + '")' : 'none';
          continue;
        }
        dst[i].className = src[i].className;
        dst[i].style.cssText = src[i].style.cssText;
        if (!src[i].children.length) dst[i].textContent = src[i].textContent;
      }
    }
  }

  function createTemplateOption(template, index, inGallery) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'template-option ' + (inGallery ? 'template-option--gallery' : 'template-option--inline');
    button.setAttribute('data-template-card', template.id);
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', 'Use the ' + template.name + ' template. ' + template.desc);

    var check = makeSpan('template-check', '✓');
    check.setAttribute('aria-hidden', 'true');
    button.appendChild(check);
    button.appendChild(createTemplateThumb(template));

    var meta = makeSpan('template-meta');
    meta.appendChild(makeSpan('template-name', template.name));
    meta.appendChild(makeSpan('template-desc', template.desc));
    button.appendChild(meta);

    button.addEventListener('click', function () { selectTemplate(template.id, inGallery); });
    return button;
  }

  // The form shows three designs; the rest live behind "See all". A design
  // picked from the gallery takes the third slot so the choice stays visible.
  function inlineTemplates() {
    var list = TEMPLATES.slice(0, 3);
    var sel = selectedTemplate();
    if (list.indexOf(sel) < 0) list[2] = sel;
    return list;
  }
  var builtKey = '';
  function ensureTemplateCards() {
    var key = inlineTemplates().map(function (t) { return t.id; }).join();
    if (key !== builtKey) buildTemplateCards();
  }

  function buildTemplateCards() {
    thumbs = [];
    builtKey = inlineTemplates().map(function (t) { return t.id; }).join();
    if (templateStack) {
      templateStack.innerHTML = '';
      inlineTemplates().forEach(function (template, index) {
        templateStack.appendChild(createTemplateOption(template, index, false));
      });
    }
    if (templateGallery) {
      templateGallery.innerHTML = '';
      TEMPLATES.forEach(function (template, index) {
        templateGallery.appendChild(createTemplateOption(template, index, true));
      });
    }
  }

  function paintTemplateCards() {
    var current = selectedTemplate().id;
    var cards = document.querySelectorAll('[data-template-card]');
    for (var i = 0; i < cards.length; i++) {
      var isCurrent = cards[i].getAttribute('data-template-card') === current;
      cards[i].classList.toggle('is-selected', isCurrent);
      cards[i].setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
    }
  }

  // ---------- color mode + logo variant ----------
  var themeSwatches = document.getElementById('themeSwatches');
  var logoEl = document.getElementById('coverLogo');
  var decoEl = document.getElementById('coverDeco');

  function buildSwatches() {
    themeSwatches.innerHTML = '';
    THEMES.forEach(function (th) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.setAttribute('role', 'radio');
      b.setAttribute('data-theme-id', th.id);
      b.setAttribute('aria-label', th.name);
      b.title = th.name;
      b.style.background = th.sw || 'linear-gradient(135deg,' + th.head + ' 50%,' + th.acc2 + ' 50%)';
      b.addEventListener('click', function () { els.theme.value = th.id; render(); save(); });
      themeSwatches.appendChild(b);
    });
  }

  function syncLook() {
    var th = themeById(val('theme'));
    ['ink', 'head', 'acc', 'acc2', 'tint'].forEach(function (k) { cover.style.setProperty('--' + k, th[k]); });
    var mode = val('logoMode');
    var key = (mode === 'color' || mode === 'bw') ? mode : (th.id === 'mono' ? 'bw' : 'color');
    if (LOGO[key] && logoEl.getAttribute('data-k') !== key) {
      logoEl.src = LOGO[key];
      logoEl.setAttribute('data-k', key);
    }
    var dk = selectedTemplate().id + th.id;
    if (decoEl.getAttribute('data-k') !== dk) {
      var d = decoUri(selectedTemplate().id, th);
      decoEl.style.backgroundImage = d ? 'url("' + d + '")' : 'none';
      decoEl.setAttribute('data-k', dk);
    }
    var sw = themeSwatches.children;
    for (var i = 0; i < sw.length; i++) {
      var on = sw[i].getAttribute('data-theme-id') === th.id;
      sw[i].classList.toggle('is-selected', on);
      sw[i].setAttribute('aria-checked', on ? 'true' : 'false');
    }
  }

  function syncTemplate() {
    var template = selectedTemplate();
    if (els.template.value !== template.id) els.template.value = template.id;
    cover.setAttribute('data-template', template.id);
    paintTemplateCards();
  }

  function selectTemplate(id, fromGallery) {
    var template = templateById(id);
    if (!template) return;
    els.template.value = template.id;
    render();
    save();
    if (fromGallery) {
      closeModal(templateModal);
      setTimeout(function () { toast(template.name + ' template selected'); }, reducedMotion.matches ? 0 : 180);
    }
  }

  function openTemplateGallery() {
    paintTemplateCards();
    openModal(templateModal);
    // Keep the heading/close button in view on phones, where the gallery is
    // one tall column; focusing a lower card would scroll them away.
    var card = templateModal.querySelector('.template-modal-card');
    var close = templateModal.querySelector('.modal-x');
    if (card) card.scrollTop = 0;
    if (close) {
      setTimeout(function () {
        try { close.focus({ preventScroll: true }); } catch (e) { close.focus(); }
      }, 40);
    }
  }

  if (seeAllTemplatesBtn) seeAllTemplatesBtn.addEventListener('click', openTemplateGallery);

  // ---------- course-code autofill (full catalog + remembered pairs) ----------
  var learnedCourses = {};
  try {
    var savedCourses = JSON.parse(localStorage.getItem(COURSES_KEY) || '{}');
    if (savedCourses && typeof savedCourses === 'object') learnedCourses = savedCourses;
  } catch (e) { /* ignore */ }
  var autoCourseName = '';

  function knownCourse(code) {
    return learnedCourses[code] || (catalogByCode[code] ? catalogByCode[code].title : '') || '';
  }

  function refreshCourseList() {
    if (!courseCodeList) return;
    var codes = {};
    catalogList.forEach(function (it) { codes[it.code] = 1; });
    Object.keys(learnedCourses).forEach(function (c) { codes[c] = 1; });
    courseCodeList.innerHTML = '';
    Object.keys(codes).sort().forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c;
      opt.setAttribute('label', knownCourse(c));
      courseCodeList.appendChild(opt);
    });
  }

  // fills the course name only when it is empty (or still holds our last fill),
  // so a hand-typed title is never overwritten
  function maybeAutofillCourse() {
    var known = knownCourse(normalizeCode(val('courseCode')));
    if (!known) return;
    var cur = val('courseName');
    if (!cur || cur === autoCourseName) {
      els.courseName.value = known;
      autoCourseName = known;
    }
  }

  // remembers a code/name pair once the field loses focus (change, not keystrokes).
  // Pairs that already match the catalog are not stored again — only the
  // student's own additions/corrections live in their browser.
  function learnCourse() {
    var code = normalizeCode(val('courseCode'));
    var name = val('courseName');
    if (!code || !name || learnedCourses[code] === name) return;
    if (catalogByCode[code] && catalogByCode[code].title === name) return;
    learnedCourses[code] = name;
    try { localStorage.setItem(COURSES_KEY, JSON.stringify(learnedCourses)); } catch (e) { /* ignore */ }
    refreshCourseList();
  }

  // ---------- course search: pick by name or code from the course-name field ----------
  var courseResults = document.getElementById('courseResults');
  var currentMatches = [];
  var activeOption = -1;

  // catalog courses plus the student's own remembered extras; a remembered
  // title wins over the catalog one, like knownCourse()
  function searchableCourses() {
    var list = catalogList.slice();
    Object.keys(learnedCourses).forEach(function (c) {
      if (!catalogByCode[c]) list.push({ code: c, title: learnedCourses[c] });
    });
    return list;
  }

  function courseMatches(query) {
    var qCode = normalizeCode(query);
    var qText = (query || '').trim().toLowerCase();
    var tokens = qText.split(/\s+/).filter(Boolean);
    var scored = [];
    searchableCourses().forEach(function (it) {
      var title = learnedCourses[it.code] || it.title;
      var tLow = title.toLowerCase();
      var score = -1;
      if (qCode && it.code === qCode) score = 0;
      else if (qCode && it.code.indexOf(qCode) === 0) score = 1;
      else if (qText && tLow.indexOf(qText) === 0) score = 2;
      else if (tokens.length && tokens.every(function (tk) { return tLow.indexOf(tk) >= 0; })) score = 3;
      else if (qCode.length >= 3 && it.code.indexOf(qCode) > 0) score = 4;
      if (score >= 0) scored.push({ code: it.code, title: title, score: score });
    });
    scored.sort(function (a, b) {
      return a.score - b.score || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0);
    });
    return scored.slice(0, 8);
  }

  function closeCourseResults() {
    if (!courseResults) return;
    courseResults.hidden = true;
    courseResults.classList.remove('is-up');
    courseResults.style.maxHeight = '';
    els.courseName.setAttribute('aria-expanded', 'false');
    els.courseName.removeAttribute('aria-activedescendant');
    currentMatches = [];
    activeOption = -1;
  }

  // The course field can sit low in the internally scrolling form, so open
  // upward (and cap the list height) when there is not enough room below it.
  function positionCourseResults() {
    var input = els.courseName.getBoundingClientRect();
    var clipTop = 0;
    var clipBottom = window.innerHeight;
    var scroller = els.courseName.closest ? els.courseName.closest('.form-scroll') : null;
    if (scroller && window.getComputedStyle(scroller).overflowY !== 'visible') {
      var box = scroller.getBoundingClientRect();
      clipTop = box.top;
      clipBottom = box.bottom;
    }
    var below = Math.max(0, clipBottom - input.bottom - 8);
    var above = Math.max(0, input.top - clipTop - 8);
    var wanted = Math.min(272, courseResults.scrollHeight || 272);
    var up = below < wanted && above > below;
    courseResults.classList.toggle('is-up', up);
    courseResults.style.maxHeight = Math.max(120, Math.min(272, up ? above : below)) + 'px';
  }

  function paintActiveOption() {
    var items = courseResults.children;
    for (var i = 0; i < items.length; i++) {
      var on = i === activeOption;
      items[i].classList.toggle('is-active', on);
      if (items[i].getAttribute('role') === 'option') items[i].setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) {
        els.courseName.setAttribute('aria-activedescendant', items[i].id);
        if (items[i].scrollIntoView) items[i].scrollIntoView({ block: 'nearest' });
      }
    }
    if (activeOption < 0) els.courseName.removeAttribute('aria-activedescendant');
  }

  function selectCourse(match) {
    els.courseCode.value = match.code;
    if (match.title) {
      els.courseName.value = match.title;
      autoCourseName = match.title;
    } else {
      // code-only course: the typed search text is not its name, so clear the
      // field and let the student type the real name (it gets remembered)
      els.courseName.value = '';
      autoCourseName = '';
    }
    closeCourseResults();
    onInput();
    els.courseName.focus();
  }

  function openCourseResults() {
    if (!courseResults) return;
    var q = els.courseName.value || '';
    if (q.trim().length < 2) { closeCourseResults(); return; }
    currentMatches = courseMatches(q);
    activeOption = -1;
    courseResults.innerHTML = '';
    if (!currentMatches.length) {
      var none = document.createElement('li');
      none.className = 'c-none';
      none.textContent = 'No course matches — keep typing to use your own course name.';
      courseResults.appendChild(none);
    } else {
      currentMatches.forEach(function (m, i) {
        var li = document.createElement('li');
        li.id = 'courseOpt' + i;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');
        var code = document.createElement('span');
        code.className = 'c-code';
        code.textContent = m.code;
        var title = document.createElement('span');
        if (m.title) {
          title.className = 'c-title';
          title.textContent = m.title;
        } else {
          title.className = 'c-title c-note';
          title.textContent = 'course name not listed yet — pick it, then type the name';
        }
        li.appendChild(code);
        li.appendChild(title);
        li.addEventListener('mousedown', function (e) {
          e.preventDefault(); // keep focus in the input; select before any blur
          selectCourse(m);
        });
        li.addEventListener('mousemove', function () {
          if (activeOption !== i) { activeOption = i; paintActiveOption(); }
        });
        courseResults.appendChild(li);
      });
    }
    courseResults.hidden = false;
    positionCourseResults();
    els.courseName.setAttribute('aria-expanded', 'true');
  }

  if (courseResults) {
    els.courseName.addEventListener('keydown', function (e) {
      if (courseResults.hidden) {
        if (e.key === 'ArrowDown') openCourseResults();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!currentMatches.length) return;
        activeOption = e.key === 'ArrowDown'
          ? (activeOption + 1) % currentMatches.length
          : (activeOption - 1 + currentMatches.length) % currentMatches.length;
        paintActiveOption();
      } else if (e.key === 'Enter') {
        if (activeOption >= 0 && currentMatches[activeOption]) {
          e.preventDefault();
          selectCourse(currentMatches[activeOption]);
        }
      } else if (e.key === 'Escape') {
        closeCourseResults();
      }
    });
    els.courseName.addEventListener('blur', function () {
      setTimeout(closeCourseResults, 150);
    });
  }

  // ---------- group members (extra submitted-by people) ----------
  var members = []; // extras only; the main fields are member 1

  function memberFrom(data) {
    data = data || {};
    return {
      name: String(data.name || '').slice(0, 46),
      studentId: String(data.studentId || '').slice(0, 12),
      serial: String(data.serial || '').slice(0, 10),
      nameInput: null
    };
  }

  function renumberMembers() {
    var rows = groupMembersEl.children;
    for (var i = 0; i < rows.length; i++) {
      rows[i].querySelector('.member-title').textContent = 'Member ' + (i + 2);
      rows[i].querySelector('.member-remove').setAttribute('aria-label', 'Remove member ' + (i + 2));
    }
    addMemberBtn.hidden = members.length >= MAX_MEMBERS - 1;
    addMemberBtn.querySelector('b').textContent = members.length ? '+ Add another member' : '+ Add group member';
    groupNote.hidden = !members.length;
  }

  function addMemberRow(data, focusIt) {
    if (members.length >= MAX_MEMBERS - 1) return null;
    var m = memberFrom(data);
    members.push(m);
    var wrap = document.createElement('div');
    wrap.className = 'member-row';
    wrap.innerHTML =
      '<div class="member-head"><span class="member-title"></span>' +
      '<button type="button" class="member-remove">Remove</button></div>' +
      '<label class="field"><span>Name</span>' +
      '<input type="text" maxlength="46" data-m="name" placeholder="Member name"></label>' +
      '<div class="row two">' +
      '<label class="field"><span>Student ID</span>' +
      '<input type="text" inputmode="numeric" maxlength="12" data-m="studentId" placeholder="e.g. 2312345678"></label>' +
      '<label class="field"><span>Serial No</span>' +
      '<input type="text" maxlength="10" data-m="serial" placeholder="optional"></label></div>';
    Array.prototype.forEach.call(wrap.querySelectorAll('input'), function (input) {
      var key = input.getAttribute('data-m');
      input.value = m[key];
      if (key === 'name') m.nameInput = input;
      input.addEventListener('input', function () { m[key] = input.value; onInput(); });
      input.addEventListener('change', function () { m[key] = input.value; onInput(); });
    });
    wrap.querySelector('.member-remove').addEventListener('click', function () {
      var i = members.indexOf(m);
      if (i >= 0) members.splice(i, 1);
      wrap.parentNode.removeChild(wrap);
      renumberMembers();
      onInput();
      addMemberBtn.focus();
    });
    groupMembersEl.appendChild(wrap);
    renumberMembers();
    if (focusIt && m.nameInput) m.nameInput.focus();
    return m;
  }

  function clearMemberRows() {
    members.length = 0;
    groupMembersEl.innerHTML = '';
    renumberMembers();
  }

  addMemberBtn.addEventListener('click', function () { addMemberRow({}, true); onInput(); });

  // A cover with nothing in its details blocks is a blank hand-fill template:
  // its printed labels stay visible in exports. Title choices (document
  // type/number) and the date do not count as details.
  function isBlankCover(people) {
    var list = people || activeMembers();
    if (list.length) return false;
    return !['courseName', 'courseCode', 'section', 'faculty', 'department']
      .some(function (id) { return !!val(id); });
  }

  // every submitted-by person with anything filled in, main fields first
  function activeMembers() {
    var list = [{ name: val('name'), studentId: val('studentId'), serial: val('serial') }];
    members.forEach(function (m) {
      list.push({ name: (m.name || '').trim(), studentId: (m.studentId || '').trim(), serial: (m.serial || '').trim() });
    });
    return list.filter(function (m) { return m.name || m.studentId || m.serial; });
  }

  // one value per line so names/IDs/serials stay aligned on the cover
  function memberLines(list, key) {
    var vals = list.map(function (m) { return m[key] || ''; });
    while (vals.length && !vals[vals.length - 1]) vals.pop();
    return vals.join('\n');
  }

  // ---------- whole-form state (storage, undo, share links) ----------
  function collectState() {
    var data = {};
    Object.keys(fields).forEach(function (id) { data[id] = els[id].value; });
    data.members = members.map(function (m) {
      return { name: m.name, studentId: m.studentId, serial: m.serial };
    });
    return data;
  }

  function applyState(data) {
    if (!data || typeof data !== 'object') return;
    Object.keys(fields).forEach(function (id) {
      if (typeof data[id] !== 'string') return;
      var v = data[id];
      if (id === 'docType' && DOC_TYPES.indexOf(v) < 0) v = 'Assignment';
      if (id === 'template' && !templateById(v)) v = 'classic';
      if (id === 'theme' && themeById(v).id !== v) v = 'mono';
      if (id === 'logoMode' && ['auto', 'color', 'bw'].indexOf(v) < 0) v = 'auto';
      var max = els[id].maxLength;
      els[id].value = (typeof max === 'number' && max > 0) ? v.slice(0, max) : v;
    });
    clearMemberRows();
    if (Array.isArray(data.members)) {
      data.members.slice(0, MAX_MEMBERS - 1).forEach(function (m) { addMemberRow(m, false); });
    }
  }

  // ---------- preview ----------
  function render() {
    ensureTemplateCards();
    syncTemplate();
    syncLook();
    var docType = val('docType') || 'Assignment';
    var no = val('docNo');
    pv.title.textContent = docType.toUpperCase() + (no ? ' ' + no : '');
    // longer titles ("PROJECT REPORT 2") step down so they stay on one line
    var tLen = pv.title.textContent.length;
    pv.title.style.fontSize = (tLen <= 11 ? 62 : tLen <= 14 ? 52 : tLen <= 17 ? 44 : tLen <= 20 ? 38 : 34) + 'px';
    docNoLabel.textContent = docType + ' no';

    var people = activeMembers();
    cover.classList.toggle('is-group', people.length > 1);
    cover.classList.toggle('is-blank', isBlankCover(people));
    cover.setAttribute('data-members', String(people.length || 1));

    setText(pv.course, val('courseName'));
    setText(pv.name, memberLines(people, 'name'));
    setText(pv.id, memberLines(people, 'studentId'));
    setText(pv.code, val('courseCode'));
    setText(pv.section, val('section'));
    setText(pv.faculty, val('faculty'));

    var dept = normalizeDept(val('department'));
    setText(pv.dept, dept ? 'Department of ' + dept : '');
    setText(pv.deptHeader, dept ? 'DEPARTMENT OF ' + dept.toUpperCase() : '');

    // optional rows only show when filled
    var serial = memberLines(people, 'serial');
    pv.serial.textContent = serial;
    rowSerial.style.display = serial ? '' : 'none';

    var date = formatDate(val('submissionDate'));
    pv.date.textContent = date;
    rowDate.style.display = date ? '' : 'none';
    // echo the parsed date under the picker, whose own format is locale-dependent
    dateEcho.textContent = date ? '\u2192 prints as \u201C' + date + '\u201D' : '';
    syncThumbs();
  }

  // scales the A4 cover to fit the preview panel (width and, on desktop, height)
  function fitPreview() {
    var cs = getComputedStyle(panel);
    var availW = panel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var s = availW / COVER_W;
    if (lockedLayout.matches) {
      var availH = panel.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      s = Math.min(s, availH / COVER_H);
    } else if (panel.classList.contains('is-compact') && window.innerWidth < 961) {
      // sticky phone "peek": the whole cover, small enough to type under
      var peekH = 184 - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      s = Math.min(s, peekH / COVER_H);
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
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(collectState())); }
    catch (e) { /* storage blocked, ignore */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) applyState(JSON.parse(raw));
    } catch (e) { /* ignore */ }
  }

  // ---------- shareable links: whole form in the URL hash ----------
  var sharedImported = false;
  function encodeState(data) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(data))))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodeState(code) {
    var b64 = code.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return JSON.parse(decodeURIComponent(escape(atob(b64))));
  }
  function applySharedState() {
    if (window.location.hash.indexOf('#s=') !== 0) return;
    try {
      applyState(decodeState(window.location.hash.slice(3)));
      sharedImported = true;
      save();
      // keep the address bar clean so the personal hash is not re-shared by accident
      if (window.history && history.replaceState) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch (e) { /* a broken link just opens the normal form */ }
  }


  // preview updates instantly; saving waits until typing pauses
  var saveTimer = null;
  var compactDone = false;
  var pdfWarmed = false;
  function onInput(e) {
    var target = e && e.target;
    if (target === els.courseCode) maybeAutofillCourse();
    if (target === els.courseName && val('courseName') !== autoCourseName) autoCourseName = '';
    if (target === els.courseName && e && e.type === 'input') openCourseResults();
    if (e && e.type === 'change' && (target === els.courseName || target === els.courseCode)) learnCourse();
    // phones: after typing starts, shrink the cover to a sticky peek
    // only real typing shrinks the preview; dropdowns, swatches and template
    // picks must leave the layout alone
    var typing = e && e.type === 'input' && target && target.tagName === 'INPUT' && target.type !== 'hidden';
    if (typing && !compactDone && window.innerWidth < 961) {
      compactDone = true;
      panel.classList.add('is-compact');
      queueFit();
      // Shrinking the preview shifts the form up; keep the field being typed
      // in below the sticky peek instead of sliding underneath it.
      var activeField = target && target.closest ? target.closest('.field') : null;
      if (activeField) {
        window.requestAnimationFrame(function () {
          activeField.scrollIntoView({
            block: 'start',
            behavior: reducedMotion.matches ? 'auto' : 'smooth'
          });
        });
      }
    }
    // the PDF libraries load in the background from the first real edit
    if (!pdfWarmed) { pdfWarmed = true; loadPdfLibs().catch(function () { /* retried on click */ }); }
    render();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 200);
  }

  Object.keys(fields).forEach(function (id) {
    els[id].addEventListener('input', onInput);
    els[id].addEventListener('change', onInput);
  });
  window.addEventListener('pagehide', function () { clearTimeout(saveTimer); save(); });

  // ---------- reset: acts at once, the toast offers Undo ----------
  resetBtn.addEventListener('click', function () {
    var snapshot = collectState();
    clearTimeout(saveTimer);
    Object.keys(fields).forEach(function (id) { els[id].value = fields[id]; });
    clearMemberRows();
    autoCourseName = '';
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    render();
    showHint('');
    toast('Form cleared', 'Undo', function () {
      applyState(snapshot);
      save();
      render();
      toast('Details restored');
    }, 5000);
  });

  // ---------- PDF ----------
  function fileName() {
    var type = (val('docType') || 'Assignment').replace(/\s+/g, '');
    var parts = [type + (val('docNo') ? val('docNo') : ''), val('courseCode'), val('studentId')]
      .filter(Boolean);
    return parts.join('-').replace(/[^a-z0-9\-_]+/gi, '_') + '.pdf';
  }

  function setBusy(busy) {
    downloadBtn.disabled = busy;
    downloadBtn.setAttribute('aria-busy', busy ? 'true' : 'false');
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

  // ---------- PDF libraries load on intent, not on page load ----------
  var pdfLibsPromise = null;
  var PDF_LIB_URLS = [
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
  ];
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var sc = document.createElement('script');
      sc.src = src;
      sc.setAttribute('data-cfasync', 'false');
      sc.onload = resolve;
      sc.onerror = reject;
      document.head.appendChild(sc);
    });
  }
  function loadPdfLibs() {
    if (window.html2canvas && window.jspdf) return Promise.resolve();
    if (!pdfLibsPromise) {
      pdfLibsPromise = Promise.all(PDF_LIB_URLS.map(loadScript)).catch(function (err) {
        pdfLibsPromise = null; // allow a retry on the next click
        throw err;
      });
    }
    return pdfLibsPromise;
  }
  function warmPdfLibs() { loadPdfLibs().catch(function () { /* the click will retry */ }); }
  downloadBtn.addEventListener('pointerover', warmPdfLibs);
  downloadBtn.addEventListener('focus', warmPdfLibs);

  // No fields are mandatory: an untouched form downloads as a blank template
  // that can be filled in by hand. The one consistency check left is for a
  // started group member (an ID with no name prints a mystery person).
  function validateDownload() {
    for (var i = 0; i < members.length; i++) {
      var m = members[i];
      var started = (m.name || '').trim() || (m.studentId || '').trim() || (m.serial || '').trim();
      if (started && !(m.name || '').trim()) {
        showHint('Member ' + (i + 2) + ' needs a name, or remove that member.');
        if (m.nameInput) m.nameInput.focus();
        return false;
      }
    }
    return true;
  }

  // Fire-and-forget, anonymous count of a completed download: the design and
  // whether the cover was blank. No names or details (see downloads.js). It runs only after the PDF is saved and
  // every failure is swallowed, so logging can never break downloading.
  function logDownload() {
    try {
      fetch(DOWNLOADS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          template: val('template') || 'classic',
          theme: val('theme') || 'mono',
          blank: isBlankCover()
        })
      }).catch(function () { /* offline / local preview: nothing to do */ });
    } catch (e) { /* never let logging surface an error */ }
  }

  downloadBtn.addEventListener('click', function () {
    if (!validateDownload()) return;
    clearTimeout(doneTimer);
    downloadBtn.classList.remove('is-done');
    showHint('');
    setBusy(true);

    var ok = false;
    var outName = fileName();
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    loadPdfLibs().then(function () { return fontsReady; }).then(function () {
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
          // On a filled cover, rows whose value was only a placeholder
          // disappear completely. On a blank hand-fill template the labels
          // stay, so the details can be written in beside them.
          if (!c.classList.contains('is-blank')) {
            ['rowName', 'rowId', 'rowCourse', 'rowSection'].forEach(function (rid) {
              var row = doc.getElementById(rid);
              if (row && row.cells[2] && !row.cells[2].textContent.trim()) row.style.display = 'none';
            });
            var fac = doc.getElementById('pvFaculty');
            var dep = doc.getElementById('pvDept');
            if (fac && dep) {
              if (!fac.textContent.trim() && !dep.textContent.trim()) fac.parentNode.style.display = 'none';
              else {
                if (!fac.textContent.trim()) fac.style.display = 'none';
                if (!dep.textContent.trim()) dep.style.display = 'none';
              }
            }
          }
          // an empty black course band looks odd (and cannot be written on)
          var courseBar = doc.getElementById('pvCourse');
          if (courseBar && !courseBar.textContent.trim()) courseBar.style.display = 'none';
        }
      });
    }).then(function (canvas) {
      var jsPDF = window.jspdf.jsPDF;
      var pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
      pdf.save(outName);
      ok = true;
      logDownload(outName);
    }).catch(function (err) {
      console.error(err);
      if (!window.html2canvas || !window.jspdf) {
        showHint('PDF libraries failed to load. Check your connection and try again.');
      } else {
        showHint('Could not make the PDF. If you opened index.html straight from a folder, use a local server or the hosted site.');
      }
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
    var availW = Math.max(200, window.innerWidth - 68);
    var availH = Math.max(200, window.innerHeight - 120);
    var s = Math.min(1, availW / COVER_W, availH / COVER_H);
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

  // ---------- mobile menu (FAQ, Developer, GitHub, LinkedIn, coffee) ----------
  var menuBtn = document.getElementById('menuBtn');
  var navMenu = document.getElementById('navMenu');
  function setMenu(open) {
    navMenu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  menuBtn.addEventListener('click', function () { setMenu(navMenu.hidden); });
  navMenu.addEventListener('click', function (e) { if (e.target.closest('a, button')) setMenu(false); });
  document.getElementById('menuCoffee').addEventListener('click', function () {
    menuBtn.focus();
    openModal(supportModal);
  });
  document.addEventListener('click', function (e) {
    if (!navMenu.hidden && !navMenu.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !navMenu.hidden) { setMenu(false); menuBtn.focus(); }
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 720) setMenu(false); });
  zoomBtn.addEventListener('click', openZoom);
  holder.addEventListener('click', openZoom);

  [supportModal, zoomModal, feedbackModal, templateModal].forEach(function (m) {
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
      theme: 'light',
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
  buildSwatches();
  refreshCourseList();
  load();
  applySharedState();
  if (seeAllTemplatesBtn) seeAllTemplatesBtn.querySelector('b').textContent = 'See all ' + TEMPLATES.length;
  render();
  if (sharedImported) {
    setTimeout(function () { toast('Details loaded from the shared link'); }, 350);
  }
  // installable + offline shell (see sw.js); harmless where unsupported
  if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* plain website it is */ });
    });
  }
  fitPreview();
  window.addEventListener('resize', queueFit);
  if (lockedLayout.addEventListener) lockedLayout.addEventListener('change', queueFit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPreview);
})();
