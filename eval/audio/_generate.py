#!/usr/bin/env python3
"""
Oira eval — TTS corpus generator (Nivel 1 / STT fixtures).

Reads eval/fixtures/<case>/script.txt lines as "Speaker: text", synthesizes a
16 kHz mono 16-bit WAV with edge-tts voices, and writes
eval/audio/<case>/audio.wav.

Speakers map to gender-matched Spanish voices:
  Médico   -> es-MX-JorgeNeural (Male)
  Paciente -> es-MX-DaliaNeural (Female)

Dev tooling only (pip: edge-tts, miniaudio, soxr, numpy); not part of the shipped app.

Usage:
  python eval/audio/_generate.py [case...]   # default: 01-simple,02-negation,12-contradiction
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import edge_tts
import miniaudio
import numpy as np
import soxr

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "eval" / "fixtures"
AUDIO = ROOT / "eval" / "audio"

VOICES = {"Médico": "es-MX-JorgeNeural", "Paciente": "es-MX-DaliaNeural"}
SAMPLE_RATE = 16000
CHANNELS = 1
SAMPLE_WIDTH = 2  # 16-bit PCM
GAP_MS = 400  # silence between utterances (keeps Whisper's segment split natural)
EDGE_FORMAT = "audio-24khz-48kbitrate-mono-mp3"


def parse_script(script_text: str):
    """Yield (speaker, text) pairs from "Speaker: text" lines."""
    lines = [l.strip() for l in script_text.splitlines() if l.strip()]
    for line in lines:
        if ":" in line:
            speaker, _, text = line.partition(":")
            speaker, text = speaker.strip(), text.strip()
            if speaker in VOICES and text:
                yield speaker, text
                continue
        # Lines without a recognized speaker prefix are droplet (not synthesized).
        print(f"  [skip] unframed line: {line[:60]!r}")


async def synthesize_line(speaker: str, text: str) -> bytes:
    """Return mono 16-bit PCM @16kHz for a single utterance."""
    voice = VOICES[speaker]
    communicate = edge_tts.Communicate(text, voice, rate="-10%")
    mp3 = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            mp3 += chunk["data"]
    # miniaudio decodes MP3 -> float PCM; then downmix to mono and resample.
    decoded = miniaudio.decode(mp3, output_format=miniaudio.SampleFormat.FLOAT32)
    src_rate = decoded.sample_rate
    src = np.frombuffer(decoded.samples, dtype=np.float32)
    nch = decoded.nchannels
    if nch > 1:
        src = src.reshape(-1, nch).mean(axis=1)  # downmix to mono
    if src_rate != SAMPLE_RATE:
        src = soxr.resample(src, src_rate, SAMPLE_RATE)
    src = np.clip(np.round(src * 32767.0), -32768, 32767).astype(np.int16)
    return src.tobytes()


def write_wav(path: Path, frames: bytes) -> None:
    """Write a 16 kHz mono 16-bit PCM WAV (RIFF)."""
    num_frames = len(frames) // SAMPLE_WIDTH
    data_size = num_frames * SAMPLE_WIDTH
    header = b"RIFF" + (36 + data_size).to_bytes(4, "little") + b"WAVE"
    fmt = (
        b"fmt "
        + (16).to_bytes(4, "little")
        + (1).to_bytes(2, "little")  # PCM
        + CHANNELS.to_bytes(2, "little")
        + SAMPLE_RATE.to_bytes(4, "little")
        + (SAMPLE_RATE * CHANNELS * SAMPLE_WIDTH).to_bytes(4, "little")
        + (CHANNELS * SAMPLE_WIDTH).to_bytes(2, "little")
        + (SAMPLE_WIDTH * 8).to_bytes(2, "little")
    )
    data = b"data" + data_size.to_bytes(4, "little") + frames
    path.write_bytes(header + fmt + data)


def silence(frames: int) -> bytes:
    return b"\0\0" * (frames // SAMPLE_WIDTH)  # 16-bit zero samples


async def generate_case(case_id: str) -> Path:
    script_file = FIXTURES / case_id / "script.txt"
    out_dir = AUDIO / case_id
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "audio.wav"

    script_text = script_file.read_text(encoding="utf-8")
    utterances = list(parse_script(script_text))
    if not utterances:
        raise SystemExit(f"[error] {case_id}: no usable lines in {script_file}")

    print(f"[generate] {case_id}: {len(utterances)} utterances")
    parts: list[bytes] = []
    gap_frames = int(GAP_MS * SAMPLE_RATE / 1000) * SAMPLE_WIDTH
    for speaker, text in utterances:
        pcm = await synthesize_line(speaker, text)
        # normalize to mono int16 layout expected by downstream (miniaudio
        # returns interleaved sample data; 1ch already matches).
        parts.append(pcm)
        parts.append(silence(gap_frames))

    frames = b"".join(parts)
    write_wav(out_file, frames)
    dur_s = len(frames) / SAMPLE_WIDTH / SAMPLE_RATE
    print(
        f"  -> {out_file.relative_to(ROOT)}  {dur_s:.2f}s  "
        f"{len(frames) / SAMPLE_WIDTH / SAMPLE_RATE / 60:.1f}min"
    )
    return out_file


async def main(case_ids: list[str]) -> None:
    for case_id in case_ids:
        await generate_case(case_id)
    print("[done]")


if __name__ == "__main__":
    cases = sys.argv[1:] or ["01-simple", "02-negation", "12-contradiction"]
    asyncio.run(main(cases))