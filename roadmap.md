# Rubik's Cube AI Solver Roadmap

## Execução Operacional Com Roadrunner

Este arquivo descreve a visão técnica e estratégica do projeto. A fila operacional usada pelo Roadrunner fica em `ai/roadmap/queue.json` e deve ser tratada como a fonte de verdade para execução autônoma passo a passo.

O Roadrunner deve priorizar o fluxo de produto definido em `GOALS.md`: entrada de estado do usuário, validação, conversão para cubies, solução verificada, exposição por WASM, interface web, testes E2E e só então extensões de pesquisa como datasets, Machine Learning e busca híbrida.

Cada item operacional deve ser pequeno, verificável e capaz de passar por `cargo test`, `npm run lint` e `npm run roadmap:check`. Execuções longas devem acontecer fora do OpenCode, preferencialmente em `tmux`, com revisão e commit manual após cada passo verificado.

## Objetivo Final

Construir um sistema híbrido de resolução de cubo mágico focado em:

* soluções ótimas ou quase ótimas
* busca heurística avançada
* heurísticas aprendidas por Machine Learning
* visualização web moderna
* execução local via WebAssembly
* aproximação do limite teórico conhecido como God’s Number

God’s Number representa o número máximo de movimentos necessários para resolver qualquer estado válido de um cubo mágico 3x3.

---

# Arquitetura Final Recomendada

```txt
Frontend (TypeScript + React + React Three Fiber)
                ↓
         WebAssembly Bridge
                ↓
          Rust Solver Engine
                ↓
Iterative Deepening A* (IDA*)
                ↓
Pattern Databases + Heuristics
                ↓
Machine Learning Heuristics
```

---

# Filosofia do Projeto

## Regra mais importante

Não começar por Inteligência Artificial.

A ordem correta do projeto é:

```txt
1. Representação do cubo
2. Sistema de movimentos
3. Algoritmos de busca
4. Heurísticas
5. Solver eficiente
6. Pattern Databases
7. Machine Learning
8. Hybrid Search
```

---

# Stack Recomendada

## Solver Core

* Rust

## Machine Learning

* Python
* PyTorch

## Frontend

* TypeScript
* React
* React Three Fiber
* Zustand
* Vite

## Integração

* WebAssembly (WASM)

---

# Fase 1 — Cube Engine

## Objetivo

Criar uma engine pura do cubo mágico.

Sem interface gráfica.
Sem Inteligência Artificial.
Sem renderização.

---

# Estrutura sugerida

```txt
cube-engine/
├── cube/
│   ├── state.rs
│   ├── cubies.rs
│   ├── moves.rs
│   ├── notation.rs
│   └── scramble.rs
│
├── search/
│   ├── bfs.rs
│   ├── ida_star.rs
│   └── heuristics.rs
│
└── main.rs
```

---

# Objetivos técnicos

A engine deve:

* representar qualquer estado válido do cubo
* aplicar movimentos
* desfazer movimentos
* gerar scrambles
* validar estados
* detectar cubo resolvido
* serializar estados

---

# Representação recomendada

Não utilizar:

```rs
["white", "green", "red"]
```

---

# Utilizar Cubie Representation

Representar separadamente:

* permutação de corners
* orientação de corners
* permutação de edges
* orientação de edges

---

# Conceitos importantes

## Corner

Peça de canto.

## Edge

Peça de aresta.

## Permutation

Posição da peça.

## Orientation

Rotação da peça.

---

# Exemplo conceitual

```txt
Corners:
[URF, UFL, ULB...]

Edges:
[UR, UF, UL...]
```

---

# Meta principal desta fase

A engine deve suportar:

```rs
cube.apply_move(Move::R);
cube.apply_move(Move::U);
cube.apply_move(Move::RPrime);

assert!(!cube.is_solved());
```

---

# Fase 2 — Algoritmos de Busca

## Objetivo

Implementar algoritmos clássicos de busca.

---

# Algoritmos recomendados

## BFS (Breadth-First Search)

Busca em largura.

Explora todos os estados de uma profundidade antes de avançar.

---

## DFS (Depth-First Search)

Busca em profundidade.

---

## IDDFS (Iterative Deepening Depth-First Search)

Busca em profundidade iterativa.

---

## A* (A-Star)

Busca heurística guiada por custo estimado.

---

## IDA* (Iterative Deepening A-Star)

Versão do A* com menor consumo de memória.

Este é um dos algoritmos mais importantes para o projeto.

---

# Conceitos importantes

## Branching Factor

Quantidade média de movimentos possíveis por estado.

## Pruning

Remoção de caminhos pouco promissores.

## Heuristic

Estimativa de distância até o estado resolvido.

---

# Fase 3 — Heurísticas

## Objetivo

Eliminar dependência de brute force.

---

# Heurísticas recomendadas

## Corner Orientation Heuristic

Avalia orientação de corners.

---

## Edge Orientation Heuristic

Avalia orientação de edges.

---

## Misplaced Cubies

Conta peças fora da posição correta.

---

# Conceito importante

## Admissible Heuristic

Heurística que nunca superestima a distância real até a solução.

Esse conceito é fundamental para soluções ótimas.

---

# Fase 4 — Pattern Databases

## Objetivo

Criar tabelas pré-calculadas para acelerar buscas.

---

# O que é Pattern Database

Banco de estados parcialmente resolvidos contendo:

```txt
estado parcial → distância mínima até solução
```

---

# Exemplos

## Corner Pattern Database

## Edge Orientation Database

## Edge Permutation Database

---

# Conceitos importantes

## Hashing

Transformar estados complexos em índices compactos.

---

## Bit Packing

Compactação de múltiplos dados em poucos bits.

---

## Lookup Table

Tabela de consulta extremamente rápida.

---

# Fase 5 — Frontend Web

## Stack

* TypeScript
* React
* React Three Fiber
* Zustand

---

# Objetivo

Visualizar:

* estado do cubo
* movimentos
* soluções
* algoritmos
* animações
* busca heurística

---

# Funcionalidades recomendadas

## Renderização do cubo

## Aplicação de movimentos

## Scramble Generator

## Playback de soluções

## Controle manual

## Visualização da busca

---

# Regra importante

A interface não deve conter lógica do cubo.

A interface apenas:

```txt
envia movimentos
recebe estados
renderiza
```

---

# Fase 6 — WebAssembly

## Objetivo

Executar a engine Rust diretamente no navegador.

---

# Tecnologias

## WebAssembly (WASM)

Formato binário executável no browser.

---

## wasm-bindgen

Ferramenta de integração Rust + JavaScript.

---

# Resultado esperado

O frontend poderá chamar:

```ts
solveCube(state)
```

com performance próxima de código nativo.

---

# Fase 7 — Dataset Generation

## Objetivo

Gerar datasets profissionais para treinamento.

---

# Estratégia recomendada

Partir do cubo resolvido.

Aplicar scrambles reversíveis.

Salvar:

```json
{
  "state": "...",
  "distance": 12,
  "best_move": "R"
}
```

---

# Conceitos importantes

## Reverse Scramble

Aplicação reversa de movimentos conhecidos.

---

## Supervised Learning Dataset

Dataset contendo entradas e respostas corretas.

---

# Organização recomendada

```txt
datasets/
├── depth_1/
├── depth_2/
├── depth_3/
...
├── depth_20/
```

---

# Fase 8 — Machine Learning

## Stack

* Python
* PyTorch

---

# Objetivo

Treinar modelos capazes de estimar distância até solução.

---

# Modelo inicial recomendado

## Multi-Layer Perceptron (MLP)

Rede neural fully-connected simples.

Não utilizar Transformers inicialmente.

---

# Input recomendado

One-hot encoding das peças do cubo.

---

# Objetivo do modelo

Receber:

```txt
estado do cubo
```

Retornar:

```txt
distância estimada até solução
```

---

# Conceitos importantes

## Policy Network

Rede neural que prevê melhor movimento.

---

## Value Network

Rede neural que prevê distância até solução.

---

# Recomendação principal

Começar com Value Networks.

---

# Fase 9 — Hybrid Search

## Objetivo

Combinar:

* busca clássica
* heurísticas clássicas
* Machine Learning

---

# Arquitetura recomendada

```txt
IDA*
    +
Pattern Databases
    +
Value Network
```

---

# Objetivo técnico

Utilizar Machine Learning para guiar a busca.

---

# Fase 10 — Solver Profissional

## Objetivo Final

Construir um solver:

* extremamente rápido
* próximo de soluções ótimas
* visual
* extensível
* modular
* preparado para pesquisa

---

# Funcionalidades avançadas

## Multi-threaded Search

Busca paralela utilizando múltiplas threads.

---

## Beam Search

Busca limitada aos caminhos mais promissores.

---

## Monte Carlo Tree Search (MCTS)

Busca probabilística guiada por simulações.

---

## Neural-Guided Search

Busca guiada por redes neurais.

---

## Human-Like Solver

Solver focado em soluções parecidas com speedcubers humanos.

---

# Conceitos Matemáticos Importantes

## Group Theory

Área da álgebra utilizada para modelar movimentos do cubo.

---

## State Space

Quantidade total de estados possíveis.

O cubo 3x3 possui aproximadamente:

4.3 × 10¹⁹ estados possíveis.

---

## Symmetry Reduction

Redução de estados equivalentes por simetria.

---

# Tecnologias Recomendadas

## Core Solver

* Rust

## Machine Learning

* Python
* PyTorch

## Interface

* TypeScript
* React
* React Three Fiber

## Build e integração

* WebAssembly
* wasm-bindgen

---

# O que evitar

## Não começar pelo frontend

## Não começar por Reinforcement Learning

## Não utilizar Transformers inicialmente

## Não usar arrays de cores como representação principal

## Não misturar UI com lógica da engine

## Não depender de brute force

---

# Ordem Recomendada de Implementação

```txt
1. Cube Engine em Rust
2. Sistema de movimentos
3. Algoritmos de busca
4. Heurísticas
5. Pattern Databases
6. WebAssembly
7. Frontend Web
8. Dataset Generation
9. Machine Learning
10. Hybrid Search
```

---

# Resultado Esperado

Ao final do projeto será possível ter:

* engine profissional de cubo mágico
* solver eficiente
* heurísticas avançadas
* busca híbrida
* integração Machine Learning + Search
* execução web em alta performance
* visualização interativa
* base para pesquisa avançada
* projeto altamente diferenciado
* possibilidade futura de paper acadêmico
