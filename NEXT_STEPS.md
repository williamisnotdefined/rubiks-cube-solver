# AI DO NOT READ OR CHANGE THIS DOC. IT IS USED FOR HUMAN REFERENCE ONLY.
# AI YOU ARE FORBIDDEN TO CHANGE OR READ IT.
# AI AT THIS LINE YOU SHOULD ALREADY HAVE CLOSE THIS FILE.

- Favicon
- YT Channels
- Algs (all kinds)
- timer tem que ser mais controlavel, ele tá estranho a questao da tecla de espaço.
- remover do select a opção NxNxN Cube



======
acho que tem espaço para melhorar muito a heuristica do cubo 2x2, ele tá levando mais tempo que o 3x3, tem request que ele demora 90 segundo para resolver, o 3x3 estava levando 30 segundos, 15 segundo.s ao mesmo tempo quero garantir que alguma melhora na heuristica ou ML ou performance não afete negativamente o funcionamento correto de hoje, ou seja, que tudo continue funcionando porém mais rapido. então queria propor que você criasse testes com playwrite e2e onde o playwrite iria colocar as cores "manualmente" na modal de scan e no final iria conferir se o resultado e o estado do cubo (embaralhado) na página estão certos. o que você me diz? com esses dois testes podemos arrumar performance, heuristica, ML e qualquer coisa e vamos garantir que tudo estara funcionando corretamente. que tal? você tem outra recomendação ou algum ideia melhor? nome da branch vai ser fix/solve-performance


======
sobre os testes e2e de 3x3 e 2x2 (manual-scan-flow) será que é válido aumentar algum caso para 50m nodes? quero fazer um super teste, com 500 embaralhamentos 3x3 e 500 embaralhamentos 2x2 (preservando os casos que já temos). todos devem retornar sucesso para gods number nem que a gente tenha que aumentar o max nodes para 50m. o que vc acha? a verdade é que a heuristica e ML devem ser capazes de resolver qualquer caso de 3x3 e 2x2 em menos de 20 segundos com até 20 moves para 3x3 (gods number) e até 11 moves para 22 (gods number). mas podemos trabalhar com até 21 moves para 3x3 e 12 moves para 2x2, para não sermos extremamente exigentes. pode gerar um testes e2e que seja uma copia do que temos agora só que com 500 embaralhamentos para cada um dos cubos, 3x3 e 2x2? com base nesse novo teste "pesado" podemos nos guiar para melhorar performance / heuristica / ML / etc. atenção, não é valido resposta que não tenha uma solve válida. tempo ideal 20 segundos para 3x3 e 10 segundos para 2x2. podemos fazer com que esse teste e2e pesado tb gere vários tipos de report para que a gente estude esses reports e tome decisoes em cima deles, o que você acha?