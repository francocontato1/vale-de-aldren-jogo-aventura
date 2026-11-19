#!/bin/sh
# Dubla todas as falas novas/alteradas com o elenco final (XTTS-v2). Uso:
#   XTTS_PY=<venv do coqui-tts>/bin/python XTTS_MODEL=<pasta do xtts_v2> QA_PY=<venv com whisper.cpp>/bin/python sh run_xtts.sh [approved.json]
# Licença do XTTS-v2: Coqui Public Model License (uso não comercial).
set -e
cd "$(dirname "$0")"
APPR=${1:+--approved $1}
node export_lines.mjs
for att in 0 1 2; do
  python3 dub_xtts.py plan --attempt $att $APPR
  n=$(python3 -c "import json;print(len(json.load(open('jobs_xtts.json'))))")
  RAW=${RAW_DIR:-/tmp}/xtts_raw; mkdir -p $RAW
  if [ "$n" -gt 0 ]; then COQUI_TOS_AGREED=1 nice -n -5 $XTTS_PY -I render_xtts.py $XTTS_MODEL jobs_xtts.json $RAW 4; fi
  $QA_PY -I dub_xtts.py post --raw $RAW $APPR
  APPR=""
done
node export_lines.mjs
