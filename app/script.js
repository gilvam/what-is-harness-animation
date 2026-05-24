/* =========================================================================
   What is a Harness — animação do Agentic Loop
   Single source of truth: o array `steps`. Tudo (blocos, conversa, caixas
   e setas ativas) é derivado dele.
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

/* ----------------------------- Elementos ------------------------------ */
const el = {
  blocks:   document.getElementById('blocks'),
  log:      document.getElementById('log'),
  progress: document.getElementById('progress'),
  code:     document.getElementById('code-snippet'),
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

// Todas as setas (paths) do diagrama — alternam entre ativa (preta) e inativa (cinza)
const WIRES = document.querySelectorAll('.wire');

/* ------------------------------- Estado ------------------------------- */
let currentIndex = 0;   // 0 = nada exibido; 1..TOTAL = step atual
let isPlaying = false;
let playTimer = null;

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

  // 2b) Setas: as do caminho do step atual ficam pretas; as demais cinza
  const activeWires = new Set(getActiveWires(i));
  WIRES.forEach((w) => w.classList.toggle('active', activeWires.has(w.id)));

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

/* --------------------------- Setas ativas ----------------------------- */
// Quais setas (ids de path) ficam pretas no step i — o "caminho" daquele step.
function getActiveWires(i) {
  if (i < 1) return [];
  const s = steps[i - 1];
  const a = getActive(i);
  if (s.actor === 'user') {
    return ['p-user-prompt', 'p-prompt-context'];
  }
  if (s.actor === 'assistant') {
    const wires = ['p-context-llm', 'p-llm-context'];
    if (s.tool) wires.push('p-llm-harness');         // tool call sobe pro Harness
    return wires;
  }
  // harness
  const wires = [];
  if (a.fs) wires.push('p-harness-fs');              // Harness -> File System
  wires.push('p-harness-llm', 'p-llm-context');      // tool return -> grava no contexto
  return wires;
}

/* --------------------------- Navegação -------------------------------- */
function goTo(i) {
  const target = Math.max(0, Math.min(TOTAL, i));
  render(target, target > currentIndex);   // "pop" só ao avançar pra frente
}

function manualStep(delta) {
  pause();
  goTo(currentIndex + delta);
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
    goTo(currentIndex + 1);
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
