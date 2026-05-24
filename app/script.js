/* =========================================================================
   What is a Harness — animação do Agentic Loop
   Single source of truth: o array `steps`. Tudo (blocos, conversa, caixas
   ativas e fluxo) é derivado dele.
   ========================================================================= */

// Ferramentas que tocam o File System
const FS_TOOLS = ['read_dir', 'read_file', 'edit_file', 'write_file', 'execute_bash'];

// Sequência corrigida — 15 steps (retornos do harness após build e test)
const steps = [
  { actor: 'user',      tool: null,           text: 'pode corrigir o arquivo hello world?' },
  { actor: 'assistant', tool: 'read_dir',     text: 'tool_call read_dir' },
  { actor: 'harness',   tool: null,           text: '[helloWorld.js, package.json]' },
  { actor: 'assistant', tool: 'read_file',    text: 'tool_call read_file helloWorld.js' },
  { actor: 'harness',   tool: null,           text: 'const msg = "hello world"; console.log(message);' },
  { actor: 'assistant', tool: 'edit_file',    text: 'tool_call edit_file message para msg' },
  { actor: 'harness',   tool: null,           text: 'ok' },
  { actor: 'assistant', tool: 'execute_bash', text: 'bash_execute node helloWorld.js' },
  { actor: 'harness',   tool: null,           text: 'hello world' },
  { actor: 'assistant', tool: 'execute_bash', text: 'bash_execute npm run build' },
  { actor: 'harness',   tool: null,           text: 'build succeeded' },                 // NOVO
  { actor: 'assistant', tool: 'execute_bash', text: 'bash_execute npm run test' },
  { actor: 'harness',   tool: null,           text: 'tests passed (3/3)' },              // NOVO
  { actor: 'assistant', tool: null,           text: 'llm review' },
  { actor: 'assistant', tool: null,           text: 'o arquivo foi corrigido' },
];

const TOTAL = steps.length;

const WHO_LABEL = {
  user: 'User',
  assistant: 'LLM (assistant)',
  harness: 'Harness',
};

const CODE_BROKEN = 'const msg = "hello world";\nconsole.log(message);';
const CODE_FIXED  = 'const msg = "hello world";\nconsole.log(msg);';

const TOKEN_COLOR = { user: '#2E9BD6', assistant: '#E6B800', harness: '#4F9E2E' };

/* ----------------------------- Elementos ------------------------------ */
const el = {
  blocks:   document.getElementById('blocks'),
  log:      document.getElementById('log'),
  progress: document.getElementById('progress'),
  code:     document.getElementById('code-snippet'),
  token:    document.getElementById('flow-token'),
  boxUser:  document.getElementById('box-user'),
  prompt:   document.getElementById('prompt-bar'),
  boxLLM:   document.getElementById('box-llm'),
  boxHarness: document.getElementById('box-harness'),
  boxFS:    document.getElementById('box-fs'),
  play:     document.getElementById('play'),
  prev:     document.getElementById('prev'),
  next:     document.getElementById('next'),
  speed:    document.getElementById('speed'),
  speedVal: document.getElementById('speed-val'),
};

/* ------------------------------- Estado ------------------------------- */
let currentIndex = 0;   // 0 = nada exibido; 1..TOTAL = step atual
let isPlaying = false;
let playTimer = null;
let flowGen = 0;        // geração para cancelar fluxos antigos

/* --------------------------- Lógica de dados -------------------------- */
// Quais caixas ficam ativas no step i (1-based)
function getActive(i) {
  const active = { user: false, llm: false, harness: false, fs: false };
  if (i < 1) return active;
  const step = steps[i - 1];
  if (step.actor === 'user') {
    active.user = true;
  } else if (step.actor === 'assistant') {
    active.llm = true;
  } else if (step.actor === 'harness') {
    active.llm = true;
    active.harness = true;
    const prev = steps[i - 2];
    if (prev && prev.actor === 'assistant' && FS_TOOLS.includes(prev.tool)) {
      active.fs = true;
    }
  }
  return active;
}

// Velocidade: slider 1..10 -> intervalo entre steps (ms)
function stepInterval() {
  const v = Number(el.speed.value);          // 1 (lento) .. 10 (rápido)
  return Math.round(2800 - v * 240);         // 2560ms .. 400ms
}

/* ------------------------------- Render ------------------------------- */
// Idempotente: reconstrói todo o estado visual para o step `i`.
// `animateNew` aplica o "pop" só no bloco recém-adicionado (avanço pra frente).
function render(i, animateNew) {
  currentIndex = i;

  // 1) Blocos da context window (1..i)
  el.blocks.innerHTML = '';
  for (let k = 1; k <= i; k++) {
    const b = document.createElement('div');
    b.className = 'block ' + steps[k - 1].actor;
    if (animateNew && k === i) b.classList.add('is-new');
    el.blocks.appendChild(b);
  }

  // 2) Caixas ativas / esmaecidas
  const a = getActive(i);
  setBox(el.boxUser, a.user, i);
  setBox(el.prompt, a.user, i);   // prompt acende junto com o User
  setBox(el.boxLLM, a.llm, i);
  setBox(el.boxHarness, a.harness, i);
  setBox(el.boxFS, a.fs, i);

  // 3) Snippet helloWorld.js (corrigido a partir do edit_file confirmado)
  const fixed = i >= 7;
  el.code.textContent = fixed ? CODE_FIXED : CODE_BROKEN;
  el.code.classList.toggle('fixed', fixed);

  // 4) Painel de conversa (mensagens 1..i)
  renderLog(i);

  // 5) Progresso + botões
  el.progress.textContent = 'Step ' + i + ' / ' + TOTAL;
  el.prev.disabled = i <= 0;
  el.next.disabled = i >= TOTAL;
}

function setBox(node, active, i) {
  node.classList.toggle('active', active);
  node.classList.toggle('dim', !active && i >= 1);
}

function renderLog(i) {
  el.log.innerHTML = '';
  if (i < 1) {
    const hint = document.createElement('li');
    hint.className = 'log-hint';
    hint.textContent = 'Clique em ▶ (play) ou na seta → para começar.';
    el.log.appendChild(hint);
    return;
  }
  let currentNode = null;
  for (let k = 1; k <= i; k++) {
    const s = steps[k - 1];
    const li = document.createElement('li');
    li.className = 'msg ' + s.actor + (k === i ? ' current' : '');

    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = WHO_LABEL[s.actor];
    li.appendChild(who);

    if (s.tool) {
      const tool = document.createElement('span');
      tool.className = 'tool';
      tool.textContent = '  ·  ' + s.tool;
      li.appendChild(tool);
    }

    const text = document.createElement('span');
    text.className = 'text';
    text.textContent = s.text;
    li.appendChild(text);

    el.log.appendChild(li);
    if (k === i) currentNode = li;
  }
  if (currentNode) currentNode.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

/* --------------------------- Animação de fluxo ------------------------ */
function path(id) { return document.getElementById(id); }

function animateAlong(pathEl, dur, gen) {
  return new Promise((resolve) => {
    const len = pathEl.getTotalLength();
    const start = performance.now();
    function frame(now) {
      if (gen !== flowGen) { resolve(); return; }   // cancelado por novo render
      let t = (now - start) / dur;
      if (t > 1) t = 1;
      const p = pathEl.getPointAtLength(len * t);
      el.token.setAttribute('cx', p.x);
      el.token.setAttribute('cy', p.y);
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

function hideToken() {
  el.token.classList.remove('on');
  el.token.setAttribute('cx', -20);
  el.token.setAttribute('cy', -20);
}

// Segmentos (ids de path) que o fluxo percorre em cada tipo de step.
function flowSegments(i) {
  const s = steps[i - 1];
  const a = getActive(i);
  if (s.actor === 'user') {
    return ['p-user-prompt', 'p-prompt-context'];
  }
  if (s.actor === 'assistant') {
    const segs = ['p-context-llm', 'p-llm-context'];
    if (s.tool) segs.push('p-llm-harness');          // tool call sobe pro Harness
    return segs;
  }
  // harness
  const segs = [];
  if (a.fs) segs.push('p-harness-fs', 'p-fs-harness'); // Harness <-> File System
  segs.push('p-harness-llm', 'p-llm-context');         // tool return -> grava no contexto
  return segs;
}

async function playFlow(i) {
  flowGen++;                       // cancela qualquer fluxo anterior
  const myGen = flowGen;
  const s = steps[i - 1];
  const segs = flowSegments(i);
  const perSeg = Math.min(650, Math.max(220, stepInterval() * 0.4));

  el.token.style.fill = TOKEN_COLOR[s.actor];
  el.token.classList.add('on');

  for (const id of segs) {
    if (myGen !== flowGen) break;
    const p = path(id);
    if (!p) continue;
    // posiciona no início do segmento antes de mostrar
    const p0 = p.getPointAtLength(0);
    el.token.setAttribute('cx', p0.x);
    el.token.setAttribute('cy', p0.y);
    await animateAlong(p, perSeg, myGen);
  }
  if (myGen === flowGen) hideToken();
}

/* --------------------------- Navegação -------------------------------- */
function goTo(i, withFlow) {
  const target = Math.max(0, Math.min(TOTAL, i));
  const advancing = target > currentIndex;
  render(target, advancing);
  if (withFlow && advancing && target >= 1) {
    playFlow(target);
  } else {
    flowGen++;          // cancela fluxo em andamento
    hideToken();
  }
}

function manualStep(delta) {
  pause();
  goTo(currentIndex + delta, delta > 0);
}

/* ------------------------------ Play / Pause -------------------------- */
function updatePlayBtn() {
  el.play.textContent = isPlaying ? '⏸ Pause' : '▶ Play';
}

function scheduleTick(delay) {
  clearTimeout(playTimer);
  playTimer = setTimeout(() => {
    if (!isPlaying) return;
    if (currentIndex >= TOTAL) { pause(); return; }
    goTo(currentIndex + 1, true);
    scheduleTick(stepInterval());
  }, delay);
}

function play() {
  if (currentIndex >= TOTAL) render(0, false);  // recomeça do início
  isPlaying = true;
  updatePlayBtn();
  scheduleTick(0);                              // primeiro step imediato
}

function pause() {
  isPlaying = false;
  clearTimeout(playTimer);
  updatePlayBtn();
}

function togglePlay() { isPlaying ? pause() : play(); }

/* ------------------------------- Eventos ------------------------------ */
el.play.addEventListener('click', togglePlay);
el.prev.addEventListener('click', () => manualStep(-1));
el.next.addEventListener('click', () => manualStep(1));

el.speed.addEventListener('input', () => {
  el.speedVal.textContent = el.speed.value;
  if (isPlaying) scheduleTick(stepInterval());   // aplica nova velocidade ao vivo
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') { e.preventDefault(); manualStep(1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); manualStep(-1); }
  else if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); togglePlay(); }
});

/* -------------------------------- Início ------------------------------ */
el.speedVal.textContent = el.speed.value;
render(0, false);
