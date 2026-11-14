// Ecos de Aldren — conteúdo narrativo
// Oitenta anos atrás, os Quatro (Elowen, Teodor, Iara e Brás) e quatro gigantes de pedra, os Vigias,
// atravessaram a Longa Noite. Os Vigias adormeceram e os nomes deles foram esquecidos.
// Elowen viveu muito mais que os outros. O jogador é o seu último aprendiz.

export const VIGIAS = [
  {
    id: 'aurel', name: 'Aurel', title: 'o que segurou o céu', pose: 'reach', place: 'lake', rune: 0,
    nameText: 'Aurel. O que segurou o céu quando ele quis cair sobre o vale. Dorme no fundo do lago, com a mão ainda erguida.',
    echo: {
      place: 'shore', time: 'Na última noite antes da Longa Noite',
      figures: [{ who: 'teodor', dx: -1.2, dz: 0.8, face: 'fire' }, { who: 'elowen', dx: 1.0, dz: 1.2, face: 'fire' }, { who: 'iara', dx: 0.2, dz: -1.4, face: 'fire' }, { who: 'bras', dx: 1.5, dz: -0.6, face: 'fire', anim: 'idle2' }],
      lines: [
        ['Teodor', 'teodor', 'Se eu não voltar, joguem minha espada no lago. Ela pesa demais para ficar parada num canto.'],
        ['Elowen', 'elowen', 'Você sempre volta, Teodor. É a coisa mais irritante em você.'],
        ['Brás', 'bras', 'Deixem ele. Quem fala de voltar é porque já está com saudade.'],
        ['Iara', 'iara', 'Olhem o Aurel. Está de mão erguida, como se o céu pesasse. Nunca vi as estrelas tão perto.'],
        ['Elowen', 'elowen', 'Lembrem desta noite. Eu vou lembrar por vocês, se for preciso.'],
      ],
    },
  },
  {
    id: 'seren', name: 'Seren', title: 'a que guardava as palavras', pose: 'kneel', place: 'stones', rune: 1,
    nameText: 'Seren. A que guardava as palavras. Ajoelhou-se sobre a espada para que nenhuma palavra antiga se perdesse.',
    echo: {
      place: 'circle', time: 'Uma tarde, muitos anos antes',
      figures: [{ who: 'elowen', dx: 0.8, dz: 0, face: 'kid' }, { who: 'kid', dx: -0.8, dz: 0.2, face: 'elowen' }],
      lines: [
        ['Elowen', 'elowen', 'Magia não é fazer as coisas aparecerem, Bento. É lembrar que elas existiam.'],
        ['Bento menino', 'kid', 'E quando a gente esquece?'],
        ['Elowen', 'elowen', 'Aí alguém precisa lembrar por nós. Por isso a Seren está aqui. Ela não esquece nada.'],
        ['Bento menino', 'kid', 'Nem o meu nome?'],
        ['Elowen', 'elowen', 'Principalmente o seu nome.'],
      ],
    },
  },
  {
    id: 'doran', name: 'Doran', title: 'o que contava as chaminés', pose: 'lie', place: 'tower', rune: 2,
    nameText: 'Doran. O que contava as chaminés. Caiu de costas olhando o céu, e o céu ficou olhando para ele.',
    echo: {
      place: 'tower', time: 'Na véspera da Longa Noite',
      figures: [{ who: 'teodor', dx: 0, dz: 0, face: 'village' }, { who: 'elowen', dx: 2.5, dz: 2.5, face: 'teodor' }],
      lines: [
        ['Teodor', 'teodor', 'Daqui eu via a vila inteira. Oitenta e três chaminés. Contei todas, duas vezes.'],
        ['Elowen', 'elowen', 'Teodor. Vem. Os outros estão esperando.'],
        ['Teodor', 'teodor', 'Só mais um pouco. Se a noite chegar, quero lembrar quantas eram.'],
        ['Elowen', 'elowen', 'Eu lembro por você.'],
        ['Teodor', 'teodor', 'Você lembra de tudo, Elowen. Às vezes acho que isso é o que mais dói em você.'],
      ],
    },
  },
  {
    id: 'maren', name: 'Maren', title: 'a que olha o vale', pose: 'sit', place: 'peak', rune: 3,
    nameText: 'Maren. A que olha o vale. Sentou-se aqui em cima para que, enquanto alguém olhasse, nada fosse esquecido de vez.',
    echo: {
      place: 'peak', time: 'Cinquenta anos depois',
      figures: [{ who: 'elowen', dx: 0, dz: 0, face: 'valley', anim: 'idle3' }],
      lines: [
        ['Elowen', 'elowen', 'Vocês foram embora tão depressa. Para mim foi só uma estação.'],
        ['Elowen', 'elowen', 'Teodor envelheceu contando chaminés. Iara foi a última a ir, e mesmo assim cedo demais.'],
        ['Elowen', 'elowen', 'Agora eu entendo por que vocês olhavam tanto para o céu. Vocês sabiam que não tinham tempo de olhar depois.'],
        ['Elowen', 'elowen', 'Maren, se um dia eu também esquecer... lembre por mim.'],
      ],
    },
  },
];

export const FINAL_ECHO = {
  time: 'Agora',
  figures: [{ who: 'elowen', dx: 0, dz: 1.6, face: 'player' }, { who: 'teodor', dx: -2.2, dz: 3.4, face: 'player' }, { who: 'iara', dx: 2.0, dz: 3.6, face: 'player' }, { who: 'bras', dx: 0.4, dz: 4.6, face: 'player', anim: 'idle2' }],
  lines: [
    ['Elowen', 'elowen', 'Se você está ouvindo isso, aprendiz, então eu também já sou uma lembrança.'],
    ['Elowen', 'elowen', 'Obrigada por devolver os nomes. Agora eles vão cuidar do vale, como cuidaram de nós.'],
    ['Teodor', 'teodor', 'Oitenta e três chaminés. Conte de novo, um dia, por mim.'],
    ['Iara', 'iara', 'E olhe para cima de vez em quando.'],
    ['Elowen', 'elowen', 'Não fique triste por muito tempo. Vá ver o mundo. É para isso que a gente lembra: para poder seguir.'],
  ],
};

export const PAGES = [
  { id: 'p1', spot: 'graves', title: 'Diário de Elowen, I', text: 'Hoje enterramos o Brás. Os humanos fazem isso: colocam uma pedra com o nome e voltam para casa. Achei estranho, a princípio. Depois entendi que a pedra não é para quem foi. É para quem fica ter onde deixar o que não conseguiu dizer.' },
  { id: 'p2', spot: 'swing', title: 'Diário de Elowen, II', text: 'O Bento pediu um balanço. Teodor amarrou as cordas nesse carvalho e passou a tarde inteira empurrando. Eu fiquei olhando de longe e pensei: daqui a sessenta anos esta árvore vai estar aqui e nenhum dos dois. E mesmo assim eles riam. Talvez seja isso que eu nunca aprendi.' },
  { id: 'p3', spot: 'camp', title: 'Bilhete de Iara', text: 'Se alguém encontrar este acampamento: a gente não fugiu. Fomos até onde a noite começa. Deixamos as cobertas porque achamos que íamos voltar para dormir nelas. Se não voltarmos, podem usar. Estão quentes ainda.' },
  { id: 'p4', spot: 'sword', title: 'Inscrição gasta', text: 'Aqui ninguém tirou a espada da pedra. Não porque não conseguiram. Porque ninguém quis. Há coisas que ficam melhor onde foram deixadas.' },
  { id: 'p5', spot: 'head', title: 'Diário de Elowen, III', text: 'Encontrei a cabeça de um gigante que não era nosso. Ninguém lembra de que lado ele lutou. As flores crescem nele do mesmo jeito. Acho que as flores entendem a guerra melhor que nós.' },
  { id: 'p6', spot: 'tree', title: 'Fitas na árvore', text: 'Fitas amarradas por gerações. Algumas desbotadas a ponto de ficarem brancas. Numa delas, ainda dá para ler: "Que a Iara volte da caça." Embaixo, outra mais nova: "Que o vovô Iago pare de tossir." O vale continua pedindo as mesmas coisas.' },
  { id: 'p7', spot: 'lakepage', title: 'Diário de Elowen, IV', text: 'Joguei a espada do Teodor no lago, como ele pediu. Fiquei esperando ele reclamar que eu errei a mira. A água ficou parada. O silêncio de quem foi tem um som próprio. Leva anos para a gente parar de escutar.' },
  { id: 'p8', spot: 'peakpath', title: 'Diário de Elowen, V (última página)', text: 'Estou velha até para uma elfa. Mandei meu aprendiz de volta com a lanterna. Ele vai achar que é uma missão. Não é. É só um jeito de fazer alguém olhar para este vale com calma, como eu nunca olhei enquanto eles estavam vivos.' },
];

export const GRAVES = [
  ['Teodor', 'Cavaleiro. Contou as chaminés.'],
  ['Iara', 'Caçadora. Olhava para cima.'],
  ['Brás', 'Curandeiro. Ria primeiro.'],
  ['Elowen', 'Voltou para casa.'],
];

// Moradores ---------------------------------------------------------------
export const NPC_INFO = {
  bento: { name: 'Bento', role: 'Ancião de Aldren' },
  iago: { name: 'Iago', role: 'Caçador, neto de Iara' },
  mateus: { name: 'Mateus', role: 'Ferreiro' },
  tomas: { name: 'Tomás', role: 'Pastor' },
};
