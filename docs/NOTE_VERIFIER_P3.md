# Pendiente: endurecer generación, revisión Qwen y evaluación de procesamiento

Fecha: 2026-09-12. Estado: propuesta de trabajo pendiente, no implementada.

## Objetivo y situación actual

Endurecer los prompts de generación, incorporar un segundo agente Qwen de
revisión y añadir heurísticas deterministas y tests de procesamiento que
permitan medir calidad, errores y coste de ejecución de extremo a extremo.

Actualmente, la generación usa Qwen3 4B Q4_K_M. Desde OIRA-REF-01 la forma y
las citas de la salida estructurada se rechazan si son inválidas (R-13); eso
no sustituye el endurecimiento de prompts ni la fidelidad semántica. Los
helpers de evidencia siguen devolviendo éxito o listas vacías; no verifican
números, negaciones, omisiones ni que un ID citado respalde el texto. El
puerto del segundo agente está definido en
`apps/desktop/src/main/inference/note-verifier.port.ts`; eso no equivale a
tener un verificador funcionando.

Referencia de la generación actual: [QWEN_STRUCTURING_P2.md](QWEN_STRUCTURING_P2.md).

## Base implementada al cierre del día

La [actualización de Abraham](UPDATE_ABRAHAM_2026-09-12.md) recoge los avances
de runtime, audio y UI. Este plan parte de una integración Qwen 4B activa,
descarga secuencial Whisper/Qwen, preparación anticipada y transcripción visible
durante la estructuración. Si Qwen falla, la transcripción se conserva.

La última validación de código pasó 216 tests en 53 archivos, typecheck, lint
y build. Es cobertura funcional, no una baseline de fidelidad clínica. Los
probes locales de GPU y handoff tampoco sustituyen el corpus propuesto aquí.

Al integrar el revisor, conservar la independencia entre la presentación del
texto y el trabajo del backend. Extender los estados/eventos para distinguir
generación, revisión y revisión incompleta; no reutilizar «listo» para ocultar
un fallo del segundo agente. La selección de GPU también necesita endurecerse:
mapear índices reales por backend y probar VRAM desconocida, tarjetas dedicadas
Intel, empates y falta de información, sin anunciar un fallback no confirmado.

## 1. Endurecer los prompts y el contrato de salida

- Versionar por separado el prompt del generador, el del revisor y el esquema.
  Registrar sus versiones en cada evaluación.
- Exigir las siete secciones y un contrato JSON validado después de generar.
  Diferenciar `STATED`, `UNKNOWN` y `NOT_STATED` con ejemplos sintéticos positivos
  y negativos. Un campo ausente no debe convertirse en una negación explícita.
- Prohibir completar diagnósticos, tratamientos, dosis, unidades, fechas o
  antecedentes a partir de conocimiento del modelo. Documentar únicamente lo
  que conste en la fuente y conservar la incertidumbre expresada.
- Separar lo referido por el paciente, lo observado por el médico y las
  instrucciones o planes. Mantener sujeto, temporalidad, condicionales y
  negaciones; no convertir una sospecha en un diagnóstico confirmado.
- Solicitar evidencia por afirmación: IDs de segmentos y fragmentos literales.
  Validar que los fragmentos pertenezcan a esos segmentos. Tener una cita válida
  no demuestra por sí solo que la afirmación esté respaldada.
- Delimitar la transcripción como datos no confiables. Instrucciones dentro del
  audio o texto, como «ignora el esquema», no deben cambiar la tarea del agente.
- Definir reintentos acotados para salida inválida, con errores de validación
  concretos. Agotarlos debe producir un estado explícito de fallo o borrador
  no validado, conservando la transcripción; nunca un éxito silencioso.
- Probar los límites de contexto y el ensamblado entre chunks: preservar
  correcciones, citas y relaciones que atraviesen sus fronteras.

## 2. Incorporar un segundo agente Qwen de revisión

El revisor debe ser una invocación separada con un rol de auditoría, contexto
limpio y prompt propio. Recibirá la transcripción original y el borrador; no
debe recibir el razonamiento del generador ni asumir que su salida es correcta.

Flujo propuesto:

1. Whisper entrega la transcripción y libera su modelo.
2. Qwen generador produce el borrador y se ejecuta la validación estructural.
3. Se descarga el generador antes de cargar el modelo Qwen de revisión.
4. El revisor contrasta cada afirmación con la transcripción y busca omisiones.
5. Se combinan sus observaciones con las heurísticas deterministas.
6. El médico recibe el borrador, los hallazgos y las fuentes para decidir.

Para el equipo de 4 GB de VRAM, mantener residencia secuencial: no cargar ambos
modelos simultáneamente. La variante y cuantización del revisor quedan por
seleccionar mediante evaluación. Usar un modelo diferente es la intención;
si se evalúa el mismo modelo con otro prompt como baseline, registrar esa
configuración y no presentarla como revisión independiente demostrada.

El contrato debe ampliar el puerto actual cuando sea necesario para identificar
afirmación, sección, evidencia, severidad y tipo de problema. Mantener estados
`SUPPORTED`, `CONTRADICTED`, `INSUFFICIENT_EVIDENCE` y `AMBIGUOUS`, y representar
por separado omisiones de información presente en la fuente. La salida del
revisor también requiere validación: sus citas y explicaciones pueden fallar.

El revisor no debe reescribir ni aceptar la nota silenciosamente. Las propuestas
de corrección deben ser explícitas y trazables. Si falla, se cancela o excede el
tiempo permitido, mostrar «revisión no completada», nunca «verificada».

La coincidencia entre ambos agentes no prueba corrección: pueden compartir
errores. Revisar la fidelidad a la transcripción tampoco demuestra que Whisper
haya reconocido correctamente el audio ni garantiza corrección clínica.

## 3. Heurísticas más fuertes y explicables

| Área | Comprobación propuesta | Límite que debe probarse |
| --- | --- | --- |
| Esquema | Secciones requeridas, tipos, presencia y salida vacía | Distinguir fallo técnico de información no mencionada |
| Evidencia | IDs existentes, citas literales y relación con la afirmación | Una cita real puede ser irrelevante |
| Números y unidades | Dosis, frecuencia, duración, mediciones, fechas y conversiones explícitas | No confundir formato equivalente con contradicción |
| Negación | Comparar polaridad y alcance de la negación | «No descarta» no significa «descarta» |
| Sujeto y tiempo | Paciente frente a familiar; pasado frente a presente | No trasladar antecedentes familiares al paciente |
| Incertidumbre | Preservar sospecha, posibilidad y condición | No elevar una hipótesis a certeza |
| Omisiones | Buscar hechos relevantes anotados en la referencia y ausentes del borrador | No exigir copiar toda la conversación |
| Chunks y correcciones | Detectar duplicados, conflictos y rectificaciones posteriores | La última mención no siempre invalida las anteriores |

Cada regla debe devolver un código estable, severidad, explicación y evidencia.
Separar errores estructurales que impiden continuar de advertencias semánticas
que requieren revisión. Evitar bloquear paráfrasis válidas por simple falta de
solapamiento léxico. Las reglas y su política de bloqueo deben evaluarse con
casos positivos y negativos antes de activarse.

## 4. Tests y corpus de procesamiento

Usar únicamente fixtures sintéticos o datos expresamente autorizados y
desidentificados; no incorporar datos reales de pacientes al repositorio.
Preparar una referencia anotada por caso: transcripción esperada, afirmaciones,
secciones, evidencia, negaciones, incertidumbre y omisiones relevantes. La
referencia debe ser revisada por una persona, no aceptada desde otro LLM.

- **Unitarios:** esquema, parseo, citas, reglas, normalización, chunks, merge y
  validación de la salida del revisor.
- **Integración con dobles:** descarga/carga secuencial, eventos de progreso,
  timeouts, cancelación, salida vacía o truncada, errores de modelo y conservación
  de la transcripción. Comprobar que un fallo del revisor no parezca un pase.
- **Procesamiento real de texto:** transcripción de referencia → generador →
  reglas → revisor, usando modelos locales. Aislar así errores de estructuración
  de los errores de reconocimiento de voz.
- **Extremo a extremo con audio sintético:** audio → Whisper → borrador →
  revisión. Incluir ruido, pausas, números, autocorrecciones, distintos hablantes,
  expresiones en español y consultas de varias longitudes.
- **Casos adversos:** prompt injection dentro de la transcripción, instrucciones
  contradictorias, fuente vacía, afirmaciones sin respaldo, contexto desbordado,
  hechos contradictorios y negaciones separadas por un límite de chunk.
- **Hardware:** ejecutar las pruebas reales en la RTX 2050 de 4 GB y, cuando
  exista acceso, en otros dispositivos/backends. Registrar el dispositivo
  efectivo; un índice solicitado no demuestra cuál ejecutó el modelo.

Separar un conjunto de desarrollo de un conjunto de evaluación congelado. No
ajustar prompts repetidamente contra el conjunto de evaluación. Los tests con
dobles sirven para contratos y fallos; no miden la calidad real del modelo.

## 5. Métricas que debe producir el harness

| Métrica | Definición o desglose requerido |
| --- | --- |
| JSON y esquema válidos | Salidas válidas / total de intentos; informar primer intento y resultado tras reintentos |
| Afirmaciones respaldadas | Afirmaciones respaldadas según referencia / afirmaciones emitidas evaluables |
| Afirmaciones no respaldadas | Afirmaciones sin respaldo o contradichas / afirmaciones emitidas evaluables; separar ambas categorías |
| Cobertura de hechos | Hechos relevantes de referencia correctamente conservados / total de hechos relevantes de referencia |
| Exactitud de citas | Citas que respaldan su afirmación / citas evaluadas; reportar existencia de IDs por separado |
| Errores críticos | Conteos y tasas por negación, dosis, unidad, sujeto y temporalidad; declarar denominador por categoría |
| Calidad del revisor | Precisión, recall y F1 al detectar errores anotados; incluir falsos positivos y errores que deja pasar |
| Omisiones detectadas | Omisiones reales detectadas / omisiones anotadas, junto con precisión de esas alertas |
| Reconocimiento de audio | WER frente a transcripción de referencia y error específico en términos/números relevantes |
| Latencia | p50/p95 por STT, descarga, carga, generación, heurísticas, revisión y total; separar frío/caliente |
| Rendimiento | Tokens/s cuando el backend lo reporte; STT: tiempo de procesamiento / duración del audio |
| Recursos y estabilidad | Pico de VRAM/RAM, timeouts, OOM, cancelaciones y fallos / ejecuciones iniciadas |
| Coste de revisión | Tiempo adicional, alertas por nota y, si se realiza un estudio humano, correcciones y tiempo de revisión |

No usar el veredicto del propio revisor como verdad de referencia. Para
denominadores vacíos, devolver `null` y el conteo, no inventar 0 % o 100 %.
Reportar resultados por caso y categoría además del agregado; incluir número
de casos, repeticiones, dispersión y método de incertidumbre cuando corresponda.
Los fallos deben figurar en el informe, no desaparecer del denominador.

Comparar con los mismos casos y condiciones:

1. Generador actual.
2. Generador con prompt endurecido.
3. Prompt endurecido más heurísticas.
4. Prompt endurecido, heurísticas y segundo agente Qwen.

Medir si el revisor detecta errores adicionales y qué falsos positivos y coste
introduce. Como no reescribe el borrador, añadirlo no mejora automáticamente la
fidelidad del texto: evaluar detección por separado y las correcciones humanas
solo cuando se hayan observado.

## 6. Artefactos, trazabilidad y criterios de cierre

El harness debe generar resultados JSON/CSV por caso y un resumen Markdown.
Registrar commit, versión/hash de prompts y dataset, modelos, cuantización,
SDK/backend, parámetros de generación, dispositivo solicitado/efectivo,
reintentos, tokens, tiempos y errores. Mantener una política explícita para
almacenar o excluir audio, transcripciones y salidas; evitar volcarlos en logs
operativos. Los resultados de evaluación no son claims clínicos de producto.

- [ ] Implementar y probar el contrato estricto de generación y sus fallos.
- [ ] Implementar las heurísticas con casos que detectan y casos que no deben marcar.
- [ ] Integrar el segundo Qwen mediante el puerto de revisión, con carga secuencial.
- [ ] Mostrar observaciones, evidencia y revisión incompleta sin aceptación automática.
- [ ] Crear corpus anotado, harness reproducible y baseline del comportamiento actual.
- [ ] Fijar umbrales de aceptación antes de la evaluación final; no inventar metas
  numéricas sin una baseline ni tratarlas como resultados obtenidos.
- [ ] Publicar la comparación de las cuatro configuraciones, incluyendo regresiones,
  falsos positivos y coste de recursos, y ejecutar tests/typecheck/lint/build.
- [ ] Antes de convertir resultados en claims de producto, documentar su respaldo
  y límites en `docs/research/<ID>-*.md`.

Responsabilidades: prompts/evaluación = IA; runtime, puertos y adaptación QVAC =
Justin; presentación de hallazgos y decisiones del médico = Antonio. Coordinar
los contratos entre esas áreas antes de implementar cambios transversales.

Principio invariable: el agente documenta y señala discrepancias; el médico decide.
