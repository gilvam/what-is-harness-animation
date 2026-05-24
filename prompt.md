<memory>
 bloco "context window 200k".
<memory>


<execute>
	<step_1>
		user: pode corrigir o arquivo hello world?
	</step_1>
	<step_2>
		assistant: tool_call read_dir
	</step_2>
	<step_3>
		harness: [helloWorld.js, package.json]
	</step_3>
	<step_4>
		assistant: tool_call read_file helloWorld.js
	</step_4>
	<step_5>
		harness: const msg = "hello world"; console.log(message);
	</step_5>
	<step_6>
		assistant: tool_call edit_file message para msg
	</step_6>
	<step_7>
		harness: ok
	</step_7>
	<step_8>
		assistant: bash_execute node helloWorld.js
	</step_8>
	<step_9>
		harness: hello world
	</step_9>
	<step_10>
		assistant: bash_execute npm run build
	</step_10>
	<step_11>
		assistant: bash_execute npm run test
	</step_11>
	<step_12>
		assistant: llm review
	</step_12>
	<step_13>
		assistant: o arquivo foi corrigido
	</step_13>
</execute>

<LLM>
	figura da cor amarela
</LLM>

<harness>
	figura da cor verde
</harness>

<file-system>
    figura da cor cinza
</file-system>


A imagem @harness-easy.jpg explica o funcionamento de um harness e a LLM.
Aonde se encontra os textos <step_1> que está em azul é a primeira entrada e bate com a primeira imagem dentro do <memory> que também é azul.
O segundo step <step_2> onde é amarela, bate com o segundo quadrado dentro do <memory> que também é amarelo e bate com a cor da <LLM>. Logo assistant é a <LLM>.
O terceiro step <step_3> é verde, bate com o terceiro quadrado verde do <memory> que também é verde e bate com a cor do <harness>.

Crie uma animação HTML na pasta @app onde mostra cada uma dessas chamadas dos textos mostrando 1 por um.
- Quando mostrar o <step_1>, mostrar a imagem 1 dentro do <memory> que bate com a cor do user.
- Quando mostrar o <step_2>, mostrar a imagem 1 e 2 dentro do <memory> e a imagem 2 é da cor da <LLM>.
- Quando mostrar o <step_3>, mostrar a imagem 1, 2 e 3 dentro do <memory> e a imagem 3 é da cor do <harness>.
- Quando mostrar o <step_4>, mostrar a imagem 1, 2, 3 e 4 dentro do <memory> e a imagem 4 é da cor da <LLM>.
- Seguir a sequencia até o final.

Quando um step dentro do <execute> estiver ativo:
- é o assistant, a <LLM> fica ativa.
- é o harness, a <LLM> e <harness> ficam ativos.
- é o harness e o anterior era o assistant e pediu para usar o read_dir, read_file, edit_file, write_file, ou execute_bash, deve ativar também o <file-system> por ter a chamada dessas ações.


AÇÕES:
- Deve ter um botão de play e um input range para selecionar a velocidade que a animação é realizada.
- Deve ter 2 botões (seta direita e esquerda) no qual quando ativado para a ação do botão play e começa a passar a animação manualmente clicando com a seta para direita e voltando com a esquerda (esses botões de seta devem funcionar também usando o teclado seta esquerda e seta direita).

#final
salve o plano no arquivo prompt-final.md
descreva de forma resumida o projeto no @README.md