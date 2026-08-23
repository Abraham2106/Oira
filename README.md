<a id="readme-top"></a>

<div align="center">
  <a href="https://github.com/Abraham2106/Oira">
    <img src="https://raw.githubusercontent.com/Ddm140207/oira_landing_page/main/assets/img/og-image.png" alt="Banner de Oira" width="100%">
  </a>

  <h1>Oira</h1>

  <p>
    Aplicación de escritorio local-first para convertir una consulta ambulatoria
    en un <strong>borrador de nota clínica</strong> listo para revisión médica.
  </p>

  <p>
    <a href="https://github.com/Abraham2106/Oira/graphs/contributors"><img alt="Contribuidores" src="https://img.shields.io/github/contributors/Abraham2106/Oira?style=flat-square"></a>
    <a href="https://github.com/Abraham2106/Oira/network/members"><img alt="Forks" src="https://img.shields.io/github/forks/Abraham2106/Oira?style=flat-square"></a>
    <a href="https://github.com/Abraham2106/Oira/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/Abraham2106/Oira?style=flat-square"></a>
    <a href="https://github.com/Abraham2106/Oira/issues"><img alt="Issues" src="https://img.shields.io/github/issues/Abraham2106/Oira?style=flat-square"></a>
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white">
    <img alt="Electron" src="https://img.shields.io/badge/Electron-38-47848F?style=flat-square&logo=electron&logoColor=white">
    <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black">
    <img alt="QVAC" src="https://img.shields.io/badge/QVAC-0.17.1-2B5F73?style=flat-square">
    <img alt="pnpm" src="https://img.shields.io/badge/pnpm-10-F69220?style=flat-square&logo=pnpm&logoColor=white">
  </p>

  <p>
    <a href="#inicio-rápido"><strong>Inicio rápido</strong></a>
    ·
    <a href="#documentación"><strong>Documentación</strong></a>
    ·
    <a href="https://github.com/Abraham2106/Oira/issues/new?labels=bug&amp;title=%5BBug%5D%3A%20"><strong>Reportar un error</strong></a>
    ·
    <a href="https://github.com/Abraham2106/Oira/issues/new?labels=enhancement&amp;title=%5BFeature%5D%3A%20"><strong>Solicitar una función</strong></a>
  </p>
</div>

> [!IMPORTANT]
> Oira está en desarrollo activo para el track QVAC / Tether. El flujo completo de consulta —grabar, transcribir, estructurar, revisar y copiar— corre de extremo a extremo con inferencia local en el dispositivo. El agente **documenta**; el médico **decide**. No diagnostica, no prescribe y no sustituye el juicio clínico. Antes de usarlo con información real, lee [privacidad y límites](#privacidad-y-límites).

<details>
  <summary><strong>Tabla de contenidos</strong></summary>

- [Visión general](#visión-general)
  - [Por qué existe Oira](#por-qué-existe-oira)
  - [Construido con](#construido-con)
- [Capacidades principales](#capacidades-principales)
- [Experiencia del producto](#experiencia-del-producto)
- [Cómo funciona](#cómo-funciona)
- [Inicio rápido](#inicio-rápido)
- [Primer uso](#primer-uso)
- [Flujos de trabajo](#flujos-de-trabajo)
- [Nota clínica y revisión](#nota-clínica-y-revisión)
- [Inferencia local](#inferencia-local)
- [Privacidad y límites](#privacidad-y-límites)
- [Desarrollo y calidad](#desarrollo-y-calidad)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Documentación](#documentación)
- [Estado y roadmap](#estado-y-roadmap)
- [Contribuir](#contribuir)
- [Soporte y feedback](#soporte-y-feedback)
- [Licencia](#licencia)
- [Agradecimientos](#agradecimientos)

</details>

## Visión general

Oira captura una consulta en el equipo del médico, transcribe el audio, estructura un borrador de nota y deja la corrección, la aceptación y la exportación en manos del clínico.

El producto es una app **desktop local-first** para consulta ambulatoria: un médico, una computadora, una consulta a la vez. El acceso se abre con inicio de sesión de Google; no hay backend propio, no hay sincronización en la nube y no hay fallback silencioso a un proveedor remoto. Si la inferencia local falla, falla de forma visible.

Este repositorio es un monorepo pnpm. El único producto ejecutable hoy es el cliente Electron (`apps/desktop`). El nombre público del proyecto es **Oira** (`github.com/Abraham2106/Oira`).

### Por qué existe Oira

Un scribe genérico puede generar texto, pero suele mezclar lo dicho con lo plausible, ocultar el origen de cada frase y presentar el resultado como nota final. Oira añade la capa operativa que el consultorio necesita:

- **El borrador no es la nota.** Nada se da por aceptado hasta que el médico revisa y confirma.
- **La ausencia es un dato válido.** Si algo no se dijo, la sección queda en *No consta en la consulta* o *Sin determinar*; no se rellena con una conclusión verosímil.
- **Cada campo puede mostrar su origen.** Las secciones enlazan fragmentos de la transcripción para que la revisión no dependa de la memoria.
- **La inferencia permanece en el dispositivo.** Transcripción (Whisper) y estructuración (Qwen3) corren por QVAC en el proceso Main de Electron.
- **Exportar es una decisión explícita.** Copiar al portapapeles saca el contenido de Oira; el destino tiene sus propias prácticas.

### Construido con

| Tecnología | Papel en Oira |
|---|---|
| [Electron](https://www.electronjs.org) | Shell de escritorio. El proceso Main es el backend local. |
| [React](https://react.dev) | Interfaz de consulta, revisión y exportación. |
| [TypeScript](https://www.typescriptlang.org) | Contratos compartidos, Main, preload y renderer. |
| [electron-vite](https://electron-vite.org) | Bundles de desarrollo y producción. |
| [Zod](https://zod.dev) | Validación en el borde IPC y del schema clínico. |
| [Vitest](https://vitest.dev) | Pruebas unitarias y evaluación de casos. |
| [QVAC (`@qvac/sdk` 0.17.1)](https://docs.qvac.tether.io/) | Inferencia local: STT y completion estructurada. |
| [Whisper Small Q8](https://docs.qvac.tether.io/ai-capabilities/transcription) | Transcripción en español, sin diarización en P0. |
| [Qwen3 600M Instruct Q4](https://docs.qvac.tether.io/) | Extracción JSON de las siete secciones de la nota. |

## Capacidades principales

| Área | Capacidad |
|---|---|
| **Consulta guiada** | Flujo único: listo → aviso al paciente → grabación → transcripción → estructuración → revisión → copia. |
| **Sesión e idioma** | Entrada con Google (OAuth en el navegador del sistema); interfaz en inglés o español. |
| **Aviso de grabación** | Casilla explícita, desmarcada por defecto. No es un documento de consentimiento ni se almacena como prueba legal. |
| **Captura local** | Micrófono a PCM 16 kHz mono; audio temporal por consulta; se elimina tras generar la nota o al descartar. |
| **STT on-device** | Whisper Small con `language: "es"`. Los hablantes no se etiquetan automáticamente. |
| **Nota estructurada** | Siete secciones editables, con estados `STATED`, `NOT_STATED` y `UNKNOWN`. |
| **Revisión humana** | Confirmación obligatoria antes de aceptar. Cada sección puede marcarse como revisada. |
| **Evidencia de origen** | Un campo puede resaltar los segmentos de transcripción que lo sustentan. |
| **Exportación mínima** | Vista previa exacta y copia al portapapeles. PDF, firma e integración EHR quedan fuera de esta versión. |
| **Privacidad observable** | El panel de estado muestra hechos confirmados o `DESCONOCIDO`; no rellena con promesas. |
| **Adaptador intercambiable** | QVAC por defecto en Electron; `NOTALOCAL_INFERENCE=mock` y los tests usan el puente sintético. |

## Experiencia del producto

Tras iniciar sesión con Google, un panel lateral da acceso a **Dashboard**, **Notas**, **Pacientes** y **Equipo**, más **Ajustes** (idioma inglés/español y cierre de sesión). La consulta sigue un stepper de cinco pasos: **Consulta**, **Grabación**, **Procesamiento**, **Revisión** y **Exportar**.

### Equipo listo y nueva consulta

Antes de que entre el paciente, la app pide confirmar el equipo y muestra el estado de privacidad. En **Nueva consulta** el médico puede añadir una etiqueta opcional y el tipo de visita. El botón **Comenzar grabación** permanece deshabilitado hasta marcar:

> Confirmé que informé al paciente de la grabación. Esto no es un documento legal.

La pantalla declara *La grabación no ha comenzado* hasta que el micrófono queda activo.

### Grabación

Un banner en vivo indica *Grabando — micrófono activo* y un temporizador. **Detener grabación** (o `Ctrl+Enter`) cierra la captura y pasa a transcribir. **Descartar consulta** pide confirmación y no genera nota.

### Procesamiento

Dos fases visibles, sin porcentajes ni ETAs inventados:

1. Transcripción
2. Estructuración

El copy describe el estado (*Transcribiendo la consulta en este equipo* / *Organizando la nota*), no un tiempo de entrega.

### Revisión

Vista partida:

- **Izquierda:** borrador con las siete secciones, badges de ausencia y control de “revisado”.
- **Derecha:** transcripción. Pulsar un origen resalta el fragmento literal.

La nota lleva el badge *Borrador — requiere revisión médica* hasta que el médico confirma y acepta. Solo entonces pasa a *Revisada por el médico*.

### Exportar

La vista previa es exactamente el texto que se copia. Un aviso recuerda que lo pegado en otro sistema queda fuera de Oira. El PDF no forma parte de esta versión.

Atajos:

| Atajo | Acción |
|---|---|
| `Ctrl+Enter` | Detiene la grabación, o acepta el borrador si ya está confirmado. |
| `Esc` | Cierra Privacidad y quita el resaltado de origen. |
| `?` | Abre o cierra Privacidad y uso (fuera de un campo de texto). |

## Cómo funciona

```text
Médico
  │
  ├── Renderer (React)
  │     · UI, stepper, revisión
  │     · Sin Node, sin fs, sin @qvac/sdk
  │     · Solo window.oira
  │
  ├── Preload (contextBridge)
  │     · Superficie cerrada, un método por canal
  │
  └── Main (backend local)
        ├── encounters + audio temporal (WAV/PCM)
        ├── transcription  → Whisper (QVAC)
        ├── structuring    → Qwen3 JSON schema (QVAC)
        ├── verify-source  → IDs de segmento deben existir
        └── export         → copia en el renderer; stub de archivo
```

El flujo de una consulta es:

1. Confirmar el aviso al paciente y empezar el encuentro.
2. Capturar audio en el renderer y enviarlo por `appendAudio` en secuencia.
3. Al detener, finalizar el WAV temporal y transcribir en el dispositivo.
4. Extraer las siete secciones con JSON schema; reintentar una vez si el schema es inválido.
5. Rechazar notas cuyos `sourceSegmentIds` no existan en la transcripción.
6. Mostrar el borrador junto a la transcripción para edición y aceptación.
7. Copiar el texto aceptado; purgar el audio temporal de esa consulta.

El renderer **nunca** importa `@qvac/sdk`. El único módulo de producción que puede hacerlo es `apps/desktop/src/main/qvac/sdk.ts`.

## Inicio rápido

### Requisitos

- Node.js `22.17` o posterior (host y runtime embebido de Electron).
- [pnpm](https://pnpm.io/) `10` (fijado en `packageManager` del `package.json` raíz). Instalar depende de pnpm; para ejecutar los scripts sirve cualquier runner (`npm run dev` o `pnpm dev`).
- Un micrófono, si vas a grabar una consulta real.
- Disco y RAM suficientes para descargar y cargar los modelos QVAC en la primera ejecución local. El tiempo depende del audio, el modelo y el equipo; este README no publica cifras de latencia.

### 1. Clonar e instalar

```bash
git clone https://github.com/Abraham2106/Oira.git
cd Oira
pnpm install
```

La primera instalación compila binarios de Electron y esbuild.

### 2. Arrancar el escritorio

```bash
npm run dev
```

Abre la ventana nativa con recarga en caliente (con pnpm también funciona `pnpm dev`). El renderer de Vite queda en `http://localhost:5173/`; la app habla con Main a través de `window.oira`.

### 3. Elegir el adaptador de inferencia

| Variable | Efecto |
|---|---|
| *(sin definir)* | En Electron, usa **QVAC** (Whisper + Qwen3). |
| `NOTALOCAL_INFERENCE=mock` | Transcripción y nota sintéticas. Útil para UI sin modelos. |
| `NODE_ENV=test` | Fuerza mock, aunque pidas QVAC. |

Ejemplo mock:

```bash
# Windows PowerShell
$env:NOTALOCAL_INFERENCE = "mock"
npm run dev
```

```bash
# macOS / Linux
NOTALOCAL_INFERENCE=mock npm run dev
```

> [!CAUTION]
> No subas audio real de pacientes, transcripciones clínicas ni notas al repositorio. Los fixtures de `apps/desktop/src/shared/fixtures/` son sintéticos.

### 4. Compilar

```bash
pnpm --filter oira-desktop build
```

El bundle de producción queda en `apps/desktop/out/`.

## Primer uso

1. Inicia sesión con tu cuenta de Google.
2. En **Equipo listo**, continúa a una nueva consulta.
3. (Opcional) Escribe una etiqueta o tipo de visita. No se exige identificador de paciente.
4. Marca el aviso al paciente.
5. **Comenzar grabación** → habla → **Detener grabación**.
6. Espera transcripción y estructuración.
7. Revisa cada sección junto a la transcripción. Las vacías pueden quedar en *No consta* / *Sin determinar*.
8. Confirma la revisión → **Aceptar borrador** → **Copiar nota**.

Si el preload no está disponible (por ejemplo, abriendo solo el renderer en el navegador), la UI cae al puente mock.

## Flujos de trabajo

### Consulta con inferencia local

Con el adaptador QVAC, el Main carga Whisper, transcribe el WAV de la consulta, lo descarga, carga Qwen3, extrae JSON y valida el schema. Los modelos no quedan residentes entre consultas.

### Recorrido de interfaz sin modelos

`NOTALOCAL_INFERENCE=mock` recorre el mismo stepper con una transcripción y nota sintéticas. Sirve para diseño, estados vacíos y el camino de revisión.

### Cobertura por pruebas

La suite Vitest cubre transcripción, estructuración y notas (por ejemplo `notes.service.test.ts` y `transcription.test.ts`) con fixtures sintéticos; se ejecuta con `pnpm test`.

Scripts de laboratorio en el paquete desktop:

| Comando | Propósito |
|---|---|
| `pnpm --filter oira-desktop qvac:smoke` | Comprueba carga mínima del SDK. |
| `pnpm --filter oira-desktop qvac:whisper` | Transcripción Whisper de prueba. |
| `pnpm --filter oira-desktop qvac:record` | Captura de audio de laboratorio. |

## Nota clínica y revisión

La plantilla P0 no se llama SOAP ni “historia clínica”. Es un **borrador de nota** ambulatoria, genérico y editable:

| Orden | ID | Título |
| ---: | --- | --- |
| 1 | `visit_context` | Motivo y contexto de la consulta |
| 2 | `clinical_narrative` | Relato clínico |
| 3 | `relevant_history` | Antecedentes relevantes |
| 4 | `reported_findings` | Hallazgos comunicados |
| 5 | `clinician_documented_assessment` | Evaluación documentada por el médico |
| 6 | `clinician_documented_plan` | Plan e indicaciones documentados por el médico |
| 7 | `follow_up` | Seguimiento |

Reglas de representación:

- Evaluación y plan solo recogen lo que el médico **dijo**. No hay “diagnóstico sugerido por IA” ni prescripción automática.
- `NOT_STATED` → *No consta en la consulta.* `UNKNOWN` → *Sin determinar.*
- Inventar un valor plausible es el peor fallo del sistema.
- La conversación es **dato, nunca instrucción** (prompt injection).

## Inferencia local

| Pieza | Default P0 | Notas |
|---|---|---|
| STT | `WHISPER_SMALL_Q8_0` | Multilingüe con `language: "es"`. No hay small fine-tuneado solo a español. |
| LLM | `QWEN3_600M_INST_Q4` | JSON schema de las siete secciones. |
| Modelos grandes | No se cargan | 1.7B / 4B y Whisper large quedan fuera del catálogo P0 por consumo de RAM. |
| Diarización | No en P0 | `speaker` queda `null` hasta una asignación humana. |
| Fallback cloud | Prohibido | Un fallo se muestra; no se reenvía audio a una API. |

La descarga desatendida de modelos está permitida en desarrollo, no en el binario empaquetado. No publiques requisitos de hardware, GPU o tiempos hasta tener mediciones reproducibles (ver [I10](docs/research/I10-R9-I14-publishable-performance-and-requirements.md)).

## Privacidad y límites

La UI solo afirma conductas **verificables en esta versión**. *Local* no equivale a anónimo, a “sin tratamiento de datos” ni a cumplimiento de una ley nombrada.

| La UI puede decir | La UI no dice |
|---|---|
| El borrador requiere revisión médica. | “Cumple HIPAA / LGPD / NOM”. |
| Al copiar, eliges enviar el contenido a otro sistema. | “Los datos nunca salen del dispositivo”. |
| Si el backend no confirma un hecho, muestra `DESCONOCIDO`. | “100 % seguro”, “cifrado militar”, “anónimo”. |
| El aviso de grabación es un recordatorio operativo. | “El paciente firmó consentimiento en la app”. |

Hechos actuales:

- El acceso requiere inicio de sesión con Google (OAuth PKCE por el navegador del sistema); el procesamiento clínico permanece en el dispositivo.
- Los encuentros viven en memoria; no hay SQLite de producción.
- El audio temporal se guarda por consulta y se purga al generar o descartar.
- El panel de Privacidad muestra `DESCONOCIDO` para procesamiento, red, almacenamiento y proveedor remoto hasta que Main confirme el hecho.
- No hay telemetría de contenido ni crash reporting con payload clínico.

Revisa [I1 — afirmaciones sobre datos de salud](docs/research/I1-R6-health-data-claims.md) antes de escribir copy de producto o de website.

## Desarrollo y calidad

| Comando | Descripción |
|---|---|
| `pnpm install` | Instala el workspace. |
| `npm run dev` (o `pnpm dev`) | Electron + Vite en desarrollo. |
| `pnpm test` | Suite Vitest del desktop (máquina de estados, IPC, QVAC unitario). |
| `pnpm lint:desktop` | ESLint del renderer y Main. |
| `pnpm typecheck` | TypeScript de `@oira/types` y del desktop. |
| `pnpm --filter oira-desktop build` | Bundle de producción. |

El renderer solo habla con el resto del sistema a través de `apps/desktop/src/renderer/bridge/`. En Electron usa `window.oira`; si el API no existe, usa `mock.ts`.

## Estructura del repositorio

```text
Oira/
├── apps/
│   └── desktop/                 # App Electron (electron-vite)
│       ├── src/main/            # Backend local: IPC, audio, notas, QVAC
│       ├── src/preload/         # contextBridge → window.oira
│       ├── src/renderer/        # UI React (login → dashboard → consulta → revisión)
│       ├── src/shared/          # Schemas Zod y contrato IPC
│       └── scripts/             # Smoke y laboratorio QVAC
├── packages/
│   ├── types/                   # Estados, secciones y tipos de dominio
│   └── ui/                      # Primitivas visuales (sin lógica clínica)
└── docs/                        # Arquitectura, UX, IA e investigación
    └── research/                # Decisiones con fuentes (I*, R-*, Q*)
```

## Documentación

| Documento | Contenido |
|---|---|
| [Frontend / UI-UX](docs/FRONTEND_UIUX_GUIDE.md) | Pantallas, copy, estados y definición de hecho. |
| [Plan frontend](docs/FRONTEND_AGILE_DELIVERABLE.md) | Iteraciones medibles de interfaz. |
| [Arquitectura backend](docs/BACKEND_DESKTOP_ARCHITECTURE_GUIDE.md) | Main, IPC, storage y adaptador QVAC. |
| [Plan backend](docs/BACKEND_AGILE_DELIVERABLE.md) | Iteraciones de Main sin improvisar la API. |
| [Electron desde cero](docs/ELECTRON_GETTING_STARTED.md) | Main / Preload / Renderer para quien no haya usado Electron. |
| [IA / QVAC](docs/AI_QVAC_TRANSCRIPTION_GUIDE.md) | STT, estructuración, prompts y evaluación. |
| [Kit de investigación](docs/research/README.md) | Prompts y decisiones con fuentes. |

Un ítem marcado como investigación pendiente **no** se publica como claim de producto hasta que exista el write-up.

## Estado y roadmap

Implementado:

- [x] Shell Electron, preload cerrado y renderer React.
- [x] Flujo completo de consulta con stepper y atajos.
- [x] Aviso al paciente antes de grabar (no es consentimiento legal).
- [x] Captura de micrófono PCM 16 kHz y almacén temporal de audio.
- [x] Adaptador QVAC: Whisper Small + Qwen3 600M con JSON schema.
- [x] Adaptador mock para tests y desarrollo sin modelos.
- [x] Inicio de sesión con Google (OAuth PKCE por navegador del sistema).
- [x] Shell con panel lateral: Dashboard, Notas, Pacientes y Equipo.
- [x] Interfaz bilingüe inglés/español persistida en ajustes.
- [x] Siete secciones I4, estados de ausencia y evidencia de origen.
- [x] Aceptación explícita y copia al portapapeles.
- [x] Panel de privacidad con fallback `DESCONOCIDO`.
- [x] Suite Vitest, lint, typecheck y casos de evaluación sintéticos.

Próximos pasos:

- [ ] Persistencia SQLite (hoy los encuentros viven en memoria).
- [ ] Confirmar en UI los hechos de red, almacenamiento y procesamiento que Main ya conoce.
- [ ] Exportación a archivo (TXT/JSON); PDF queda fuera hasta I9/R-10.
- [ ] Empaquetado, firma e instaladores.
- [ ] Integración continua en GitHub Actions.
- [ ] Website público (`apps/website` sigue vacío).
- [ ] Licencia publicada en el repositorio.

## Contribuir

1. Crea un fork del repositorio.
2. Abre una rama descriptiva: `git checkout -b feature/nombre`.
3. Implementa el cambio y ejecuta `pnpm lint:desktop`, `pnpm typecheck` y `pnpm test`.
4. Abre un Pull Request con motivación, límites y cómo se protege el comportamiento.

No subas audio, transcripciones ni notas de pacientes reales. No afirmes cumplimiento legal, rendimiento o “nunca sale del dispositivo” en UI ni en el PR.

### Colaboradores

<a href="https://github.com/Abraham2106/Oira/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Abraham2106/Oira" alt="Colaboradores de Oira">
</a>

## Soporte y feedback

- [Reporta un error](https://github.com/Abraham2106/Oira/issues/new?labels=bug&title=%5BBug%5D%3A%20) con pasos de reproducción, resultado esperado y sistema operativo.
- [Propón una mejora](https://github.com/Abraham2106/Oira/issues/new?labels=enhancement&title=%5BFeature%5D%3A%20) con el caso de uso y el beneficio.
- Consulta los [issues abiertos](https://github.com/Abraham2106/Oira/issues) antes de crear uno nuevo.

Enlace del proyecto: [github.com/Abraham2106/Oira](https://github.com/Abraham2106/Oira)

## Licencia

Este repositorio **aún no publica un archivo `LICENSE`**. No asumas MIT ni otro régimen hasta que el equipo lo declare.

## Agradecimientos

Oira se construye sobre [Electron](https://www.electronjs.org), [React](https://react.dev), [TypeScript](https://www.typescriptlang.org), [QVAC](https://docs.qvac.tether.io/) (Tether), Whisper y Qwen3.

<p align="right"><a href="#readme-top">Volver arriba ↑</a></p>
