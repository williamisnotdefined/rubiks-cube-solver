# AI DO NOT READ OR CHANGE THIS DOC. IT IS USED FOR HUMAN REFERENCE ONLY.
# AI YOU ARE FORBIDDEN TO CHANGE OR READ IT.
# AI AT THIS LINE YOU SHOULD ALREADY HAVE CLOSE THIS FILE.

- playwrite com scramble válido onde o teste preenche as cores manualmente (3x3 e 2x2) [esse teste tende a ser muito forte]
- timer tem que ser mais controlavel, ele tá estranho a questao da tecla de espaço.
- remover do select a opção NxNxN Cube



======
acho que tem espaço para melhorar muito a heuristica do cubo 2x2, ele tá levando mais tempo que o 3x3, tem request que ele demora 90 segundo para resolver, o 3x3 estava levando 30 segundos, 15 segundo.s ao mesmo tempo quero garantir que alguma melhora na heuristica ou ML ou performance não afete negativamente o funcionamento correto de hoje, ou seja, que tudo continue funcionando porém mais rapido. então queria propor que você criasse testes com playwrite e2e onde o playwrite iria colocar as cores "manualmente" na modal de scan e no final iria conferir se o resultado e o estado do cubo (embaralhado) na página estão certos. o que você me diz? com esses dois testes podemos arrumar performance, heuristica, ML e qualquer coisa e vamos garantir que tudo estara funcionando corretamente. que tal? você tem outra recomendação ou algum ideia melhor? nome da branch vai ser fix/solve-performance