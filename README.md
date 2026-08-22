# Notas-Medicas-name-pending

Documentación de ingeniería de NotaLocal (desktop local, track QVAC / Tether).

## Docs

| Guía | Dueño | Alcance |
| --- | --- | --- |
| [Frontend / UI-UX](docs/FRONTEND_UIUX_GUIDE.md) | Antonio | Website, renderer desktop, design system, UX y privacidad percibida |
| [Frontend — entregable agile](docs/FRONTEND_AGILE_DELIVERABLE.md) | Antonio | 12 iteraciones medibles del primer entregable (mock + Home) |
| [Backend desktop](docs/BACKEND_DESKTOP_ARCHITECTURE_GUIDE.md) | Justin | Electron Main, IPC, SQLite, adapter QVAC |
| [Backend — entregable agile](docs/BACKEND_AGILE_DELIVERABLE.md) | Justin | 12 iteraciones medibles sin `@qvac/sdk` (IPC + SQLite + mock) |
| [IA / QVAC transcripción](docs/AI_QVAC_TRANSCRIPTION_GUIDE.md) | IA | STT, estructuración, prompts y evaluación de modelos |

Principio rector del producto: **el agente documenta; el médico decide.**

## Investigación pendiente

Las tres guías marcan trabajo que **no se resuelve codeando**. Hay prompts listos para un modelo investigador en [`docs/research/`](docs/research/README.md):

1. Pega [`docs/research/prompts/SYSTEM.md`](docs/research/prompts/SYSTEM.md)
2. Pega **un** prompt de [`frontend`](docs/research/prompts/frontend.md), [`backend`](docs/research/prompts/backend.md) o [`ai-qvac`](docs/research/prompts/ai-qvac.md)
3. El entregable va a `docs/research/<ID>-….md` con fuentes y una decisión
