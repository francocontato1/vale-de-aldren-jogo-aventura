#!/bin/sh
# Compila src/ para game-<hash>.js e atualiza index.html (detalhes em tools/build.mjs)
set -e
cd "$(dirname "$0")"
node tools/build.mjs
