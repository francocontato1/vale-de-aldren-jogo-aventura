#!/bin/sh
# Compila src/ para game-<hash>.js e atualiza index.html
set -e
cd "$(dirname "$0")"
npx esbuild src/main.js --bundle --minify --format=esm --target=es2020 --outfile=game.js --log-level=warning
H=$(md5sum game.js | cut -c1-8)
rm -f game-*.js
mv game.js game-$H.js
sed -i "s#<script type=\"module\" src=\"game[^\"]*\.js\"></script>#<script type=\"module\" src=\"game-$H.js\"></script>#" index.html
echo "game-$H.js"
