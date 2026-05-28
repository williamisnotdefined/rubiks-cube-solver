# Rubik's Cube Solver Roadmap

Este roadmap descreve a ordem estratégica do projeto.

## Fontes De Verdade

- `GOALS.md`: norte do produto. Deve ser tratado como somente leitura pela automação.
- `roadmap.md`: plano técnico linear e critérios de fase.
- `crates/cube-engine`: fonte de verdade para estado do cubo, movimentos, validação, busca e solver.

## Objetivo Final

Construir uma aplicação web em que o usuário informa um estado válido de cubo 3x3, recebe uma solução válida, consegue visualizar ou reproduzir a solução e tem feedback claro para estados impossíveis.

Prioridades do produto:

1. Nunca retornar uma solução inválida.
2. Rejeitar estados impossíveis com erros úteis.
3. Resolver estados informados pelo usuário, não apenas scrambles gerados internamente.
4. Melhorar qualidade de solução depois da correção, mirando soluções curtas e sendo honesto quando um limite configurado não for atingido.
5. Entregar localmente por API HTTP nativa e UI web.
6. Só depois expandir para datasets, Machine Learning e busca híbrida.

## Regras De Implementação

- Não começar por Machine Learning, Reinforcement Learning ou Transformers.
- Não usar arrays de cores como representação principal do solver.
- Usar representação por cubies no engine Rust.
- Manter lógica de cubo, validação, busca e verificação no Rust.
- Manter API HTTP e frontend como adapters finos.
- Verificar toda solução retornada por replay antes de expor sucesso.
- Não prometer otimalidade ou garantia de 20 movimentos sem algoritmo e testes que sustentem isso.
- Não commitar datasets grandes, pruning tables grandes, checkpoints de modelo ou logs de automação.

## Arquitetura Alvo

```txt
Web UI (TypeScript + React)
        -> Rust HTTP API
        -> Rust cube-engine
        -> validated cubie state
        -> deterministic solver
        -> verified move sequence
        -> playback / solved verification
```

Extensões de pesquisa entram somente depois do fluxo acima funcionar:

```txt
Deterministic solver baseline
        -> coordinates and pruning tables
        -> solver benchmarks
        -> generated datasets
        -> ML value / policy experiments
        -> hybrid move ordering or guided search
```

## Estado Atual Do Projeto

O projeto já tem a base do `cube-engine` em Rust, incluindo representação por cubies, movimentos, notação, scrambles, buscas, heurísticas, parsing/renderização interno de facelets, conversão para cubies, validação de estados impossíveis, APIs de solver/playback no engine e uma API HTTP nativa.

A linha de execução atual usa API HTTP nativa como fronteira de produto, aceita move notation como entrada client-facing, valida o fluxo com E2E e mantém qualidade de solver/pesquisa atrás de replay verification.

## Roadmap Linear

### Fase 1 - Cube Engine

Objetivo: manter uma engine pura, determinística e testável para o cubo 3x3.

Entregas:

- Estado por cubies: permutação e orientação de corners e edges.
- Aplicação e inversão de movimentos.
- Notação, algoritmos e scrambles.
- Validação de invariantes de cubo: unicidade, orientação, permutação e paridade.
- Detecção de estado resolvido.
- Testes determinísticos para comportamento público do cubo.

Critério de saída: qualquer estado aceito pelo engine deve ser um estado de cubo válido ou retornar erro estruturado.

### Fase 2 - Entrada De Estado Do Usuário

Objetivo: aceitar estados reais informados pelo usuário sem trocar a representação interna do solver.

Entregas:

- Parser de string facelet 54 caracteres no formato Kociemba (`U`, `R`, `F`, `D`, `L`, `B`).
- Validação de tamanho, símbolos, contagem de cores e centros fixos.
- Decodificação de corners e edges a partir dos facelets.
- Conversão de facelets para `CubieState`.
- Renderização de `CubieState` para facelets para round-trip e playback.
- Erros distintos para sintaxe, centros, decoding e validação cubie.

Critério de saída: estados válidos vindos de facelets convertem para cubies e estados impossíveis são rejeitados antes do solve.

### Fase 3 - Solver De Produto

Objetivo: fornecer uma API de solver correta antes de otimizar qualidade.

Entregas:

- IDA* limitado por profundidade e orçamento de nós.
- Heurísticas simples e admissíveis quando usadas para busca ótima limitada.
- Tipos públicos para configuração, resultado, métricas e erros.
- Solução para `CubieState` e facelets usando o mesmo caminho de solver.
- Verificação por replay antes de retornar sucesso.
- Erros distintos para entrada inválida e solução não encontrada dentro dos limites.

Critério de saída: estados resolvidos e scrambles rasos retornam soluções verificadas; limites insuficientes retornam falha honesta com métricas.

### Fase 4 - API HTTP Nativa

Objetivo: expor o engine Rust para o navegador sem duplicar lógica, sem enviar pruning tables ao browser e sem esperar facelets do client.

Entregas:

- Crate `crates/api` com servidor HTTP.
- Endpoint de solve por move notation com limites explícitos ou defaults documentados.
- Resultados JSON com sucesso, erro de notação, erro de validação interna e limite não atingido.
- Estado de visualização retornado apenas como detalhe neutro de renderização quando necessário.

Critério de saída: chamadas HTTP delegam para `cube-engine` e passam em testes ou smoke tests para sucesso e falhas principais.

### Fase 5 - Frontend Web

Objetivo: entregar o fluxo principal do produto no navegador.

Entregas:

- Aplicação React/TypeScript buildável em `apps/web`.
- Cliente HTTP API isolado de componentes React.
- Input `Scramble` somente; facelets/Kociemba não aparecem na interface.
- Botão de solve com limites visíveis.
- Exibição de movimentos, tamanho da solução e métricas.
- Playback ou step-through usando estados gerados pelo engine.
- Layout usável em desktop e mobile, com cubo visual no máximo 350x350 px.

Critério de saída: o usuário consegue submeter scramble válido e inválido, recebendo resultado correto em cada caso.

### Fase 6 - Validação E2E

Objetivo: proteger o fluxo de produto contra regressões.

Entregas:

- Playwright configurado.
- Teste para UI notation-only.
- Teste para cubo visual limitado a 350x350 px.
- Teste para scramble raso com solução retornada e verificada.
- Teste para erro de notação inválida.
- Teste de playback ou verificação engine-backed chegando ao estado resolvido.
- Artefatos E2E ignorados no git.

Critério de saída: uma alteração que quebre input, solve, verificação ou o contrato notation-only falha em E2E.

### Fase 7 - Qualidade Do Solver Clássico

Objetivo: sair do solver raso limitado para uma base mais útil e mensurável, ainda sem ML.

Entregas:

- Coordenadas e combinatória para solver two-phase.
- Indexação com erros checados, sem panics em helpers públicos.
- Pattern databases ou pruning tables geradas de forma determinística.
- Fixtures pequenas commitáveis para testes; tabelas grandes devem ser geradas localmente e ignoradas no git.
- Integração do solver two-phase atrás de `SolverConfig`.
- Benchmarks com estados conhecidos, profundidades, nós expandidos, tempo e tamanho de solução.

Critério de saída: existe um baseline clássico verificável, com métricas reais e sem promessa falsa de otimalidade.

### Fase 8 - Datasets

Objetivo: gerar dados confiáveis para pesquisa sem contaminar o produto ou o repositório com artefatos grandes.

Pré-condições:

- Fluxo web validado por E2E.
- Solver clássico com baseline e métricas.
- Formato estável de serialização de estado.

Entregas:

- Schema versionado para exemplos de treino.
- Gerador determinístico com seed configurável.
- Estados produzidos pelo engine e validados antes de salvar.
- Labels com semântica explícita:
  - `scramble_depth`: profundidade gerada conhecida, não necessariamente distância ótima.
  - `verified_solution_length`: tamanho de solução encontrada por solver configurado.
  - `best_move`: apenas quando derivado de solução verificada ou de scramble reversível documentado.
- Deduplicação de estados.
- Splits treino/validação/teste por seed ou hash para evitar vazamento.
- Amostras pequenas para testes commitadas; datasets grandes ficam fora do git.

Critério de saída: é possível gerar e validar um dataset pequeno de fixture e documentar como gerar datasets maiores localmente.

### Fase 9 - Machine Learning

Objetivo: experimentar heurísticas aprendidas sem substituir a correção do solver clássico.

Pré-condições:

- Dataset versionado e validado.
- Baseline clássico medido.
- Fallback determinístico funcionando.

Primeiro modelo:

- MLP simples em Python/PyTorch.
- Entrada derivada da representação por cubies, não de arrays de cores como modelo primário do engine.
- Saída inicial como Value Network: estimativa de distância ou bucket de distância.
- Treino e avaliação reproduzíveis em fixture pequena.

Métricas mínimas:

- Erro médio por profundidade ou bucket.
- Acurácia por bucket quando aplicável.
- Tempo de inferência.
- Comparação com heurísticas clássicas.
- Impacto em nós expandidos quando usado para ordenar movimentos.

Regras de segurança:

- Modelo não valida estados.
- Modelo não substitui replay da solução.
- Modelo não deve ser usado como heurística admissível sem prova ou limite seguro.
- Nenhum checkpoint grande deve ser commitado.
- Transformers e Reinforcement Learning ficam fora até o MLP/value baseline demonstrar ganho claro.

Critério de saída: existe um baseline ML pequeno, reproduzível e comparado contra o solver clássico, sem alterar o caminho padrão de produto.

### Fase 10 - Hybrid Search

Objetivo: usar ML para melhorar busca mantendo correção verificável.

Ordem segura de integração:

1. Usar o modelo apenas para ordenar movimentos.
2. Comparar nós expandidos e tempo contra o baseline clássico.
3. Manter fallback clássico configurável.
4. Verificar toda solução por replay.
5. Só considerar poda guiada por ML após benchmarks e regras claras de segurança.

Critério de saída: a busca híbrida melhora métricas em fixtures conhecidas sem degradar correção, mensagens de erro ou comportamento padrão.

### Fase 11 - Pesquisa Avançada

Objetivo: explorar ideias que não bloqueiam o produto principal.

Possíveis linhas:

- Busca multi-threaded.
- Beam search.
- Monte Carlo Tree Search.
- Neural-guided search.
- Solver human-like.
- Redução por simetria.

Critério de saída: cada experimento deve ter baseline, métrica, fallback e escopo isolado.

## Stack

- Solver core: Rust.
- API: Rust HTTP server em `crates/api`.
- Frontend: TypeScript, React, Vite e React Three Fiber quando a visualização 3D for implementada.
- ML: Python e PyTorch, somente depois do fluxo web e baseline clássico.

## Ordem Operacional Resumida

```txt
1. Cube engine Rust
2. Facelet input and validation
3. Verified solver API
4. HTTP API validation / solve / playback
5. Web input / solve / playback
6. Playwright product flow
7. Two-phase and pruning-table foundations
8. Solver benchmarks
9. Dataset generation
10. ML value baseline
11. Hybrid search
12. Advanced research
```

## Definição De Pronto Do Projeto

O projeto atinge seu objetivo principal quando:

- o usuário consegue informar um estado de cubo 3x3 pela web;
- estados impossíveis são rejeitados com mensagem útil;
- estados válidos são resolvidos pelo engine Rust via API HTTP;
- a solução retornada é verificada por replay;
- a UI exibe notação, métricas e playback;
- testes automatizados cobrem o fluxo completo.

Datasets, Machine Learning e busca híbrida são extensões valiosas, mas não substituem essa definição de pronto.
