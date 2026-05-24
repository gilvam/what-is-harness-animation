# what-is-harness-animation

Animação HTML didática que explica como um **harness** e uma **LLM** trabalham juntos dentro de
um *agentic loop*, reproduzindo fielmente o diagrama `harness-easy.jpg`.

A animação percorre, passo a passo, uma conversa real de exemplo — pedir para corrigir o arquivo
`helloWorld.js` — e mostra:

- os blocos da **context window 200k** surgindo um a um (memória acumulada);
- quais componentes ficam **ativos** em cada step (User, LLM, Harness, File System);
- o **fluxo** do step destacado nas **setas** (a seta do caminho atual fica preta; as demais cinza);
- a conversa completa num **painel lateral** (User → LLM → Harness → ...).

Cada step é colorido pelo seu ator: **azul** = user, **amarelo** = LLM (assistant),
**verde** = harness. A sequência tem **15 steps** (o agentic loop fecha cada `tool_call`/
`bash_execute` com o retorno do harness, inclusive em `npm run build` e `npm run test`).

## Como executar

Abra o arquivo `app/index.html` no navegador (duplo clique ou `file://`). Não precisa de
servidor nem dependências.

## Controles

- **▶ Play / ⏸ Pause** — roda a animação automaticamente.
- **Slider de velocidade** — ajusta o ritmo ao vivo.
- **◀ / ▶** — navegação manual (pausa o play). Também pelo teclado: setas `←` / `→`;
  `espaço` alterna play/pause.

## Estrutura

| Caminho | Descrição |
|---|---|
| `app/index.html` | Estrutura: palco do diagrama (caixas + setas SVG), painel de conversa, controles. |
| `app/styles.css` | Estilos, cores fiéis à imagem, estados ativo/esmaecido e animações. |
| `app/script.js` | Dados dos steps, render idempotente, play/pause, velocidade, teclado e fluxo. |
| `harness-easy.jpg` | Diagrama de referência. |
| `prompt-final.md` | Especificação final do projeto (prompt refinado + sequência de 15 steps). |
