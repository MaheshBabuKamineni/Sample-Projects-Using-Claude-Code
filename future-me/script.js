(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     Constants
     ------------------------------------------------------------------------ */

  const STORAGE_KEY = 'futureMe.letters.v1';
  const THEME_KEY = 'futureMe.theme';
  const MAX_MESSAGE = 2000;
  const QUOTE_INTERVAL = 15000;
  const REVEAL_STAGGER = 450;

  const QUOTES = [
    { text: 'What you do today can improve all your tomorrows.', author: 'Ralph Marston' },
    { text: 'A year from now you may wish you had started today.', author: 'Karen Lamb' },
    { text: 'Act as if what you do makes a difference. It does.', author: 'William James' },
    { text: 'Start where you are. Use what you have. Do what you can.', author: 'Arthur Ashe' },
    { text: 'Small deeds done are better than great deeds planned.', author: 'Peter Marshall' },
    { text: 'The two most powerful warriors are patience and time.', author: 'Leo Tolstoy' },
    { text: 'The future depends on what you do today.', author: 'Mahatma Gandhi' },
    { text: 'Believe you can and you’re halfway there.', author: 'Theodore Roosevelt' },
    { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
    { text: 'Be patient with yourself. Self-growth is tender; it’s holy ground.', author: 'Stephen Covey' },
  ];

  const EMPTY_TEXT = {
    none: 'No letters yet. Your future self is waiting to hear from you.',
    sealed: 'Nothing is sealed right now. Write a new letter to start the clock.',
    opened: 'No letters have unlocked yet. Patience, they’re worth the wait.',
  };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const els = {
    themeToggle: $('#themeToggle'),
    quoteCard: $('#quoteCard'),
    quoteText: $('#quoteText'),
    quoteAuthor: $('#quoteAuthor'),
    newQuote: $('#newQuote'),
    form: $('#letterForm'),
    name: $('#name'),
    message: $('#message'),
    unlockAt: $('#unlockAt'),
    charCount: $('#charCount'),
    formError: $('#formError'),
    submit: $('#submitBtn'),
    filters: $$('.filter'),
    statTotal: $('#statTotal'),
    statSealed: $('#statSealed'),
    statOpened: $('#statOpened'),
    statNext: $('#statNext'),
    letters: $('#letters'),
    empty: $('#emptyState'),
    emptyText: $('#emptyText'),
    template: $('#letterTemplate'),
    toast: $('#toast'),
  };

  const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const shortDateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

  /* ------------------------------------------------------------------------
     State
     ------------------------------------------------------------------------ */

  let letters = loadLetters();
  let filter = 'all';
  let pendingReveals = 0;
  const cards = new Map(); // letter id -> element refs for the rendered card

  /* ------------------------------------------------------------------------
     Storage
     ------------------------------------------------------------------------ */

  function isValidLetter(letter) {
    return (
      letter !== null &&
      typeof letter === 'object' &&
      typeof letter.id === 'string' &&
      typeof letter.name === 'string' &&
      typeof letter.message === 'string' &&
      Number.isFinite(letter.createdAt) &&
      Number.isFinite(letter.unlockAt)
    );
  }

  function loadLetters() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(isValidLetter) : [];
    } catch {
      return [];
    }
  }

  function saveLetters() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(letters));
      return true;
    } catch {
      return false;
    }
  }

  function createId() {
    if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  /* ------------------------------------------------------------------------
     Theme
     ------------------------------------------------------------------------ */

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const isDark = theme === 'dark';
    els.themeToggle.setAttribute('aria-pressed', String(isDark));
    els.themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  }

  function initTheme() {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

    els.themeToggle.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* Theme just won't persist */
      }
    });
  }

  /* ------------------------------------------------------------------------
     Quotes
     ------------------------------------------------------------------------ */

  let quoteIndex = Math.floor(Math.random() * QUOTES.length);
  let quoteTimer;

  function setQuote(index) {
    const quote = QUOTES[index];
    els.quoteText.textContent = `“${quote.text}”`;
    els.quoteAuthor.textContent = `— ${quote.author}`;
  }

  function nextQuote() {
    quoteIndex = (quoteIndex + 1) % QUOTES.length;
    els.quoteCard.classList.add('is-changing');
    setTimeout(() => {
      setQuote(quoteIndex);
      els.quoteCard.classList.remove('is-changing');
    }, 300);
  }

  function restartQuoteTimer() {
    clearInterval(quoteTimer);
    quoteTimer = setInterval(nextQuote, QUOTE_INTERVAL);
  }

  function initQuotes() {
    setQuote(quoteIndex);
    restartQuoteTimer();
    els.newQuote.addEventListener('click', () => {
      nextQuote();
      restartQuoteTimer();
    });
  }

  /* ------------------------------------------------------------------------
     Time helpers
     ------------------------------------------------------------------------ */

  const pad = (n) => String(n).padStart(2, '0');

  function splitDuration(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    return {
      d: Math.floor(total / 86400),
      h: Math.floor((total % 86400) / 3600),
      m: Math.floor((total % 3600) / 60),
      s: total % 60,
    };
  }

  function shortDuration(ms) {
    const { d, h, m, s } = splitDuration(ms);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${pad(s)}s`;
  }

  /** Formats a Date as the value a datetime-local input expects (local time). */
  function toLocalInputValue(date) {
    const offsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 19);
  }

  function presetDate(preset) {
    const date = new Date();
    switch (preset) {
      case 'minute':
        date.setMinutes(date.getMinutes() + 1);
        break;
      case 'week':
        date.setDate(date.getDate() + 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'year':
        date.setFullYear(date.getFullYear() + 1);
        break;
      case 'fiveYears':
        date.setFullYear(date.getFullYear() + 5);
        break;
    }
    return date;
  }

  /* ------------------------------------------------------------------------
     Form
     ------------------------------------------------------------------------ */

  function updateCharCount() {
    const length = els.message.value.length;
    els.charCount.textContent = `${length} / ${MAX_MESSAGE}`;
    els.charCount.classList.toggle('is-near', length > MAX_MESSAGE * 0.9);
  }

  function clearFormError() {
    els.formError.textContent = '';
    $$('.is-invalid', els.form).forEach((field) => field.classList.remove('is-invalid'));
  }

  function showFormError(message, field) {
    clearFormError();
    els.formError.textContent = message;
    // Re-trigger the shake animation even if the field was already invalid
    void field.offsetWidth;
    field.classList.add('is-invalid');
    field.focus();
  }

  function validate(name, message, unlockAt) {
    if (!name) return ['Tell your future self who this is from.', els.name];
    if (!message) return ['Write something worth waiting for.', els.message];
    if (!Number.isFinite(unlockAt)) return ['Pick a date and time for the letter to unlock.', els.unlockAt];
    if (unlockAt <= Date.now() + 5000) {
      return ['Choose a moment in the future. Even a minute from now works.', els.unlockAt];
    }
    return null;
  }

  function handleSubmit(event) {
    event.preventDefault();

    const name = els.name.value.trim();
    const message = els.message.value.trim().slice(0, MAX_MESSAGE);
    const unlockAt = els.unlockAt.value ? new Date(els.unlockAt.value).getTime() : NaN;

    const error = validate(name, message, unlockAt);
    if (error) {
      showFormError(...error);
      return;
    }

    const letter = {
      id: createId(),
      name,
      message,
      createdAt: Date.now(),
      unlockAt,
      opened: false,
    };

    letters.push(letter);
    const saved = saveLetters();

    els.form.reset();
    els.name.value = name; // Keep the name handy for the next letter
    updateCharCount();
    clearFormError();
    playSealedAnimation();

    if (filter === 'opened') setFilter('sealed', false);
    render(letter.id);

    if (saved) {
      toast(`Sealed! See you on ${dateFormat.format(unlockAt)}.`);
    } else {
      toast('Couldn’t save to this browser. The letter will vanish on refresh.', 'warn');
    }
  }

  function playSealedAnimation() {
    const label = $('.btn-label', els.submit);
    els.submit.classList.remove('is-sealed');
    void els.submit.offsetWidth;
    els.submit.classList.add('is-sealed');
    label.textContent = 'Sealed ✓';
    setTimeout(() => {
      els.submit.classList.remove('is-sealed');
      label.textContent = 'Seal the letter';
    }, 1600);
  }

  function initForm() {
    els.form.addEventListener('submit', handleSubmit);
    els.message.addEventListener('input', updateCharCount);
    els.form.addEventListener('input', (event) => {
      if (event.target.classList.contains('is-invalid')) clearFormError();
    });

    // Keep the picker from offering past dates
    els.unlockAt.addEventListener('focus', () => {
      els.unlockAt.min = toLocalInputValue(new Date());
    });

    $$('[data-preset]', els.form).forEach((button) => {
      button.addEventListener('click', () => {
        els.unlockAt.value = toLocalInputValue(presetDate(button.dataset.preset));
        if (els.unlockAt.classList.contains('is-invalid')) clearFormError();
      });
    });

    updateCharCount();
  }

  /* ------------------------------------------------------------------------
     Dashboard rendering
     ------------------------------------------------------------------------ */

  function setFilter(next, rerender = true) {
    filter = next;
    els.filters.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
    });
    if (rerender) render();
  }

  function matchesFilter(letter, now) {
    if (filter === 'sealed') return letter.unlockAt > now;
    if (filter === 'opened') return letter.unlockAt <= now;
    return true;
  }

  function render(highlightId) {
    const now = Date.now();
    cards.clear();
    els.letters.replaceChildren();

    const visible = letters
      .filter((letter) => matchesFilter(letter, now))
      .sort((a, b) => a.unlockAt - b.unlockAt);

    visible.forEach((letter, index) => {
      const refs = createCard(letter, index);
      cards.set(letter.id, refs);
      els.letters.append(refs.root);
      updateCard(letter, refs, now, true);

      if (letter.id === highlightId) {
        refs.root.classList.add('is-new');
        requestAnimationFrame(() => {
          refs.root.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'nearest' });
        });
      }
    });

    updateEmptyState();
    updateStats(now);
  }

  function updateEmptyState() {
    const hasCards = cards.size > 0;
    els.empty.hidden = hasCards;
    if (!hasCards) {
      els.emptyText.textContent = letters.length === 0 ? EMPTY_TEXT.none : EMPTY_TEXT[filter];
    }
  }

  function createCard(letter, index) {
    const root = els.template.content.firstElementChild.cloneNode(true);
    root.dataset.id = letter.id;
    root.style.setProperty('--i', String(Math.min(index, 8)));

    const refs = {
      root,
      status: $('.letter-status', root),
      units: {
        d: $('[data-unit="d"]', root),
        h: $('[data-unit="h"]', root),
        m: $('[data-unit="m"]', root),
        s: $('[data-unit="s"]', root),
      },
      progress: $('.progress', root),
      fill: $('.progress-fill', root),
      pct: $('.progress-pct', root),
      body: $('.letter-body', root),
      sign: $('.letter-sign', root),
      lockedView: $('.locked-view', root),
      openView: $('.open-view', root),
      revealing: false,
    };

    $('.letter-from', root).textContent = `From ${letter.name}`;
    $('.progress-written', root).textContent = `Sealed ${shortDateFormat.format(letter.createdAt)}`;
    refs.status.textContent = `Unlocks ${dateFormat.format(letter.unlockAt)}`;
    refs.openView.setAttribute('aria-hidden', 'true');

    $('.delete', root).addEventListener('click', () => deleteLetter(letter.id));
    return refs;
  }

  function setUnit(el, value, animate) {
    const text = pad(value);
    if (el.textContent === text) return;
    el.textContent = text;
    if (animate && !reducedMotion.matches) {
      el.animate(
        [
          { transform: 'translateY(-35%)', opacity: 0 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' }
      );
    }
  }

  function updateCard(letter, refs, now, initial = false) {
    const remaining = letter.unlockAt - now;

    if (remaining > 0) {
      const parts = splitDuration(remaining);
      for (const unit of ['d', 'h', 'm', 's']) setUnit(refs.units[unit], parts[unit], !initial);

      const span = Math.max(1, letter.unlockAt - letter.createdAt);
      const pct = Math.min(100, Math.max(0, ((now - letter.createdAt) / span) * 100));
      refs.fill.style.width = `${pct.toFixed(2)}%`;
      refs.progress.setAttribute('aria-valuenow', String(Math.floor(pct)));
      refs.pct.textContent = `${Math.floor(pct)}% of the wait is behind you`;
      return;
    }

    if (refs.revealing || refs.root.classList.contains('is-unlocked')) return;

    if (letter.opened) {
      showUnlocked(letter, refs);
    } else if (!document.hidden) {
      // Only reveal while the page is visible, so the moment isn't missed
      reveal(letter, refs);
    }
  }

  function showUnlocked(letter, refs) {
    refs.body.textContent = letter.message;
    refs.sign.textContent = `— ${letter.name}, ${dateFormat.format(letter.createdAt)}`;
    refs.status.textContent = `Unlocked ${dateFormat.format(letter.unlockAt)}`;
    refs.root.classList.remove('is-locked');
    refs.root.classList.add('is-unlocked');
    refs.lockedView.setAttribute('aria-hidden', 'true');
    refs.openView.removeAttribute('aria-hidden');
  }

  /** Seal shakes and breaks, the letter unfolds, and confetti bursts out. */
  function reveal(letter, refs) {
    refs.revealing = true;
    const delay = pendingReveals++ * REVEAL_STAGGER;

    setTimeout(() => {
      refs.root.classList.add('revealing');

      setTimeout(() => {
        showUnlocked(letter, refs);
        refs.root.classList.add('unfolding');
        burstConfetti(refs.root);

        letter.opened = true;
        saveLetters();
        toast(`A letter from ${letter.name} just unlocked ✉️`);
      }, 750);

      setTimeout(() => {
        refs.root.classList.remove('revealing', 'unfolding');
        refs.revealing = false;
        pendingReveals = Math.max(0, pendingReveals - 1);
      }, 2200);
    }, delay);
  }

  function burstConfetti(container) {
    if (reducedMotion.matches) return;

    const colors = ['var(--accent)', 'var(--coral)', 'var(--gold)', '#3ecf8e', '#4cc9f0'];
    const layer = document.createElement('div');
    layer.className = 'confetti';

    for (let i = 0; i < 30; i++) {
      const piece = document.createElement('i');
      const angle = Math.random() * Math.PI * 2;
      const distance = 70 + Math.random() * 130;
      piece.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
      piece.style.setProperty('--y', `${Math.sin(angle) * distance + 40}px`);
      piece.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = `${Math.random() * 120}ms`;
      layer.append(piece);
    }

    container.append(layer);
    setTimeout(() => layer.remove(), 1500);
  }

  function deleteLetter(id) {
    const letter = letters.find((l) => l.id === id);
    if (!letter) return;

    const stillSealed = letter.unlockAt > Date.now();
    const question = stillSealed
      ? 'This letter is still sealed. Delete it forever without reading it?'
      : 'Delete this letter forever?';
    if (!window.confirm(question)) return;

    letters = letters.filter((l) => l.id !== id);
    saveLetters();
    updateStats();

    const refs = cards.get(id);
    if (!refs) return;
    cards.delete(id);
    refs.root.classList.add('removing');
    refs.root.addEventListener(
      'animationend',
      () => {
        refs.root.remove();
        updateEmptyState();
      },
      { once: true }
    );
  }

  function updateStats(now = Date.now()) {
    const sealed = letters.filter((l) => l.unlockAt > now);
    const nextUnlock = sealed.reduce((min, l) => Math.min(min, l.unlockAt), Infinity);

    els.statTotal.textContent = String(letters.length);
    els.statSealed.textContent = String(sealed.length);
    els.statOpened.textContent = String(letters.length - sealed.length);
    els.statNext.textContent = Number.isFinite(nextUnlock) ? shortDuration(nextUnlock - now) : '—';
  }

  /* ------------------------------------------------------------------------
     Toast
     ------------------------------------------------------------------------ */

  let toastTimer;

  function toast(message, tone = 'default') {
    els.toast.textContent = message;
    els.toast.dataset.tone = tone;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 3400);
  }

  /* ------------------------------------------------------------------------
     Clock
     ------------------------------------------------------------------------ */

  function tick() {
    const now = Date.now();
    for (const letter of letters) {
      const refs = cards.get(letter.id);
      if (refs) updateCard(letter, refs, now);
    }
    updateStats(now);
  }

  /* ------------------------------------------------------------------------
     Init
     ------------------------------------------------------------------------ */

  initTheme();
  initQuotes();
  initForm();

  els.filters.forEach((button) => {
    button.addEventListener('click', () => setFilter(button.dataset.filter));
  });

  // Another tab may add or delete letters; stay in sync
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      letters = loadLetters();
      render();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tick();
  });

  render();
  setInterval(tick, 1000);
})();
