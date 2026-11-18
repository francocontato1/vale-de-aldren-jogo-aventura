// Vale de Aldren — conteúdo narrativo
//
// A HISTÓRIA (para quem for mexer aqui):
//
// "Velar" quer dizer duas coisas: vigiar e passar a noite ao lado de um morto. Os Veladores faziam as duas.
// Há seiscentos anos, ninguém em Aldren partia sozinho: quando alguém morria, a família amarrava uma fita na
// árvore, fazia o voto ("Eu velo. Enquanto eu olhar, você fica.") e passava a sentar todo dia, na hora da
// morte, no relógio de sol daquela pessoa, lembrando em voz alta. Às vezes por uma noite. Às vezes por anos.
// O povo venerava Aldren, o primeiro Velador, que se ajoelhou há mil anos para velar alguém e virou pedra:
// o gigante ajoelhado do círculo. Achavam que era santidade. O mestre Auren foi o primeiro a dizer que não:
// a pedra cresce em quem não levanta. Quem segura uma lembrança com força demais vai endurecendo, dos dedos
// para dentro, e a pedra mantém a pessoa viva, sentada, lembrando para sempre.
//
// A família no centro de tudo: Teo e Ilsa perdem a filha, Mira, de febre, aos sete anos. Ilsa vela e começa
// a virar pedra; Teo vai esquecendo a voz da filha e se odeia por isso. Auren convence os jovens a partir
// para salvá-los. Na véspera, na escada, Ilsa manda Teo embora: "Alguém tem que levar ela andando." Ela fica
// no monte (a gigante sentada, que a vila chama de "a Moça"). Auren fica, já sem sentir as pernas (o gigante
// deitado ao pé da torre). Quarenta anos depois, Teo volta velho, esculpe o rosto da filha entre as flores e
// vai ao lago pagar uma promessa: a pedra de sete pulos que ele nunca ensinou a Mira. Não consegue soltar.
// É o gigante do lago, de mão erguida, com a pedra entre os dedos.
//
// Odessa é a Dessa das lembranças: uma menina elfa órfã, adotada pelos Veladores, que nunca conseguiu soltar
// a luz. Prometeu ao Teo tirar o musgo do relógio da Mira "até ele voltar". Ele voltou e não veio jantar. Ela
// continuou limpando, seiscentos anos. Agora as mãos dela estão virando pedra. "Quem velou não fecha a
// vigília": é preciso um estranho, alguém que veja tudo sem se agarrar e dê a cada lembrança um lugar (um
// mapa). Por isso ela escreveu ao pai da Lia, um cartógrafo da Coroa, há doze anos. Ele veio, mediu tudo em
// três dias e não viu nada, mas contou que tinha uma filha que sabia ficar quieta. Quando ele morreu, Odessa
// escreveu para a filha.
//
// Lia tem 24 anos, é de Ancoradouro, no litoral leste. Desde a morte do pai aceita todo trabalho longe de
// casa e deve uma carta à mãe faz um ano. A bússola dele puxa para o leste: ela acha que é defeito. No fim,
// fechadas as oito vigílias, Odessa abre a mão, a pedra do gigante do lago finalmente pula sete vezes, e a
// Lia solta a dela.
//
// Cada fala dublada tem um id. As vozes ficam em a/vox/<id>.mp3 (ver tools/voice). Uma fala cujo texto ou voz
// mudou depois da gravação aparece só como legenda até ser dublada de novo (o jogo confere o texto).

export const CAST = {
  lia: { name: 'Lia', role: 'Cartógrafa' },
  odessa: { name: 'Odessa', role: 'Maga do observatório' },
  anselmo: { name: 'Seu Anselmo', role: 'Pastor' },
  celeste: { name: 'Celeste', role: 'Padeira' },
  tome: { name: 'Tomé', role: 'Menino da vila' },
  irene: { name: 'Irene', role: 'Pintora' },
  bastiao: { name: 'Bastião', role: 'Carpinteiro' },
  marta: { name: 'Dona Marta', role: 'Peixeira, dona da taberna' },
  joca: { name: 'Joca', role: 'Construtor de barcos' },
  tiao: { name: 'Tião', role: 'Pescador' },
  nina: { name: 'Nina', role: 'Menina da praia' },
  davi: { name: 'Seu Davi', role: 'Faroleiro' },
  alva: { name: 'Vésper', role: 'Dragoa dos Veladores' },
  // as pessoas das lembranças (voice: timbre usado na dublagem)
  teo: { name: 'Teo', role: 'Lembrança', voice: 'teo' },
  ilsa: { name: 'Ilsa', role: 'Lembrança', voice: 'ilsa' },
  mira: { name: 'Mira', role: 'Lembrança', voice: 'mira' },
  teo_v: { name: 'Teo', role: 'Lembrança', voice: 'teo_v' },
  auren: { name: 'Mestre Auren', role: 'Lembrança', voice: 'auren' },
  sela: { name: 'Sela', role: 'Lembrança', voice: 'sela' },
  sela_m: { name: 'Sela', role: 'Lembrança', voice: 'sela_m' },
  dessa: { name: 'Dessa', role: 'Lembrança', voice: 'dessa' },
  eco_m: { name: 'Um Velador', role: 'Lembrança' },
  eco_f: { name: 'Uma Veladora', role: 'Lembrança' },
  narrador: { name: '', role: '' },
};
export const voiceOf = (sp) => (CAST[sp] && CAST[sp].voice) || sp;

// id -> [speaker, text, emotion]
export const LINES = {
  // ---------------- abertura ----------------
  intro1: ['narrador', 'Seiscentos anos atrás, no vale de Aldren, ninguém morria sozinho.', 'tender'],
  intro2: ['narrador', 'Quando alguém partia, um Velador sentava ao lado e lembrava, em voz alta, a vida inteira daquela pessoa. Às vezes por uma noite. Às vezes por anos.', 'neutral'],
  intro3: ['narrador', 'Numa manhã de primavera, os Veladores foram embora. Ficaram as pedras, as escadas, e quatro gigantes que ninguém se lembra de ter esculpido.', 'tender'],
  carta: ['odessa', 'Cara Lia. Há doze anos escrevi ao seu pai pedindo um mapa deste vale. Ele veio, mediu tudo em três dias e foi embora sem ver nada. Antes de ir, me disse que tinha uma filha que sabia ficar quieta. Soube da morte dele. Sinto muito. O trabalho é seu, se quiser. Não preciso de estradas. Preciso de alguém que nunca esteve aqui. Odessa, observatório de Aldren.', 'tired'],
  chegada: ['lia', 'Então foi aqui que ele passou três dias. Não me admira que não tenha visto nada. Este lugar não tem pressa nenhuma.', 'tender'],
  li_bussola: ['lia', 'A bússola do pai continua puxando pro leste. Ele dizia que era defeito de fábrica. Nunca mandou consertar.', 'tender'],

  // ---------------- Odessa ----------------
  od_first: ['odessa', 'Lia. Você é mais alta do que eu imaginava. Seu pai falava de você como se você ainda tivesse oito anos. Sente, por favor. A subida é ingrata.', 'tender'],
  od_quem: ['odessa', 'Porque você nunca esteve aqui. Neste vale, quem conhece a história não consegue olhar pra ela sem se agarrar. Eu preciso de olhos de fora.', 'neutral'],
  od_mapa: ['odessa', 'Os Veladores deixaram oito vigílias abertas. Oito lembranças que alguém começou a velar e nunca terminou. Continuam lá, presas nos lugares onde aconteceram. Quero que você veja cada uma até o fim e desenhe no mapa, no lugar certo.', 'neutral'],
  od_fechar: ['odessa', 'Lembrança que tem lugar não precisa de ninguém segurando. Os Veladores chamavam isso de fechar a vigília. E quem velou não fecha. Eu tentei. Toda vez que chego perto, eu seguro.', 'tender'],
  od_como: ['odessa', 'Vá até o lugar na hora em que aconteceu. Sente. Não procure nada, espere. Quando você estiver quieta o bastante, o lugar mostra. A gente chamava isso de lume.', 'neutral'],
  od_hora: ['odessa', 'Cada lugar tem a sua hora. O lago é de manhã cedo. A escada, de fim de tarde. O jardim dos relógios é exigente: quatro e meia. Se chegar fora de hora, sente e deixe o tempo passar.', 'neutral'],
  od_depois: ['odessa', 'E volte pra me contar o que viu. Não precisa ser rápido. Só não demore anos. Disso eu já me encarreguei.', 'tender'],
  od_cha: ['odessa', 'Chá? Está morno. Sempre está. Não me pergunte por quê.', 'neutral'],
  od_n2: ['odessa', 'O Auren dizia que a gente não lembra das pessoas. Lembra do jeito que olhava pra elas. Por isso tem lembrança que muda com os anos. Quem muda é quem olha.', 'tender'],
  od_n3: ['odessa', 'Seiscentos anos, e eu ainda subo esta colina toda noite pra ver se a estrada mudou. Não muda. Estrada não tem esse costume.', 'tired'],
  od_n4: ['odessa', 'Faltam poucas. É estranho. Achei que eu ia sentir alívio. Estou com medo de ficar sem nada pra segurar.', 'sad'],
  od_todos: ['odessa', 'Oito. Você viu tudo, do começo ao fim. Hoje à noite eu fecho as vigílias. Suba depois que escurecer. Eu não quero fazer isso sozinha.', 'tender'],
  od_noite: ['odessa', 'Ainda não. Vigília se fecha de noite, que é quando elas começam. Volte quando as estrelas aparecerem.', 'neutral'],
  od_pos1: ['odessa', 'Desci até a vila hoje. Comprei pão. A Celeste quase deixou a bandeja cair.', 'happy'],
  od_pos2: ['odessa', 'O mapa está pronto. Pode ir quando quiser. Ou não ir. Ninguém aqui vai achar estranho você ficar.', 'tender'],
  od_cha2: ['odessa', 'Chá? Cuidado, está quente. Faz trinta anos que eu não digo isso.', 'happy'],
  // o que a Odessa conta depois de cada lembrança (uma vez cada, na ordem em que a Lia encontra)
  od_r_lago: ['odessa', 'A Mira. Seis anos, banguela, e já jogava pedra melhor do que muito adulto. Eu tinha a idade dela, contando em anos de elfa. Fomos amigas um verão só.', 'tender'],
  od_r_arvore: ['odessa', 'Um nó simples e um duplo. Todo mundo reparou. Ninguém disse nada. Num velório, o nó diz o que ninguém tem coragem de dizer.', 'sad'],
  od_r_circulo: ['odessa', 'Então você me viu. A menina que não conseguia soltar a luz. Era eu. O Auren me achou na estrada, sozinha, e me trouxe pra cá. Ele me chamava de Dessa. Ninguém mais chama.', 'sad'],
  od_r_torre: ['odessa', 'O povo rezava pro gigante do círculo como se ele fosse santo. O Auren foi o primeiro a dizer em voz alta que era só um homem cansado demais pra levantar. Quase expulsaram ele do vale.', 'neutral'],
  od_r_relogios: ['odessa', 'Quatro e meia. Eu limpo aquele relógio toda tarde, há seiscentos anos. Ele pediu isso pra ninguém achar que ela não existiu. Ninguém nunca passou por lá pra achar nada.', 'tender'],
  od_r_escada: ['odessa', 'Eu vi os dois daqui de cima, com a luneta. Ela no último degrau, ele no primeiro. Fiquei a noite inteira esperando um deles mudar de lugar. Nenhum mudou.', 'sad'],
  od_r_monte: ['odessa', 'Os da vila chamam ela de Moça e deixam pão no pé dela. Ela ia achar graça. A Ilsa nunca comia nada antes do meio-dia.', 'tender'],
  od_r_rosto: ['odessa', 'Ele voltou velho, com um cinzel e pão duro na sacola. Esculpiu o rosto da filha porque já não lembrava da voz. Depois desceu até o lago. Eu esquentei o jantar duas vezes.', 'sad'],
  // as mãos (depois de três lembranças)
  od_maos: ['odessa', 'Você deve ter reparado que eu nunca pego a xícara pela asa. Eu não sinto mais as mãos. Começou nos dedos, trinta anos atrás. Este inverno passou do pulso. É pedra. É o que acontece com quem vela tempo demais.', 'tired'],
  od_maos2: ['odessa', 'Também. Mas não é só por mim. Vigília aberta não deixa ninguém descansar. Nem quem velou, nem quem foi velado.', 'tender'],
  // o passado da Lia (depois de alguma amizade)
  od_lia1: ['odessa', 'Posso fazer uma pergunta de velha? Por que você aceitou? Uma desconhecida escreve dizendo que conheceu o seu pai, e você atravessa o reino.', 'neutral'],
  li_od_longe: ['lia', 'Porque era longe. Desde que ele morreu, eu aceito tudo o que fica longe de casa.', 'sad'],
  od_lia2: ['odessa', 'Eu fiz isso por duzentos anos, sem sair do lugar. Dá pra fugir parada, sabia? É até mais fácil.', 'tender'],
  li_od_mapa: ['lia', 'Porque você escreveu que ele falou de mim. Ele quase nunca falava de mim. Nem comigo.', 'sad'],
  od_lia3: ['odessa', 'Hum. As pessoas raramente dizem as coisas pra quem precisa ouvir. Dizem pra uma velha num observatório.', 'tender'],
  od_pai: ['odessa', 'Tem uma coisa que eu devia ter contado no primeiro dia. Seu pai, quando esteve aqui, disse que você desenhava bichos nas margens dos mapas dele, e que ele nunca teve coragem de apagar. Disse que você sabia ficar quieta. Ele, não.', 'tender'],
  li_od_pai: ['lia', 'Ele nunca me disse isso.', 'sad'],
  od_pai2: ['odessa', 'Eu sei. Por isso estou dizendo eu.', 'tender'],
  od_carta: ['odessa', 'Do Davi? Ele ainda escreve como se eu tivesse vinte anos. Espere aqui um instante.', 'tender'],
  od_resposta: ['odessa', 'Leve isto pra ele. Demorei, a letra não sai mais como antes. Diga que hoje à noite ele olhe pra cá.', 'tender'],
  od_alva: ['odessa', 'A sombra no céu é a Vésper. Os Veladores diziam que ela levava pro alto as vigílias que se fechavam. Faz seiscentos anos que não tem nada pra levar. Se chegar devagar, ela deixa você se aproximar.', 'tender'],
  od_fita: ['odessa', 'Você refez os nós da fita da Mira? Obrigada. Eu nunca tive coragem de encostar nela.', 'tender'],

  // ---------------- Seu Anselmo (fala devagar, conta história, perde o fio) ----------------
  an_first: ['anselmo', 'Boa tarde, moça. É você que veio trabalhar pra Odessa? Hum. Faz tempo que ela não chama ninguém. A última vez foi um homem de botas boas que não parava quieto.', 'neutral'],
  an_gigantes: ['anselmo', 'Desde menino. Meu avô dizia que não são estátuas. São gente que sentou pra esperar alguém e esperou demais. Por isso a gente não aponta pra eles. Não é medo. É respeito. Não se aponta pra quem está rezando.', 'tender'],
  an_veladores: ['anselmo', 'Foram embora. Numa manhã só, dizem. Meu avô achava que eles cansaram de lembrar. Eu acho que ninguém cansa de lembrar. Cansa é de esperar.', 'neutral'],
  an_c1: ['anselmo', 'Ovelha não lembra de nada, sabia? Perde a cria de manhã, de tarde já está pastando. A gente chama isso de burrice. Eu já não tenho tanta certeza.', 'tender'],
  an_c2: ['anselmo', 'Quando o vento vira e cheira a chuva, olhe pra gigante do monte. Ela sempre fica com uma nuvem no ombro. Minha avó dizia que era o xale dela.', 'tender'],
  an_c3: ['anselmo', 'Minha mulher se foi faz onze anos. Eu converso com ela de manhã, enquanto tiro o leite. Não conta pra Celeste, senão ela faz sopa e vem me visitar.', 'happy'],
  an_noite: ['anselmo', 'Já é noite? Nessa idade a gente conta estrela pra dormir. Eu nunca passo das trinta.', 'tired'],
  an_c4: ['anselmo', 'Você foi até a Maré? A Marta fala por três, mas o peixe dela vale por quatro.', 'happy'],
  an_c5: ['anselmo', 'Quando eu era moço, desci até o mar com as ovelhas. Elas olharam a água um tempão e voltaram. Ovelha é bicho sábio.', 'tender'],
  an_r_monte: ['anselmo', 'Subiu no monte, foi? A gente chama aquela lá de Moça. Minha avó deixava um pão no pé dela todo dia de colheita. Dizia que moça que fica pra trás sente fome.', 'tender'],
  an_r_lago: ['anselmo', 'Pedra pulando no lago? Meu recorde é onze. Tá, nove. Tá bom, eram seis. Mas o lago estava agitado naquele dia.', 'happy'],
  an_lia1: ['anselmo', 'E você, moça? É de onde? Tem cara de quem veio de longe e ainda não chegou direito.', 'neutral'],
  li_an1: ['lia', 'De Ancoradouro, no litoral. Minha mãe tem uma papelaria lá. Meu pai desenhava estradas pra Coroa. Passava meses fora.', 'neutral'],
  an_lia2: ['anselmo', 'Estrada é coisa boa. Mas tem gente que conhece todas e não acha a de casa. Não falo do seu pai, não. Falo de mim, quando era moço.', 'tender'],

  // ---------------- Celeste (rápida, mandona, carinhosa, sempre comida) ----------------
  ce_first: ['celeste', 'Gente nova! Entra, que o pão acabou de sair. Você é a moça da Odessa? Ela encomendou pão pra você. Três por dia, ela disse. Eu disse que ninguém come três pães por dia. Ela disse que cartógrafo anda muito.', 'excited'],
  ce_odessa: ['celeste', 'A Odessa? Desce uma vez por ano, se tanto. Fica parada na porta sentindo o cheiro e vai embora sem comprar. Ano passado eu pus um pão quentinho na mão dela. Ela segurou como quem segura uma pedra.', 'tender'],
  ce_ruinas: ['celeste', 'Minha avó dizia que eles velavam os mortos por anos. Anos! Eu velei o Elias uma noite e achei que ia junto. Desculpa. Você perguntou das pedras.', 'sad'],
  ce_c1: ['celeste', 'Prova esse. Não, esse não, esse queimou. Esse aqui. Viu? Leva dois. A subida pro observatório é comprida e a Odessa só oferece chá morno.', 'happy'],
  ce_c2: ['celeste', 'Meu marido construía barcos. Faz seis invernos que ele se foi. Eu ainda faço pão pra dois. O que sobra eu dou pros passarinhos. Eles agradecem do jeito deles.', 'sad'],
  ce_c3: ['celeste', 'O Tomé passou aqui correndo de novo. Aquele menino acha que vai acordar os gigantes. Deixa ele. Alguém tem que tentar.', 'happy'],
  ce_noite: ['celeste', 'O forno já esfriou, querida. Volta amanhã cedo, que tem pão de mel.', 'tired'],
  ce_cesta: ['celeste', 'Você vai pros lados do mar? Então leva este pão pra Marta, da taberna da Maré. A gente troca pão por peixe desde antes de você nascer.', 'happy'],
  ce_peixe: ['celeste', 'Peixe da Marta! Ela sempre manda o melhor. Sabia que foi ela que me ensinou a fazer pão de sal? Obrigada, querida. Volta amanhã que eu guardo um pra você.', 'excited'],
  ce_barco: ['celeste', 'Você velejou o barco do Elias? Que bom. Ele ia gostar de saber que alguém ainda leva ele pra ver o mar.', 'sad'],
  ce_c4: ['celeste', 'A Marta e eu trocamos pão por peixe faz trinta anos. Nunca anotamos nada. Ela jura que eu devo dois peixes. Eu juro que ela me deve um pedido de desculpas desde o casamento dela.', 'happy'],
  ce_r_relogios: ['celeste', 'Um relógio que marca a hora em que a pessoa morreu? O do Elias marcaria cinco da manhã. Eu estava acendendo o forno. Ainda acendo às cinco. Vai ver eu também tenho um relógio desses.', 'sad'],
  ce_um: ['celeste', 'Ontem eu fiz pão pra um. Só pra um. Sobrou espaço no forno e eu fiquei olhando aquele buraco um tempão. Depois coloquei um bolo.', 'tender'],
  ce_lia1: ['celeste', 'Você está comendo direito, menina? E a sua mãe, sabe que você está aqui no fim do mundo?', 'neutral'],
  li_ce1: ['lia', 'Mais ou menos. Faz um ano que eu não escrevo pra ela. Toda vez que eu começo, não sei o que dizer.', 'sad'],
  ce_lia2: ['celeste', 'Escreve o que você comeu. Mãe só quer saber disso. O resto ela adivinha.', 'tender'],
  ce_lia3: ['celeste', 'Tá bom, não pergunto mais. Mas da próxima vez que for pra casa, leva um pão. Pão fala por você.', 'tender'],

  // ---------------- Tomé (criança: exagera, emenda tudo) ----------------
  to_first: ['tome', 'Você é cartógrafa? De verdade? Então você sabe onde fica tudo! Me diz: o que os gigantes estão olhando?', 'excited'],
  to_naosei: ['tome', 'Ah. Eu acho que estão esperando alguém. Por isso não piscam.', 'happy'],
  to_porque: ['tome', 'Porque eu quero acordar eles! Todo dia eu grito bom dia pro gigante do lago. Um dia ele responde. A tia Celeste diz que paciência é a magia mais forte. Mas é a mais chata também.', 'excited'],
  to_c1: ['tome', 'Sabia que se você deitar na grama e olhar as nuvens, parece que é a terra que está andando?', 'excited'],
  to_c2: ['tome', 'Eu achei uma pedra com um desenho de estrela! Escondi. Não vou contar onde. Tá bom, é perto do círculo de pedras. Mas não conta pra ninguém!', 'happy'],
  to_c3: ['tome', 'Quando eu crescer eu vou construir uma escada até a lua. Com corrimão.', 'happy'],
  to_pos: ['tome', 'Você viu? A mão do gigante do lago! Ele jogou! Eu falei que eles estavam acordados por dentro!', 'excited'],
  to_nina: ['tome', 'Você vai pro mar? Lá mora a Nina. Ela diz que já viu uma baleia. Eu acho que é mentira. Entrega este desenho pra ela? É um gigante. Pra ela ver que aqui também tem coisa grande.', 'excited'],
  to_concha: ['tome', 'Dá pra ouvir o mar mesmo! Ou é o meu ouvido? Tanto faz. Vou guardar debaixo do travesseiro.', 'excited'],
  to_c4: ['tome', 'A Nina viu uma baleia. Eu vi um gigante. Empate.', 'happy'],
  to_r_lago: ['tome', 'Você viu gente jogando pedra no lago? Me ensina! Eu só consigo fazer a pedra afundar. Com estilo, mas afundar.', 'excited'],
  to_r_pulos: ['tome', 'A tia Celeste falou que você fez a pedra pular um montão de vezes! Amanhã eu vou lá e bato o seu recorde. Ou empato. Ou pelo menos molho o pé.', 'excited'],
  to_lia1: ['tome', 'Você tem pai? O meu foi pro mar e voltou com uma tatuagem de peixe. Era pra ser uma baleia.', 'happy'],
  li_to1: ['lia', 'Tinha. Ele desenhava mapas. Foi ele que me ensinou.', 'tender'],
  to_lia2: ['tome', 'Ah. Desculpa. Quer ver a minha pedra de estrela? Não, eu não vou mostrar. Mas você pode imaginar ela. Ela é muito bonita.', 'tender'],

  // ---------------- Irene (hesitante, se corrige o tempo todo) ----------------
  ir_first: ['irene', 'Ah, desculpa, não vi você chegar. Estou tentando pintar a luz em cima do lago. É impossível. Quando eu acerto a cor, a luz já mudou.', 'tender'],
  ir_porque: ['irene', 'Porque a parte boa não é o quadro. É a meia hora olhando. O quadro é só a desculpa que eu dou pros outros.', 'tender'],
  ir_ver: ['irene', 'Pode. Está horrível. Mas olha este canto aqui. O reflexo. Por um segundo, eu acertei.', 'happy'],
  ir_c1: ['irene', 'Eu acho que os Veladores não pintavam. Quem pinta um lugar consegue ir embora dele depois. Fica com o quadro. Eles, pelo jeito, não conseguiam ir embora de nada.', 'tender'],
  ir_c2: ['irene', 'Já reparou que à noite o lago vira outro céu? Às vezes eu não sei em qual dos dois as estrelas estão de verdade.', 'tender'],
  ir_c3: ['irene', 'Colho camomila de manhã, pinto à tarde, durmo cedo. As pessoas acham pouco. Eu acho que é o suficiente.', 'neutral'],
  ir_c4: ['irene', 'Tentei pintar o mar uma vez. Usei todo o azul que eu tinha e ainda faltou.', 'happy'],
  ir_mao: ['irene', 'Já reparou na mão do gigante do lago? Eu pintei ela umas vinte vezes. Só semana passada eu vi: os dedos estão fechados em volta de alguma coisa. Pequena. Uma pedra, eu acho.', 'neutral'],
  ir_r_lago: ['irene', 'Você viu alguma coisa no lago, não viu? Dá pra ver na sua cara. Eu pinto ali faz três anos e nunca vi nada. Acho que eu falo demais com a tela. Ou de menos. Não sei.', 'tender'],
  ir_lia1: ['irene', 'Você desenha, né? Quer dizer, claro que desenha, você é cartógrafa. Que pergunta. Desculpa.', 'neutral'],
  li_ir1: ['lia', 'Quando eu era pequena, meu pai fazia os mapas e eu desenhava nas margens. Bichos, gente pequenininha, casas com fumaça. Ele deixava. Depois eu parei.', 'tender'],
  ir_lia2: ['irene', 'Por quê? Não, desculpa, não precisa responder. É que as margens são a melhor parte. Eu acho. Enfim. Volta a desenhar nelas.', 'tender'],

  // ---------------- Bastião (seco, frase curta) ----------------
  ba_first: ['bastiao', 'Hum. Visita. Se veio pedir conserto, entra na fila. A fila é o vale inteiro.', 'neutral'],
  ba_conhecer: ['bastiao', 'Então tá. Bastião. Carpinteiro. Conserto o que quebra. Que é tudo, com o tempo.', 'neutral'],
  ba_ponte: ['bastiao', 'Uma ponte. Os Veladores fizeram uma de pedra, ali no riacho seco. Caiu faz trezentos anos. Ninguém precisa dela, o riacho nem tem água. Mas ponte caída parece frase pela metade. Me incomoda.', 'neutral'],
  ba_c1: ['bastiao', 'Serrote. Martelo. Paciência. Nessa ordem.', 'neutral'],
  ba_c2: ['bastiao', 'A Odessa me pediu uma estante nova. Pra quê, eu perguntei. Pra guardar o que eu ainda não li, ela disse. Vai precisar de mil estantes.', 'happy'],
  ba_c3: ['bastiao', 'Os Veladores cortavam pedra como eu nunca vi. Nenhuma junta torta. Mas a escada deles não leva a lugar nenhum. Bons de mão, ruins de plano. Igual a mim.', 'happy'],
  ba_c4: ['bastiao', 'Cimbre montado. Falta pedra, tempo e coragem. Pedra tem.', 'neutral'],
  ba_c5: ['bastiao', 'O Joca pediu carvalho. Pra barco. Barco e ponte levam pro outro lado. Só isso.', 'neutral'],
  ba_r_escada: ['bastiao', 'Você foi na escada. Viu o último degrau? Gasto de um jeito diferente dos outros. Não é de pé. É de gente sentada. Muito tempo.', 'neutral'],
  ba_quase: ['bastiao', 'Faltam três pedras. Quando você terminar esse seu mapa, eu termino a minha frase.', 'neutral'],
  ba_pronta: ['bastiao', 'Pronta. Não serve pra nada. Ficou bonita.', 'happy'],
  ba_lia1: ['bastiao', 'Cartógrafa. Seu pai também?', 'neutral'],
  li_ba1: ['lia', 'Ele desenhava estradas. E sabia de cor onde cada ponte tinha caído.', 'tender'],
  ba_lia2: ['bastiao', 'Hum. Então ele ia gostar da minha.', 'tender'],

  // ---------------- lembranças ----------------
  // 1 · O lago — uma manhã de primavera. Teo, Ilsa e a filha, Mira, de seis anos.
  lago1: ['teo', 'Olha a mão, Mira. Assim, de lado. Como se fosse cortar a água.', 'tender'],
  lago2: ['mira', 'Assim?', 'excited'],
  lago3: ['ilsa', 'Mais baixo, filha. Abaixa o ombro.', 'tender'],
  lago4: ['mira', 'Foi! Mãe, conta!', 'excited'],
  lago5: ['ilsa', 'Uma, duas, três. Três!', 'happy'],
  lago6: ['mira', 'O pai faz sete.', 'neutral'],
  lago7: ['teo', 'O pai treina faz trinta anos. Amanhã a gente volta e eu te ensino o segredo.', 'happy'],
  lago8: ['mira', 'Que segredo?', 'surprised'],
  lago9: ['teo', 'Amanhã.', 'happy'],
  lago10: ['mira', 'Mãe, essa aqui tem um furo. Essa não pula, né?', 'neutral'],
  lago11: ['ilsa', 'Não. Essa é de guardar.', 'tender'],
  lago_r: ['lia', 'Amanhã, ele disse. E o lago ficou quieto como quem sabe de alguma coisa.', 'tender'],
  lago_r2: ['lia', 'Ele voltou pra ensinar o segredo. A mão do gigante ainda está erguida. Ele nunca soltou a pedra.', 'sad'],
  // 2 · O círculo — uma noite de verão. O mestre Auren ensina os aprendizes; ao lado, o gigante ajoelhado.
  circ1: ['auren', 'Fechem os olhos. Pensem em alguém que vocês perderam. Não no rosto. Numa coisa pequena. O jeito de rir. Um cheiro.', 'tender'],
  circ2: ['sela_m', 'Posso pensar no meu cachorro?', 'neutral'],
  circ3: ['auren', 'Pode. Cachorro conta.', 'happy'],
  circ4: ['auren', 'Agora abram a mão. Devagar. Deixem ir.', 'tender'],
  circ5: ['sela_m', 'Subiu! Mestre, a minha subiu!', 'excited'],
  circ6: ['auren', 'Dessa?', 'neutral'],
  circ7: ['dessa', 'A minha não sobe. Fica aqui, pesando.', 'sad'],
  circ8: ['auren', 'Em quem você pensou?', 'tender'],
  circ9: ['dessa', 'Na minha mãe. Se eu soltar, ela vai embora de novo.', 'sad'],
  circ10: ['auren', 'Não vai. Vai pra onde dá pra ver. Olhem o Aldren ali, ajoelhado. Ele também não conseguiu soltar. Faz quatrocentos anos.', 'tender'],
  circ11: ['auren', 'O povo acende vela pra ele como se fosse santo. Eu não quero isso pra nenhum de vocês.', 'neutral'],
  circ_r: ['lia', 'Uma menina de orelhas pontudas que não conseguia abrir a mão. Ele a chamou de Dessa.', 'surprised'],
  // 3 · A árvore — inverno do ano seguinte. A febre durou três dias.
  arvore1: ['ilsa', 'Me dá a pedra.', 'sad'],
  arvore2: ['teo', 'A furada? Ela ia querer levar.', 'sad'],
  arvore3: ['ilsa', 'Ela vai ficar aqui. Então a pedra fica com ela.', 'neutral'],
  arvore4: ['teo', 'Ilsa, a gente não precisa fazer do jeito antigo. Amarrar, dizer o nome e voltar pra casa. Tem família que faz assim.', 'tender'],
  arvore5: ['ilsa', 'Tem família que esquece em um ano.', 'neutral'],
  arvore6: ['teo', 'Eu não vou esquecer ela.', 'sad'],
  arvore7: ['ilsa', 'Então diz. Do jeito certo.', 'neutral'],
  arvore8: ['teo', 'Eu velo. Enquanto eu olhar, você fica.', 'sad'],
  arvore9: ['ilsa', 'Eu velo. Enquanto eu olhar, você fica.', 'tender'],
  arvore10: ['ilsa', 'Você deu nó simples, Teo.', 'neutral'],
  arvore11: ['teo', 'Eu sei.', 'sad'],
  arvore_r: ['lia', 'Dois nós na mesma fita. Um duplo, bem apertado. Um simples, que desata se alguém puxar.', 'tender'],
  // 4 · O jardim dos relógios — dois anos depois, às quatro e meia da tarde.
  rel1: ['dessa', 'Você vem todo dia nessa hora.', 'neutral'],
  rel2: ['teo', 'Quatro e meia. Foi quando ela parou de respirar. A Ilsa quis um relógio que marcasse.', 'tender'],
  rel3: ['dessa', 'Todos esses relógios são de gente morta?', 'neutral'],
  rel4: ['teo', 'Todos. Cada família senta no seu, na sua hora. Tem gente que senta há quarenta anos.', 'neutral'],
  rel5: ['dessa', 'E você vai sentar quarenta anos?', 'neutral'],
  rel6: ['teo', 'Eu não lembro mais da voz dela, Dessa. Eu sento aqui, tento lembrar, e cada dia vem um pouco menos. A Ilsa lembra de tudo. A Ilsa não sai mais de casa.', 'sad'],
  rel7: ['dessa', 'Então para de vir.', 'neutral'],
  rel8: ['teo', 'Se um dia eu não vier, você tira o musgo da sombra? Só isso. Pra ninguém achar que ela não existiu.', 'tender'],
  rel9: ['dessa', 'Até quando?', 'neutral'],
  rel10: ['teo', 'Até eu voltar.', 'tender'],
  rel_r: ['lia', 'Todos os relógios estão cobertos de musgo. Menos este. Alguém ainda limpa a sombra dele.', 'surprised'],
  // 5 · A torre — outono, três anos depois do enterro.
  torre1: ['sela', 'Mestre, desce daí. A rachadura já passou do terceiro andar.', 'sad'],
  torre2: ['auren', 'Daqui eu vejo o vale inteiro, Sela. Hoje eu contei. Dezenove pessoas sentadas no mesmo lugar desde ontem.', 'neutral'],
  torre3: ['sela', 'Estão velando.', 'neutral'],
  torre4: ['auren', 'Estão virando o Aldren. Pega a minha mão.', 'tired'],
  torre5: ['sela', 'Está gelada.', 'surprised'],
  torre6: ['auren', 'Faz um ano que eu não sinto os pés. Quarenta anos velando a minha mulher. Eu chamei isso de amor. Era medo de levantar.', 'tired'],
  torre7: ['sela', 'O conselho não vai aceitar. Eles rezam pro Aldren.', 'sad'],
  torre8: ['auren', 'Por isso vocês vão embora. Os jovens. Na primavera. Um lugar onde lembrar virou reza não é lugar pra ninguém crescer.', 'neutral'],
  torre9: ['sela', 'E a Ilsa? Ela não sai do relógio da Mira. As mãos dela estão iguais às suas.', 'sad'],
  torre10: ['auren', 'Então leve ela. Nem que seja carregada.', 'tender'],
  torre_r: ['lia', 'Dezenove pessoas sentadas sem levantar. E o vale inteiro chamando isso de devoção.', 'tender'],
  // 6 · A escada — na véspera da partida. Ilsa estava no último degrau desde a manhã.
  escada1: ['teo', 'Ilsa. Desce. As carroças saem com o sol.', 'sad'],
  escada2: ['ilsa', 'Eu sei a que horas elas saem.', 'neutral'],
  escada3: ['teo', 'A Sela arrumou as suas coisas. Eu levo o relógio da Mira, se você quiser. A gente arranca a placa e leva.', 'tender'],
  escada4: ['ilsa', 'E ela fica aqui sozinha? Sem ninguém pra dizer o nome dela?', 'sad'],
  escada5: ['teo', 'Ela não está aqui, Ilsa. Ela não está em lugar nenhum.', 'sad'],
  escada6: ['ilsa', 'Então me diz como era a voz dela.', 'neutral'],
  escada7: ['teo', 'Eu não sei. Eu não sei mais.', 'sad'],
  escada8: ['ilsa', 'Eu sei. Eu lembro de tudo, Teo. Se eu for embora, eu esqueço. E se eu esquecer, ela morre de verdade.', 'sad'],
  escada9: ['teo', 'Olha as suas mãos.', 'sad'],
  escada10: ['ilsa', 'Eu já olhei.', 'tender'],
  escada11: ['ilsa', 'Vai. Alguém tem que levar ela andando. Eu levo ela parada.', 'tender'],
  escada12: ['teo', 'E se eu subir?', 'sad'],
  escada13: ['ilsa', 'Aí a gente vira pedra junto, e ninguém leva ela pra lugar nenhum. Não sobe, Teo.', 'tender'],
  escada_r: ['lia', 'Ele não subiu. Ela não desceu. E os dois achavam que estavam salvando alguém.', 'sad'],
  // 7 · O mirante — na manhã da partida.
  monte1: ['ilsa', 'Olha, Mira. Lá vão eles. Daqui as carroças parecem formiga.', 'tender'],
  monte2: ['ilsa', 'A tia Sela vai na terceira, de lenço amarelo. Ela não olha pra trás. Nunca olhou. Eu é que olho por nós duas.', 'sad'],
  monte3: ['ilsa', 'E o seu pai vai a pé, por último. Devagar. Ele sempre foi devagar pra ir embora.', 'tender'],
  monte4: ['ilsa', 'Ele parou. Está olhando pra cá.', 'surprised'],
  monte5: ['ilsa', 'Não acena, filha. Se a gente acenar, ele volta. E se ele voltar, ele fica.', 'sad'],
  monte6: ['ilsa', 'Pronto. Foi. Agora somos só nós duas. Eu fico mais um pouco. Só mais um pouco.', 'tender'],
  monte_r: ['lia', 'Só mais um pouco. Ela disse isso há seiscentos anos.', 'tender'],
  // 8 · O rosto entre as flores — quarenta anos depois.
  rosto1: ['dessa', 'Teo?', 'surprised'],
  rosto2: ['teo_v', 'Dessa. Você não envelheceu nada. Eu envelheci por nós dois.', 'happy'],
  rosto3: ['dessa', 'Os outros vieram?', 'neutral'],
  rosto4: ['teo_v', 'Não. Estão espalhados pelo litoral, criando netos. Esqueceram o caminho de volta. Fez bem pra eles.', 'tender'],
  rosto5: ['dessa', 'De quem é esse rosto?', 'neutral'],
  rosto6: ['teo_v', 'Da Mira. Eu esqueci a voz dela no terceiro inverno. O rosto, não. Vou deixar o rosto aqui antes de esquecer também.', 'tender'],
  rosto7: ['dessa', 'A Ilsa está lá em cima, no monte. Ela virou...', 'sad'],
  rosto8: ['teo_v', 'Eu vi da estrada. Ela me pediu pra não subir. Eu não subo.', 'sad'],
  rosto9: ['teo_v', 'Vou até o lago. Devo uma pedra de sete pulos pra alguém.', 'tender'],
  rosto10: ['dessa', 'Volta pro jantar.', 'tender'],
  rosto_r: ['lia', 'Um rosto de criança sorrindo no meio das flores. Alguém deixou ele aqui pra não precisar mais carregar.', 'tender'],
  rosto_r2: ['lia', 'É a Mira. Ele deixou o rosto dela aqui e foi pagar a promessa do lago.', 'tender'],
  // esperando a hora certa de cada lugar
  li_circ_dia: ['lia', 'Este lugar precisa das estrelas. Vou esperar a noite.', 'neutral'],
  li_hora_lago: ['lia', 'A névoa já foi embora. Este lugar lembra melhor de manhã cedo.', 'neutral'],
  li_hora_torre: ['lia', 'Este lugar pede o fim da tarde. Vou esperar o sol baixar.', 'neutral'],
  li_hora_monte: ['lia', 'Daqui de cima, a vista é de manhã. Vou esperar o dia nascer.', 'neutral'],
  li_hora_arvore: ['lia', 'Aqui o que importa é a luz da tarde. Vou esperar um pouco.', 'neutral'],
  li_hora_rel: ['lia', 'Quatro e meia, ela disse. Nem um minuto antes.', 'neutral'],
  li_hora_escada: ['lia', 'Esta escada pede o entardecer. Vou ficar aqui até lá.', 'neutral'],
  li_hora_rosto: ['lia', 'As flores estão fechadas. Melhor esperar o dia.', 'neutral'],

  // ---------------- final: a noite em que as vigílias se fecham ----------------
  fim1: ['odessa', 'Chegou a hora. Fica aqui do meu lado.', 'tender'],
  fim2: ['odessa', 'Oito vigílias. Você viu cada uma até o fim e deu um lugar pra elas no seu mapa. Agora ninguém precisa segurar.', 'tender'],
  fim_dessa: ['odessa', 'Eu prometi ao Teo que limpava o relógio da Mira até ele voltar. Ele voltou e não veio jantar. Eu continuei limpando. Seiscentos anos, Lia.', 'sad'],
  fim3: ['lia', 'E agora?', 'tender'],
  fim4b: ['odessa', 'Agora eu abro a mão. Do jeito que o Auren ensinou. Faz seiscentos anos que eu tento.', 'tender'],
  fim5: ['odessa', 'Mira. Ilsa. Teo. Auren. Aldren.', 'tender'],
  fim6: ['odessa', 'Pronto. Podem ir.', 'tender'],
  fim_lago: ['lia', 'Olha. Lá embaixo, no lago.', 'surprised'],
  fim_pulos: ['lia', 'Um. Dois. Três, quatro, cinco. Seis. Sete.', 'tender'],
  fim7: ['anselmo', 'Faz oitenta anos que eu não fico acordado até tão tarde.', 'happy'],
  fim8: ['celeste', 'Trouxe pão pra todo mundo. Até pra você, Odessa. Não adianta fazer essa cara.', 'happy'],
  fim_marta: ['marta', 'Fechei a taberna cedo, olha só. A primeira vez em trinta anos! O Tião quase chorou. Ele ia pedir a sopa.', 'excited'],
  fim_nina: ['nina', 'É a baleia cantando? Não? Como é que você sabe?', 'excited'],
  fim_davi: ['davi', 'Lá embaixo, o farol está aceso. Hoje eu deixei ele sozinho. Ele que me desculpe. Daqui eu vejo os dois.', 'tender'],
  fim9: ['tome', 'Eu falei! Eu falei que eles estavam acordados!', 'excited'],
  fim_lia0: ['odessa', 'E você, cartógrafa? Não está segurando nada?', 'tender'],
  fim_lia: ['lia', 'A bússola do meu pai. Puxa pro leste desde que ele morreu. Eu achava que era defeito.', 'sad'],
  fim_lia2: ['odessa', 'E o que fica a leste?', 'tender'],
  fim_lia3: ['lia', 'Ancoradouro. A minha mãe.', 'tender'],
  fim_lia4: ['lia', 'Pode ir, pai.', 'tender'],
  fim10: ['odessa', 'Lia. As minhas mãos. Estão quentes.', 'surprised'],
  fim11: ['narrador', 'Em Aldren, nada se perde. Só muda de lugar.', 'tender'],
  li_carta_mae: ['lia', 'Mãe. Desculpa a demora. Estou num vale onde as pessoas viravam pedra de tanta saudade. Não quero isso pra nós duas. Chego antes da primavera. Guarda um lugar na mesa. Lia.', 'tender'],

  // ---------------- pensamentos de Lia (descobertas e momentos) ----------------
  li_espada: ['lia', 'Uma espada fincada na pedra, com o cabo pra cima. Um jeito antigo de velar alguém que morreu lutando.', 'tender'],
  li_aqueduto: ['lia', 'Um aqueduto que não leva mais água a lugar nenhum. As ovelhas dormem na sombra dos arcos. Ainda serve. Só que de outro jeito.', 'tender'],
  li_balanco: ['lia', 'Alguém pendurou este balanço há muito tempo. As cordas já foram trocadas várias vezes. Gerações de gente cuidando de um balanço.', 'happy'],
  li_ponte: ['lia', 'A ponte dos Veladores, partida no meio. O riacho secou faz séculos. Mesmo assim, o Bastião quer terminar a frase.', 'tender'],
  li_ponte2: ['lia', 'A ponte está inteira. Não leva a lugar nenhum que já não desse pra ir. Atravessei duas vezes, só pra garantir.', 'happy'],
  li_santuario: ['lia', 'Estatuetas cobertas de musgo no meio da floresta. Alguém deixou flores frescas aqui. Hoje.', 'surprised'],
  li_banco: ['lia', 'Um banco virado pro oeste. Quem colocou ele aqui sabia exatamente onde o sol se põe.', 'tender'],
  li_poco: ['lia', 'Dizem que, numa noite sem vento, dá pra ver as estrelas no fundo deste poço. Mesmo de dia.', 'neutral'],
  li_poco2: ['lia', 'A corda do poço é nova. Alguém tira água daqui toda tarde e leva até o jardim dos relógios.', 'tender'],
  li_noite: ['lia', 'Já escureceu. Melhor acender a lanterna.', 'neutral'],
  li_sentar1: ['lia', 'Daqui dá pra ouvir o vento passando na grama. Parece o mar.', 'tender'],
  li_sentar2: ['lia', 'Vou ficar mais um pouco. Ninguém está me esperando com pressa.', 'tender'],
  li_sentar3: ['lia', 'As nuvens andam tão devagar. Ou sou eu que finalmente parei.', 'tender'],
  li_sentar4: ['lia', 'O pai nunca sentava em lugar nenhum. Dizia que mapa não se faz sentado. Acho que ele estava um pouco errado.', 'tender'],
  li_mapa_cheio: ['lia', 'Oito lugares. Oito pedaços da mesma família. Já sei como termina. Só falta a Odessa.', 'tender'],
  li_estrela: ['lia', 'Uma estrela cadente. Esqueci de fazer um pedido. Tudo bem. Ver já foi bom.', 'happy'],
  // ---------------- Vila da Maré ----------------
  ma_first: ['marta', 'Olha só, gente nova na Maré! Senta, não repara a bagunça, o Joca deixa serragem até no meu pão. Você é a moça da Odessa? Ela mandou avisar que você vinha. Mandou avisar há três anos, mas veio, né? Está com fome? Claro que está.', 'excited'],
  ma_odessa: ['marta', 'Todo mundo conhece. Ela desce aqui uma vez por década, compra sal e pergunta se o mar continua no mesmo lugar. Continua, eu digo. Ela sempre parece aliviada.', 'happy'],
  ma_lugar: ['marta', 'É, né? A gente reclama do vento, do sal, do frio, do Joca, da sopa. Mas ninguém vai embora.', 'tender'],
  ma_c1: ['marta', 'O Tião pede a mesma sopa faz vinte anos. E toda santa vez pergunta o que tem de sopa. Eu digo: a mesma. Ele diz: então eu quero. É quase um casamento, aquilo.', 'happy'],
  ma_c2: ['marta', 'O Tião pesca, a Nina canta, o Joca martela. E eu conto tudo pra todo mundo. Cada um com o seu talento.', 'happy'],
  ma_c3: ['marta', 'Quando o farol acende, eu fecho a taberna. É o Davi dizendo boa noite pra vila inteira.', 'tender'],
  ma_noite: ['marta', 'A taberna já fechou, querida. Mas a porta fica sempre só encostada.', 'tired'],
  ma_pao: ['marta', 'Pão da Celeste! Ainda morno, como é que ela consegue? Toma, leva este peixe defumado pra ela. E diz que o sal é por minha conta, como sempre. E diz que eu não devo dois peixes. É um. Um e meio.', 'excited'],
  ma_amiga: ['marta', 'Você já é de casa, sabia? Aqui a gente não pergunta de onde a pessoa veio. Pergunta se ela já comeu.', 'tender'],
  ma_voo: ['marta', 'Era você montada naquele bicho? Eu vi! A vila inteira viu! A Nina não para de falar nisso. Muito obrigada, viu? Agora sou eu que não durmo.', 'excited'],
  ma_lia1: ['marta', 'E você, hein? Tem namorado? Namorada? Mãe viva? Come direito? Desculpa, eu pergunto tudo de uma vez. O Davi diz que eu faço inventário de gente.', 'happy'],
  li_ma1: ['lia', 'Mãe viva. Longe. A gente não se fala muito.', 'neutral'],
  ma_lia2: ['marta', 'Longe é relativo, querida. A Celeste mora a meio dia daqui, e a gente se vê uma vez por mês, trocando pão por peixe e reclamando. Isso é perto. Longe é não escrever.', 'tender'],

  jo_first: ['joca', 'Opa. Cuidado com a serragem. Você é a cartógrafa? Então desenha aí no mapa: aqui mora o melhor construtor de barcos do vale. Que também é o único.', 'happy'],
  jo_casco: ['joca', 'Um barco pro Tião. O dele já é mais remendo do que barco. Este aqui fica pronto na primavera. Ou na outra.', 'neutral'],
  jo_barco: ['joca', 'Aquele, no fim do píer? Era do mestre Elias, marido da Celeste. Ele dizia que barco parado apodrece por dentro. Se quiser, leva pra passear. Só traz de volta inteiro.', 'tender'],
  jo_c1: ['joca', 'Essa tábua aqui: estou curvando ela faz três dias. Ela não quer. Eu também não quero desistir. Vamos ver quem cansa primeiro.', 'happy'],
  jo_c2: ['joca', 'Aprendi tudo com o mestre Elias. Ele conversava com os barcos. Eu achava doideira. Hoje eu converso também.', 'tender'],
  jo_c3: ['joca', 'Vento pelo lado é o melhor. Vento de frente, nem tente: o barco para e a vela fica batendo. Aí é virar um pouco e ir em zigue-zague.', 'neutral'],
  jo_depois: ['joca', 'E aí, velejou? Ela puxa um pouco pra esquerda, né? O mestre dizia que era saudade.', 'happy'],

  ti_first: ['tiao', 'Psiu. Fala baixinho que os peixes escutam. Brincadeira, peixe não escuta nada. Mas eu gosto do silêncio.', 'happy'],
  ti_pesca: ['tiao', 'Hoje? Nada. Ontem também nada. Mas ontem o nada estava mais bonito.', 'happy'],
  ti_nina: ['tiao', 'É sim. Ela coleciona conchas, histórias e perguntas. As perguntas eu não sei responder. As conchas eu ajudo a achar.', 'tender'],
  ti_c1: ['tiao', 'Tem dia que o peixe não vem. Aí eu converso com a boia. Ela não responde. Mas também não reclama da sopa.', 'happy'],
  ti_c2: ['tiao', 'Quando o mar fica liso assim, feito espelho, minha avó dizia que era o céu se olhando.', 'tender'],
  ti_c3: ['tiao', 'Se for velejar, volte antes do farol acender. Não é perigo, não. É que a Marta fica preocupada e fala o dobro.', 'happy'],

  // a Nina só fala perguntando
  ni_first: ['nina', 'Oi! Você veio das montanhas? Lá tem dragão? É verdade que lá em cima neva? Neve tem gosto de quê?', 'excited'],
  ni_dragao: ['nina', 'Tem? Grande? Maior que o farol? Será que ela me dá carona se eu pedir com educação?', 'excited'],
  ni_baleia: ['nina', 'Você acredita? Uma vez eu ouvi, de noite, deitada no píer. Um som comprido. O papai disse que era o vento. Vento tem saudade, por acaso?', 'excited'],
  ni_c1: ['nina', 'Sabia que areia é pedra que ficou muito tempo no mar? Então daqui a mil anos o gigante do lago vira praia?', 'happy'],
  ni_c2: ['nina', 'Quer conhecer a Dona Concha? É a minha favorita. Por que todo mundo ri quando eu falo o nome dela?', 'happy'],
  ni_c3: ['nina', 'Você já deitou na areia de olho fechado? Sentiu a terra respirando? Será que ela sabe que a gente está em cima dela?', 'tender'],
  ni_desenho: ['nina', 'Um gigante! Foi o Tomé que desenhou? Ele desenha bem, né? Você leva esta concha pra ele? Sabia que encostando no ouvido dá pra ouvir o mar?', 'excited'],
  ni_noite: ['nina', 'Eu devia estar dormindo, né? Mas a lua está tão grande hoje. Você conta pro papai?', 'tender'],
  ni_voo: ['nina', 'Você voou nela? De verdade? Ela é quente ou gelada? Da próxima vez pergunta se eu posso ir junto?', 'excited'],
  ni_lia1: ['nina', 'Você tem mãe? Ela sabe que você está aqui?', 'neutral'],
  li_ni1: ['lia', 'Sabe. Mais ou menos.', 'neutral'],
  ni_lia2: ['nina', 'Mais ou menos? Como é que alguém sabe mais ou menos? Por que você não conta pra ela direito?', 'surprised'],

  da_first: ['davi', 'Boa tarde. Ou boa noite, daqui a pouco. Sou o Davi, cuido do farol. Quer dizer, o farol se cuida sozinho. Eu só subo pra fazer companhia.', 'tender'],
  da_tempo: ['davi', 'Quarenta e dois anos. Nunca vi um navio passar. Mas acendo toda noite. Vai que um dia alguém se perde.', 'tender'],
  da_ve: ['davi', 'O mar inteiro, o vale inteiro. E às vezes uma sombra enorme passando na frente da lua. A Odessa diz que é nuvem. Ela mente muito mal.', 'happy'],
  da_c1: ['davi', 'Sabe o pior de um farol? Ninguém agradece quando dá certo. O barco chega, e pronto. Ninguém sobe aqui pra dizer obrigado à lâmpada.', 'happy'],
  da_c2: ['davi', 'Daqui, de noite, dá pra ver o observatório. Uma luzinha lá no alto. Eu pisco o farol pra ela. Ela nunca pisca de volta.', 'tender'],
  da_c3: ['davi', 'O mar ensina uma coisa: tudo volta. A maré, os barcos, as pessoas. Só demora.', 'tender'],
  da_carta: ['davi', 'Você conhece a Odessa? A gente se escreve faz quarenta anos. Ela leva uns dez pra responder. Diz que é a letra que anda ruim. Elfa com letra ruim, onde já se viu. Leva esta carta?', 'happy'],
  da_noite: ['davi', 'Boa noite, cartógrafa. Fica aí embaixo e olha pra cima. Daqui a pouco eu pisco pra você.', 'tender'],
  da_resposta: ['davi', 'Dela? Já? Não em dez anos. Em dez dias. Com licença, cartógrafa. Eu vou ler lá em cima, sozinho, como um velho bobo.', 'surprised'],
  da_piscou: ['davi', 'Você viu? Ontem à noite. A luzinha do observatório. Piscou três vezes. Quarenta anos, cartógrafa. Quarenta anos, e ela piscou de volta.', 'tender'],
  da_lia1: ['davi', 'Você escreve cartas, cartógrafa?', 'neutral'],
  li_da1: ['lia', 'Devo uma pra minha mãe. Faz um ano.', 'sad'],
  da_lia2: ['davi', 'Carta devida é a pior dívida. Cresce em silêncio. Tome. Papel bom, do meu. Escreva quando quiser. Não precisa ser hoje. Mas não deixe virar quarenta anos.', 'tender'],

  // ---------------- Vésper, a dragoa ----------------
  li_alva_corre: ['lia', 'Ela levantou a cabeça. Acho que eu cheguei rápido demais. Devagar, Lia.', 'surprised'],
  li_alva1: ['lia', 'Ela é enorme. E está me olhando como quem decide se eu sou uma pergunta ou uma resposta.', 'tender'],
  li_alva2: ['lia', 'Ela abaixou a cabeça até o chão. Acho que é um convite.', 'tender'],
  li_voo: ['lia', 'O vale inteiro cabe debaixo das asas dela.', 'excited'],
  li_voo_fim: ['lia', 'Obrigada, Vésper. Eu nunca mais vou olhar pra um mapa do mesmo jeito.', 'tender'],

  // ---------------- curiosidades e pequenos momentos ----------------
  li_mar: ['lia', 'O mar. Daqui de cima, o vale parecia um mundo inteiro. Ele termina aqui, na areia, e começa outra coisa.', 'tender'],
  li_barco0: ['lia', 'Um barco bonito, bem cuidado. Melhor perguntar de quem é antes de sair com ele.', 'neutral'],
  li_barco: ['lia', 'O barco do mestre Elias. Puxa um pouco pra esquerda, mesmo. Deve ser saudade.', 'tender'],
  li_cogumelos: ['lia', 'Um círculo perfeito de cogumelos. A Nina diria que é uma porta. O Anselmo diria que choveu. Os dois devem ter razão.', 'tender'],
  li_tronco: ['lia', 'Um tronco oco, cheio de folhas secas. Alguma raposa dorme aqui, dá pra sentir o cheiro. Melhor não incomodar.', 'neutral'],
  li_colmeia: ['lia', 'Uma colmeia num toco velho. As abelhas nem ligam pra mim. Estão ocupadas demais sendo abelhas.', 'happy'],
  li_ninho: ['lia', 'Três ovos azulados. A mãe deve estar por perto, me olhando de algum galho. Já estou indo.', 'tender'],
  li_amoras: ['lia', 'Amoras maduras, quentes de sol. Agora as minhas mãos estão roxas, mas valeu a pena.', 'happy'],
  li_estrela_pedra: ['lia', 'Uma estrela gravada na pedra, quase apagada pelo musgo. Igual à do Tomé. Os Veladores marcavam os caminhos que davam pro céu.', 'surprised'],
  li_fonte: ['lia', 'Água brotando da pedra, gelada. Alguém colocou um cano de ferro aqui há muito tempo, pra quem passasse com sede. Obrigada, quem quer que tenha sido.', 'tender'],
  li_cabana: ['lia', 'Uma cabana de caçador. A lanterna está apagada há anos, mas a lenha está empilhada, pronta. Como se alguém fosse voltar.', 'neutral'],
  li_arvore_nomes: ['lia', 'Nomes gravados na casca, uns por cima dos outros. Os mais antigos a árvore já engoliu. Ela guarda todo mundo, crescendo devagar por cima.', 'tender'],
  li_farol: ['lia', 'O farol do Seu Davi. Quarenta e dois anos acendendo uma luz pra ninguém. Ou pra todo mundo, depende de como se olha.', 'tender'],
  li_dormindo: ['lia', 'Está dormindo. Melhor não acordar. Amanhã a gente conversa.', 'tender'],
  // ---------------- a árvore das fitas e o lago ----------------
  li_fitas: ['lia', 'Centenas de fitas. Cada uma é alguém que morreu e alguém que ficou pra lembrar.', 'tender'],
  li_fita_no: ['lia', 'Refiz os dois nós. Não pra prender ninguém. Só pra fita não cair antes da hora.', 'tender'],
  li_fita_minha: ['lia', 'Amarrei a minha no galho de baixo, perto da pedra furada. Não vou contar o que eu pedi.', 'tender'],
  li_pedra_achar: ['lia', 'Uma pedra boa pra jogar. Achatada, lisa, cabe na curva do dedo.', 'neutral'],
  li_pulos_bom: ['lia', 'Olha só isso. Acho que até o gigante viu.', 'happy'],
  li_pulos_zero: ['lia', 'Afundou com estilo. O Tomé ia gostar.', 'happy'],
};

// Os oito lugares de memória. `place` é a chave do ponto no mundo (ver world/landmarks.js).
// hours: de que hora a que hora o lugar "lembra" (pode virar a meia-noite); wait: o que a Lia pensa fora da hora.
// order/era: a ordem no tempo (o caderno mostra a linha do tempo dos Veladores).
// figures.model: a silhueta da pessoa na lembrança (ver actors/human.js).
export const PLACES = [
  { id: 'lago', name: 'O Gigante do Lago', place: 'lake', hint: 'Na margem do lago, a sudoeste · de manhã cedo', time: 'Uma manhã de primavera. Teo, Ilsa e a filha, Mira, de seis anos.',
    hours: [5.2, 10.5], wait: 'li_hora_lago', order: 1, era: 'Antes',
    figures: [{ who: 'teo', model: 'v_teo', dx: 1.3, dz: 0.5, anim: 'throw' }, { who: 'mira', model: 'v_mira', dx: 0.3, dz: 0.9, anim: 'idle' }, { who: 'ilsa', model: 'v_ilsa', dx: -1.1, dz: 0.3, anim: 'idle' }],
    lines: ['lago1', 'lago2', 'lago3', 'lago4', 'lago5', 'lago6', 'lago7', 'lago8', 'lago9', 'lago10', 'lago11'], reflect: 'lago_r', reflectIf: { seen: 'rosto', line: 'lago_r2' },
    sketch: 'Teo ensinava a filha a jogar pedras; Ilsa contava os pulos. Mira fez três. Ele prometeu o segredo dos sete para o dia seguinte. Ela guardou uma pedra furada, das que não pulam.' },
  { id: 'circulo', name: 'O Círculo das Estrelas', place: 'stones', hours: [19.6, 5], wait: 'li_circ_dia', hint: 'Entre as pedras em pé, a noroeste · à noite', time: 'Uma noite de verão. O mestre Auren ensinava os aprendizes de Velador, ao lado do gigante ajoelhado.',
    order: 2, era: 'Antes',
    figures: [{ who: 'auren', model: 'v_auren', dx: 0.9, dz: 0.2, anim: 'sit', yaw: -0.7 }, { who: 'dessa', model: 'v_dessa', dx: -0.3, dz: 1.5, anim: 'kneel', yaw: 2.3 }, { who: 'sela_m', model: 'v_sela_m', dx: -1.3, dz: 0.7, anim: 'kneel', yaw: 1.9 }],
    lines: ['circ1', 'circ2', 'circ3', 'circ4', 'circ5', 'circ6', 'circ7', 'circ8', 'circ9', 'circ10', 'circ11'], reflect: 'circ_r',
    sketch: 'Lembrar sem segurar: a luz só sobe quando a mão se abre. A luz da Sela subiu. A da Dessa, uma menina elfa, ficou pesando na mão. Ao lado, Aldren, o primeiro Velador, ajoelhado há quatrocentos anos.' },
  { id: 'arvore', name: 'A Árvore das Fitas', place: 'tree', hint: 'Na floresta a noroeste · à tarde', time: 'Inverno do ano seguinte. A febre durou três dias.',
    hours: [11, 18.6], wait: 'li_hora_arvore', order: 3, era: 'O luto',
    figures: [{ who: 'teo', model: 'v_teo', dx: 0.7, dz: 0.3, anim: 'reach' }, { who: 'ilsa', model: 'v_ilsa', dx: -0.7, dz: 0.2, anim: 'reach' }],
    lines: ['arvore1', 'arvore2', 'arvore3', 'arvore4', 'arvore5', 'arvore6', 'arvore7', 'arvore8', 'arvore9', 'arvore10', 'arvore11'], reflect: 'arvore_r',
    sketch: 'A fita da Mira, com a pedra furada. O voto dos Veladores: "Eu velo. Enquanto eu olhar, você fica." Ilsa deu nó duplo. Teo deu nó simples.' },
  { id: 'relogios', name: 'O Jardim dos Relógios de Sol', place: 'garden', hint: 'A sudeste, no fim da trilha · às quatro e meia da tarde', time: 'Dois anos depois. Quatro e meia da tarde.',
    hours: [16.3, 17.4], wait: 'li_hora_rel', order: 4, era: 'O luto',
    figures: [{ who: 'teo', model: 'v_teo', dx: 0, dz: 0, anim: 'kneel' }, { who: 'dessa', model: 'v_dessa', dx: 1.3, dz: 0.8, anim: 'idle' }],
    lines: ['rel1', 'rel2', 'rel3', 'rel4', 'rel5', 'rel6', 'rel7', 'rel8', 'rel9', 'rel10'], reflect: 'rel_r',
    sketch: 'Cada relógio marca a hora em que alguém morreu. O da Mira, quatro e meia. Teo já não lembrava a voz da filha. Pediu à Dessa que tirasse o musgo da sombra "até ele voltar".' },
  { id: 'torre', name: 'A Torre Partida', place: 'tower', hint: 'Ao norte, no fim da trilha · no fim da tarde', time: 'Outono, três anos depois do enterro. Sela, irmã da Ilsa, era aprendiz do mestre Auren.',
    hours: [15.3, 19.8], wait: 'li_hora_torre', order: 5, era: 'A partida',
    figures: [{ who: 'auren', model: 'v_auren', dx: 0, dz: 0, anim: 'idleOld' }, { who: 'sela', model: 'v_sela', dx: 1.6, dz: 1.2, anim: 'idle' }],
    lines: ['torre1', 'torre2', 'torre3', 'torre4', 'torre5', 'torre6', 'torre7', 'torre8', 'torre9', 'torre10'], reflect: 'torre_r',
    sketch: 'Do alto da torre rachada, Auren contou dezenove pessoas que não levantavam mais. A pedra cresce em quem vela sem fim. Os jovens partiriam na primavera.' },
  { id: 'escada', name: 'A Escada para o Céu', place: 'stairs', hint: 'Na encosta a leste · ao entardecer', time: 'Véspera da partida. Ilsa estava no último degrau desde a manhã.',
    hours: [16.8, 20.3], wait: 'li_hora_escada', order: 6, era: 'A partida',
    figures: [{ who: 'ilsa', model: 'v_ilsa', dx: 0, dz: 0, anim: 'sit', top: true }, { who: 'teo', model: 'v_teo', dx: 0, dz: 0, anim: 'idle' }], camA: 0.75,
    lines: ['escada1', 'escada2', 'escada3', 'escada4', 'escada5', 'escada6', 'escada7', 'escada8', 'escada9', 'escada10', 'escada11', 'escada12', 'escada13'], reflect: 'escada_r',
    sketch: 'Ilsa no último degrau, Teo no primeiro. Ele já não lembrava a voz da filha; ela não conseguia esquecer nada. "Alguém tem que levar ela andando. Eu levo ela parada."' },
  { id: 'monte', name: 'O Mirante da Gigante', place: 'peak', hint: 'No alto da montanha, ao norte · de manhã', time: 'Na manhã da partida.',
    hours: [5.0, 11.5], wait: 'li_hora_monte', order: 7, era: 'A partida',
    figures: [{ who: 'ilsa', model: 'v_ilsa', dx: 0, dz: 0, anim: 'sit', yaw: Math.PI }], camA: 0.55,
    lines: ['monte1', 'monte2', 'monte3', 'monte4', 'monte5', 'monte6'], reflect: 'monte_r',
    sketch: 'Ilsa, sozinha com a filha que já não estava ali, viu o povo partir. Teo parou e olhou para trás. Ela não acenou. "Só mais um pouco."' },
  { id: 'rosto', name: 'O Rosto entre as Flores', place: 'head', hint: 'No campo florido a leste da vila · de dia', time: 'Quarenta anos depois.',
    hours: [6.5, 18.8], wait: 'li_hora_rosto', order: 8, era: 'Depois',
    figures: [{ who: 'teo_v', model: 'v_teo_v', dx: -1.0, dz: 0.4, anim: 'work' }, { who: 'dessa', model: 'v_dessa_j', dx: 1.0, dz: 0.6, anim: 'idle' }],
    lines: ['rosto1', 'rosto2', 'rosto3', 'rosto4', 'rosto5', 'rosto6', 'rosto7', 'rosto8', 'rosto9', 'rosto10'], reflect: 'rosto_r', reflectIf: { seen: ['lago', 'arvore', 'relogios'], line: 'rosto_r2' },
    sketch: 'Teo voltou velho e esculpiu o rosto da filha antes de esquecer também. Não subiu o monte. Foi ao lago pagar uma pedra de sete pulos.' },
];

export const FINALE = ['fim1', 'fim2', 'fim_dessa', 'fim3', 'fim4b', 'fim5', 'fim6', 'fim_lago', 'fim_pulos', 'fim7', 'fim8', 'fim_marta', 'fim_nina', 'fim_davi', 'fim9', 'fim_lia0', 'fim_lia', 'fim_lia2', 'fim_lia3', 'fim_lia4', 'fim10'];

// pequenas descobertas sem lume (lineIf: outra fala depois que algo aconteceu)
export const NOTES = {
  espada: { title: 'A espada na pedra', line: 'li_espada' },
  aqueduto: { title: 'O aqueduto', line: 'li_aqueduto' },
  balanco: { title: 'O balanço', line: 'li_balanco' },
  ponte: { title: 'A ponte partida', line: 'li_ponte', lineIf: { flag: 'ponte', line: 'li_ponte2', title: 'A ponte do Bastião' } },
  santuario: { title: 'O santuário da floresta', line: 'li_santuario' },
  banco: { title: 'O banco do poente', line: 'li_banco' },
  poco: { title: 'O poço', line: 'li_poco', lineIf: { seen: 'relogios', line: 'li_poco2', title: 'O poço da corda nova' } },
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

// As fitas da árvore: cada uma é uma vigília (quem morreu, quem ficou). A Lia descobre lendo.
// cloth/ink: cores; hand: estilo da letra (css); age: 0 nova ... 1 quase fio.
export const RIBBONS = [
  { id: 'ilsa', cloth: '#9b3b32', ink: '', hand: 'none', age: 0.95, title: 'Fita de lã vermelha, quase fio', text: 'Nenhuma palavra. Dois nós: um duplo, bem apertado, e um simples. E uma pedra achatada com um furo no meio.', needs: ['lago', 'arvore'], whoName: 'Ilsa e Teo, pela Mira' },
  { id: 'teo', cloth: '#5b6e8c', ink: '#2b2a33', hand: 'old', age: 0.93, title: 'Fita de linho azul, desbotada', text: 'Helena. Quarenta anos. Me perdoa a demora em levantar. — A.', whoName: 'Mestre Auren, pela mulher', needs: ['torre', 'circulo'] },
  { id: 'sela', cloth: '#d9b23c', ink: '#3a2d12', hand: 'old', age: 0.9, title: 'Lenço amarelo, rasgado em tira', text: 'Ilsa: se mudar de ideia, siga a estrada. Eu vou devagar. Eu prometo que vou devagar. — S.', whoName: 'Sela, pela irmã', needs: ['monte', 'torre'] },
  { id: 'dessa', cloth: '#b8bcc8', ink: '#28304a', hand: 'elf', age: 0.8, title: 'Fio de prata, trançado', text: 'Que eles voltem.  —  e embaixo, com a mesma letra, muito mais tremida:  Que eles estejam bem.', whoName: 'Odessa', needs: ['circulo', 'relogios'] },
  { id: 'celeste', cloth: '#e8d6b0', ink: '#5a3a20', hand: 'round', age: 0.25, title: 'Pano de prato bordado', text: 'Elias. O pão ainda é pra dois.', whoName: 'Celeste' },
  { id: 'bastiao', cloth: '#7a5a3c', ink: '#1d140c', hand: 'block', age: 0.4, title: 'Tira de couro, entalhada a faca', text: 'PONTE PRONTA ANTES DE EU FICAR VELHO.  (embaixo, menor:)  já fiquei. continua valendo.', whoName: 'Bastião' },
  { id: 'tome', cloth: '#3f8f5a', ink: '#14301c', hand: 'kid', age: 0.05, title: 'Fita verde, com nó de sapato', text: 'Quero acordar o gigante. Mas só se ele quiser.', whoName: 'Tomé' },
  { id: 'davi', cloth: '#22344f', ink: '#1f2d44', hand: 'fine', age: 0.5, title: 'Fita de seda azul-marinho', text: 'Para quem se perdeu: siga a luz. Para quem ficou: obrigado por acender a sua.', whoName: 'Seu Davi' },
  { id: 'nina', cloth: '#e6a0a8', ink: '#5a2030', hand: 'kid', age: 0.02, title: 'Fita rosa com uma conchinha costurada', text: 'Baleia existe? Se existe, que ela cante de novo.', whoName: 'Nina' },
];
export const LIA_WISHES = [
  { id: 'pai', t: 'Que o pai saiba que eu voltei a desenhar nas margens.' },
  { id: 'voltar', t: 'Voltar pra casa antes de virar pedra.' },
  { id: 'ficar', t: 'Aprender a ficar. E a ir embora.' },
];

// amizades: o que a Lia anota no caderno sobre cada um
export const FRIENDS = {
  odessa: 'Mora no observatório há seiscentos anos. Nunca pega a xícara pela asa.', anselmo: 'Pastor. Conversa com a mulher de manhã, enquanto tira o leite.', celeste: 'Padeira. Ainda faz pão para dois.', tome: 'Grita bom dia para o gigante do lago todo dia.', irene: 'Pinta para poder ir embora dos lugares.', bastiao: 'Quer terminar a frase da ponte partida.',
  marta: 'Dona da taberna da Maré. Faz inventário de gente.', joca: 'Constrói barcos e conversa com eles.', tiao: 'Pescador. Conversa com a boia.', nina: 'Coleciona conchas e perguntas.', davi: 'Acende o farol toda noite, para quem se perder.',
};
// o que a Lia anota sobre cada pessoa das lembranças (aparece depois de ver alguém nelas)
export const VELADORES = {
  mira: { name: 'Mira', note: 'Seis anos, banguela. Fazia três pulos. Guardava as pedras que não pulam. Morreu de febre no inverno seguinte.', seen: ['lago', 'arvore', 'relogios'] },
  teo: { name: 'Teo', note: 'Pai da Mira. Deu nó simples na fita da filha. Foi esquecendo a voz dela e partiu com o povo. Voltou velho, para pagar uma promessa.', seen: ['lago', 'arvore', 'relogios', 'escada', 'rosto'] },
  ilsa: { name: 'Ilsa', note: 'Mãe da Mira. Lembrava de tudo, e por isso não podia ir. Ficou no monte, vendo a estrada.', seen: ['lago', 'arvore', 'escada', 'monte'] },
  sela: { name: 'Sela', note: 'Irmã da Ilsa, aprendiz do mestre Auren. Partiu de lenço amarelo e prometeu ir devagar.', seen: ['circulo', 'torre'] },
  auren: { name: 'Mestre Auren', note: 'Velou a mulher por quarenta anos. Foi o primeiro a dizer que aquilo não era devoção, e mandou os jovens embora.', seen: ['circulo', 'torre'] },
  dessa: { name: 'Dessa', note: 'Uma menina elfa, órfã, adotada pelos Veladores. Não conseguia abrir a mão. Prometeu limpar o relógio da Mira.', seen: ['circulo', 'relogios', 'rosto'] },
  aldren: { name: 'Aldren', note: 'O primeiro Velador. Ajoelhou-se há mil anos para velar alguém e nunca mais levantou. O povo rezava para ele.', seen: ['circulo', 'torre'] },
};
// coisas que se carregam de uma vila para a outra
export const ITEMS = { pao: 'Cesta de pão da Celeste (para a Dona Marta)', peixe: 'Peixe defumado da Dona Marta (para a Celeste)', desenho: 'Desenho de gigante do Tomé (para a Nina)', concha: 'Concha da Nina (para o Tomé)', carta: 'Carta do Seu Davi (para a Odessa)', resposta: 'Resposta da Odessa (para o Seu Davi)', papel: 'Papel de carta do Seu Davi (para escrever à mãe)' };

export const text = (id) => (LINES[id] ? LINES[id][1] : id);
export const speaker = (id) => (LINES[id] ? LINES[id][0] : 'narrador');
