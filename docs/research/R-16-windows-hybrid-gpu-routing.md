# R-16 — Diagnóstico de GPU híbrida en el ejecutable Windows

Fecha: 2026-09-15

Equipo: AMD Ryzen 5 7535HS + AMD Radeon(TM) Graphics (iGPU, 512 MiB) +
NVIDIA GeForce RTX 2050 (4 GiB, driver 592.82). Vulkan 1.4.321. Optimus
activo (`VK_LAYER_NV_optimus`, `VK_LAYER_AMD_switchable_graphics`).
Ejecutable investigado: `C:\Users\solan\AppData\Local\Oira\app-0.0.7\Oira.exe`.

## Conclusión

La causa es doble: la GPU de la ventana Electron y la GPU de inferencia QVAC
son procesos/decisiones independientes.

- El ejecutable ya solicita GPU de alto rendimiento para Chromium con
  `force_high_performance_gpu`.
- Whisper usa Vulkan con `use_gpu: true` y el índice real de QVAC.
- Qwen usa Vulkan con `device: "gpu"`, `gpu_layers: 99`, `main-gpu: "dedicated"`
  y sin reparto entre GPUs.

Los cambios sin confirmar del árbol corrigen fallos reales que podían enviar
la inferencia a la integrada: consulta de recursos mal formada, ordinal de GPU
inventado por VRAM y Qwen sin selector explícito de dedicada.

La sonda real detectó AMD Radeon integrada y NVIDIA RTX 2050, ambas con Vulkan
disponible. El binario instalado también contiene el worker QVAC. No hay
modelos provisionados en el perfil de la app, así que no fue posible ejecutar
el smoke test empaquetado hasta el final.

Por tanto, ver `GPU 0` junto a `Oira.exe` no demuestra que la inferencia use la
integrada, ni ver actividad en la RTX demuestra que Chromium renderiza allí.
En Optimus, incluso cuando la dedicada calcula o renderiza, el panel interno
puede seguir conectado a la integrada y ésta hace el scan-out.

## Mapa de ejecución

```text
Oira.exe (Electron main)
  ├─ app.commandLine.force_high_performance_gpu
  │    └─ Chromium renderer / compositor ──> preferencia de GPU de Windows
  └─ composeApplication
       └─ createInferencePorts("qvac")
            └─ createQvacInferenceRuntime({ gpuPreference })
                 ├─ getSystemResources({ sample: true })
                 │    └─ bare-gpu-info: lista los adaptadores y sus índices QVAC
                 ├─ Whisper cpp: use_gpu=true, gpu_device=<índice QVAC>
                 └─ llama.cpp: device="gpu", gpu_layers=99,
                     main-gpu="dedicated", split-mode="none"
                      └─ QVAC Bare worker ──> Vulkan ──> GPU dedicada
```

La ruta concreta se sigue en `apps/desktop/src/main/index.ts`,
`apps/desktop/src/main/composition/compose-application.ts`,
`apps/desktop/src/main/inference/select.ts`,
`apps/desktop/src/main/qvac/inference-runtime.ts`,
`apps/desktop/src/main/qvac/device-selection.ts`,
`apps/desktop/src/main/qvac/whisper-stt-config.ts` y
`apps/desktop/src/main/qvac/qwen-llm-config.ts`.

Codegraph confirma el flujo: `composeApplication` → `createInferencePorts` →
`createQvacInferenceRuntime`. El renderer solo ve eventos de ciclo de vida;
no elige GPU.

## Hallazgos que explican el fallo anterior

### 1. La selección del proceso UI no selecciona QVAC

Electron documenta `--force_high_performance_gpu` como «Force using discrete
GPU when there are multiple GPUs available» y exige añadirlo antes de
`app.whenReady()`. `index.ts` lo hace en ese punto. Es correcto para Chromium,
pero no reemplaza la selección Vulkan del worker QVAC. Windows DXGI expone la
misma idea como `DXGI_GPU_PREFERENCE_HIGH_PERFORMANCE`; el SO y los
controladores conservan la decisión final para el proceso de interfaz.

NVIDIA Optimus documenta que una aplicación puede renderizar en la GPU de alto
rendimiento mientras el monitor interno permanece conectado a la integrada;
los frames se copian al pipeline de scan-out de la iGPU. Ver sólo GPU 0 en
`Oira.exe` es compatible con ese diseño.

Fuentes: [Electron command-line switches](https://www.electronjs.org/docs/latest/api/command-line-switches),
[Microsoft: DXGI_GPU_PREFERENCE](https://learn.microsoft.com/en-us/windows/win32/api/dxgi1_6/ne-dxgi1_6-dxgi_gpu_preference),
[NVIDIA Optimus](https://docs.nvidia.com/gameworks/content/technologies/desktop/optimus.htm).

### 2. Whisper requiere activación e índice explícitos

Whisper usa GPU sólo con `contextParams.use_gpu: true`; `gpu_device` selecciona
un adaptador no predeterminado. Ambos se pasan desde el runtime. En Windows el
backend del addon es Vulkan, no CUDA. CUDA aparece en la RTX (`drivers.cuda:
true`) y no en la AMD; eso no decide el backend de Whisper.

El defecto previo era que la consulta de recursos usaba `includeSamples`,
mientras que el SDK 0.18.2 acepta `sample`. El README instalado lo declara
así: `getSystemResources({ sample: true })`. Sin datos de muestra tampoco se
obtenía VRAM para ordenar los adaptadores con fiabilidad.

El script de laboratorio `apps/desktop/scripts/qvac-qwen.mjs` todavía usa
`includeSamples` y `main-gpu: 1`; no es el camino del producto.

### 3. El índice calculado no era un índice de backend

La lógica previa (`llamaCppGpuIndex`) derivaba un índice por rango de VRAM:
«el índice de la GPU con más VRAM es el recuento de GPUs con menos VRAM». Eso
presupone un orden de enumeración de llama.cpp que QVAC no garantiza.

En este equipo QVAC enumera AMD primero (índice 0) y RTX después (índice 1).
Vulkaninfo coincide: GPU0 integrada AMD, GPU1 discreta NVIDIA. El ordinal
inventado coincidía aquí por accidente. Si QVAC listara la RTX primero, el
índice inventado seguiría siendo `1` y Whisper recibiría la AMD.

El selector actual conserva el índice devuelto por QVAC y lo entrega a Whisper
como `gpu_device`.

### 4. Qwen necesita pedir la clase de dispositivo, no adivinar un ordinal

El esquema instalado de `@qvac/sdk` 0.18.2 (`llamacpp-config`) declara:

> GPU to pin when `device` is `"gpu"`: a GPU-device index, `"integrated"`, or
> `"dedicated"` (the discrete GPU with the most VRAM). Omit to let the backend
> choose the first enumerated device. Resolved against the addon's own ggml
> device enumeration, so it cannot desync from the device list the backend
> actually uses. If an explicit request cannot be satisfied the addon falls
> back to CPU rather than substituting a different GPU.

`main-gpu: "dedicated"` restringe la selección a GPUs dedicadas; con
`split-mode: "none"` no reparte el modelo entre ambas. `device: "gpu"` y
`gpu_layers: 99` solicitan inferencia GPU y residencia completa. El cambio
actual usa ese selector para Qwen en vez de un ordinal deducido.

La propia API entrega `stats.backendDevice` (`"gpu"` o `"cpu"`) tras una
completion; es la evidencia de backend efectivo para Qwen. La UI conserva el
campo como `effective` cuando está presente. Un fallo de `"dedicated"` no
manda el trabajo a la integrada: cae a CPU.

### 5. En Windows la VRAM de QVAC no es una verdad de dispositivo

La matriz de recursos del SDK (`system-resources-support-matrix.md`) marca
`memoryTotalBytes` como `unverified` mientras el alcance sea ambiguo. La sonda
de este equipo lo reprodujo: AMD y RTX devolvieron
`memoryTotalBytes.status = "unverified"`. Ordenar por VRAM en Windows híbrido
no es un contrato fiable; el nombre/clase e índice de enumeración sí lo son.

### 6. El empaquetado no elimina por sí mismo los addons

`forge.config.cjs` aplica `@qvac/sdk/electron-forge` para `win32-x64`,
`asar: false` y `prune: false`. El paquete instalado 0.0.7 contiene:

- `resources/app/qvac/worker.bundle.js` (9.5 MiB)
- `resources/app/qvac/worker.entry.mjs`
- `resources/app/qvac/addons.manifest.json` con `@qvac/asr-ggml`,
  `@qvac/llm-llamacpp` y `bare-gpu-info`
- `resources/app/node_modules/bare-runtime-win32-x64/bin/bare.exe`
- `force_high_performance_gpu` y `getSystemResources({ sample: true })` en el
  Main empaquetado

Esto descarta la ausencia del worker como explicación primaria del síntoma,
aunque no prueba que un controlador Vulkan concreto acepte la carga del modelo.

## Evidencia tomada en este equipo

| Observación | Resultado |
| --- | --- |
| WMI | `AMD Radeon(TM) Graphics` 512 MiB; `NVIDIA GeForce RTX 2050` ~4 GiB |
| `nvidia-smi` | RTX 2050, driver 592.82, 4096 MiB |
| `vulkaninfo --summary` | GPU0 `PHYSICAL_DEVICE_TYPE_INTEGRATED_GPU` AMD; GPU1 `PHYSICAL_DEVICE_TYPE_DISCRETE_GPU` RTX 2050. Capas Optimus presentes |
| `qvac-gpu-probe.mjs resources` | AMD y RTX, ambas `drivers.vulkan: true`. RTX también `cuda: true`. VRAM `unverified` en las dos |
| Perfil de la app | `%APPDATA%\Oira\model-cache` vacío; no hay `settings.json` (preferencia por defecto `dedicated`) |
| Cache de laboratorio | `%LOCALAPPDATA%\Oira\qvac-models` ausente |
| Smoke empaquetado | `PACKAGED_WARM` → `GPU_SELECTION_UNAVAILABLE` antes de cargar pesos. El error posterior `BARE_RUNTIME_BINARY_NOT_FOUND` sale del diagnóstico del script (`createRequire(process.execPath)`), no de la ausencia de `bare.exe` en `resources/app` |

El smoke no llegó a `PACKAGED_SMOKE_PASS` porque no hay pesos en
`userData/model-cache`. `GPU_SELECTION_UNAVAILABLE` en este arranque inspeccionado
es un fallo de `getSystemResources`/selección antes del `loadModel`; no sustituye
la necesidad de aprovisionar modelos para la prueba de release.

## Casos que siguen siendo posibles

| Caso | Señal observable | Acción/interpretación |
| --- | --- | --- |
| La ventana usa AMD y Qwen usa RTX | `Oira.exe` muestra GPU 0; `backendDevice` es `gpu` y la memoria RTX crece | Comportamiento válido en portátil híbrido. |
| La ventana usa AMD y Qwen cae a CPU | `backendDevice: "cpu"`; sin aumento de VRAM RTX | Investigar el log Vulkan/driver y la carga de Qwen. El addon cae a CPU si `"dedicated"` no se puede satisfacer. |
| Whisper toma AMD | El evento muestra `gpu_device=0` en un equipo donde QVAC enumera AMD primero | Comparar la lista `getSystemResources` contra el índice pasado. |
| La preferencia Windows vence al switch de Electron | `Oira.exe` continúa en GPU 0 antes de iniciar modelos | Configurar el ejecutable instalado en Configuración > Sistema > Pantalla > Gráficos > Alto rendimiento y reiniciar la app. |
| La pantalla sigue en AMD aunque la RTX trabaja | Monitor interno cableado a iGPU (Optimus) | Es normal: la RTX puede renderizar/calcular y copiar el resultado a la iGPU. |
| Vulkan no está disponible o falla | `getSystemResources` no lista Vulkan o la carga falla | Actualizar/reinstalar el driver del fabricante; CUDA por sí solo no sirve a este build. |
| VRAM insuficiente | Qwen no carga o informa fallo | No hay spill transparente configurado; reducir modelo/contexto o usar hardware con VRAM suficiente. |
| `gpuPreference: "integrated"` en Ajustes | El runtime pide `main-gpu: "integrated"` tras reiniciar | Intencional. El valor se captura al arrancar Main; cambiarlo exige reinicio. |
| `getSystemResources` lanza en el .exe | `warmTranscription` → `GPU_SELECTION_UNAVAILABLE` | Distinto de «falta el modelo». Revisar worker Bare, `QVAC_WORKER_PATH` y el spawn desde `dist/main`. |

## Protocolo de validación de release

1. Empaquetar el candidato con `pnpm make:desktop`.
2. En el mismo equipo instalarlo y aprovisionar ambos pesos mediante la UI
   (`ggml-large-v3-turbo.bin` y `Qwen3-4B-Q4_K_M.gguf` en
   `%APPDATA%\Oira\model-cache`).
3. Ejecutar `node apps/desktop/scripts/qvac-gpu-probe.mjs resources` y guardar
   la lista y el orden de GPU de QVAC.
4. Ejecutar la prueba del ejecutable empaquetado:

   ```powershell
   node apps/desktop/scripts/qvac-packaged-gpu-smoke.mjs `
     "$env:LOCALAPPDATA\Oira\app-<versión>\Oira.exe"
   ```

   Debe terminar en `PACKAGED_SMOKE_PASS`, informar `PACKAGED_QWEN` con
   `backendDevice: "gpu"`, y mostrar aumento de memoria en `nvidia-smi`.
5. En Administrador de tareas añadir la columna **Motor de GPU** y observar el
   proceso worker además de `Oira.exe`; no evaluar sólo la gráfica 3D de la
   ventana. Para NVIDIA, contrastar memoria y procesos con `nvidia-smi`.
6. Repetir con batería y corriente, y con la preferencia Windows en
   «Dejar que Windows decida» y «Alto rendimiento». Registrar modelo de GPU,
   versión de driver, backend efectivo y resultado.

La prueba no debe aprobarse sólo porque la configuración solicitada dice
`dedicated`: debe exigir `backendDevice: "gpu"` y evidencia de memoria/proceso
en la dedicada. El API actual no expone el nombre/UUID exacto de la GPU efectiva
para Qwen; por ello la correlación con la telemetría del controlador es aún
necesaria.

Ver solo GPU 0 en `Oira.exe` no invalida el resultado: Optimus puede presentar
la imagen mediante la integrada aunque la RTX calcule. Electron y NVIDIA Optimus
documentan ese comportamiento.

## Pruebas unitarias

Las pruebas focalizadas
`src/main/qvac/device-selection.test.ts` y
`src/main/qvac/inference-runtime.test.ts` cubren: índice QVAC real (no ordinal
por VRAM), `getSystemResources({ sample: true })`, `main-gpu: "dedicated"`,
rechazo de adaptadores < 1 GiB y el caso AMD 512 MiB / RTX 4 GiB.

En esta sesión, con el shell sin sandbox, Vitest ejecutó 23 pruebas y
pasaron. Si el entorno aísla `esbuild` al leer directorios fuera del
workspace, el arranque puede fallar sin que eso sea un fallo de las pruebas ni
del código.

`pnpm --filter oira-desktop exec tsc -p tsconfig.node.json --noEmit` pasó.

## Límites y siguiente mejora recomendada

El selector de Qwen es robusto por clase (`dedicated`), pero Whisper depende
del ordinal que enumera QVAC. La corrección actual es la mejor disponible para
el contrato del SDK, no una prueba de que su enumeración coincida con Vulkan en
todas las combinaciones de drivers. Añadir a la prueba empaquetada una
aserción de backend efectivo para Whisper —si el SDK lo expone por
`getBackendInfo()`— y un registro estructurado de UUID/nombre del adaptador
cerraría esa brecha.

Para aprobar el `.exe`, aprovisiona los modelos y ejecuta:

```powershell
node apps/desktop/scripts/qvac-packaged-gpu-smoke.mjs "$env:LOCALAPPDATA\Oira\app-0.0.7\Oira.exe"
```

Debe terminar en `PACKAGED_SMOKE_PASS`, indicar `backendDevice: "gpu"` y
aumentar la memoria de la RTX en `nvidia-smi`.
