// Vale de Aldren — conteúdo narrativo
//
// Há muito tempo, um povo chamado Veladores viveu neste vale. Construíam para olhar: torres, escadas que
// não levam a lugar nenhum, círculos de pedra, relógios de sol. Um dia foram embora, sem guerra e sem
// despedida. Ficaram as pedras e os gigantes, que, dizem, são Veladores que sentaram para ver algo bonito
// e esqueceram de levantar.
//
// O fio das oito lembranças (o jogador monta na ordem que achar):
//   Teo e Ilsa se conhecem crianças no lago (ela guarda uma pedra furada), amarram o mesmo pedido na árvore
//   aos dezessete, discutem na escada na véspera da partida: ela decide ficar. No mirante, na manhã da
//   partida, Ilsa vê o povo ir embora e fica "só mais um pouco" (é a gigante do monte). Sela, irmã dela, é
//   aprendiz do velho mestre Auren (a torre). Auren ensina as crianças a olhar o céu (o círculo), entre elas
//   uma menina elfa recém-chegada, a Dessa: a própria Odessa, criança. Teo pede à Dessa que cuide do jardim
//   dos relógios "até a gente voltar" (por isso ela está aqui há seiscentos anos). Muitos anos depois, Teo
//   volta velho, esculpe o rosto de Ilsa sorrindo entre as flores e vai até o lago "jogar uma pedra" (é o
//   gigante do lago, de mão erguida).
//
// Lia tem 24 anos, é de Ancoradouro, no litoral. O pai desenhava estradas para a Coroa e morreu há dois
// invernos; ela carrega a bússola dele (a agulha puxa para o leste) e aceita todo trabalho que fique longe.
// Deve uma carta à mãe faz um ano. O passado dela aparece aos poucos, nas conversas com quem fica amigo dela.
//
// Cada fala dublada tem um id. As vozes são geradas em a/vox/<id>.mp3 (ver tools/voice). Uma fala cujo texto
// ou voz mudou depois da gravação aparece só como legenda até ser dublada de novo (o jogo confere o texto).

export const CAST = {
  lia: { name: 'Lia', role: 'Cartógrafa' },
  odessa: { name: 'Odessa', role: 'Maga do observatório' },
  anselmo: { name: 'Seu Anselmo', role: 'Pastor' },
  celeste: { name: 'Celeste', role: 'Padeira' },
  tome: { name: 'Tomé', role: 'Menino da vila' },
  irene: { name: 'Irene', role: 'Herbalista e pintora' },
  bastiao: { name: 'Bastião', role: 'Carpinteiro' },
  marta: { name: 'Dona Marta', role: 'Peixeira, dona da taberna' },
  joca: { name: 'Joca', role: 'Construtor de barcos' },
  tiao: { name: 'Tião', role: 'Pescador' },
  nina: { name: 'Nina', role: 'Menina da praia' },
  davi: { name: 'Seu Davi', role: 'Faroleiro' },
  alva: { name: 'Vésper', role: 'Dragoa dos Veladores' },
  // as pessoas das lembranças (voice: timbre usado na dublagem)
  teo_m: { name: 'Teo', role: 'Lembrança', voice: 'teo_m' },
  ilsa_m: { name: 'Ilsa', role: 'Lembrança', voice: 'ilsa_m' },
  teo: { name: 'Teo', role: 'Lembrança', voice: 'eco_m' },
  ilsa: { name: 'Ilsa', role: 'Lembrança', voice: 'eco_f' },
  teo_v: { name: 'Teo', role: 'Lembrança', voice: 'teo_v' },
  auren: { name: 'Mestre Auren', role: 'Lembrança', voice: 'auren' },
  sela: { name: 'Sela', role: 'Lembrança', voice: 'sela' },
  sela_m: { name: 'Sela', role: 'Lembrança', voice: 'sela_m' },
  dessa: { name: 'Dessa', role: 'Lembrança', voice: 'dessa' },
  avo: { name: 'Uma voz, de longe', role: 'Lembrança', voice: 'avo' },
  eco_m: { name: 'Um Velador', role: 'Lembrança' },
  eco_f: { name: 'Uma Veladora', role: 'Lembrança' },
  narrador: { name: '', role: '' },
};
export const voiceOf = (sp) => (CAST[sp] && CAST[sp].voice) || sp;

// id -> [speaker, text, emotion]
export const LINES = {
  // ---------------- abertura ----------------
  intro1: ['narrador', 'Dizem que no vale de Aldren nada se perde. Só muda de lugar.', 'tender'],
  intro2: ['narrador', 'Há muito tempo, viveu aqui um povo que construía para olhar. Torres, escadas, círculos de pedra. Chamavam a si mesmos de Veladores.', 'neutral'],
  intro3: ['narrador', 'Um dia, foram embora. Ninguém sabe para onde. Deixaram as pedras, os gigantes... e uma pergunta.', 'tender'],
  carta: ['odessa', 'Cartógrafa. Que bom que aceitou. Não preciso de um mapa de estradas, essas eu já conheço. Preciso de um mapa do que importa. Me procure no observatório, no alto da colina, depois da vila. E traga sapatos confortáveis. Odessa.', 'tired'],
  chegada: ['lia', 'Então este é o vale de Aldren. É mais quieto do que eu imaginava. Do jeito bom.', 'tender'],
  li_bussola: ['lia', 'A bússola do meu pai continua puxando pro leste. Ele dizia que era defeito. Eu acho que é teimosia. Igual a ele.', 'tender'],

  // ---------------- Odessa ----------------
  od_first: ['odessa', 'Ah. Você veio a pé. Eu tinha certeza de que ia chegar amanhã. Ou daqui a dez anos. Eu me confundo com essas coisas.', 'tired'],
  od_quem: ['odessa', 'Sou. Faz seiscentos anos que moro neste vale, e ainda não entendi ele direito. Por isso chamei você.', 'neutral'],
  od_mapa: ['odessa', 'Um mapa dos lugares onde alguém foi feliz. Os Veladores deixaram oito. Eu sinto eles, mas já não consigo ver. Meus olhos ficaram cansados de tanto olhar a mesma coisa.', 'tender'],
  od_como: ['odessa', 'Vá até eles e fique. Sente, espere, olhe. Quando um lugar percebe que está sendo olhado com calma, ele lembra. Nós chamamos isso de lume. Desenhe no seu caderno o que você vir.', 'neutral'],
  od_hora: ['odessa', 'Ah, e cada lugar tem a sua hora. O lago gosta de manhã cedo, a escada gosta do fim do dia... O jardim dos relógios, então, é um chato. Se chegar fora de hora, sente e deixe o tempo passar.', 'happy'],
  od_depois: ['odessa', 'Depois volte e me conte. Sem pressa. A pressa espanta os lumes. Espanta os gatos também.', 'happy'],
  od_n2: ['odessa', 'Nos meus primeiros cem anos aqui, eu colecionava feitiços inúteis. Um que deixa o chá sempre morno. Um que acha botões perdidos. Todo mundo achava bobagem. Eu também. Mas eram os que eu mais usava.', 'happy'],
  od_n3: ['odessa', 'Pensei uma coisa ontem, olhando o céu. Para mim, vocês humanos são como estrelas cadentes. Passam rápido demais. E eu passei séculos olhando para o chão, estudando pedra.', 'sad'],
  od_n4: ['odessa', 'Está quase. Engraçado... e se o mapa ficar pronto e eu não sentir nada? Seiscentos anos é muito tempo para esperar uma resposta.', 'tired'],
  od_todos: ['odessa', 'Oito lugares. Você viu coisas que eu nunca vi. Hoje à noite passa a Chuva de Lumes. Acontece uma vez a cada cem anos. Suba até o observatório depois que escurecer. Eu espero você.', 'excited'],
  od_noite: ['odessa', 'Ainda está claro. Os lumes são tímidos. Volte quando as estrelas aparecerem.', 'neutral'],
  od_pos1: ['odessa', 'Estou tentando aprender o nome de todo mundo da vila. Comecei pela padeira. Celeste. Viu? Já sei um.', 'happy'],
  od_pos2: ['odessa', 'Fique o tempo que quiser. O mapa está pronto, mas o vale não. O vale nunca fica pronto.', 'tender'],
  od_cha: ['odessa', 'Quer chá? Está morno. Está sempre morno. Esse é o feitiço.', 'happy'],
  // o que a Odessa conta depois de cada lembrança (uma vez cada, na ordem em que a Lia encontra)
  od_r_lago: ['odessa', 'Dois meninos jogando pedra no lago... O Teo e a Ilsa. Eu conheci os dois. Não me olhe assim. Eu sou velha, não sou mentirosa.', 'tender'],
  od_r_arvore: ['odessa', 'A fita com a pedra furada ainda está lá? ... Hum. Eu vivia dizendo pra Ilsa que pedra furada não dá sorte nenhuma. Ela respondia que dava, sim. Pra quem tem paciência.', 'tender'],
  od_r_circulo: ['odessa', 'Então você me viu. A menina emburrada que queria feitiço de verdade. ... É. Era eu. O mestre Auren me chamava de Dessa. Ninguém mais chama.', 'sad'],
  od_r_torre: ['odessa', 'O Auren subia naquela torre toda tarde, com rachadura e tudo. Eu achava teimosia. Hoje eu subo esta colina toda noite. Como é que chama, quando é a gente?', 'happy'],
  od_r_relogios: ['odessa', 'Quatro e meia. ... O Teo me pediu pra cuidar do jardim até eles voltarem. Eu achei que era até a primavera. Já faz seiscentas primaveras. Eu tiro o musgo das sombras até hoje. Ninguém nunca repara.', 'tender'],
  od_r_escada: ['odessa', 'A Ilsa passou a noite no último degrau. O Teo, no primeiro. Eu vi os dois daqui, com a luneta. Não fiz nada. Tinha nove anos de elfa, o que eu ia fazer? ... Às vezes ainda acho que devia ter feito.', 'sad'],
  od_r_monte: ['odessa', 'A gigante do monte... Os mais velhos da vila chamam de "a Moça". Eu nunca contei o nome dela pra ninguém. Parecia uma coisa dela, não minha.', 'tender'],
  od_r_rosto: ['odessa', 'Ele voltou, sim. Velho, sozinho, com um cinzel e um saco de pão duro. Esculpiu o rosto dela e disse que ia até o lago jogar uma pedra. ... Eu esquentei o jantar duas vezes.', 'sad'],
  // o passado da Lia (depois de alguma amizade)
  od_lia1: ['odessa', 'Posso perguntar uma coisa? É curiosidade de gente velha. Por que uma cartógrafa tão nova aceita a carta de uma maga que ela nunca viu?', 'neutral'],
  li_od_longe: ['lia', 'Porque era longe. Desde que o meu pai morreu, eu aceito tudo o que fica longe.', 'sad'],
  od_lia2: ['odessa', 'Hum. Eu fiz isso por uns duzentos anos. Funciona. Até o dia em que não funciona mais.', 'tender'],
  li_od_mapa: ['lia', 'Meu pai desenhava estradas. Eu queria desenhar uma coisa que ele nunca desenhou.', 'tender'],
  od_lia3: ['odessa', 'Então desenhe devagar. Ele ia gostar de ver.', 'tender'],
  od_carta: ['odessa', 'Do Davi? Ele ainda escreve à mão. Bom. Diga a ele que... Não. Espere aqui um instante.', 'tender'],
  od_resposta: ['odessa', 'Pronto. Leve isto pra ele. E diga que hoje à noite... Não diga nada. Ele vai ver.', 'happy'],
  od_alva: ['odessa', 'A sombra no céu? É a Vésper. A última dragoa dos Veladores. Tem o nome da estrela da tarde. Mora lá no alto, perto da gigante do monte. Se você chegar devagar, ela deixa você chegar perto. Se chegar correndo, ela vai embora e só volta daqui a um ano.', 'tender'],
  od_fita: ['odessa', 'Você refez o nó da fita da Ilsa? ... Obrigada. Eu nunca tive coragem de encostar nela.', 'tender'],

  // ---------------- Seu Anselmo (fala devagar, conta história, perde o fio) ----------------
  an_first: ['anselmo', 'Boa tarde, moça. Você é a que veio fazer o mapa da Odessa? Hum. Ela começa um mapa desses a cada século. Nunca termina. Diz que o vale muda enquanto ela desenha.', 'happy'],
  an_gigantes: ['anselmo', 'Conheço desde menino. Meu avô dizia que eles não são estátuas. São gente que sentou para ver alguma coisa bonita... e gostou tanto que esqueceu de levantar.', 'tender'],
  an_veladores: ['anselmo', 'Acho que não aconteceu nada. Às vezes as pessoas só vão embora. Não precisa ser tragédia. As ovelhas também mudam de pasto, e ninguém faz poema por isso.', 'neutral'],
  an_c1: ['anselmo', 'Sabe por que eu gosto de pastorear? Ovelha não tem pressa. Com elas a gente aprende o tamanho certo do dia.', 'tender'],
  an_c2: ['anselmo', 'Quando o vento vira e cheira a chuva, olhe para a gigante do monte. Ela sempre fica com uma nuvem no ombro.', 'neutral'],
  an_c3: ['anselmo', 'Meu avô tinha uma cabra chamada Duquesa. Ou era a minha avó que chamava Duquesa? ... Enfim. A cabra subia no gigante do lago todo verão. Ninguém nunca descobriu como ela descia.', 'happy'],
  an_noite: ['anselmo', 'Já é noite? Hum. Nessa idade a gente conta estrela para dormir. Eu nunca passo das trinta.', 'tired'],
  an_c4: ['anselmo', 'Você foi até a Maré? A Marta fala por três, mas o peixe dela vale por quatro.', 'happy'],
  an_c5: ['anselmo', 'Quando eu era moço, desci até o mar com as ovelhas. Elas olharam a água um tempão e voltaram. Ovelha é bicho sábio.', 'tender'],
  an_r_monte: ['anselmo', 'Subiu no monte, foi? A gente chama aquela lá de "a Moça". Minha avó deixava um pão no pé dela todo dia de colheita. Dizia que moça que fica pra trás sente fome.', 'tender'],
  an_r_lago: ['anselmo', 'Pedra pulando no lago? Hum. Meu recorde é onze. ... Tá, nove. Tá bom, eram seis. Mas o lago tava agitado naquele dia.', 'happy'],
  an_lia1: ['anselmo', 'E você, moça? É de onde? Tem cara de quem veio de longe e ainda não chegou direito.', 'neutral'],
  li_an1: ['lia', 'De Ancoradouro, no litoral. Minha mãe tem uma papelaria lá. Meu pai desenhava estradas pra Coroa. Passava meses fora.', 'neutral'],
  an_lia2: ['anselmo', 'Hum. Estrada é coisa boa. Mas tem gente que conhece todas e não acha a de casa. ... Não falo do seu pai, não. Falo de mim, quando era moço.', 'tender'],

  // ---------------- Celeste (rápida, mandona, carinhosa, sempre comida) ----------------
  ce_first: ['celeste', 'Ah! Gente nova! Entra, entra, que o pão acabou de sair. Você é a moça do mapa? A Odessa encomendou pão para você. Três por dia, ela disse. Eu disse que ninguém come três pães por dia. Ela disse que cartógrafo anda muito.', 'excited'],
  ce_odessa: ['celeste', 'A Odessa? Vem aqui uma vez por ano, se tanto. Fica parada na porta sentindo o cheiro e vai embora sem comprar nada. Ano passado eu dei um pão para ela. Ficou olhando para o pão como se fosse um livro!', 'happy'],
  ce_ruinas: ['celeste', 'Eu acho que eles eram padeiros. É sério! Quem mais acorda antes do sol para olhar o céu? Toda aquela gente de torre e escada... tinha fome de alguma coisa, isso eu garanto.', 'happy'],
  ce_c1: ['celeste', 'Prova esse. Não, esse não, esse queimou. Esse aqui. ... Viu? Leva dois. A subida pro observatório é comprida e a Odessa só oferece chá morno.', 'happy'],
  ce_c2: ['celeste', 'Meu marido construía barcos. Faz seis invernos que ele se foi. Eu ainda faço pão para dois. O que sobra eu dou para os passarinhos. Eles agradecem do jeito deles.', 'sad'],
  ce_c3: ['celeste', 'O Tomé passou aqui correndo de novo. Aquele menino acha que vai acordar os gigantes. Deixa ele. Alguém tem que tentar.', 'happy'],
  ce_noite: ['celeste', 'O forno já esfriou, querida. Volta amanhã cedo, que tem pão de mel.', 'tired'],
  ce_cesta: ['celeste', 'Você vai pros lados do mar? Então leva este pão pra Marta, da taberna da Maré. A gente troca pão por peixe desde antes de você nascer.', 'happy'],
  ce_peixe: ['celeste', 'Peixe da Marta! Ela sempre manda o melhor. Sabia que foi ela que me ensinou a fazer pão de sal? Obrigada, querida. Volta amanhã que eu guardo um pra você.', 'excited'],
  ce_barco: ['celeste', 'Você velejou o barco do Elias? ... Que bom. Ele ia gostar de saber que alguém ainda leva ele pra ver o mar.', 'sad'],
  ce_c4: ['celeste', 'A Marta e eu trocamos pão por peixe faz trinta anos. Nunca anotamos nada. Ela jura que eu devo dois peixes. Eu juro que ela me deve um pedido de desculpas desde o casamento dela.', 'happy'],
  ce_r_relogios: ['celeste', 'Um relógio pra hora mais feliz? O meu marcava cinco da manhã. Forno quente, vila dormindo, o Elias roncando lá dentro. ... Não conta pra ninguém que eu disse isso.', 'tender'],
  ce_lia1: ['celeste', 'Você tá comendo direito, menina? E a sua mãe, sabe que você tá aqui no fim do mundo?', 'neutral'],
  li_ce1: ['lia', 'Mais ou menos. Faz um ano que eu não escrevo pra ela. Toda vez que eu começo, não sei o que dizer.', 'sad'],
  ce_lia2: ['celeste', 'Ah, querida. Escreve o que você comeu. Mãe só quer saber disso. O resto ela adivinha.', 'tender'],
  ce_lia3: ['celeste', 'Tá bom, tá bom, não pergunto mais. Mas da próxima vez que for pra casa, leva um pão. Pão fala por você.', 'tender'],

  // ---------------- Tomé (criança: exagera, emenda tudo) ----------------
  to_first: ['tome', 'Você é cartógrafa? De verdade? Então você sabe onde fica tudo! Me diz: onde os gigantes guardam os sonhos deles?', 'excited'],
  to_naosei: ['tome', 'Ah. Tudo bem. Eu acho que é na barriga. Por isso eles ficam sentados.', 'happy'],
  to_porque: ['tome', 'Porque eu quero acordar eles! Todo dia eu grito bom dia para o gigante do lago. Um dia ele vai responder. A tia Celeste diz que paciência é a magia mais forte. Mas é a mais chata também.', 'excited'],
  to_c1: ['tome', 'Sabia que se você deitar na grama e olhar as nuvens, parece que é a terra que está andando?', 'excited'],
  to_c2: ['tome', 'Eu achei uma pedra com um desenho de estrela! Escondi. Não vou contar onde. Tá bom, é perto do círculo de pedras. Mas não conta para ninguém!', 'happy'],
  to_c3: ['tome', 'Quando eu crescer eu vou ser Velador. Vou construir uma escada até a lua. Mas com corrimão.', 'happy'],
  to_pos: ['tome', 'Você viu? Os lumes subiram! Eu falei que os gigantes estavam acordados por dentro!', 'excited'],
  to_nina: ['tome', 'Você vai pro mar? Lá mora a Nina. Ela diz que já viu uma baleia. Eu acho que é mentira. Entrega este desenho pra ela? É um gigante. Pra ela ver que aqui também tem coisa grande.', 'excited'],
  to_concha: ['tome', 'Dá pra ouvir o mar mesmo! Ou é o meu ouvido? Tanto faz. Vou guardar debaixo do travesseiro.', 'excited'],
  to_c4: ['tome', 'A Nina viu uma baleia. Eu vi um gigante. Empate.', 'happy'],
  to_r_lago: ['tome', 'Você viu os Veladores jogando pedra no lago? Me ensina! Eu só consigo fazer a pedra afundar. Com estilo, mas afundar.', 'excited'],
  to_r_pulos: ['tome', 'A tia Celeste falou que você fez a pedra pular um montão de vezes! Amanhã eu vou lá e bato o seu recorde. Ou empato. Ou pelo menos molho o pé.', 'excited'],
  to_lia1: ['tome', 'Você tem pai? O meu foi pro mar e voltou com uma tatuagem de peixe. Era pra ser uma baleia.', 'happy'],
  li_to1: ['lia', 'Tinha. Ele desenhava mapas. Foi ele que me ensinou.', 'tender'],
  to_lia2: ['tome', 'Ah. ... Desculpa. Quer ver a minha pedra de estrela? Não, eu não vou mostrar. Mas você pode imaginar ela. Ela é muito bonita.', 'tender'],

  // ---------------- Irene (hesitante, se corrige o tempo todo) ----------------
  ir_first: ['irene', 'Ah, desculpa, não vi você chegar. Estou tentando pintar a luz em cima do lago. É impossível. Quando eu acerto a cor, a luz já mudou.', 'tender'],
  ir_porque: ['irene', 'Porque a parte boa não é o quadro. É a meia hora olhando. O quadro é só a desculpa que eu dou para os outros.', 'tender'],
  ir_ver: ['irene', 'Pode. Está horrível. Mas olha este canto aqui... o reflexo. Por um segundo, eu acertei.', 'happy'],
  ir_c1: ['irene', 'Os Veladores pintavam? Eu acho que sim. Ninguém constrói uma escada para o céu sem ter vontade de desenhar ele antes.', 'tender'],
  ir_c2: ['irene', 'Já reparou que à noite o lago vira outro céu? Às vezes eu não sei em qual dos dois as estrelas estão de verdade.', 'tender'],
  ir_c3: ['irene', 'Colho camomila de manhã, pinto à tarde, durmo cedo. As pessoas acham pouco. Eu acho que é o suficiente.', 'neutral'],
  ir_c4: ['irene', 'Tentei pintar o mar uma vez. Usei todo o azul que eu tinha e ainda faltou.', 'happy'],
  ir_r_lago: ['irene', 'Você viu alguma coisa no lago, não viu? Dá pra ver na sua cara. Eu pinto ali faz três anos e nunca vi nada. Acho que eu... falo demais com a tela. Ou de menos. Não sei.', 'tender'],
  ir_lia1: ['irene', 'Você desenha, né? Quer dizer... claro que desenha, você é cartógrafa. Que pergunta. Desculpa.', 'neutral'],
  li_ir1: ['lia', 'Quando eu era pequena, meu pai fazia os mapas e eu desenhava nas margens. Bichos, gente pequenininha, casas com fumaça. Ele deixava. Depois eu parei.', 'tender'],
  ir_lia2: ['irene', 'Por quê? ... Não, desculpa, não precisa responder. É que as margens são a melhor parte. Eu acho. Talvez. Enfim. Volta a desenhar nelas.', 'tender'],

  // ---------------- Bastião (seco, frase curta) ----------------
  ba_first: ['bastiao', 'Hum. Visita. Se veio pedir conserto, entra na fila. A fila é o vale inteiro.', 'neutral'],
  ba_conhecer: ['bastiao', 'Hum. Então tá. Bastião. Carpinteiro. Conserto o que quebra. Que é tudo, com o tempo.', 'neutral'],
  ba_ponte: ['bastiao', 'Uma ponte. Os Veladores fizeram uma de pedra, ali no riacho seco. Caiu faz trezentos anos. Ninguém precisa dela, o riacho nem tem água. Mas uma ponte caída parece uma frase pela metade. Me incomoda.', 'neutral'],
  ba_c1: ['bastiao', 'Serrote. Martelo. Paciência. Nessa ordem.', 'neutral'],
  ba_c2: ['bastiao', 'A Odessa me pediu uma estante nova. Para quê, eu perguntei. Para guardar o que eu ainda não li, ela disse. Vai precisar de mil estantes.', 'happy'],
  ba_c3: ['bastiao', 'Os Veladores cortavam pedra como eu nunca vi. Nenhuma junta torta. Mas a escada deles não leva a lugar nenhum. Bons de mão, ruins de plano. Igual a mim.', 'happy'],
  ba_c4: ['bastiao', 'Cimbre montado. Falta pedra, tempo e coragem. Pedra tem.', 'neutral'],
  ba_c5: ['bastiao', 'O Joca pediu carvalho. Pra barco. Barco e ponte... levam pro outro lado. Só isso.', 'neutral'],
  ba_r_escada: ['bastiao', 'Você foi na escada. Viu os degraus? Gastos no meio. Alguém subiu muito ali. Muito.', 'neutral'],
  ba_quase: ['bastiao', 'Faltam três pedras. Quando você terminar esse seu mapa, eu termino a minha frase.', 'neutral'],
  ba_pronta: ['bastiao', 'Pronta. Não serve pra nada. ... Ficou bonita.', 'happy'],
  ba_lia1: ['bastiao', 'Cartógrafa. ... Seu pai também?', 'neutral'],
  li_ba1: ['lia', 'Ele desenhava estradas. E sabia de cor onde cada ponte tinha caído.', 'tender'],
  ba_lia2: ['bastiao', 'Hum. Então ele ia gostar da minha.', 'tender'],

  // ---------------- lembranças ----------------
  // O lago (crianças)
  lago1: ['teo_m', 'Ilsa! Olha essa. Essa vai longe.', 'excited'],
  lago2: ['ilsa_m', 'Você disse isso das últimas nove.', 'happy'],
  lago3: ['teo_m', 'Conta. Conta em voz alta.', 'excited'],
  lago4: ['ilsa_m', 'Um... dois... três, quatro, cinco... seis... sete! Sete, Teo!', 'excited'],
  lago5: ['teo_m', 'Sete! Viu? Eu falei!', 'excited'],
  lago6: ['ilsa_m', 'E afundou do mesmo jeito.', 'happy'],
  lago7: ['teo_m', 'Mas antes ela voou. Isso conta.', 'happy'],
  lago8: ['avo', 'Ilsaaa! O pão!', 'neutral'],
  lago9: ['ilsa_m', 'Já vou! ... Me dá uma pedra. Não, essa não. Aquela ali, a furada.', 'happy'],
  lago10: ['teo_m', 'Essa é feia. Não pula.', 'neutral'],
  lago11: ['ilsa_m', 'Não é pra jogar. É pra guardar.', 'tender'],
  lago_r: ['lia', 'Talvez seja isso que o gigante segura com a mão erguida. Não o céu. Uma pedra que ainda não afundou.', 'tender'],
  lago_r2: ['lia', 'O gigante do lago está de mão erguida. Como quem vai jogar uma pedra.', 'tender'],
  // A árvore (dezessete anos)
  arvore1: ['teo', 'Pronto. Amarrei a minha. Agora você.', 'happy'],
  arvore2: ['ilsa', 'Vira pra lá.', 'neutral'],
  arvore3: ['teo', 'Por quê?', 'surprised'],
  arvore4: ['ilsa', 'Porque eu vou amarrar a pedra junto, e você vai rir.', 'happy'],
  arvore5: ['teo', 'A pedra furada? Você ainda tem aquilo?', 'surprised'],
  arvore6: ['ilsa', 'Tá vendo? Riu.', 'happy'],
  arvore7: ['teo', 'Não ri. ... Tá, ri um pouco. O que você pediu?', 'happy'],
  arvore8: ['ilsa', 'Não se conta. Senão não vale.', 'happy'],
  arvore9: ['teo', 'Então eu conto o meu, e o meu não vale. Pedi pra gente lembrar deste dia.', 'tender'],
  arvore10: ['ilsa', 'Bobo. Era o mesmo pedido.', 'tender'],
  arvore_r: ['lia', 'Uma fita com uma pedra furada. Ainda está lá, no galho mais baixo.', 'tender'],
  // O círculo (noite)
  circ1: ['auren', 'Deitem. Todo mundo. Dessa, você também.', 'tender'],
  circ2: ['dessa', 'Eu vim aprender feitiço. Feitiço de verdade. Não deitar na grama.', 'neutral'],
  circ3: ['sela_m', 'Ela tá com medo de formiga.', 'happy'],
  circ4: ['dessa', 'Não tô!', 'surprised'],
  circ5: ['auren', 'Olhem aquela. A vermelha, baixinha. Se cada estrela é um sol, alguém lá também está deitado na grama, olhando pra cá.', 'tender'],
  circ6: ['dessa', 'E deve achar a gente pequeno.', 'neutral'],
  circ7: ['auren', 'Ou bonito. Depende de quanto tempo ele olhar. ... Agora estendam a mão. Assim. E soprem devagar.', 'tender'],
  circ8: ['sela_m', 'Subiu! A luzinha subiu!', 'excited'],
  circ9: ['dessa', 'Pra que serve isso?', 'neutral'],
  circ10: ['auren', 'Pra nada. É o melhor feitiço que eu sei.', 'happy'],
  circ_r: ['lia', 'Ele chamou a menina de Dessa.', 'surprised'],
  // A torre (outono)
  torre1: ['sela', 'Mestre. A rachadura cresceu de novo. Já dá pra passar a mão por dentro.', 'sad'],
  torre2: ['auren', 'Eu sei. Eu passo a mão todo dia. É como cumprimentar um amigo.', 'tired'],
  torre3: ['sela', 'A torre não aguenta outro inverno.', 'sad'],
  torre4: ['auren', 'Eu também não, provavelmente. Somos dois.', 'happy'],
  torre5: ['sela', 'Não brinca com isso. ... A partida é na primavera. Todo mundo já está arrumando as coisas.', 'sad'],
  torre6: ['auren', 'E a sua irmã?', 'neutral'],
  torre7: ['sela', 'A Ilsa diz que não vai. Diz que ainda não terminou de olhar.', 'sad'],
  torre8: ['auren', 'Então ela é a melhor aluna que eu já tive. ... Me ajuda a subir? Daqui a pouco o sol encosta na montanha.', 'tender'],
  torre9: ['sela', 'E quando a torre cair?', 'surprised'],
  torre10: ['auren', 'Eu sento no chão e olho daqui. O céu não muda por causa de uma torre.', 'tender'],
  torre_r: ['lia', 'A Ilsa tinha uma irmã. E não foi com ela.', 'tender'],
  // O mirante (manhã da partida)
  monte1: ['ilsa', 'Daqui eu vejo a estrada inteira. As carroças parecem formiga.', 'tender'],
  monte2: ['ilsa', 'A Sela vai na terceira. Dá pra ver o lenço amarelo. ... Ela não olhou pra trás. Ela nunca olha. Eu é que olho por nós duas.', 'sad'],
  monte3: ['ilsa', 'E o Teo vai a pé, atrás de todo mundo. Devagar. Eu sabia que ia ser devagar.', 'tender'],
  monte4: ['ilsa', '... Ele parou. Tá olhando pra cá.', 'surprised'],
  monte5: ['ilsa', 'Eu não vou acenar. Se eu acenar, ele volta. E se ele voltar, eu vou.', 'sad'],
  monte6: ['ilsa', 'Hoje eu fico mais um pouco. Só mais um pouco.', 'tender'],
  monte_r: ['lia', 'Só mais um pouco. Talvez seja assim que alguém vira pedra. Não de tristeza. De vontade de ficar.', 'tender'],
  // O jardim dos relógios (alguns dias antes da partida)
  rel1: ['dessa', 'Esses relógios estão todos errados. Aquele marca nove. Aquele marca meio-dia. Aquele ali nem tem sombra.', 'neutral'],
  rel2: ['teo', 'Não estão errados. Cada um marca a hora mais feliz de alguém.', 'tender'],
  rel3: ['dessa', 'Então isso não é um relógio. É uma lembrança presa num prego.', 'neutral'],
  rel4: ['teo', '... É. É exatamente isso.', 'happy'],
  rel5: ['dessa', 'E o seu?', 'neutral'],
  rel6: ['teo', 'Este aqui. Quatro e meia da tarde. A gente voltava do lago, ela tropeçou na beira do poço, molhou o vestido inteiro... e riu. Foi a primeira vez que eu ouvi ela rir.', 'tender'],
  rel7: ['dessa', 'A Ilsa? Ela ri de tudo.', 'surprised'],
  rel8: ['teo', 'Agora ri. ... Dessa, quando a gente for embora, você cuida do jardim? Tira o musgo das sombras. Só isso.', 'tender'],
  rel9: ['dessa', 'Até quando?', 'neutral'],
  rel10: ['teo', 'Até a gente voltar.', 'tender'],
  rel_r: ['lia', 'Se eu tivesse um relógio desses, que hora ele marcaria? Ainda não sei. E acho que está tudo bem não saber ainda.', 'tender'],
  // A escada (véspera da partida)
  escada1: ['teo', 'Desce, Ilsa. Por favor. A gente precisa conversar.', 'sad'],
  escada2: ['ilsa', 'Sobe você. Daqui de cima dá pra conversar melhor.', 'tender'],
  escada3: ['teo', 'Ela não leva a lugar nenhum, essa escada. Você sabe.', 'neutral'],
  escada4: ['ilsa', 'Leva até o último degrau.', 'happy'],
  escada5: ['teo', 'E depois?', 'surprised'],
  escada6: ['ilsa', 'Depois eu olho. É pra isso que serve uma escada.', 'tender'],
  escada7: ['teo', 'Vem com a gente amanhã. Eu carrego as suas coisas. Eu carrego você, se precisar.', 'sad'],
  escada8: ['ilsa', 'Eu sei que carrega. É por isso que eu não posso ir.', 'sad'],
  escada9: ['teo', 'Isso não faz sentido nenhum.', 'sad'],
  escada10: ['ilsa', 'Faz, sim. Só que daqui de cima.', 'tender'],
  escada_r: ['lia', 'Ele não subiu.', 'sad'],
  // O rosto entre as flores (muitos anos depois)
  rosto1: ['dessa', 'Você voltou.', 'surprised'],
  rosto2: ['teo_v', 'Voltei. Os joelhos não, mas eu sim.', 'happy'],
  rosto3: ['dessa', 'E os outros?', 'neutral'],
  rosto4: ['teo_v', 'Estão bem. Longe, olhando outras coisas. Mandaram lembranças. ... Mentira, não mandaram. Mas iam mandar.', 'happy'],
  rosto5: ['dessa', 'Você esculpiu ela sorrindo.', 'tender'],
  rosto6: ['teo_v', 'Ela sorria muito. Quer dizer... depois dos dez anos.', 'tender'],
  rosto7: ['dessa', 'E se um dia ninguém mais souber quem ela era?', 'sad'],
  rosto8: ['teo_v', 'Então vai ser só um rosto sorrindo no meio das flores. Também não é um jeito ruim de ser lembrada.', 'tender'],
  rosto9: ['teo_v', 'Vou até o lago. Jogar uma pedra.', 'tender'],
  rosto10: ['dessa', 'Volta pro jantar.', 'tender'],
  rosto_r: ['lia', 'Ninguém sabe de quem é este rosto. Mesmo assim, ele faz a gente sorrir de volta. Talvez seja o bastante.', 'tender'],
  rosto_r2: ['lia', 'É a Ilsa. Ele esculpiu a Ilsa.', 'tender'],
  // esperando a hora certa de cada lugar
  li_circ_dia: ['lia', 'Acho que este lugar precisa das estrelas. Vou esperar a noite.', 'neutral'],
  li_hora_lago: ['lia', 'A névoa já foi embora. Acho que este lugar lembra melhor de manhã cedo.', 'neutral'],
  li_hora_torre: ['lia', 'Este lugar parece pedir o fim da tarde. Vou esperar o sol baixar.', 'neutral'],
  li_hora_monte: ['lia', 'Daqui de cima, a vista é de manhã. Vou esperar o dia nascer.', 'neutral'],
  li_hora_arvore: ['lia', 'As fitas ficam mais bonitas com sol da tarde. Vou esperar um pouco.', 'neutral'],
  li_hora_rel: ['lia', 'Relógio de sol fora de hora não marca nada. Vou esperar a tarde.', 'neutral'],
  li_hora_escada: ['lia', 'Esta escada pede o entardecer. Vou ficar aqui até lá.', 'neutral'],
  li_hora_rosto: ['lia', 'As flores estão fechadas. Melhor esperar o dia.', 'neutral'],

  // ---------------- final: a Chuva de Lumes ----------------
  fim1: ['odessa', 'Chegou. Olhe para cima.', 'tender'],
  fim2: ['odessa', 'Seiscentos anos eu procurei os Veladores nas pedras. E eles estavam nas coisas pequenas. Numa pedra que pula na água. Num pedido amarrado numa fita. Numa escada que não leva a lugar nenhum.', 'tender'],
  fim_dessa: ['odessa', 'O Teo me pediu pra cuidar do jardim até eles voltarem. Eu tinha nove anos de elfa. Achei que era até a primavera.', 'tender'],
  fim3: ['lia', 'Você ficou esperando eles esse tempo todo?', 'tender'],
  fim4b: ['odessa', 'No começo, fiquei esperando. Depois fiquei porque gostava. Levei uns trezentos anos pra perceber a diferença.', 'happy'],
  fim5: ['odessa', 'Vou mostrar um feitiço. O único que eles me ensinaram sem querer. Não serve para nada. É o meu preferido.', 'happy'],
  fim6: ['odessa', 'Pronto. Agora o vale inteiro sabe que foi olhado.', 'tender'],
  fim7: ['anselmo', 'Faz oitenta anos que eu não fico acordado até tão tarde.', 'happy'],
  fim8: ['celeste', 'Trouxe pão para todo mundo! Até para você, Odessa. Não adianta fazer essa cara.', 'happy'],
  fim_marta: ['marta', 'Fechei a taberna cedo, olha só. A primeira vez em trinta anos! O Tião quase chorou. Ele ia pedir a sopa.', 'excited'],
  fim_nina: ['nina', 'Isso é a baleia cantando? Não? E se for? Como é que você sabe que não é?', 'excited'],
  fim_davi: ['davi', 'Lá embaixo, o farol está aceso. Hoje eu deixei ele sozinho. Ele que me desculpe. Daqui eu vejo os dois.', 'tender'],
  fim9: ['tome', 'Eu falei! Eu falei que eles estavam acordados!', 'excited'],
  fim_lia: ['lia', 'Lembra do jardim dos relógios? Acho que agora eu sei que hora o meu marcaria.', 'tender'],
  fim_lia2: ['odessa', 'Qual?', 'tender'],
  fim_lia3: ['lia', 'Esta.', 'tender'],
  fim10: ['odessa', 'Obrigada, cartógrafa. Seu mapa está pronto. Mas o vale, não. O vale nunca fica pronto.', 'tender'],
  fim11: ['narrador', 'E assim, no vale de Aldren, nada se perdeu. Só mudou de lugar.', 'tender'],
  li_carta_mae: ['lia', 'Mãe. Hoje eu comi pão de mel, peixe defumado e um bolo que a Celeste jurou que não queimou. Achei um lugar onde as coisas não se perdem. Vou ficar até a primavera. Vem ver.', 'tender'],

  // ---------------- pensamentos de Lia (descobertas e momentos) ----------------
  li_espada: ['lia', 'Uma espada fincada na pedra. Ninguém tirou. Ou ninguém quis tirar. Tem coisas que ficam melhor onde foram deixadas.', 'tender'],
  li_aqueduto: ['lia', 'Um aqueduto que não leva mais água a lugar nenhum. As ovelhas dormem na sombra dos arcos. Ele ainda serve. Só que de outro jeito.', 'tender'],
  li_balanco: ['lia', 'Alguém pendurou este balanço há muito tempo. As cordas já foram trocadas várias vezes. Gerações de crianças cuidando de um balanço.', 'happy'],
  li_ponte: ['lia', 'A ponte dos Veladores, partida no meio. O riacho secou faz séculos. Mesmo assim, o Bastião quer terminar a frase.', 'tender'],
  li_ponte2: ['lia', 'A ponte está inteira. Não leva a lugar nenhum que já não desse pra ir. Atravessei duas vezes, só pra garantir.', 'happy'],
  li_santuario: ['lia', 'Estatuetas no meio da floresta, cobertas de musgo. Alguém deixou flores frescas aqui. Hoje.', 'surprised'],
  li_banco: ['lia', 'Um banco virado para o oeste. Quem colocou ele aqui sabia exatamente onde o sol se põe.', 'tender'],
  li_poco: ['lia', 'Dizem que, numa noite sem vento, dá para ver as estrelas no fundo deste poço. Mesmo de dia.', 'neutral'],
  li_poco2: ['lia', 'O poço onde a Ilsa tropeçou e riu pela primeira vez. A borda ainda está gasta deste lado.', 'tender'],
  li_noite: ['lia', 'Já escureceu. Melhor acender a lanterna.', 'neutral'],
  li_sentar1: ['lia', 'Daqui dá para ouvir o vento passando na grama. Parece o mar.', 'tender'],
  li_sentar2: ['lia', 'Vou ficar mais um pouco. Ninguém está me esperando com pressa.', 'tender'],
  li_sentar3: ['lia', 'As nuvens andam tão devagar. Ou sou eu que finalmente parei.', 'tender'],
  li_sentar4: ['lia', 'Meu pai nunca sentava em lugar nenhum. Dizia que mapa não se faz sentado. Acho que ele estava um pouco errado.', 'tender'],
  li_mapa_cheio: ['lia', 'Oito lugares. O caderno está cheio de gente que eu nunca vou conhecer. E mesmo assim parece que conheço.', 'tender'],
  li_estrela: ['lia', 'Uma estrela cadente. Esqueci de fazer um pedido. Tudo bem. Ver já foi bom.', 'happy'],
  // ---------------- Vila da Maré ----------------
  ma_first: ['marta', 'Olha só, gente nova na Maré! Senta, senta, não repara a bagunça, o Joca deixa serragem até no meu pão. Você é a moça do mapa? A Odessa mandou avisar que você vinha. Quer dizer, mandou avisar há três anos. Mas veio, né? Tá com fome? Claro que tá.', 'excited'],
  ma_odessa: ['marta', 'Todo mundo conhece. Ela desce aqui uma vez por década, compra sal e pergunta se o mar continua no mesmo lugar. Continua, eu digo. Ela sempre parece aliviada.', 'happy'],
  ma_lugar: ['marta', 'É, né? A gente reclama do vento, do sal, do frio, do Joca, da sopa... Mas ninguém vai embora.', 'tender'],
  ma_c1: ['marta', 'Sabia que o Tião pede a mesma sopa faz vinte anos? Vinte! E toda santa vez pergunta o que tem de sopa. Eu digo: a mesma. Ele diz: então eu quero. É o nosso casamento, aquilo. Não conta pra mulher dele.', 'happy'],
  ma_c2: ['marta', 'O Tião pesca, a Nina canta, o Joca martela. E eu conto tudo para todo mundo. Cada um com o seu talento.', 'happy'],
  ma_c3: ['marta', 'Quando o farol acende, eu fecho a taberna. É o Davi dizendo boa noite para a vila inteira.', 'tender'],
  ma_noite: ['marta', 'A taberna já fechou, querida. Mas a porta fica sempre só encostada.', 'tired'],
  ma_pao: ['marta', 'Pão da Celeste! Ainda morno, como é que ela consegue? Toma, leva este peixe defumado pra ela. E diz que o sal é por minha conta, como sempre. E diz que eu não devo dois peixes. Diz que é um. Um e meio.', 'excited'],
  ma_amiga: ['marta', 'Você já é de casa, sabia? Aqui a gente não pergunta de onde a pessoa veio. Pergunta se ela já comeu.', 'tender'],
  ma_voo: ['marta', 'Era você montada naquele bicho? Eu vi! A vila inteira viu! A Nina não para de falar nisso. Muito obrigada, viu? Agora eu é que não durmo.', 'excited'],
  ma_lia1: ['marta', 'E você, hein? Tem namorado? Namorada? Mãe viva? Come direito? Desculpa, eu pergunto tudo de uma vez. O Davi diz que eu faço inventário de gente.', 'happy'],
  li_ma1: ['lia', 'Mãe viva. Longe. A gente não se fala muito.', 'neutral'],
  ma_lia2: ['marta', 'Longe é relativo, querida. A Celeste mora a meio dia daqui e a gente se vê uma vez por mês, trocando pão por peixe e reclamando. Isso é perto. Longe é não escrever.', 'tender'],

  jo_first: ['joca', 'Opa. Cuidado com a serragem. Você é a cartógrafa? Então desenha aí no mapa: aqui mora o melhor construtor de barcos do vale. Que também é o único.', 'happy'],
  jo_casco: ['joca', 'Um barco pro Tião. O dele já é mais remendo do que barco. Este aqui fica pronto na primavera. Ou na outra.', 'neutral'],
  jo_barco: ['joca', 'Aquele, no fim do píer? Era do mestre Elias, marido da Celeste. Ele dizia que barco parado apodrece por dentro. Se quiser, leva pra passear. Só traz de volta inteiro.', 'tender'],
  jo_c1: ['joca', 'Ó, essa tábua aqui: tô curvando ela faz três dias. Ela não quer. Eu também não quero desistir. Vamos ver quem cansa primeiro.', 'happy'],
  jo_c2: ['joca', 'Aprendi tudo com o mestre Elias. Ele conversava com os barcos. Eu achava doideira. Hoje eu converso também.', 'tender'],
  jo_c3: ['joca', 'Vento pelo lado é o melhor. Vento de frente, nem tente: o barco para e a vela fica batendo. Aí é virar um pouco e ir em zigue-zague.', 'neutral'],
  jo_depois: ['joca', 'E aí, velejou? Ela puxa um pouco pra esquerda, né? O mestre dizia que era saudade.', 'happy'],

  ti_first: ['tiao', 'Psiu. Fala baixinho que os peixes escutam. Brincadeira, peixe não escuta nada. Mas eu gosto do silêncio.', 'happy'],
  ti_pesca: ['tiao', 'Hoje? Nada. Ontem também nada. Mas ontem o nada tava mais bonito.', 'happy'],
  ti_nina: ['tiao', 'É sim. Ela coleciona conchas, histórias e perguntas. As perguntas eu não sei responder. As conchas eu ajudo a achar.', 'tender'],
  ti_c1: ['tiao', 'Tem dia que o peixe não vem. Aí eu converso com a boia. Ela não responde. Mas também não reclama da sopa.', 'happy'],
  ti_c2: ['tiao', 'Quando o mar fica liso assim, feito espelho, minha avó dizia que era o céu se olhando.', 'tender'],
  ti_c3: ['tiao', 'Se for velejar, volte antes do farol acender. Não é perigo, não. É que a Marta fica preocupada e fala o dobro.', 'happy'],

  // a Nina só fala perguntando
  ni_first: ['nina', 'Oi! Você veio das montanhas? Lá tem dragão? É verdade que lá em cima neva? Neve tem gosto de quê?', 'excited'],
  ni_dragao: ['nina', 'Tem?! Grande? Maior que o farol? Será que ela me dá carona se eu pedir com educação?', 'excited'],
  ni_baleia: ['nina', 'Você acredita? Uma vez eu ouvi, de noite, deitada no píer. Um som comprido, assim: uuuuuu. O papai disse que era o vento. Vento tem saudade, por acaso?', 'excited'],
  ni_c1: ['nina', 'Sabia que areia é pedra que ficou muito tempo no mar? Então daqui a mil anos o gigante do lago vira praia? E aí dá pra sentar nele?', 'happy'],
  ni_c2: ['nina', 'Quer conhecer a Dona Concha? É a minha favorita. Por que todo mundo ri quando eu falo o nome dela?', 'happy'],
  ni_c3: ['nina', 'Você já deitou na areia de olho fechado? Sentiu a terra respirando? Será que ela sabe que a gente tá em cima dela?', 'tender'],
  ni_desenho: ['nina', 'Um gigante! Foi o Tomé que desenhou? Ele desenha bem, né? Você leva esta concha pra ele? Sabia que encostando no ouvido dá pra ouvir o mar?', 'excited'],
  ni_noite: ['nina', 'Eu devia estar dormindo, né? Mas a lua tá tão grande hoje... Você conta pro papai?', 'tender'],
  ni_voo: ['nina', 'Você voou nela? De verdade? Ela é quente ou gelada? Você ficou com medo? Por que não me levou junto? Da próxima vez você pergunta pra ela se eu posso? Promete?', 'excited'],
  ni_lia1: ['nina', 'Você tem mãe? Ela sabe que você tá aqui?', 'neutral'],
  li_ni1: ['lia', 'Sabe... mais ou menos.', 'neutral'],
  ni_lia2: ['nina', 'Mais ou menos? Como é que alguém sabe mais ou menos? Por que você não conta pra ela direito?', 'surprised'],

  da_first: ['davi', 'Boa tarde. Ou boa noite, daqui a pouco. Sou o Davi, cuido do farol. Quer dizer, o farol se cuida sozinho. Eu só subo para fazer companhia.', 'tender'],
  da_tempo: ['davi', 'Quarenta e dois anos. Nunca vi um navio passar. Mas acendo toda noite. Vai que um dia alguém se perde.', 'tender'],
  da_ve: ['davi', 'O mar inteiro, o vale inteiro. E às vezes uma sombra enorme passando na frente da lua. A Odessa diz que é nuvem. Ela mente muito mal.', 'happy'],
  da_c1: ['davi', 'Sabe o pior de um farol? Ninguém agradece quando dá certo. O barco chega, e pronto. Ninguém sobe aqui pra dizer obrigado à lâmpada.', 'happy'],
  da_c2: ['davi', 'Daqui de noite dá para ver o observatório, sabia? Uma luzinha lá no alto. Eu pisco o farol para ela. Ela nunca pisca de volta.', 'tender'],
  da_c3: ['davi', 'O mar ensina uma coisa: tudo volta. A maré, os barcos, as pessoas. Só demora.', 'tender'],
  da_carta: ['davi', 'Você conhece a Odessa? Velha amiga. Faz quarenta anos que a gente se escreve, e ela leva uns dez para responder. Leva esta carta? Quem sabe ela responde em cinco.', 'happy'],
  da_noite: ['davi', 'Boa noite, cartógrafa. Fica aí embaixo e olha para cima. Daqui a pouco eu pisco para você.', 'tender'],
  da_resposta: ['davi', 'Dela? Já? ... Não em cinco anos. Em cinco dias. Com licença, cartógrafa. Eu vou ler lá em cima, sozinho, como um velho bobo.', 'surprised'],
  da_piscou: ['davi', 'Você viu? Ontem à noite. A luzinha do observatório. Piscou três vezes. Quarenta anos, cartógrafa. Quarenta anos, e ela piscou de volta.', 'tender'],
  da_lia1: ['davi', 'Você escreve cartas, cartógrafa?', 'neutral'],
  li_da1: ['lia', 'Devo uma pra minha mãe. Faz um ano.', 'sad'],
  da_lia2: ['davi', 'Carta devida é a pior dívida. Cresce em silêncio. ... Tome. Papel bom, do meu. Escreva quando quiser. Não precisa ser hoje. Mas não deixe virar quarenta anos.', 'tender'],

  // ---------------- Vésper, a dragoa ----------------
  li_alva_corre: ['lia', 'Ela levantou a cabeça. Acho que eu cheguei rápido demais. Devagar, Lia.', 'surprised'],
  li_alva1: ['lia', 'Ela é enorme. E está me olhando como quem decide se eu sou uma pergunta ou uma resposta.', 'tender'],
  li_alva2: ['lia', 'Ela abaixou a cabeça até o chão. Acho que é um convite.', 'tender'],
  li_voo: ['lia', 'O vale inteiro cabe debaixo das asas dela.', 'excited'],
  li_voo_fim: ['lia', 'Obrigada, Vésper. Eu nunca mais vou olhar para um mapa do mesmo jeito.', 'tender'],

  // ---------------- curiosidades e pequenos momentos ----------------
  li_mar: ['lia', 'O mar. Daqui de cima, o vale parecia um mundo inteiro. Ele termina aqui, na areia, e começa outra coisa.', 'tender'],
  li_barco0: ['lia', 'Um barco bonito, bem cuidado. Melhor perguntar de quem é antes de sair com ele.', 'neutral'],
  li_barco: ['lia', 'O barco do mestre Elias. Puxa um pouco para a esquerda, mesmo. Deve ser saudade.', 'tender'],
  li_cogumelos: ['lia', 'Um círculo perfeito de cogumelos. A Nina diria que é uma porta. O Anselmo diria que choveu. Os dois devem ter razão.', 'tender'],
  li_tronco: ['lia', 'Um tronco oco, cheio de folhas secas. Alguma raposa dorme aqui, dá para sentir o cheiro. Melhor não incomodar.', 'neutral'],
  li_colmeia: ['lia', 'Uma colmeia num toco velho. As abelhas nem ligam para mim. Estão ocupadas demais sendo abelhas.', 'happy'],
  li_ninho: ['lia', 'Três ovos azulados. A mãe deve estar por perto, me olhando de algum galho. Já estou indo, já estou indo.', 'tender'],
  li_amoras: ['lia', 'Amoras maduras. Doces, quentes de sol. Agora as minhas mãos estão roxas, mas valeu a pena.', 'happy'],
  li_estrela_pedra: ['lia', 'Uma estrela gravada na pedra, quase apagada pelo musgo. Igual à do Tomé. Os Veladores marcavam os caminhos que davam para o céu.', 'surprised'],
  li_fonte: ['lia', 'Água brotando da pedra, gelada. Alguém colocou um cano de ferro aqui há muito tempo, para quem passasse com sede. Obrigada, quem quer que tenha sido.', 'tender'],
  li_cabana: ['lia', 'Uma cabana de caçador. A lanterna está apagada há anos, mas a lenha está empilhada, pronta. Como se alguém fosse voltar.', 'neutral'],
  li_arvore_nomes: ['lia', 'Nomes gravados na casca, uns por cima dos outros. Os mais antigos a árvore já engoliu. Ela guarda todo mundo, crescendo devagar por cima.', 'tender'],
  li_farol: ['lia', 'O farol do Seu Davi. Quarenta e dois anos acendendo uma luz para ninguém. Ou para todo mundo, depende de como se olha.', 'tender'],
  li_dormindo: ['lia', 'Está dormindo. Melhor não acordar. Amanhã a gente conversa.', 'tender'],
  // ---------------- a árvore das fitas e o lago ----------------
  li_fitas: ['lia', 'Centenas de fitas. Linho, lã, couro, seda. Umas novas, outras que já viraram quase fio.', 'tender'],
  li_fita_no: ['lia', 'Pronto. Nó duplo, do jeito que estava. Agora aguenta mais uns cem anos.', 'tender'],
  li_fita_minha: ['lia', 'Amarrei a minha no galho de baixo, perto da pedra furada. Não vou contar o que eu pedi. Senão não vale.', 'happy'],
  li_pedra_achar: ['lia', 'Uma pedra boa pra jogar. Achatada, lisa, cabe na curva do dedo.', 'neutral'],
  li_pulos_bom: ['lia', 'Olha só isso. Acho que até o gigante viu.', 'happy'],
  li_pulos_zero: ['lia', 'Afundou com estilo. O Tomé ia gostar.', 'happy'],
};

// Os oito lugares de memória. `place` é a chave do ponto no mundo (ver world/landmarks.js).
// hours: de que hora a que hora o lugar "lembra" (pode virar a meia-noite); wait: o que a Lia pensa fora da hora.
// order/era: a ordem no tempo (o caderno mostra a linha do tempo dos Veladores).
// figures.model: a silhueta da pessoa na lembrança (ver actors/human.js).
export const PLACES = [
  { id: 'lago', name: 'O Gigante do Lago', place: 'lake', hint: 'Na margem do lago, a sudoeste · de manhã cedo', time: 'Numa manhã de névoa. Teo e Ilsa tinham dez anos.',
    hours: [5.2, 10.5], wait: 'li_hora_lago', order: 1, era: 'Infância',
    figures: [{ who: 'teo_m', model: 'v_teo_m', dx: 1.2, dz: 0.6, anim: 'throw' }, { who: 'ilsa_m', model: 'v_ilsa_m', dx: -0.9, dz: 0.5, anim: 'idle' }],
    lines: ['lago1', 'lago2', 'lago3', 'lago4', 'lago5', 'lago6', 'lago7', 'lago8', 'lago9', 'lago10', 'lago11'], reflect: 'lago_r', reflectIf: { seen: 'rosto', line: 'lago_r2' },
    sketch: 'Teo e Ilsa, crianças, na margem. Ele jogava pedras; ela contava os pulos. Ela guardou a pedra furada, a que não pula.' },
  { id: 'arvore', name: 'A Árvore das Fitas', place: 'tree', hint: 'Na floresta a noroeste · à tarde', time: 'Numa tarde de primavera. Teo e Ilsa tinham dezessete anos.',
    hours: [11, 18.6], wait: 'li_hora_arvore', order: 2, era: 'Juventude',
    figures: [{ who: 'teo', model: 'v_teo', dx: 0.7, dz: 0.3, anim: 'reach' }, { who: 'ilsa', model: 'v_ilsa', dx: -0.7, dz: 0.2, anim: 'reach' }],
    lines: ['arvore1', 'arvore2', 'arvore3', 'arvore4', 'arvore5', 'arvore6', 'arvore7', 'arvore8', 'arvore9', 'arvore10'], reflect: 'arvore_r',
    sketch: 'Dois pedidos amarrados no mesmo galho, um deles com a pedra furada. Eram o mesmo pedido.' },
  { id: 'circulo', name: 'O Círculo das Estrelas', place: 'stones', hours: [19.6, 5], wait: 'li_circ_dia', hint: 'Entre as pedras em pé, a noroeste · à noite', time: 'Numa noite clara de verão. O mestre Auren ensinava as crianças a olhar.',
    order: 3, era: 'Juventude',
    figures: [{ who: 'auren', model: 'v_auren', dx: 0.9, dz: -0.3, anim: 'sit' }, { who: 'dessa', model: 'v_dessa', dx: -0.6, dz: 0.4, anim: 'lie' }, { who: 'sela_m', model: 'v_sela_m', dx: 0.1, dz: 1.3, anim: 'lie' }],
    lines: ['circ1', 'circ2', 'circ3', 'circ4', 'circ5', 'circ6', 'circ7', 'circ8', 'circ9', 'circ10'], reflect: 'circ_r',
    sketch: 'O mestre Auren e as crianças deitados no meio do círculo. Uma menina de orelhas pontudas queria feitiço de verdade. Ele a chamou de Dessa.' },
  { id: 'torre', name: 'A Torre Partida', place: 'tower', hint: 'Ao norte, no fim da trilha · no fim da tarde', time: 'Num fim de tarde de outono. Sela era aprendiz do mestre Auren.',
    hours: [15.3, 19.8], wait: 'li_hora_torre', order: 4, era: 'Antes da partida',
    figures: [{ who: 'auren', model: 'v_auren', dx: 0, dz: 0, anim: 'idleOld' }, { who: 'sela', model: 'v_sela', dx: 1.6, dz: 1.2, anim: 'idle' }],
    lines: ['torre1', 'torre2', 'torre3', 'torre4', 'torre5', 'torre6', 'torre7', 'torre8', 'torre9', 'torre10'], reflect: 'torre_r',
    sketch: 'O velho mestre subia na torre toda tarde, sabendo que ela ia cair. Sela, a aprendiz, contou que a irmã não ia partir.' },
  { id: 'relogios', name: 'O Jardim dos Relógios de Sol', place: 'garden', hint: 'A sudeste, no fim da trilha · às quatro e meia da tarde', time: 'Às quatro e meia da tarde, poucos dias antes da partida.',
    hours: [16.3, 17.4], wait: 'li_hora_rel', order: 5, era: 'Antes da partida',
    figures: [{ who: 'teo', model: 'v_teo', dx: 0, dz: 0, anim: 'kneel' }, { who: 'dessa', model: 'v_dessa', dx: 1.3, dz: 0.8, anim: 'idle' }],
    lines: ['rel1', 'rel2', 'rel3', 'rel4', 'rel5', 'rel6', 'rel7', 'rel8', 'rel9', 'rel10'], reflect: 'rel_r',
    sketch: 'Cada relógio marca a hora mais feliz de alguém. O do Teo marca quatro e meia: a primeira vez que a Ilsa riu, perto do poço. Ele pediu à Dessa que cuidasse do jardim.' },
  { id: 'escada', name: 'A Escada para o Céu', place: 'stairs', hint: 'Na encosta a leste · ao entardecer', time: 'Ao entardecer, na véspera da partida.',
    hours: [16.8, 20.3], wait: 'li_hora_escada', order: 6, era: 'A véspera',
    figures: [{ who: 'ilsa', model: 'v_ilsa', dx: 0, dz: 0, anim: 'idle', top: true }, { who: 'teo', model: 'v_teo', dx: 0, dz: 0, anim: 'idle' }],
    lines: ['escada1', 'escada2', 'escada3', 'escada4', 'escada5', 'escada6', 'escada7', 'escada8', 'escada9', 'escada10'], reflect: 'escada_r',
    sketch: 'Ilsa no último degrau, Teo no primeiro. Ele pediu que ela fosse junto. Ela ficou lá em cima, olhando.' },
  { id: 'monte', name: 'O Mirante da Gigante', place: 'peak', hint: 'No alto da montanha, ao norte · de manhã', time: 'Na manhã da partida.',
    hours: [5.0, 11.5], wait: 'li_hora_monte', order: 7, era: 'A partida',
    figures: [{ who: 'ilsa', model: 'v_ilsa', dx: 0, dz: 0, anim: 'sit' }],
    lines: ['monte1', 'monte2', 'monte3', 'monte4', 'monte5', 'monte6'], reflect: 'monte_r',
    sketch: 'Ilsa sentada, vendo o povo ir embora pela estrada. Teo parou e olhou para trás. Ela não acenou. Só mais um pouco, ela disse.' },
  { id: 'rosto', name: 'O Rosto entre as Flores', place: 'head', hint: 'No campo florido a leste da vila · de dia', time: 'Muitos anos depois.',
    hours: [6.5, 18.8], wait: 'li_hora_rosto', order: 8, era: 'Muitos anos depois',
    figures: [{ who: 'teo_v', model: 'v_teo_v', dx: -1.0, dz: 0.4, anim: 'work' }, { who: 'dessa', model: 'v_dessa', dx: 1.0, dz: 0.6, anim: 'idle' }],
    lines: ['rosto1', 'rosto2', 'rosto3', 'rosto4', 'rosto5', 'rosto6', 'rosto7', 'rosto8', 'rosto9', 'rosto10'], reflect: 'rosto_r', reflectIf: { seen: ['lago', 'monte', 'escada', 'arvore'], line: 'rosto_r2' },
    sketch: 'Teo voltou velho e esculpiu o rosto dela sorrindo, para o caso de ninguém lembrar. Depois foi até o lago jogar uma pedra.' },
];

export const FINALE = ['fim1', 'fim2', 'fim_dessa', 'fim3', 'fim4b', 'fim5', 'fim6', 'fim7', 'fim8', 'fim_marta', 'fim_nina', 'fim_davi', 'fim9', 'fim_lia', 'fim_lia2', 'fim_lia3', 'fim10'];

// pequenas descobertas sem lume (lineIf: outra fala depois que algo aconteceu)
export const NOTES = {
  espada: { title: 'A espada na pedra', line: 'li_espada' },
  aqueduto: { title: 'O aqueduto', line: 'li_aqueduto' },
  balanco: { title: 'O balanço', line: 'li_balanco' },
  ponte: { title: 'A ponte partida', line: 'li_ponte', lineIf: { flag: 'ponte', line: 'li_ponte2', title: 'A ponte do Bastião' } },
  santuario: { title: 'O santuário da floresta', line: 'li_santuario' },
  banco: { title: 'O banco do poente', line: 'li_banco' },
  poco: { title: 'O poço', line: 'li_poco', lineIf: { seen: 'relogios', line: 'li_poco2', title: 'O poço da Ilsa' } },
  cogumelos: { title: 'O círculo de cogumelos', line: 'li_cogumelos' },
  tronco: { title: 'O tronco oco', line: 'li_tronco' },
  colmeia: { title: 'A colmeia', line: 'li_colmeia' },
  ninhoAve: { title: 'O ninho', line: 'li_ninho' },
  amoras: { title: 'A amoreira', line: 'li_amoras' },
  estrela: { title: 'A pedra da estrela', line: 'li_estrela_pedra' },
  fonte: { title: 'A fonte na pedra', line: 'li_fonte' },
  cabana: { title: 'A cabana do caçador', line: 'li_cabana' },
  arvoreNomes: { title: 'A árvore dos nomes', line: 'li_arvore_nomes' },
  farol: { title: 'O farol', line: 'li_farol' },
};

// As fitas da árvore: cada uma com tecido, idade, letra e quem amarrou (a Lia descobre lendo).
// cloth/ink: cores; hand: estilo da letra (css); age: 0 nova ... 1 quase fio.
export const RIBBONS = [
  { id: 'ilsa', cloth: '#9b3b32', ink: '', hand: 'none', age: 0.95, title: 'Fita de lã vermelha, quase fio', text: 'Não tem nada escrito. Só um nó duplo, bem apertado, e uma pedra achatada com um furo no meio.', who: 'Ilsa (se a Lia viu o lago ou a árvore)', needs: ['lago', 'arvore'], whoName: 'Ilsa' },
  { id: 'teo', cloth: '#5b6e8c', ink: '#2b2a33', hand: 'old', age: 0.93, title: 'Fita de linho azul, desbotada', text: 'Que a gente lembre deste dia.', whoName: 'Teo', needs: ['arvore'] },
  { id: 'sela', cloth: '#d9b23c', ink: '#3a2d12', hand: 'old', age: 0.9, title: 'Lenço amarelo, rasgado em tira', text: 'Ilsa: se mudar de ideia, siga a estrada. Eu vou devagar. Eu prometo que vou devagar. — S.', whoName: 'Sela', needs: ['monte', 'torre'] },
  { id: 'dessa', cloth: '#b8bcc8', ink: '#28304a', hand: 'elf', age: 0.8, title: 'Fio de prata, trançado', text: 'Que eles voltem.  —  e embaixo, com a mesma letra, muito mais nova:  Que eles estejam bem.', whoName: 'Odessa', needs: ['circulo', 'relogios'] },
  { id: 'celeste', cloth: '#e8d6b0', ink: '#5a3a20', hand: 'round', age: 0.25, title: 'Pano de prato bordado', text: 'Que o Elias saiba que o pão ainda é pra dois.', whoName: 'Celeste' },
  { id: 'bastiao', cloth: '#7a5a3c', ink: '#1d140c', hand: 'block', age: 0.4, title: 'Tira de couro, entalhada a faca', text: 'PONTE PRONTA ANTES DE EU FICAR VELHO.  (embaixo, menor:)  já fiquei. continua valendo.', whoName: 'Bastião' },
  { id: 'tome', cloth: '#3f8f5a', ink: '#14301c', hand: 'kid', age: 0.05, title: 'Fita verde, com nó de sapato', text: 'Quero acordar o gigante. Mas só se ele quiser.', whoName: 'Tomé' },
  { id: 'davi', cloth: '#22344f', ink: '#1f2d44', hand: 'fine', age: 0.5, title: 'Fita de seda azul-marinho', text: 'Para quem se perdeu: siga a luz. Para quem ficou: obrigado por acender a sua.', whoName: 'Seu Davi' },
  { id: 'nina', cloth: '#e6a0a8', ink: '#5a2030', hand: 'kid', age: 0.02, title: 'Fita rosa com uma conchinha costurada', text: 'Baleia existe? Se existe, que ela cante de novo.', whoName: 'Nina' },
];
export const LIA_WISHES = [
  { id: 'pai', t: 'Que meu pai saiba que eu continuo desenhando.' },
  { id: 'voltar', t: 'Voltar aqui um dia. Com a minha mãe.' },
  { id: 'ficar', t: 'Aprender a ficar.' },
];

// amizades: o que a Lia anota no caderno sobre cada um
export const FRIENDS = {
  odessa: 'Mora no observatório há seiscentos anos. Coleciona feitiços inúteis.', anselmo: 'Pastor. Diz que ovelha ensina o tamanho certo do dia.', celeste: 'Padeira. Ainda faz pão para dois.', tome: 'Quer acordar os gigantes. Com paciência.', irene: 'Pinta a luz em cima do lago.', bastiao: 'Quer terminar a frase da ponte partida.',
  marta: 'Dona da taberna da Maré. Fala por três.', joca: 'Constrói barcos e conversa com eles.', tiao: 'Pescador. Conversa com a boia.', nina: 'Coleciona conchas e perguntas.', davi: 'Acende o farol toda noite, para quem se perder.',
};
// o que a Lia anota sobre cada pessoa das lembranças (aparece depois de ver alguém nelas)
export const VELADORES = {
  teo: { name: 'Teo', note: 'Jogava pedras no lago e não desistia de sete pulos. Partiu com o povo. Voltou velho.', seen: ['lago', 'arvore', 'relogios', 'escada', 'rosto'] },
  ilsa: { name: 'Ilsa', note: 'Contava tudo: pulos, degraus, estrelas. Guardou a pedra furada. Ficou.', seen: ['lago', 'arvore', 'escada', 'monte'] },
  sela: { name: 'Sela', note: 'Irmã da Ilsa, aprendiz do mestre Auren. Partiu de lenço amarelo e não olhou para trás.', seen: ['circulo', 'torre'] },
  auren: { name: 'Mestre Auren', note: 'Ensinava a olhar. Subia numa torre rachada todo fim de tarde.', seen: ['circulo', 'torre'] },
  dessa: { name: 'Dessa', note: 'Uma menina de orelhas pontudas que queria feitiço de verdade. Prometeu cuidar do jardim dos relógios.', seen: ['circulo', 'relogios', 'rosto'] },
};
// coisas que se carregam de uma vila para a outra
export const ITEMS = { pao: 'Cesta de pão da Celeste (para a Dona Marta)', peixe: 'Peixe defumado da Dona Marta (para a Celeste)', desenho: 'Desenho de gigante do Tomé (para a Nina)', concha: 'Concha da Nina (para o Tomé)', carta: 'Carta do Seu Davi (para a Odessa)', resposta: 'Resposta da Odessa (para o Seu Davi)', papel: 'Papel de carta do Seu Davi (para escrever à mãe)' };

export const text = (id) => (LINES[id] ? LINES[id][1] : id);
export const speaker = (id) => (LINES[id] ? LINES[id][0] : 'narrador');
