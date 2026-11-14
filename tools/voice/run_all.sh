#!/usr/bin/env bash
# Resumable full render: restarts generate.py whenever it exits with code 3 (memory guard / --limit).
# Usage: CHATTERBOX_DIR=... WHISPER_GGML=... PY=/path/venv/bin/python ./run_all.sh lines.json [extra generate.py args]
set -u
cd "$(dirname "$0")"
PY=${PY:-python3}
export MALLOC_ARENA_MAX=2 OMP_WAIT_POLICY=PASSIVE
PRIO=${PRIO:-"intro*,carta,chegada,od_*,lago*,circ*,torre*,monte*,arvore*,rel*,escada*,rosto*,fim*"}
while true; do
  "$PY" generate.py "$@" --priority "$PRIO"
  rc=$?
  [ $rc -eq 3 ] || break
done
"$PY" generate.py "$@" --manifest-only
"$PY" qa_report.py "$1" --qa-dir "${QA:-qa/vox}"
exit $rc
