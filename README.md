# Ecos de Aldren

Um jogo de exploração contemplativo e mágico que roda direto no navegador (three.js).

Oitenta anos atrás, quatro amigos e quatro gigantes de pedra, os Vigias, atravessaram a Longa Noite. Os gigantes adormeceram pelo vale e ninguém lembra mais os nomes deles. Você é o último aprendiz da maga Elowen, que deixou a lanterna dela com você e um último pedido: devolver os nomes.

## Como jogar

- **Offline:** baixe `jogar-offline.html` e abra no Chrome ou no Edge. Tudo já vem dentro do arquivo.
- **Online:** com o GitHub Pages ativado (veja abaixo), o jogo fica em `https://francocontato1.github.io/vale-de-aldren-jogo-aventura/`.

| Tecla | Ação |
|---|---|
| W A S D | Andar (Shift corre, C anda devagar) |
| Mouse ou setas | Câmera |
| E | Falar, ler, tocar as runas |
| Botão esquerdo / direito | Golpe de espada / defender |
| L | Lanterna |
| J | Diário |
| M | Mapa |
| Espaço | Pular e avançar uma lembrança |
| 1 a 4 | Escolher fala no diálogo |

## Estrutura

- `src/`: código-fonte do jogo
  - `main.js`: laço do jogo, história e interações
  - `story.js`: textos, lembranças e páginas do diário
  - `magic.js`: lembranças fantasmas, espíritos e vaga-lumes
  - `world/`: terreno, céu, vila e gigantes
  - `actors/`: personagens e lobos
- `docs/`: versão pronta para jogar, que é a pasta publicada pelo GitHub Pages
  - `index.html`
  - `game-<hash>.js`, gerado pelo build
  - `a/` com modelos, texturas e sons
- `jogar-offline.html`: o jogo inteiro num único arquivo
- `build.sh`: compila `src/` para `docs/`
- `standalone.py`: gera o `jogar-offline.html`

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

Os modelos `.glb` ficam com a extensão `.glb.wasm` para que sejam servidos em qualquer hospedagem estática.

## Ativar o GitHub Pages

Em **Settings → Pages**, escolha **Deploy from a branch**, branch `main`, pasta `/docs`, e salve.

## Créditos

- [three.js](https://threejs.org)
- Árvores: [ez-tree](https://github.com/dgreenheck/ez-tree)
- Avatares e animações: Ready Player Me
- Sons: Meta/Oculus Audio Pack (CC0)
