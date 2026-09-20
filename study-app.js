(() => {
  'use strict';
  const units = window.BEFA_UNITS;
  if (!Array.isArray(units) || units.length !== 4 || units.some(unit => !Array.isArray(unit.cards) || unit.cards.length !== 15)) {
    document.body.innerHTML = '<p style="padding:2rem;font:16px system-ui">The flashcard data could not be loaded.</p>';
    return;
  }

  const unitNames = ['Business Organisation', 'Consumer & Demand', 'Production & Markets', 'Accounting Fundamentals'];
  const storageKey = 'befa-bloom-study-progress-v1';
  const allCards = units.flatMap(unit => unit.cards.map((card, index) => ({ ...card, id: `u${unit.id}-q${index + 1}`, unitId: unit.id, questionNumber: index + 1, unitName: unitNames[unit.id - 1] })));
  const $ = id => document.getElementById(id);
  const el = { homeView: $('homeView'), studyView: $('studyView'), unitGrid: $('unitGrid'), homeButton: $('homeButton'), homeBrand: $('homeBrand'), overallText: $('overallProgressText'), overallBar: $('overallProgressBar'), studyBreadcrumb: $('studyBreadcrumb'), studyEyebrow: $('studyEyebrow'), studyTitle: $('studyTitle'), cardCount: $('cardCount'), progressBar: $('studyProgressBar'), flashcard: $('flashcard'), question: $('questionText'), answer: $('answerText'), cardNumber: $('cardNumber'), reveal: $('revealButton'), previous: $('previousButton'), next: $('nextButton'), know: $('knowButton'), review: $('reviewButton'), shuffle: $('shuffleButton'), back: $('backToHome'), questions: $('questionListButton'), searchButton: $('searchButton'), searchDialog: $('searchDialog'), questionDialog: $('questionDialog'), searchInput: $('searchInput'), searchResults: $('searchResults'), searchSummary: $('searchSummary'), questionList: $('questionList') };
  let progress = loadProgress();
  let session = [];
  let sessionName = '';
  let currentIndex = 0;

  function loadProgress() { try { return JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { return {}; } }
  function saveProgress() { localStorage.setItem(storageKey, JSON.stringify(progress)); renderHome(); }
  function statusFor(card) { return progress[card.id] || ''; }
  function makeElement(tag, options = {}) { const node = document.createElement(tag); Object.assign(node, options); return node; }
  function cardFor(unitId, questionNumber) { return allCards.find(card => card.unitId === unitId && card.questionNumber === questionNumber); }

  function renderHome() {
    const known = allCards.filter(card => statusFor(card) === 'known').length;
    el.overallText.textContent = `${known} / ${allCards.length}`;
    el.overallBar.style.width = `${known / allCards.length * 100}%`;
    el.unitGrid.replaceChildren();
    units.forEach(unit => {
      const knownInUnit = unit.cards.filter((_, i) => statusFor(cardFor(unit.id, i + 1)) === 'known').length;
      const button = makeElement('button', { className: 'unit-card', type: 'button' });
      button.innerHTML = `<span class="unit-kicker">UNIT ${unit.id} · ${unit.cards.length} CARDS</span><h3>${unitNames[unit.id - 1]}</h3><p>Explore ${unit.cards.length} exam-focused questions.</p><span class="unit-card-footer"><span class="unit-status">${knownInUnit} known</span><span class="arrow-bubble" aria-hidden="true">→</span></span>`;
      button.addEventListener('click', () => openUnit(unit.id));
      el.unitGrid.append(button);
    });
  }

  function openUnit(unitId, startQuestion = 1) {
    const unit = units.find(item => item.id === unitId);
    session = unit.cards.map((_, index) => cardFor(unitId, index + 1));
    sessionName = `Unit ${unitId} · ${unitNames[unitId - 1]}`;
    currentIndex = Math.max(0, session.findIndex(card => card.questionNumber === startQuestion));
    showStudy();
  }
  function openSearchCard(card) {
    session = allCards.filter(item => item.unitId === card.unitId);
    sessionName = `Unit ${card.unitId} · ${card.unitName}`;
    currentIndex = session.findIndex(item => item.id === card.id);
    closeDialog(el.searchDialog);
    showStudy();
  }
  function showStudy() {
    el.homeView.hidden = true; el.studyView.hidden = false; el.homeButton.hidden = false;
    renderCard(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function showHome() {
    el.studyView.hidden = true; el.homeView.hidden = false; el.homeButton.hidden = true;
    renderHome(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function currentCard() { return session[currentIndex]; }
  function renderCard() {
    const card = currentCard(); if (!card) return showHome();
    el.flashcard.classList.remove('is-flipped');
    el.question.textContent = card.q; el.answer.textContent = card.a;
    el.cardNumber.textContent = String(card.questionNumber).padStart(2, '0');
    el.studyEyebrow.textContent = `UNIT ${card.unitId} · ${card.unitName.toUpperCase()}`;
    el.studyTitle.textContent = `Question ${card.questionNumber}`;
    el.studyBreadcrumb.textContent = sessionName;
    el.cardCount.textContent = `${currentIndex + 1} / ${session.length}`;
    el.progressBar.style.width = `${(currentIndex + 1) / session.length * 100}%`;
    el.reveal.innerHTML = 'Reveal answer <span aria-hidden="true">↻</span>';
    el.flashcard.setAttribute('aria-label', `Question ${card.questionNumber}. ${card.q} Press Enter or Space to reveal the answer.`);
    renderRating();
  }
  function renderRating() {
    const status = statusFor(currentCard());
    el.know.classList.toggle('is-active', status === 'known');
    el.review.classList.toggle('is-active', status === 'review');
    el.know.setAttribute('aria-pressed', String(status === 'known'));
    el.review.setAttribute('aria-pressed', String(status === 'review'));
  }
  function flipCard() {
    const isFlipped = el.flashcard.classList.toggle('is-flipped');
    el.reveal.innerHTML = isFlipped ? 'Show question <span aria-hidden="true">↻</span>' : 'Reveal answer <span aria-hidden="true">↻</span>';
    el.flashcard.setAttribute('aria-label', isFlipped ? 'Answer revealed. Press Enter or Space to return to the question.' : `Question ${currentCard().questionNumber}. ${currentCard().q} Press Enter or Space to reveal the answer.`);
  }
  function move(amount) { currentIndex = (currentIndex + amount + session.length) % session.length; renderCard(); }
  function setStatus(status) {
    const id = currentCard().id;
    progress[id] = progress[id] === status ? '' : status;
    if (!progress[id]) delete progress[id];
    saveProgress(); renderRating();
  }
  function shuffleSession() {
    const current = currentCard();
    for (let i = session.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [session[i], session[j]] = [session[j], session[i]]; }
    currentIndex = session.findIndex(card => card.id === current.id); renderCard();
  }
  function openQuestionList() {
    el.questionList.replaceChildren();
    session.forEach((card, index) => {
      const button = makeElement('button', { className: `question-item${index === currentIndex ? ' is-current' : ''}`, type: 'button' });
      const num = makeElement('span', { className: 'question-number-badge', textContent: String(card.questionNumber) });
      const text = makeElement('span', { textContent: card.q }); button.append(num, text);
      button.addEventListener('click', () => { currentIndex = index; closeDialog(el.questionDialog); renderCard(); });
      el.questionList.append(button);
    });
    el.questionDialog.showModal();
  }
  function closeDialog(dialog) { if (dialog.open) dialog.close(); }
  function doSearch() {
    const query = el.searchInput.value.trim().toLocaleLowerCase(); el.searchResults.replaceChildren();
    if (!query) { el.searchSummary.textContent = 'Start typing to search all 60 cards.'; return; }
    const matches = allCards.filter(card => `${card.q} ${card.a}`.toLocaleLowerCase().includes(query));
    el.searchSummary.textContent = `${matches.length} card${matches.length === 1 ? '' : 's'} found.`;
    if (!matches.length) { el.searchResults.append(makeElement('p', { className: 'empty-results', textContent: 'No cards match that search yet.' })); return; }
    matches.forEach(card => {
      const button = makeElement('button', { className: 'result-item', type: 'button' });
      const meta = makeElement('div', { className: 'result-meta', textContent: `UNIT ${card.unitId} · QUESTION ${card.questionNumber} · ${card.unitName}` });
      const question = makeElement('div', { className: 'result-question', textContent: card.q }); button.append(meta, question);
      button.addEventListener('click', () => openSearchCard(card)); el.searchResults.append(button);
    });
  }
  function openSearch() { el.searchDialog.showModal(); el.searchInput.value = ''; doSearch(); setTimeout(() => el.searchInput.focus(), 0); }
  function activeInput() { const tag = document.activeElement?.tagName; return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'; }

  el.homeBrand.addEventListener('click', showHome); el.homeButton.addEventListener('click', showHome); el.back.addEventListener('click', showHome);
  el.searchButton.addEventListener('click', openSearch); el.searchInput.addEventListener('input', doSearch);
  el.questions.addEventListener('click', openQuestionList); el.shuffle.addEventListener('click', shuffleSession);
  el.flashcard.addEventListener('click', () => { if (!ignoreNextCardClick) flipCard(); }); el.reveal.addEventListener('click', flipCard);
  el.flashcard.addEventListener('keydown', event => { if (event.key === 'Enter' || event.code === 'Space') { event.preventDefault(); flipCard(); } });
  el.previous.addEventListener('click', () => move(-1)); el.next.addEventListener('click', () => move(1));
  el.know.addEventListener('click', () => setStatus('known')); el.review.addEventListener('click', () => setStatus('review'));
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => closeDialog($(button.dataset.closeDialog))));
  let touchStartX = 0;
  let touchStartY = 0;
  let ignoreNextCardClick = false;
  el.flashcard.addEventListener('touchstart', event => {
    touchStartX = event.changedTouches[0].clientX;
    touchStartY = event.changedTouches[0].clientY;
  }, { passive: true });
  el.flashcard.addEventListener('touchend', event => {
    const distanceX = event.changedTouches[0].clientX - touchStartX;
    const distanceY = event.changedTouches[0].clientY - touchStartY;
    if (Math.abs(distanceX) > 55 && Math.abs(distanceX) > Math.abs(distanceY)) {
      ignoreNextCardClick = true;
      move(distanceX < 0 ? 1 : -1);
      setTimeout(() => { ignoreNextCardClick = false; }, 300);
    }
  }, { passive: true });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { if (!el.searchDialog.open && !el.questionDialog.open && !el.studyView.hidden) showHome(); return; }
    if (activeInput() || el.searchDialog.open || el.questionDialog.open) return;
    if (event.key === '/') { event.preventDefault(); openSearch(); return; }
    if (el.studyView.hidden) return;
    if (event.key === 'ArrowLeft') move(-1); else if (event.key === 'ArrowRight') move(1); else if (event.code === 'Space') { event.preventDefault(); flipCard(); } else if (event.key.toLowerCase() === 'k') setStatus('known'); else if (event.key.toLowerCase() === 'r') setStatus('review');
  });
  renderHome();
})();
