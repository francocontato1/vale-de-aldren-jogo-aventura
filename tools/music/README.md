# Ecos de Aldren: soundtrack sources

Original score for the game. Every melody, harmony and arrangement in `cues.py` was written for this
project. The mood references (Hisaishi-style tenderness, the open spaces of *Shadow of the Colossus*,
the gentle melancholy of *Frieren*) shaped the feel only. No melody, progression or recording was
copied from them.

The **main motif** (scale degrees 5-1-2-3 · 2-6; in D: `A4 D5 E5 F#5 | E5 B4`) opens `title`. It comes
back transposed or re-coloured in most of the other cues, and plays in full (D, then E) in `finale`.

## Files

| file | what |
|---|---|
| `cues.py` | the score: note data (melodies, chord progressions, arrangement, mix levels) for the 10 cues |
| `theory.py` | notation parser (`"A4:.5 D5:.5 E5 F#5:2"`), chord symbols, voicing and accompaniment patterns, sustain pedal |
| `engine.py` | offline renderer: multisample playback (Hermite pitch-shift, velocity filtering, loop-extended sustains), string-section builder, synth pad/choir/air/celesta/music box, synthetic hall IR (scipy FFT convolution), bus compression, true-peak limiter, loudness normalisation |
| `render.py` | renders + masters + verifies every cue, encodes MP3, writes `a/music/manifest.json`, exports `midi/<cue>.mid` and spectrogram PNGs |
| `fetch_samples.py` | downloads the CC-BY samples (about 80 MB; they are **not** committed) |
| `midi/*.mid` | the note data as Standard MIDI Files, for editing in a DAW |

## Re-rendering

```bash
pip install numpy scipy soundfile pyloudnorm matplotlib     # plus ffmpeg with libmp3lame
python3 tools/music/fetch_samples.py --dest /tmp/aldren-samples
python3 tools/music/render.py --samples /tmp/aldren-samples --work /tmp/aldren-work            # all cues
python3 tools/music/render.py --samples /tmp/aldren-samples --work /tmp/aldren-work night ruins # some cues
```

Rendering is deterministic: each cue has a fixed seed for humanisation (timing ±8-20 ms, velocity
±5 %, ensemble detune, celesta "stars"). The full set takes about 6 minutes on 4 CPU cores.

Mastering targets: integrated loudness **-20 LUFS**, true peak ≤ **-2 dBTP** before encoding
(≤ -1.5 dBTP after decoding the MP3), 38 Hz high-pass, -2.5 dB high shelf at 7 kHz, gentle 1.8:1 bus
compression. `render.py` prints a verification table: loudness, true peak, DC, click detector,
spectral balance, start and end levels. One-shot cues start with 0.25 s of silence and fade fully to
digital silence. `village_night` is a seamless loop: its reverb tail is folded back into its start.

## Sample sources and licences

| instrument(s) used | source | licence |
|---|---|---|
| Piano | **Salamander Grand Piano V3** by Alexander Holm (Yamaha C5), MP3 set hosted in [Tonejs/audio](https://github.com/Tonejs/audio/tree/master/salamander) | CC BY 3.0 |
| Violin, cello, contrabass, flute, French horn, harp, nylon guitar | [nbrosowsky/tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments) by Nicholaus P. Brosowsky (edited from public sources listed in that repo's `sample-source-info.txt`: cello from Freesound "12408__flcellogrl__real-cello-notes" by flcellogrl; nylon guitar from Freesound "11573__quartertone__classicalguitar-multisampled" by quartertone; violin, contrabass, flute, French horn and harp from VSCO-2 Community Edition by Versilian Studios) | CC BY 3.0 |
| Pad, choir "oo", airy texture, celesta, music box, reverb | synthesised in `engine.py` | original (same licence as the game) |

Licence text: https://creativecommons.org/licenses/by/3.0/

The samples were trimmed, pitch-shifted, filtered, looped, layered and reverberated, so the rendered
audio is an adaptation. That is allowed under CC BY 3.0 as long as attribution is given.

### Attribution text for the game credits

> **Music**: original score composed for *Ecos de Aldren*.
> Piano: *Salamander Grand Piano* by Alexander Holm, CC BY 3.0.
> Strings, flute, horn, harp and guitar samples: *tonejs-instruments* by Nicholaus P. Brosowsky
> (github.com/nbrosowsky/tonejs-instruments), CC BY 3.0, with samples from the VSCO-2 Community Edition
> (Versilian Studios) and Freesound users flcellogrl and quartertone.
> Licence: creativecommons.org/licenses/by/3.0. The samples were modified (edited, pitch-shifted,
> processed and mixed).

## Cues

See `a/music/manifest.json` for each cue's duration, loop flag, mood and when to play it. Apart from
`village_night`, every cue is meant to play once and then leave minutes of silence.
