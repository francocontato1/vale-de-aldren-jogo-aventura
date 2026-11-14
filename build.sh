#!/bin/sh
# Compila src/ para docs/game-<hash>.js e atualiza docs/index.html
set -e
cd "$(dirname "$0")"
npx esbuild src/main.js --bundle --minify --format=esm --target=es2020 --outfile=docs/game.js --log-level=warning
H=$(md5sum docs/game.js | cut -c1-8)
rm -f docs/game-*.js
mv docs/game.js docs/game-$H.js
sed -i "s#<script type=\"module\" src=\"game[^\"]*\.js\"></script>#<script type=\"module\" src=\"game-$H.js\"></script>#" docs/index.html
echo "game-$H.js"
