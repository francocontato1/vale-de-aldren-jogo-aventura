# Vale de Aldren

Um jogo contemplativo que roda direto no navegador (three.js). Sem combate, sem pressa.

Há muito tempo, um povo chamado Veladores viveu neste vale. Construíam para olhar: torres, escadas que não levam a lugar nenhum, círculos de pedra, relógios de sol. Um dia foram embora, sem guerra e sem despedida. Ficaram as pedras e os gigantes, que, dizem, são Veladores que sentaram para ver algo bonito e esqueceram de levantar.

Você é Lia, uma jovem cartógrafa de Ancoradouro, no litoral, chamada por Odessa, uma maga elfa que mora no observatório do vale há seiscentos anos. Ela não quer um mapa de estradas: quer um mapa do que importa. Quando você senta num dos oito lugares dos Veladores, na hora certa, e olha com calma, o lugar lembra: um lume, uma lembrança de luz. Você desenha o que viu no caderno.

As oito lembranças contam, fora de ordem, uma história só: Teo e Ilsa, que se conheceram jogando pedras no lago; Sela, a irmã que partiu; o mestre Auren, que ensinava a olhar; e uma menina elfa chamada Dessa. Cabe a você montar. A Lia também tem a sua história (o pai que desenhava estradas, a bússola que puxa para o leste, a carta que ela deve à mãe), e quem fica amigo dela vai sabendo aos poucos.

## Como jogar

- **Online:** https://francocontato1.github.io/vale-de-aldren-jogo-aventura/
- **Offline:** baixe `jogar-offline.html` e abra no Chrome ou no Edge.

| Tecla | Ação |
|---|---|
| W A S D | Andar (Shift corre) |
| Mouse ou setas | Olhar ao redor |
| E | Conversar, observar, sentar e contemplar |
| T | Sentada: deixar o tempo passar (pôr do sol, noite estrelada) |
| J · M · L | Caderno · Mapa · Lanterna |
| Espaço | Pular · avançar uma fala |
| 1 a 4 | Escolher o que dizer |
| No barco | A D leme · W S caçar/folgar a vela · E desembarcar (perto do píer ou de uma praia rasa) |
| Voando com a Vésper | W bater asas · S frear · A D curvas (ou o mouse) · Espaço subir · Shift descer · E pousar |
| Chamar a Vésper | V assoviar (depois do primeiro voo): ela vem de onde estiver e pousa ao seu lado |

No celular, há um joystick e botões na tela.

## O que há no vale

- **A vila de Aldren:** padaria da Celeste (com forno de pão), oficina do Bastião, casa da Irene com ervas secando, casa-torre, casa dos livros, pasto do Seu Anselmo, moinho de vento, poço e fogueira. Cada casa é diferente, e as de dois andares têm escada e quartos de verdade.
- **Os lugares dos Veladores:** o gigante no lago (de manhã), a árvore das fitas (à tarde), o círculo das estrelas (à noite), a torre partida (no fim da tarde), o jardim dos relógios de sol (às quatro e meia), a escada para o céu (ao entardecer), a gigante sentada no monte (de manhã) e o rosto entre as flores (de dia). Fora de hora, sente e deixe o tempo passar (T).
- **A árvore das fitas:** leia os pedidos (cada fita com tecido, idade e letra próprios), amarre o seu e refaça o nó da fita mais antiga.
- **Pedras no lago:** de qualquer ponto da margem, escolha uma pedra e lance no tempo certo. Sem placar; o Teo fez sete.
- **O caderno:** a linha do tempo dos Veladores, as pessoas das lembranças, perguntas que se respondem com as descobertas, as fitas lidas e uma página sobre a própria Lia.
- **Pequenas descobertas:** a espada na pedra, o aqueduto, a ponte partida sobre o riacho seco, o santuário da floresta, o balanço, o banco virado para o poente.
- **A Vila da Maré:** uma vila de pescadores na enseada a sudeste, com praia de areia, mar com ondas, píer, taberna, galpão do barqueiro e um farol no promontório. Moram lá a Dona Marta, o Joca, o Tião, a Nina e o Seu Davi.
- **Amizades e favores:** conversar todo dia e levar coisas de uma vila para a outra (o pão da Celeste, o desenho do Tomé, a carta do Seu Davi) aumenta a amizade; os corações aparecem no diálogo e no caderno.
- **O barco do mestre Elias:** depois de falar com o Joca, dá para velejar pela enseada e ver os cardumes.
- **Vésper, a dragoa dos Veladores:** mora no ninho ao lado da gigante do monte (há uma trilha até lá). Chegue andando devagar; depois, monte e voe sobre o vale. Ao pousar, ela fica esperando ali; de qualquer lugar, um assovio (V) a chama de volta.
- **Casas vivas:** dá para sentar nas cadeiras e bancos, deitar na cama e dormir até de manhã. À noite os moradores sentam perto da lareira e depois dormem nas suas camas.
- **Floresta:** coelhos, passarinhos que voam quando a gente chega perto, gaivotas, borboletas, e curiosidades perto das trilhas (círculo de cogumelos, colmeia, fonte, pedra com estrela, cabana de caçador...).
- **O céu:** cerca de 5 mil estrelas reais do catálogo Hipparcos, com cor pela temperatura, Via Láctea, lua com fases e estrelas cadentes, girando como vistas de 23° de latitude sul.

## Estrutura

- `src/main.js`: laço do jogo, Lia, moradores, diálogos, lumes, caderno, final
- `src/story.js`: todas as falas (com quem fala e a emoção), os oito lugares e as anotações
- `src/actors/human.js`: personagens montados a partir de peças (roupa, cabeça, cabelo) num só esqueleto
- `src/magic.js`: lumes, o espírito que acompanha a Lia, vaga-lumes, a Chuva de Lumes
- `src/audio.js`: sons ambientes, passos, música com silêncios entre as faixas, vozes dubladas
- `src/world/`: terreno, céu, água, árvores, grama, vila (`village.js`) e ruínas (`landmarks.js`)
- `a/`: recursos do jogo (`chars/` personagens, `music/` trilha, `vox/` vozes, `sky/` estrelas)
- `tools/`: como cada recurso foi gerado (`chars/`, `music/`, `voice/`, `sky/`)

## Falas novas sem dublagem

Uma fala só toca a gravação se o texto e o timbre ainda forem os mesmos de quando foi gravada; as falas novas ou reescritas aparecem só como legenda até serem dubladas (o jogo não usa a voz sintética do navegador, para não destoar). `node tools/voice/export_lines.mjs` gera `tools/voice/lines.json` (com o timbre de cada fala) e `tools/voice/redub_ids.txt` (as que faltam). Os timbres de todo o elenco, inclusive a Vila da Maré e as pessoas das lembranças, já estão em `tools/voice/voices.json`; o pipeline está em `tools/voice/README.md`:

```bash
python make_refs.py --kokoro-dir $KOKORO_DIR
```

```bash
PY=$W/venv/bin/python ./run_all.sh lines.json --out ../../a/vox --ckpt-dir $CHATTERBOX_DIR --asr-model $W/ggml-small.bin --force --ids "$(cat redub_ids.txt)"
```

## Compilar

```bash
npm install
```

```bash
npm run build
```

```bash
npm run offline
```

Os modelos `.glb` ficam com a extensão `.glb.wasm` para serem servidos em qualquer hospedagem estática.

## Ativar o GitHub Pages

Em **Settings → Pages**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`, e salve.

## Créditos

- Motor: [three.js](https://threejs.org) (MIT)
- Personagens e animações: [Quaternius](https://quaternius.com) — Universal Base Characters, Modular Character Outfits: Fantasy, Universal Animation Library 1 e 2 (CC0)
- Música: trilha original composta para este jogo (ver `tools/music/README.md`). Piano: *Salamander Grand Piano*, de Alexander Holm (CC BY 3.0). Cordas, flauta, trompa, harpa e violão: *tonejs-instruments*, de Nicholaus P. Brosowsky (CC BY 3.0), com amostras do VSCO-2 Community Edition (Versilian Studios) e dos usuários flcellogrl e quartertone do Freesound. As amostras foram modificadas.
- Vozes: sintetizadas com Chatterbox Multilingual (Resemble AI, MIT) a partir de timbres criados com Kokoro-82M (Apache-2.0). Ver `tools/voice/README.md`.
- Dragoa: *Tarisland Dragon*, de [Dr A](https://sketchfab.com/doctorA) (CC BY 4.0), obtido via Sketchfab; conversão em `tools/chars/dragon.mjs`
- Animação extra (sentada conduzindo): Universal Animation Library 1, Quaternius (CC0), extraída por `tools/chars/extra_anims.mjs`
- Céu: estrelas do catálogo XHIP/Hipparcos e contorno da Via Láctea via [d3-celestial](https://github.com/ofrohn/d3-celestial), de Olaf Frohn (BSD-3)
- Árvores: [ez-tree](https://github.com/dgreenheck/ez-tree), de Daniel Greenheck (MIT)
- Sons ambientes e passos: Meta/Oculus Audio Pack (CC0)
