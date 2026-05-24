# Prompt final — Animação "What is a Harness" (Agentic Loop)

> Versão refinada do prompt original (`prompt.md`), com as decisões fechadas com o usuário e a
> **sequência corrigida de 15 steps** (retornos do harness inseridos após `npm run build` e
> `npm run test`). Serve como especificação executável do projeto em `app/`.

---

## Objetivo

Criar uma **animação HTML** (em `app/`) que reproduz fielmente o diagrama `harness-easy.jpg` e
explica, passo a passo, como um **harness** e uma **LLM** cooperam num *agentic loop* para
corrigir o arquivo `helloWorld.js`. A cada step a animação:

- revela um bloco na **context window 200k** (memória acumulada, um a um);
- acende as caixas corretas (**User / LLM / Harness / File System**);
- destaca as **setas** do caminho do step (ativas em preto, inativas em cinza);
- registra a mensagem no **painel de conversa, à esquerda do palco**.

## Mapeamento de cores (fiel ao diagrama)

| Elemento | Cor | Ator correspondente |
|---|---|---|
| User / prompt / 1º bloco | **azul** (`#2E9BD6`) | `user` |
| LLM / blocos do assistant | **amarelo/ouro** (`#E6B800`) | `assistant` |
| Harness / blocos do harness | **verde** (`#4F9E2E`) | `harness` |
| File System | branco, borda cinza | (acende em tool calls de FS) |

O ator de cada step define a cor do bloco adicionado na context window e quais caixas acendem.

## Sequência de steps (15 — corrigida)

| # | Ator | Cor bloco | Tool | Mensagem | Caixas ativas |
|---|------|-----------|------|----------|---------------|
| 1 | user | azul | — | `pode corrigir o arquivo hello world?` | User |
| 2 | assistant | amarelo | read_dir | `tool_call read_dir` | LLM |
| 3 | harness | verde | — | `[helloWorld.js, package.json]` | LLM + Harness + File System |
| 4 | assistant | amarelo | read_file | `tool_call read_file helloWorld.js` | LLM |
| 5 | harness | verde | — | `const msg = "hello world"; console.log(message);` | LLM + Harness + File System |
| 6 | assistant | amarelo | edit_file | `tool_call edit_file message para msg` | LLM |
| 7 | harness | verde | — | `ok` | LLM + Harness + File System |
| 8 | assistant | amarelo | execute_bash | `bash_execute node helloWorld.js` | LLM |
| 9 | harness | verde | — | `hello world` | LLM + Harness + File System |
| 10 | assistant | amarelo | execute_bash | `bash_execute npm run build` | LLM |
| **11** | **harness** | **verde** | — | `build succeeded` *(novo)* | LLM + Harness + File System |
| 12 | assistant | amarelo | execute_bash | `bash_execute npm run test` | LLM |
| **13** | **harness** | **verde** | — | `tests passed (3/3)` *(novo)* | LLM + Harness + File System |
| 14 | assistant | amarelo | — | `llm review` | LLM |
| 15 | assistant | amarelo | — | `o arquivo foi corrigido` | LLM |

**Correção aplicada:** o prompt original tinha `bash_execute npm run build` (step 10) e
`bash_execute npm run test` (step 11) sem retorno do harness, quebrando o padrão
`assistant → harness` do loop. Foram inseridos os retornos do harness (`build succeeded` e
`tests passed (3/3)`), adicionando **2 blocos verdes** (posições 11 e 13). Total: **15 blocos**.

Cores dos 15 blocos:
`azul, amarelo, verde, amarelo, verde, amarelo, verde, amarelo, verde, amarelo, verde, amarelo, verde, amarelo, amarelo`

## Regras de ativação (genéricas)

Para o step atual `N`:

- **user** → acende **User** (+ barra `prompt`).
- **assistant** → acende **LLM**.
- **harness** → acende **LLM + Harness**; e se o step anterior for `assistant` com
  `tool ∈ {read_dir, read_file, edit_file, write_file, execute_bash}` → acende também
  **File System** (houve chamada que toca o sistema de arquivos).

Com a sequência corrigida, o **File System acende nos steps 3, 5, 7, 9, 11 e 13**.

Blocos são cumulativos: no step `N` ficam visíveis os blocos `1..N`.

## Decisões de design (confirmadas)

- **Layout:** réplica fiel do diagrama `harness-easy.jpg`.
- **Texto dos steps:** painel de conversa **à esquerda** do palco (log acumulativo, mensagem
  atual destacada).
- **Fluxo (sem bolinha):** as **setas** do caminho do step atual ficam **pretas e mais grossas**;
  as demais ficam **cinza claro e finas** (o diagrama continua visível). Setas por ator:
  - **user** → `User→prompt`, `prompt→context`;
  - **assistant** → `context→LLM`, `LLM→context` (+ `LLM→Harness` se houver tool_call);
  - **harness** → `Harness→File System` (se FS ativo), `Harness→LLM` (tool return), `LLM→context`.
- **Setas — geometria:** há folga entre as pontas das setas e as caixas; a seta `LLM→context`
  **sai da lateral esquerda da LLM** e **arqueia para cima** (não afunda).
- **Barra do prompt:** a barra azul do prompt tem a **mesma largura dos blocos** da context
  window, e logo **abaixo dela aparece o texto "prompt"** (como no diagrama original).
- **Fim:** para no último step (sem loop); navegação manual permite revisar.

## Ações / controles (requisito)

- **Play / Pause** com auto-avanço por timer.
- **Slider de velocidade** (`input range`) controlando o intervalo entre steps ao vivo.
- **Botões ◀ / ▶** de navegação manual; clicar **pausa o play** e move um step.
- **Teclado** `←` / `→` faz o mesmo que os botões (e pausa o play); `espaço` alterna play/pause.
- **Indicador de progresso** `Step N / 15`; botões desabilitam nos extremos.

## Arquivos do projeto

- `app/index.html` — palco do diagrama (caixas + overlay SVG das setas), painel de conversa,
  barra de controles.
- `app/styles.css` — cores fiéis à imagem, estados ativo/esmaecido, animações (pop dos blocos).
- `app/script.js` — array `steps` (única fonte de verdade), `render(i)` idempotente, play/pause,
  velocidade, teclado e `getActiveWires(i)` (setas ativas por step).

## Como verificar

1. Abrir `app/index.html` no navegador.
2. **Play:** avança sozinho pelos 15 steps; blocos surgem 1 a 1; slider muda a velocidade ao vivo;
   para no fim.
3. Conferir, por step, blocos/cores corretos (2 verdes novos em 11 e 13) e caixas certas acesas
   (File System em 3, 5, 7, 9, 11, 13).
4. ◀ / ▶ (mouse) e ← / → (teclado) pausam o play e navegam; `Step N / 15` coerente.
5. **Setas:** sem bolinha; só as setas do step atual ficam pretas/grossas, as demais cinza; a
   seta `LLM→context` **sai da esquerda da LLM**, arqueia para cima e há folga até as caixas.
6. **Layout:** o painel de conversa fica **à esquerda** e o palco do diagrama à direita.
7. Comparar visualmente com `harness-easy.jpg`.
