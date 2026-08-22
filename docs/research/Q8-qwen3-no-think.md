# Q8 — Qwen3 y razonamiento visible

**Estado:** investigación documental y protocolo; no hay configuración ni resultados ejecutados.  
**Decisión:** DEFER cualquier parámetro que pretenda desactivar razonamiento. Mantener prompt de sistema, json_schema y validación Zod; no usar una convención no documentada como control de producción.  
**Fuentes consultadas:** 2026-08-22.

## 1. Evidencia documental

QVAC documenta que los modelos que emiten bloques de pensamiento pueden exponerlos como eventos thinkingDelta cuando se activa la captura correspondiente; también distingue contenido final, eventos y salida raw [QVAC, Text generation](https://docs.qvac.tether.io/ai-capabilities/text-generation/). Esta evidencia demuestra observabilidad de pensamiento, no un parámetro oficial para desactivarlo.

El texto literal /no_think aparece en ejemplos o convenciones de modelos, pero no se trata aquí como parámetro oficial de QVAC. Los nombres reasoning_budget y remove_thinking_from_context son leads: deben encontrarse con semántica exacta en documentación oficial o tipos del SDK fijado antes de invocarse. No se inventa enable_thinking ni un campo equivalente.

## 2. Reglas no negociables

- El contrato de salida sigue siendo json_schema más validación Zod.
- El prompt del sistema describe la tarea y límites del producto; no se promete que controlar “thinking” garantice JSON válido.
- Nunca se expone pensamiento bruto al clínico como explicación clínica.
- Un parámetro no documentado no se incorpora a la configuración ni al README.

## 3. Matriz de laboratorio

Usar los casos 02, 07 y 10 definidos por IA, datos sintéticos y el modelo fijado. Para cada variante se registran tipos confirmados, salida cruda protegida para depuración, salida estructurada validada, fallos y tiempo/memoria solo si se miden realmente.

| Variante | Parámetro/convención | Tipos o docs confirmados | Caso 02 | Caso 07 | Caso 10 | JSON/Zod | Resultado |
|---|---|---|---|---|---|---|---|
| Base | Prompt de sistema actual | BLOCKED — NEEDS TARGET HARDWARE | | | | | BLOCKED |
| Convención de texto | /no_think | UNVERIFIED | | | | | BLOCKED |
| Campo candidato | reasoning_budget | TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION | | | | | BLOCKED |
| Campo candidato | remove_thinking_from_context | TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION | | | | | BLOCKED |

## 4. Protocolo bloqueado

1. Fijar SDK/modelo y copiar definiciones de tipos con rutas.
2. Verificar si alguno de los nombres candidatos existe, su tipo, alcance y valor permitido; si no, detener esa variante.
3. Ejecutar base y cada variante válida en los tres casos con misma versión/schema.
4. Evaluar validez Zod, campos obligatorios, contenido visible final, manejo de eventos y fallos. No evaluar a ojo solo la “sensación” de razonamiento.
5. Si una convención textual se prueba, etiquetarla empírica para ese modelo/pin; no convertirla en API.
6. Elegir solo una configuración reproducible que no degrade salida estructurada ni introduzca contenido no permitido.

Todos los resultados son **BLOCKED — NEEDS TARGET HARDWARE**.

## 5. Decisión

**DEFER.** El sistema conserva prompt de sistema + json_schema + Zod y no adopta /no_think ni parámetros de razonamiento sin tipos, semántica y resultados. La salida visible al usuario seguirá siendo el resultado estructurado validado, no pensamiento interno.

## Bibliografía

1. QVAC by Tether. [Text generation](https://docs.qvac.tether.io/ai-capabilities/text-generation/). Consultado el 2026-08-22.
2. QVAC by Tether. [API Summary](https://docs.qvac.tether.io/reference/api/). Consultado el 2026-08-22.
