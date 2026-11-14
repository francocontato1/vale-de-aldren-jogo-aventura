// Vale de Aldren — conteúdo narrativo
//
// Há muito tempo, um povo chamado Veladores viveu neste vale. Construíam para olhar:
// torres, escadas que não levam a lugar nenhum, círculos de pedra, relógios de sol.
// Um dia foram embora, sem guerra e sem despedida. Ficaram as pedras e os gigantes,
// que, dizem, são Veladores que sentaram para ver algo bonito e esqueceram de levantar.
//
// Lia, uma jovem cartógrafa, chega ao vale a pedido de Odessa, uma maga elfa que mora
// aqui há seiscentos anos. Odessa não quer um mapa de estradas: quer um mapa dos lugares
// onde alguém foi feliz. Quando alguém para e olha um desses lugares com calma, ele
// "lembra": um lume, uma lembrança de luz, aparece por alguns instantes.
//
// Cada fala dublada tem um id. As vozes são geradas em a/vox/<id>.mp3 (ver tools/voice).

export const CAST = {
  lia: { name: 'Lia', role: 'Cartógrafa' },
  odessa: { name: 'Odessa', role: 'Maga do observatório' },
  anselmo: { name: 'Seu Anselmo', role: 'Pastor' },
  celeste: { name: 'Celeste', role: 'Padeira' },
  tome: { name: 'Tomé', role: 'Menino da vila' },
  irene: { name: 'Irene', role: 'Herbalista e pintora' },
  bastiao: { name: 'Bastião', role: 'Carpinteiro' },
  eco_m: { name: 'Um Velador', role: 'Lembrança' },
  eco_f: { name: 'Uma Veladora', role: 'Lembrança' },
  narrador: { name: '', role: '' },
};

// id -> [speaker, text, emotion]
export const LINES = {
  // ---------------- abertura ----------------
  intro1: ['narrador', 'Dizem que no vale de Aldren nada se perde. Só muda de lugar.', 'tender'],
  intro2: ['narrador', 'Há muito tempo, viveu aqui um povo que construía para olhar. Torres, escadas, círculos de pedra. Chamavam a si mesmos de Veladores.', 'neutral'],
  intro3: ['narrador', 'Um dia, foram embora. Ninguém sabe para onde. Deixaram as pedras, os gigantes... e uma pergunta.', 'tender'],
  carta: ['odessa', 'Cartógrafa. Que bom que aceitou. Não preciso de um mapa de estradas, essas eu já conheço. Preciso de um mapa do que importa. Me procure no observatório, no alto da colina, depois da vila. E traga sapatos confortáveis. Odessa.', 'tired'],
  chegada: ['lia', 'Então este é o vale de Aldren. É mais quieto do que eu imaginava. Do jeito bom.', 'tender'],

  // ---------------- Odessa ----------------
  od_first: ['odessa', 'Ah. Você veio a pé. Eu tinha certeza de que ia chegar amanhã. Ou daqui a dez anos. Eu me confundo com essas coisas.', 'tired'],
  od_quem: ['odessa', 'Sou. Faz seiscentos anos que moro neste vale, e ainda não entendi ele direito. Por isso chamei você.', 'neutral'],
  od_mapa: ['odessa', 'Um mapa dos lugares onde alguém foi feliz. Os Veladores deixaram oito. Eu sinto eles, mas já não consigo ver. Meus olhos ficaram cansados de tanto olhar a mesma coisa.', 'tender'],
  od_como: ['odessa', 'Vá até eles e fique. Sente, espere, olhe. Quando um lugar percebe que está sendo olhado com calma, ele lembra. Nós chamamos isso de lume. Desenhe no seu caderno o que você vir.', 'neutral'],
  od_depois: ['odessa', 'Depois volte e me conte. Sem pressa. A pressa espanta os lumes. Espanta os gatos também.', 'happy'],
  od_n1: ['odessa', 'Um lume, então. Fazia tempo que ninguém via um. Eu dei nomes aos gigantes, sabia? Os Veladores nunca disseram como chamavam eles. Talvez nome seja coisa de quem tem medo de esquecer.', 'tender'],
  od_n2: ['odessa', 'Nos meus primeiros cem anos aqui, eu colecionava feitiços inúteis. Um que deixa o chá sempre morno. Um que acha botões perdidos. Todo mundo achava bobagem. Eu também. Mas eram os que eu mais usava.', 'happy'],
  od_n3: ['odessa', 'Pensei uma coisa ontem, olhando o céu. Para mim, vocês humanos são como estrelas cadentes. Passam rápido demais. E eu passei séculos olhando para o chão, estudando pedra.', 'sad'],
  od_n4: ['odessa', 'Está quase. Engraçado... e se o mapa ficar pronto e eu não sentir nada? Seiscentos anos é muito tempo para esperar uma resposta.', 'tired'],
  od_todos: ['odessa', 'Oito lugares. Você viu coisas que eu nunca vi. Hoje à noite passa a Chuva de Lumes. Acontece uma vez a cada cem anos. Suba até o observatório depois que escurecer. Eu espero você.', 'excited'],
  od_noite: ['odessa', 'Ainda está claro. Os lumes são tímidos. Volte quando as estrelas aparecerem.', 'neutral'],
  od_pos1: ['odessa', 'Estou tentando aprender o nome de todo mundo da vila. Comecei pela padeira. Celeste. Viu? Já sei um.', 'happy'],
  od_pos2: ['odessa', 'Fique o tempo que quiser. O mapa está pronto, mas o vale não. O vale nunca fica pronto.', 'tender'],
  od_cha: ['odessa', 'Quer chá? Está morno. Está sempre morno. Esse é o feitiço.', 'happy'],

  // ---------------- Seu Anselmo ----------------
  an_first: ['anselmo', 'Boa tarde, moça. Você é a que veio fazer o mapa da Odessa? Hum. Ela começa um mapa desses a cada século. Nunca termina. Diz que o vale muda enquanto ela desenha.', 'happy'],
  an_gigantes: ['anselmo', 'Conheço desde menino. Meu avô dizia que eles não são estátuas. São gente que sentou para ver alguma coisa bonita... e gostou tanto que esqueceu de levantar.', 'tender'],
  an_veladores: ['anselmo', 'Acho que não aconteceu nada. Às vezes as pessoas só vão embora. Não precisa ser tragédia. As ovelhas também mudam de pasto, e ninguém faz poema por isso.', 'neutral'],
  an_c1: ['anselmo', 'Sabe por que eu gosto de pastorear? Ovelha não tem pressa. Com elas a gente aprende o tamanho certo do dia.', 'tender'],
  an_c2: ['anselmo', 'Quando o vento vira e cheira a chuva, olhe para a gigante do monte. Ela sempre fica com uma nuvem no ombro.', 'neutral'],
  an_c3: ['anselmo', 'Na minha idade a gente para de perguntar para onde as coisas vão. Começa a perguntar onde elas estão agora.', 'tender'],
  an_noite: ['anselmo', 'Já é noite? Hum. Nessa idade a gente conta estrela para dormir. Eu nunca passo das trinta.', 'tired'],

  // ---------------- Celeste ----------------
  ce_first: ['celeste', 'Ah! Gente nova! Entra, entra, que o pão acabou de sair. Você é a moça do mapa? A Odessa encomendou pão para você. Três por dia, ela disse. Eu disse que ninguém come três pães por dia. Ela disse que cartógrafo anda muito.', 'excited'],
  ce_odessa: ['celeste', 'A Odessa? Vem aqui uma vez por ano, se tanto. Fica parada na porta sentindo o cheiro e vai embora sem comprar nada. Ano passado eu dei um pão para ela. Ficou olhando para o pão como se fosse um livro!', 'happy'],
  ce_ruinas: ['celeste', 'Eu acho que eles eram padeiros. É sério! Quem mais acorda antes do sol para olhar o céu? Toda aquela gente de torre e escada... tinha fome de alguma coisa, isso eu garanto.', 'happy'],
  ce_c1: ['celeste', 'Pão bom é igual conversa boa. Precisa de tempo, de calor, e de alguém para dividir.', 'tender'],
  ce_c2: ['celeste', 'Meu marido construía barcos. Faz seis invernos que ele se foi. Eu ainda faço pão para dois. O que sobra eu dou para os passarinhos. Eles agradecem do jeito deles.', 'sad'],
  ce_c3: ['celeste', 'O Tomé passou aqui correndo de novo. Aquele menino acha que vai acordar os gigantes. Deixa ele. Alguém tem que tentar.', 'happy'],
  ce_noite: ['celeste', 'O forno já esfriou, querida. Volta amanhã cedo, que tem pão de mel.', 'tired'],

  // ---------------- Tomé ----------------
  to_first: ['tome', 'Você é cartógrafa? De verdade? Então você sabe onde fica tudo! Me diz: onde os gigantes guardam os sonhos deles?', 'excited'],
  to_naosei: ['tome', 'Ah. Tudo bem. Eu acho que é na barriga. Por isso eles ficam sentados.', 'happy'],
  to_porque: ['tome', 'Porque eu quero acordar eles! Todo dia eu grito bom dia para o gigante do lago. Um dia ele vai responder. A tia Celeste diz que paciência é a magia mais forte. Mas é a mais chata também.', 'excited'],
  to_c1: ['tome', 'Sabia que se você deitar na grama e olhar as nuvens, parece que é a terra que está andando?', 'excited'],
  to_c2: ['tome', 'Eu achei uma pedra com um desenho de estrela! Escondi. Não vou contar onde. Tá bom, é perto do círculo de pedras. Mas não conta para ninguém!', 'happy'],
  to_c3: ['tome', 'Quando eu crescer eu vou ser Velador. Vou construir uma escada até a lua. Mas com corrimão.', 'happy'],
  to_pos: ['tome', 'Você viu? Os lumes subiram! Eu falei que os gigantes estavam acordados por dentro!', 'excited'],

  // ---------------- Irene ----------------
  ir_first: ['irene', 'Ah, desculpa, não vi você chegar. Estou tentando pintar a luz em cima do lago. É impossível. Quando eu acerto a cor, a luz já mudou.', 'tender'],
  ir_porque: ['irene', 'Porque a parte boa não é o quadro. É a meia hora olhando. O quadro é só a desculpa que eu dou para os outros.', 'tender'],
  ir_ver: ['irene', 'Pode. Está horrível. Mas olha este canto aqui... o reflexo. Por um segundo, eu acertei.', 'happy'],
  ir_c1: ['irene', 'Os Veladores pintavam? Eu acho que sim. Ninguém constrói uma escada para o céu sem ter vontade de desenhar ele antes.', 'tender'],
  ir_c2: ['irene', 'Já reparou que à noite o lago vira outro céu? Às vezes eu não sei em qual dos dois as estrelas estão de verdade.', 'tender'],
  ir_c3: ['irene', 'Colho camomila de manhã, pinto à tarde, durmo cedo. As pessoas acham pouco. Eu acho que é o suficiente.', 'neutral'],

  // ---------------- Bastião ----------------
  ba_first: ['bastiao', 'Hum. Visita. Se veio pedir conserto, entra na fila. A fila é o vale inteiro.', 'neutral'],
  ba_conhecer: ['bastiao', 'Hum. Então tá. Bastião. Carpinteiro. Conserto o que quebra. Que é tudo, com o tempo.', 'neutral'],
  ba_ponte: ['bastiao', 'Uma ponte. Os Veladores fizeram uma de pedra, ali no riacho seco. Caiu faz trezentos anos. Ninguém precisa dela, o riacho nem tem água. Mas uma ponte caída parece uma frase pela metade. Me incomoda.', 'neutral'],
  ba_c1: ['bastiao', 'Madeira boa avisa antes de quebrar. Range. Gente também.', 'neutral'],
  ba_c2: ['bastiao', 'A Odessa me pediu uma estante nova. Para quê, eu perguntei. Para guardar o que eu ainda não li, ela disse. Vai precisar de mil estantes.', 'happy'],
  ba_c3: ['bastiao', 'Os Veladores cortavam pedra como eu nunca vi. Nenhuma junta torta. Mas a escada deles não leva a lugar nenhum. Bons de mão, ruins de plano. Igual a mim.', 'happy'],

  // ---------------- lumes ----------------
  lago1: ['eco_m', 'Sete pulos! Você viu? Sete!', 'excited'],
  lago2: ['eco_f', 'Vi. A pedra afundou do mesmo jeito.', 'happy'],
  lago3: ['eco_m', 'Mas antes ela voou. Isso conta.', 'happy'],
  lago4: ['eco_f', 'Joga outra. Eu quero ver ela voar de novo.', 'tender'],
  lago_r: ['lia', 'Talvez seja isso que o gigante segura com a mão erguida. Não o céu. Uma pedra que ainda não afundou.', 'tender'],

  circ1: ['eco_f', 'Se cada estrela é um sol, será que alguém lá também está olhando para cá?', 'tender'],
  circ2: ['eco_m', 'Talvez. E deve achar a gente tão pequeno.', 'neutral'],
  circ3: ['eco_f', 'Ou tão bonito. Depende de quanto tempo ele olhar.', 'tender'],
  circ_r: ['lia', 'Eles construíram um círculo inteiro só para deitar no meio e olhar para cima. Acho que eu entendo.', 'tender'],

  torre1: ['eco_f', 'A torre não vai aguentar outro inverno, mestre.', 'sad'],
  torre2: ['eco_m', 'Eu sei.', 'tired'],
  torre3: ['eco_f', 'Então por que o senhor continua subindo nela toda tarde?', 'surprised'],
  torre4: ['eco_m', 'Porque ainda está de pé. Quando cair, eu sento no chão e olho daqui. O céu não muda por causa de uma torre.', 'tender'],
  torre_r: ['lia', 'Nada aqui foi feito para durar para sempre. Foi feito para ser usado enquanto durasse.', 'tender'],

  monte1: ['eco_f', 'Daqui eu vejo a vila inteira. As chaminés, o lago, a estrada.', 'tender'],
  monte2: ['eco_f', 'Amanhã eles vão me chamar para ir embora junto. Eu vou dizer que sim.', 'sad'],
  monte3: ['eco_f', 'Mas hoje... hoje eu vou ficar mais um pouco. Só mais um pouco.', 'tender'],
  monte_r: ['lia', 'Só mais um pouco. Talvez seja assim que alguém vira pedra. Não de tristeza. De vontade de ficar.', 'tender'],

  arvore1: ['eco_m', 'O que você pediu?', 'happy'],
  arvore2: ['eco_f', 'Não se conta. Senão não vale.', 'happy'],
  arvore3: ['eco_m', 'Então eu conto o meu. Pedi que a gente lembre deste dia.', 'tender'],
  arvore4: ['eco_f', 'Bobo. Era o mesmo pedido.', 'tender'],
  arvore_r: ['lia', 'Centenas de fitas. Centenas de pedidos que ninguém mais lembra. E a árvore guardou todos, sem saber ler nenhum.', 'tender'],

  rel1: ['eco_m', 'Cada relógio deste jardim marca uma hora diferente. As pessoas acham que estão quebrados.', 'neutral'],
  rel2: ['eco_m', 'Não estão. Cada um marca a hora mais feliz de alguém. Este aqui é o meu. Quatro e meia da tarde.', 'tender'],
  rel3: ['eco_m', 'Foi quando ela riu pela primeira vez, ali perto do poço.', 'tender'],
  rel_r: ['lia', 'Se eu tivesse um relógio desses, que hora ele marcaria? Ainda não sei. E acho que está tudo bem não saber ainda.', 'tender'],

  escada1: ['eco_m', 'Você sabe que ela não leva a lugar nenhum.', 'neutral'],
  escada2: ['eco_f', 'Leva até o último degrau.', 'happy'],
  escada3: ['eco_m', 'E depois?', 'surprised'],
  escada4: ['eco_f', 'Depois eu olho. É para isso que serve uma escada.', 'tender'],
  escada_r: ['lia', 'Talvez o lugar nunca tenha sido lá em cima. Talvez o lugar fosse a subida.', 'tender'],

  rosto1: ['eco_f', 'Você esculpiu o rosto dele sorrindo.', 'tender'],
  rosto2: ['eco_m', 'Ele sorria muito.', 'tender'],
  rosto3: ['eco_f', 'E se um dia ninguém mais souber quem ele era?', 'sad'],
  rosto4: ['eco_m', 'Então vai ser só um rosto sorrindo no meio das flores. Também não é um jeito ruim de ser lembrado.', 'tender'],
  rosto_r: ['lia', 'Ninguém sabe de quem é este rosto. Mesmo assim, ele faz a gente sorrir de volta. Talvez seja o bastante.', 'tender'],

  // ---------------- final: a Chuva de Lumes ----------------
  fim1: ['odessa', 'Chegou. Olhe para cima.', 'tender'],
  fim2: ['odessa', 'Seiscentos anos eu procurei os Veladores nas pedras. E eles estavam nas coisas pequenas. Numa pedra que pula na água. Num pedido amarrado numa fita. Numa escada que não leva a lugar nenhum.', 'tender'],
  fim3: ['lia', 'Você acha que eles ainda existem? Em algum lugar?', 'tender'],
  fim4: ['odessa', 'Acho que fizeram o que todo mundo faz. Olharam o mundo com carinho... e depois foram ver outra parte dele.', 'tender'],
  fim5: ['odessa', 'Vou mostrar um feitiço. O único que eles me ensinaram sem querer. Não serve para nada. É o meu preferido.', 'happy'],
  fim6: ['odessa', 'Pronto. Agora o vale inteiro sabe que foi olhado.', 'tender'],
  fim7: ['anselmo', 'Faz oitenta anos que eu não fico acordado até tão tarde.', 'happy'],
  fim8: ['celeste', 'Trouxe pão para todo mundo! Até para você, Odessa. Não adianta fazer essa cara.', 'happy'],
  fim9: ['tome', 'Eu falei! Eu falei que eles estavam acordados!', 'excited'],
  fim10: ['odessa', 'Obrigada, cartógrafa. Seu mapa está pronto. Mas o vale, não. O vale nunca fica pronto.', 'tender'],
  fim11: ['narrador', 'E assim, no vale de Aldren, nada se perdeu. Só mudou de lugar.', 'tender'],

  // ---------------- pensamentos de Lia (descobertas e momentos) ----------------
  li_espada: ['lia', 'Uma espada fincada na pedra. Ninguém tirou. Ou ninguém quis tirar. Tem coisas que ficam melhor onde foram deixadas.', 'tender'],
  li_aqueduto: ['lia', 'Um aqueduto que não leva mais água a lugar nenhum. As ovelhas dormem na sombra dos arcos. Ele ainda serve. Só que de outro jeito.', 'tender'],
  li_balanco: ['lia', 'Alguém pendurou este balanço há muito tempo. As cordas já foram trocadas várias vezes. Gerações de crianças cuidando de um balanço.', 'happy'],
  li_ponte: ['lia', 'A ponte dos Veladores, partida no meio. O riacho secou faz séculos. Mesmo assim, o Bastião quer terminar a frase.', 'tender'],
  li_santuario: ['lia', 'Estatuetas no meio da floresta, cobertas de musgo. Alguém deixou flores frescas aqui. Hoje.', 'surprised'],
  li_banco: ['lia', 'Um banco virado para o oeste. Quem colocou ele aqui sabia exatamente onde o sol se põe.', 'tender'],
  li_poco: ['lia', 'Dizem que, numa noite sem vento, dá para ver as estrelas no fundo deste poço. Mesmo de dia.', 'neutral'],
  li_noite: ['lia', 'Já escureceu. Melhor acender a lanterna.', 'neutral'],
  li_circ_dia: ['lia', 'Acho que este lugar precisa das estrelas. Vou esperar a noite.', 'neutral'],
  li_sentar1: ['lia', 'Daqui dá para ouvir o vento passando na grama. Parece o mar.', 'tender'],
  li_sentar2: ['lia', 'Vou ficar mais um pouco. Ninguém está me esperando com pressa.', 'tender'],
  li_sentar3: ['lia', 'As nuvens andam tão devagar. Ou sou eu que finalmente parei.', 'tender'],
  li_mapa_cheio: ['lia', 'Oito lugares. O caderno está cheio de gente que eu nunca vou conhecer. E mesmo assim parece que conheço.', 'tender'],
  li_estrela: ['lia', 'Uma estrela cadente. Esqueci de fazer um pedido. Tudo bem. Ver já foi bom.', 'happy'],
  li_dormindo: ['lia', 'Está dormindo. Melhor não acordar. Amanhã a gente conversa.', 'tender'],
};

// Os oito lugares de memória. `place` é a chave do ponto no mundo (ver world/landmarks.js).
export const PLACES = [
  { id: 'lago', name: 'O Gigante do Lago', place: 'lake', hint: 'Na margem do lago, a sudoeste', time: 'Numa manhã de névoa, há muito tempo',
    figures: [{ who: 'eco_m', dx: 1.2, dz: 0.6, anim: 'throw' }, { who: 'eco_f', dx: -0.8, dz: -0.4, anim: 'sit' }], lines: ['lago1', 'lago2', 'lago3', 'lago4'], reflect: 'lago_r',
    sketch: 'Dois Veladores na margem. Ele jogava pedras na água. Ela contava os pulos.' },
  { id: 'circulo', name: 'O Círculo das Estrelas', place: 'stones', night: true, hint: 'Entre as pedras em pé, a noroeste', time: 'Numa noite clara de verão',
    figures: [{ who: 'eco_f', dx: -0.6, dz: 0.4, anim: 'lie' }, { who: 'eco_m', dx: 0.9, dz: -0.3, anim: 'sit' }], lines: ['circ1', 'circ2', 'circ3'], reflect: 'circ_r',
    sketch: 'Deitados no meio do círculo, perguntando se alguém lá em cima olhava de volta.' },
  { id: 'torre', name: 'A Torre Partida', place: 'tower', hint: 'Ao norte, no fim da trilha', time: 'Num fim de tarde de outono',
    figures: [{ who: 'eco_m', dx: 0, dz: 0, anim: 'idleOld' }, { who: 'eco_f', dx: 1.6, dz: 1.2, anim: 'idle' }], lines: ['torre1', 'torre2', 'torre3', 'torre4'], reflect: 'torre_r',
    sketch: 'Um velho mestre subia na torre toda tarde, sabendo que ela ia cair.' },
  { id: 'monte', name: 'O Mirante da Gigante', place: 'peak', hint: 'No alto da montanha, ao norte', time: 'Na véspera da partida',
    figures: [{ who: 'eco_f', dx: 0, dz: 0, anim: 'sit' }], lines: ['monte1', 'monte2', 'monte3'], reflect: 'monte_r',
    sketch: 'Uma Veladora sentada, olhando a vila inteira. Só mais um pouco, ela disse.' },
  { id: 'arvore', name: 'A Árvore das Fitas', place: 'tree', hint: 'Na floresta a noroeste', time: 'Numa tarde de primavera',
    figures: [{ who: 'eco_m', dx: 0.7, dz: 0.3, anim: 'reach' }, { who: 'eco_f', dx: -0.7, dz: 0.2, anim: 'reach' }], lines: ['arvore1', 'arvore2', 'arvore3', 'arvore4'], reflect: 'arvore_r',
    sketch: 'Dois pedidos amarrados no mesmo galho. Eram o mesmo pedido.' },
  { id: 'relogios', name: 'O Jardim dos Relógios de Sol', place: 'garden', hint: 'A sudeste, no fim da trilha', time: 'Às quatro e meia da tarde',
    figures: [{ who: 'eco_m', dx: 0, dz: 0, anim: 'kneel' }], lines: ['rel1', 'rel2', 'rel3'], reflect: 'rel_r',
    sketch: 'Cada relógio marca a hora mais feliz de alguém. Um deles marca quatro e meia.' },
  { id: 'escada', name: 'A Escada para o Céu', place: 'stairs', hint: 'Na encosta a leste', time: 'Ao entardecer, muitas vezes',
    figures: [{ who: 'eco_f', dx: 0, dz: 0, anim: 'idle', top: true }, { who: 'eco_m', dx: 0, dz: 0, anim: 'idle' }], lines: ['escada1', 'escada2', 'escada3', 'escada4'], reflect: 'escada_r',
    sketch: 'Uma escada que não leva a lugar nenhum. Ela subia mesmo assim, para olhar.' },
  { id: 'rosto', name: 'O Rosto entre as Flores', place: 'head', hint: 'No campo florido a leste da vila', time: 'Quando a pedra ainda era nova',
    figures: [{ who: 'eco_m', dx: -1.0, dz: 0.4, anim: 'work' }, { who: 'eco_f', dx: 1.0, dz: 0.6, anim: 'idle' }], lines: ['rosto1', 'rosto2', 'rosto3', 'rosto4'], reflect: 'rosto_r',
    sketch: 'Um escultor deu ao rosto um sorriso, para o caso de ninguém lembrar de quem era.' },
];

export const FINALE = ['fim1', 'fim2', 'fim3', 'fim4', 'fim5', 'fim6', 'fim7', 'fim8', 'fim9', 'fim10'];

// pequenas descobertas sem lume
export const NOTES = {
  espada: { title: 'A espada na pedra', line: 'li_espada' },
  aqueduto: { title: 'O aqueduto', line: 'li_aqueduto' },
  balanco: { title: 'O balanço', line: 'li_balanco' },
  ponte: { title: 'A ponte partida', line: 'li_ponte' },
  santuario: { title: 'O santuário da floresta', line: 'li_santuario' },
  banco: { title: 'O banco do poente', line: 'li_banco' },
  poco: { title: 'O poço', line: 'li_poco' },
};

export const text = (id) => (LINES[id] ? LINES[id][1] : id);
export const speaker = (id) => (LINES[id] ? LINES[id][0] : 'narrador');
