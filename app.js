const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('#site-nav');

navToggle?.addEventListener('click', () => {
  const isOpen = siteNav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});

siteNav?.addEventListener('click', (event) => {
  if (event.target.matches('a')) {
    siteNav.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
  }
});

const pageSections = [...document.querySelectorAll('[data-page]')];
const pageNavLinks = [...(siteNav?.querySelectorAll('a[href^="#"]') || [])];
const pageIds = new Set(pageSections.map((section) => section.dataset.page));

function pageForElement(id) {
  const directPage = pageIds.has(id) ? id : null;
  if (directPage) return directPage;

  const target = document.getElementById(id);
  return target?.closest('[data-page]')?.dataset.page || 'route';
}

function setActivePage(page, { scrollTop = false } = {}) {
  const nextPage = pageIds.has(page) ? page : 'route';

  pageSections.forEach((section) => {
    const isActive = section.dataset.page === nextPage;
    section.hidden = !isActive;
    section.classList.toggle('page-active', isActive);
  });

  pageNavLinks.forEach((link) => {
    const id = link.getAttribute('href')?.slice(1);
    const isActive = id === nextPage;
    link.classList.toggle('is-active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  if (scrollTop) {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
}

function activateFromHash({ scrollToTarget = false } = {}) {
  const id = window.location.hash.replace('#', '') || 'route';
  const page = pageForElement(id);
  setActivePage(page, { scrollTop: !scrollToTarget });

  if (scrollToTarget && id !== page) {
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    });
  }
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;

  const id = link.getAttribute('href').slice(1);
  if (!id) return;

  event.preventDefault();
  history.pushState(null, '', `#${id}`);

  const page = pageForElement(id);
  setActivePage(page, { scrollTop: pageIds.has(id) });

  if (!pageIds.has(id)) {
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    });
  }
});

window.addEventListener('hashchange', () => {
  activateFromHash({ scrollToTarget: true });
});

window.addEventListener('popstate', () => {
  activateFromHash({ scrollToTarget: true });
});

activateFromHash();

const routeForm = document.querySelector('#route-form');
const routeResult = document.querySelector('#route-result');

function formatRub(value) {
  return new Intl.NumberFormat('ru-RU').format(Math.max(0, Number(value) || 0));
}

function updateRoute() {
  if (!routeForm || !routeResult) return;

  const data = new FormData(routeForm);
  const debt = Number(data.get('debtAmount')) || 0;
  const checked = (name) => data.get(name) === 'on';

  const inMfcRange = debt >= 25000 && debt <= 1000000;
  const closedBase = checked('closedFssp') && checked('noOpenFssp');
  const socialBase = (checked('pensioner') || checked('childBenefit') || checked('svo')) && checked('execOver1') && checked('noProperty');
  const oldExecBase = checked('execOver7');
  const mfcPossible = inMfcRange && (closedBase || socialBase || oldExecBase);

  const recentBankruptcy = checked('recentBankruptcy');
  const courtDuty = debt >= 500000 && checked('cannotPay') && checked('oneCreditorBlocks');
  const courtPossible = checked('cannotPay') || checked('overdue3');

  routeResult.classList.remove('warning', 'alert');

  if (recentBankruptcy) {
    routeResult.classList.add('warning');
    routeResult.innerHTML = `<strong>Нужна отдельная проверка по срокам.</strong><br>Повторное внесудебное заявление и новое судебное дело по заявлению самого гражданина обычно ограничены 5 годами после завершения или прекращения предыдущей процедуры. Проверьте точную дату завершения прошлой процедуры.<div class="result-actions"><a href="#consequences">Посмотреть последствия</a><a href="#contacts">Официальные сервисы</a></div>`;
    return;
  }

  if (mfcPossible) {
    routeResult.innerHTML = `<strong>Вероятный маршрут: МФЦ.</strong><br>Долг ${formatRub(debt)} руб. попадает в диапазон внесудебной процедуры, и отмечено подходящее основание. Проверьте список кредиторов, дату выдачи исполнительного документа и справки по выбранной категории.<div class="result-actions"><a href="#mfc">Открыть вкладку МФЦ</a><a href="forms/mfc-extrajudicial-bankruptcy-application.docx" download>Скачать заявление</a></div>`;
    return;
  }

  if (courtDuty) {
    routeResult.classList.add('alert');
    routeResult.innerHTML = `<strong>Вероятный маршрут: арбитражный суд.</strong><br>При долге от 500 000 руб. и невозможности рассчитаться с кредиторами может возникнуть обязанность подать заявление в течение 30 рабочих дней.<div class="result-actions"><a href="#court">Открыть вкладку суда</a><a href="forms/court-bankruptcy-application.docx" download>Скачать заявление</a></div>`;
    return;
  }

  if (courtPossible) {
    routeResult.classList.add('warning');
    routeResult.innerHTML = `<strong>Скорее всего, нужно смотреть судебный порядок.</strong><br>Для МФЦ сейчас не хватает диапазона долга или специального основания. Судебное заявление возможно при доказанном предвидении банкротства.<div class="result-actions"><a href="#court">Проверить судебный порядок</a><a href="#documents">Открыть документы</a></div>`;
    return;
  }

  routeResult.classList.add('warning');
  routeResult.innerHTML = `<strong>Недостаточно признаков для выбора процедуры.</strong><br>Проверьте сумму долга, просрочки, исполнительные производства и имущество. Если платежи пока посильны, банкротство может быть преждевременным.<div class="result-actions"><a href="#court">Суд</a><a href="#mfc">МФЦ</a></div>`;
}

routeForm?.addEventListener('input', updateRoute);
updateRoute();

const courtCheckForm = document.querySelector('#court-check-form');
const courtCheckResult = document.querySelector('#court-check-result');
const mfcCheckForm = document.querySelector('#mfc-check-form');
const mfcCheckResult = document.querySelector('#mfc-check-result');
const mfcInstructionPanels = [...document.querySelectorAll('[data-mfc-info]')];
const mfcProofSets = [...document.querySelectorAll('[data-mfc-proof]')];

function updateCourtCheck() {
  if (!courtCheckForm || !courtCheckResult) return;

  const data = new FormData(courtCheckForm);
  const debt = Number(data.get('courtDebt')) || 0;
  const cannotPay = data.get('courtCannotPay') === 'on';
  const oneCreditorBlocks = data.get('courtOneCreditorBlocks') === 'on';
  const stoppedPayments = data.get('courtStoppedPayments') === 'on';
  const tenPercent = data.get('courtTenPercent') === 'on';
  const propertyShortage = data.get('courtPropertyShortage') === 'on';
  const noPropertyEnforcement = data.get('courtNoPropertyEnforcement') === 'on';
  const soonMoney = data.get('courtSoonMoney') === 'on';
  const recentBankruptcy = data.get('courtRecentBankruptcy') === 'on';
  const hasInsolvencySign = cannotPay || stoppedPayments || tenPercent || propertyShortage || noPropertyEnforcement;

  courtCheckResult.classList.remove('is-ok', 'is-warn', 'is-no');

  if (recentBankruptcy) {
    courtCheckResult.classList.add('is-warn');
    courtCheckResult.innerHTML = '<strong>Сначала проверьте пятилетний срок.</strong><br>Если предыдущее банкротство завершилось менее 5 лет назад, новое дело по заявлению самого гражданина обычно не возбуждается. Нужно смотреть дату завершения процедуры и кто именно подает заявление.';
    return;
  }

  if (soonMoney && !propertyShortage && !noPropertyEnforcement) {
    courtCheckResult.classList.add('is-no');
    courtCheckResult.innerHTML = '<strong>Неплатежеспособность может не подтвердиться.</strong><br>Если ожидаемые поступления действительно позволяют полностью закрыть наступившие долги в ближайшее время, суд может не увидеть признаков банкротства.';
    return;
  }

  if (debt >= 500000 && cannotPay && oneCreditorBlocks) {
    courtCheckResult.classList.add('is-ok');
    courtCheckResult.innerHTML = '<strong>Судебный порядок подходит, и может быть обязанность обратиться.</strong><br>Если выплаты одному кредитору делают невозможными расчеты с другими, а общий долг не меньше 500 000 руб., заявление подают в течение 30 рабочих дней.';
    return;
  }

  if (hasInsolvencySign) {
    courtCheckResult.classList.add('is-warn');
    courtCheckResult.innerHTML = '<strong>Судебный порядок можно рассматривать.</strong><br>Соберите документы о долгах, доходах, имуществе и исполнительных производствах. Долг меньше 500 000 руб. сам по себе не блокирует обращение, если есть признаки неплатежеспособности или недостаточности имущества.';
    return;
  }

  courtCheckResult.classList.add('is-no');
  courtCheckResult.innerHTML = '<strong>Пока признаков мало.</strong><br>Если платежи посильны и нет очевидной невозможности платить, банкротство может быть преждевременным.';
}

function updateMfcInstructions(ground) {
  if (!mfcInstructionPanels.length) return;

  const activeGround = ground || 'none';
  mfcInstructionPanels.forEach((panel) => {
    panel.hidden = panel.dataset.mfcInfo !== activeGround;
  });
}

function updateMfcProofSets(ground) {
  if (!mfcProofSets.length) return;

  const activeProof = ['pension', 'benefit', 'svo'].includes(ground) ? 'social' : (ground || 'none');
  mfcProofSets.forEach((set) => {
    set.hidden = set.dataset.mfcProof !== activeProof;
  });
}

function updateMfcCheck() {
  if (!mfcCheckForm || !mfcCheckResult) return;

  const data = new FormData(mfcCheckForm);
  const debt = Number(data.get('mfcDebt')) || 0;
  const ground = data.get('mfcGround');
  updateMfcInstructions(ground);
  updateMfcProofSets(ground);
  const recentBankruptcy = data.get('mfcRecentBankruptcy') === 'on';
  const inRange = debt >= 25000 && debt <= 1000000;
  const checked = (name) => data.get(name) === 'on';
  const hasGround = ground && ground !== 'none';
  const creditorsReady = checked('mfcCreditorsReady');
  const closedReady = ground === 'closed' && checked('mfcReturned46') && checked('mfcNoOpenAfterReturn');
  const socialReady = ['pension', 'benefit', 'svo'].includes(ground) && checked('mfcExecOver1') && checked('mfcNoPropertySocial') && checked('mfcSocialDocs');
  const oldReady = ground === 'old' && checked('mfcExecOver7') && checked('mfcOldDocs');
  const fullReady = inRange && creditorsReady && (closedReady || socialReady || oldReady);

  mfcCheckResult.classList.remove('is-ok', 'is-warn', 'is-no');

  if (recentBankruptcy) {
    mfcCheckResult.classList.add('is-no');
    mfcCheckResult.innerHTML = '<strong>Через МФЦ пока нельзя.</strong><br>Повторное внесудебное заявление допускается не раньше чем через 5 лет после завершения или прекращения предыдущей процедуры банкротства.';
    return;
  }

  if (fullReady) {
    mfcCheckResult.classList.add('is-ok');
    mfcCheckResult.innerHTML = '<strong>Предварительно МФЦ подходит.</strong><br>Проверьте справки по выбранному основанию и обязательно внесите всех известных кредиторов в список. Неуказанные требования не будут списаны.';
    return;
  }

  if (!inRange && hasGround) {
    mfcCheckResult.classList.add('is-warn');
    mfcCheckResult.innerHTML = '<strong>Основание есть, но сумма долга не подходит для МФЦ.</strong><br>Для внесудебного порядка нужен долг от 25 000 до 1 000 000 руб. Проверьте расчет суммы.';
    return;
  }

  if (!creditorsReady && hasGround) {
    mfcCheckResult.classList.add('is-warn');
    mfcCheckResult.innerHTML = '<strong>Пока нельзя подавать заявление.</strong><br>Для МФЦ нужен список всех известных кредиторов. Если кредитора не указать, его требование не будет списано.';
    return;
  }

  if (ground === 'closed') {
    mfcCheckResult.classList.add('is-no');
    mfcCheckResult.innerHTML = '<strong>По этому основанию МФЦ пока не подходит.</strong><br>Нужны оба условия: возврат исполнительного документа по п. 4 ч. 1 ст. 46 Закона № 229-ФЗ и отсутствие новых неоконченных или непрекращенных исполнительных производств после такого возврата.';
    return;
  }

  if (['pension', 'benefit', 'svo'].includes(ground)) {
    mfcCheckResult.classList.add('is-no');
    mfcCheckResult.innerHTML = '<strong>Условий для обращения через МФЦ пока недостаточно.</strong><br>Для пенсионеров, получателей ежемесячного пособия в связи с рождением и воспитанием ребёнка и участников СВО нужны исполнительный документ старше 1 года, его предъявление к исполнению и неполное исполнение, отсутствие имущества для взыскания, а также справки или межведомственные сведения.';
    return;
  }

  if (ground === 'old') {
    mfcCheckResult.classList.add('is-no');
    mfcCheckResult.innerHTML = '<strong>Условий для длительного исполнения более 7 лет пока недостаточно.</strong><br>Нужен исполнительный документ старше 7 лет, который предъявлялся к исполнению и не исполнен полностью, а также справка или межведомственные сведения.';
    return;
  }

  mfcCheckResult.classList.add('is-no');
  mfcCheckResult.innerHTML = '<strong>МФЦ, скорее всего, не подходит.</strong><br>Если нет специального основания, смотрите судебный порядок или проверьте исполнительные производства.';
}

courtCheckForm?.addEventListener('input', updateCourtCheck);
mfcCheckForm?.addEventListener('input', updateMfcCheck);
updateCourtCheck();
updateMfcCheck();

const checklistInputs = document.querySelectorAll('.checklist input[type="checkbox"]');
const storageKey = 'bankruptcy-checklist-v1';

function loadChecklistState() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch {
    return {};
  }
}

function saveChecklistState(state) {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function updateProgress() {
  document.querySelectorAll('.checklist').forEach((list) => {
    const name = list.dataset.list;
    const inputs = [...list.querySelectorAll('input[type="checkbox"]')];
    const done = inputs.filter((input) => input.checked).length;
    const percent = inputs.length ? Math.round((done / inputs.length) * 100) : 0;
    const pill = document.querySelector(`[data-progress-for="${name}"]`);
    if (pill) pill.textContent = `${percent}%`;
  });
}

function hydrateChecklists() {
  const state = loadChecklistState();
  checklistInputs.forEach((input) => {
    const list = input.closest('.checklist')?.dataset.list;
    const id = input.dataset.id;
    input.checked = Boolean(state[`${list}:${id}`]);
  });
  updateProgress();
}

checklistInputs.forEach((input) => {
  input.addEventListener('change', () => {
    const state = loadChecklistState();
    const list = input.closest('.checklist')?.dataset.list;
    state[`${list}:${input.dataset.id}`] = input.checked;
    saveChecklistState(state);
    updateProgress();
  });
});

hydrateChecklists();

document.querySelector('#reset-checklists')?.addEventListener('click', () => {
  localStorage.removeItem(storageKey);
  checklistInputs.forEach((input) => {
    input.checked = false;
  });
  updateProgress();
});

document.querySelector('#print-page')?.addEventListener('click', () => window.print());

document.querySelector('#download-checklist')?.addEventListener('click', () => {
  const lines = ['Чек-лист по банкротству гражданина', ''];
  document.querySelectorAll('.checklist-card').forEach((card) => {
    lines.push(card.querySelector('h3')?.textContent || 'Раздел');
    card.querySelectorAll('li').forEach((item) => {
      const input = item.querySelector('input');
      const text = item.textContent.trim().replace(/\s+/g, ' ');
      lines.push(`${input?.checked ? '[x]' : '[ ]'} ${text}`);
    });
    lines.push('');
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'checklist-bankrotstvo-grazhdanina.txt';
  link.click();
  URL.revokeObjectURL(url);
});

const searchInput = document.querySelector('#site-search');
const clearSearch = document.querySelector('#clear-search');
const resultsBox = document.querySelector('#search-results');
const searchableItems = [...document.querySelectorAll('.searchable')].map((node, index) => {
  if (!node.id) node.id = `result-${index + 1}`;
  const title = node.dataset.title || node.querySelector('h2,h3,summary,strong')?.textContent || 'Раздел';
  return {
    id: node.id,
    title: title.trim(),
    text: `${title} ${node.textContent}`.toLowerCase()
  };
});

function updateSearch() {
  if (!searchInput || !resultsBox) return;
  const query = searchInput.value.trim().toLowerCase();
  resultsBox.innerHTML = '';

  if (query.length < 2) return;

  const matches = searchableItems
    .filter((item) => item.text.includes(query))
    .slice(0, 6);

  if (!matches.length) {
    resultsBox.textContent = 'Ничего не найдено. Попробуйте другой запрос.';
    return;
  }

  matches.forEach((item) => {
    const link = document.createElement('a');
    link.href = `#${item.id}`;
    link.textContent = item.title;
    resultsBox.append(link);
  });
}

searchInput?.addEventListener('input', updateSearch);
clearSearch?.addEventListener('click', () => {
  if (!searchInput || !resultsBox) return;
  searchInput.value = '';
  resultsBox.innerHTML = '';
  searchInput.focus();
});
