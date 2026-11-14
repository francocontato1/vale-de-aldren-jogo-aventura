# Vale de Aldren

Um jogo contemplativo que roda direto no navegador (three.js). Sem combate, sem pressa.

Há muito tempo, um povo chamado Veladores viveu neste vale. Construíam para olhar: torres, escadas que não levam a lugar nenhum, círculos de pedra, relógios de sol. Um dia foram embora, sem guerra e sem despedida. Ficaram as pedras e os gigantes, que, dizem, são Veladores que sentaram para ver algo bonito e esqueceram de levantar.

Você é Lia, uma jovem cartógrafa chamada por Odessa, uma maga elfa que mora no observatório do vale há seiscentos anos. Ela não quer um mapa de estradas: quer um mapa do que importa. Quando você senta num dos oito lugares dos Veladores e olha com calma, o lugar lembra: um lume, uma lembrança de luz, aparece por alguns instantes. Você desenha o que viu no caderno.

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

No celular, há um joystick e botões na tela.

## O que há no vale

- **A vila de Aldren:** padaria da Celeste (com forno de pão), oficina do Bastião, casa da Irene com ervas secando, casa-torre, casa dos livros, pasto do Seu Anselmo, moinho de vento, poço e fogueira. Cada casa é diferente, e as de dois andares têm escada e quartos de verdade.
- **Os lugares dos Veladores:** o gigante no lago, o círculo das estrelas (só à noite), a torre partida, a gigante sentada no monte, a árvore das fitas, o jardim dos relógios de sol, a escada para o céu e o rosto entre as flores.
- **Pequenas descobertas:** a espada na pedra, o aqueduto, a ponte partida sobre o riacho seco, o santuário da floresta, o balanço, o banco virado para o poente.
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
- Céu: estrelas do catálogo XHIP/Hipparcos e contorno da Via Láctea via [d3-celestial](https://github.com/ofrohn/d3-celestial), de Olaf Frohn (BSD-3)
- Árvores: [ez-tree](https://github.com/dgreenheck/ez-tree), de Daniel Greenheck (MIT)
- Sons ambientes e passos: Meta/Oculus Audio Pack (CC0)
