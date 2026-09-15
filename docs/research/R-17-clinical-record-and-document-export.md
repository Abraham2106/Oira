# R-17 — Expediente clínico local y exportación documental

**Estado:** especificación de implementación; no implica que SQLite cifrado, exportación PDF ni conformidad EHR estén implementados.  
**Fecha:** 2026-09-15.  
**Alcance:** persistencia local recuperable de pacientes, consultas y notas; exportación PDF desde una nota aceptada; base para interoperabilidad FHIR.

## 1. Objetivo

Permitir que Oira conserve consultas y notas aprobadas entre reinicios, mantenga vínculo verificable entre cada campo clínico y su transcripción y exporte un documento fiel a la versión que el profesional aceptó. El clínico revisa y decide; la IA solo prepara un borrador.

“Temporal” significa persistencia local recuperable sujeta a retención configurable, no almacenamiento efímero en memoria. La duración concreta de retención depende de la jurisdicción, institución y función de Oira (borrador antes de transferir o expediente oficial); esos datos siguen abiertos.

## 2. Estado actual de Oira y compatibilidad requerida

- `EncounterRepository` es en memoria; no recupera consultas después del cierre.
- Las notas aceptadas usan `NoteStorePort`; el adaptador JSON es opcional y el almacenamiento por defecto es memoria.
- `StoredNoteRecord` contiene nota, transcripción, consulta, etiqueta y `acceptedAt`; la aceptación requiere confirmación explícita y verificación de fuentes.
- `ExportPort` exporta TXT/JSON de la nota aceptada. El adaptador obtiene la nota del almacenamiento, no debe confiar en texto arbitrario del renderer.
- La nota de Oira tiene siete secciones con presencia, procedencia y `sourceSegmentIds`; el contrato clínico actual no se sustituirá por un SOAP de cuatro bloques.
- `R-3-sqlite-binding.md` difiere la elección del binding hasta probarlo en desarrollo y en el paquete Electron junto con QVAC.
- `R-5-encryption-at-rest.md` difiere afirmar cifrado hasta validar cifrado, gestión de claves y empaquetado por plataforma.
- `R-10-pdf-export.md` difiere PDF hasta probar plantilla, sandbox, recursos y salida empaquetada.

Este documento organiza la implementación y conserva esas condiciones. Ningún prototipo de CRUD o PDF se considerará prueba de almacenamiento clínico seguro.

## 3. Decisiones de diseño

1. SQLite vive en Main. El renderer solo usa métodos tipados y validados de `window.oira`; nunca recibe SQL, ruta de base ni clave.
2. El repositorio conserva recursos clínicos normalizados internamente. FHIR es un formato de interoperabilidad derivado, no el esquema interno obligatorio.
3. La identificación del paciente se confirma por una persona. No se enlaza un expediente por nombre inferido por Whisper.
4. Los borradores y segmentos pueden recuperarse hasta vencer su política de retención. El audio se purga al cerrar procesamiento según el flujo existente, salvo que una decisión clínica y de producto cambie formalmente esa política.
5. Una nota aceptada es inmutable. Toda corrección posterior genera una nueva versión vinculada a la anterior, con motivo y autoría real.
6. PDF y Bundle FHIR se derivan de una versión aceptada persistida. No ejecutan inferencia, resumen ni codificación clínica durante la exportación.
7. Una exportación no equivale a firma digital. La atribución de autor, editor y atestador refleja acciones reales.
8. Los errores de apertura, migración o descifrado bloquean el acceso a los registros con un error recuperable; jamás se reemplaza automáticamente una base no leíble por una vacía.

## 4. Modelo lógico mínimo

| Tabla | Campos principales | Reglas |
|---|---|---|
| `patients` | `id`, identificadores y entidad emisora, nombre necesario, datos demográficos mínimos, `created_at`, `updated_at` | UUID interno; unicidad por sistema+valor del identificador; evitar datos no necesarios. |
| `encounters` | `id`, `patient_id`, estado, inicio/fin, tipo, profesional/autor de captura, retención, timestamps | FK obligatoria; estados de dominio existentes; una consulta activa si la regla actual lo requiere. |
| `transcript_segments` | `id`, `encounter_id`, ordinal, texto, tiempos, speaker nullable, motor/modelo | IDs estables y conservados para resolver citas de nota. Sin datos de audio en esta tabla. |
| `drafts` | `id`, `encounter_id`, versión, JSON validado de nota, issues, estado, modelo/prompt version, timestamps | Solo contenido validado se puede aceptar; salida no validada permanece etiquetada como tal. |
| `note_versions` | `id`, `encounter_id`, versión, nota, `status`, autor, accepted-by, accepted-at, previous-version-id, amendment-reason | No actualizar contenido aceptado in situ; guardar nueva versión atómicamente. |
| `note_sources` | `note_version_id`, section/field id, `segment_id` | FK y validación garantizan que cada fuente pertenece a la misma consulta. |
| `audit_events` | `id`, actor, action, resource type/id, timestamp UTC, outcome, metadata mínima | Solo metadatos; no copiar transcripción ni nota a logs. Append-only a nivel de aplicación. |
| `exports` | `id`, `note_version_id`, formato, destino elegido/resultado, fecha, hash del artefacto | No guardar ruta sensible completa en telemetría. Cancelación se registra como tal si la política la exige. |
| `schema_migrations` | versión, checksum, aplicado-en | Migraciones versionadas, transaccionales cuando sea posible y con ruta de recuperación documentada. |

Los identificadores técnicos no son identificadores clínicos universales. Fechas se guardan en UTC y se muestran con la zona horaria de la consulta. Índices cubren paciente, fecha y estado; no crear índice de texto de transcripciones en MVP.

## 5. Seguridad, retención y recuperación

- **Binding:** completar la matriz de `R-3` (CRUD empaquetado, ambas órdenes de carga QVAC/SQLite, integridad referencial y migración). No fijar tecnología antes de esos resultados.
- **Cifrado:** SQLCipher solo se adopta si `R-5` valida el binding y compatibilidad del paquete. `safeStorage` puede custodiar una clave aleatoria, pero por sí mismo no cifra la base. Si la plataforma no ofrece un almacén de claves adecuado, el comportamiento debe ser explícito y bloquear o reducir el alcance; no degradar silenciosamente a texto plano.
- **Transacciones:** aceptar nota, insertar nueva versión, registrar fuentes y evento de auditoría en una sola transacción. Cada operación IPC tiene autorización y validación en Main.
- **Archivos auxiliares:** revisar journal/WAL, temporales, crash dumps, backups y exportaciones para confirmar que no filtren texto en claro. Borrado lógico no equivale a borrado físico en SSD.
- **Permisos:** base bajo `app.getPath("userData")`, permisos mínimos del sistema operativo y exclusión del repositorio, logs y reportes.
- **Backups:** usar SQLite Backup API o mecanismo equivalente compatible con WAL; cifrar el backup y verificar restauración. No copiar `.db` mientras esté activa como método de backup.
- **Retención:** tabla/mecanismo de política por categoría. Expiración explícita y visible; no borrar una nota oficial por la política de borradores. Confirmar reglas legales/institucionales antes de activar borrado automático.
- **Auditoría:** conservar actor, acción, objeto, tiempo y resultado. Hash del contenido puede apoyar integridad, no reemplaza firma ni prueba por sí solo cumplimiento normativo.
- **Amenaza declarada:** el cifrado en reposo no protege la sesión desbloqueada ni un dispositivo comprometido bajo la misma cuenta; reportar límites reales por plataforma.

## 6. Exportación PDF

### Contrato

Entrada: `noteVersionId` y elección explícita del destino por diálogo del proceso Main. Main vuelve a cargar y validar la versión aceptada. El renderer no envía HTML, contenido del PDF ni rutas de archivo.

El PDF contiene identificación mínima requerida, fecha/hora y zona horaria, datos de consulta, autoría veraz, las secciones Oira con texto exacto de la versión aprobada, estado/fecha de aceptación e identificador/versionado documental. Si hay varias páginas, incluir paginación y contexto identificador mínimo en encabezados o pies.

No incluir automáticamente audio, transcripción completa, borradores fallidos, cadena de pensamiento, datos innecesarios ni marcas internas de validación. Alertas clínicas no resueltas bloquean aceptación y por tanto exportación. La exportación conserva negaciones, incertidumbre, números, unidades y dosis literalmente como están en la versión aprobada.

### Implementación

- Extender `ExportPort` con formato PDF o introducir un puerto dedicado `PdfRendererPort`; la decisión final debe respetar el ownership Main/renderer del README.
- Generar desde plantilla y recursos empaquetados locales. No cargar CDN, fuentes remotas ni contenido proporcionado como HTML por el renderer.
- Mantener `contextIsolation`, `nodeIntegration: false`, CSP restrictiva y ventana/contents de impresión de mínimo privilegio; destruirlos al concluir.
- Usar `webContents.printToPDF` si el spike de `R-10` confirma el resultado en desarrollo y paquete Windows soportado. Recibir un Buffer en Main y escribirlo con un flujo seguro y errores tipados.
- No sobrescribir silenciosamente: el diálogo permite elegir ruta, y conflictos de nombre requieren confirmación. Cancelar no se informa como éxito.
- Registrar versión, timestamp, resultado y hash del PDF según política local; no registrar contenido clínico en logs.
- No declarar PDF/A, PDF/UA, WCAG, firma electrónica o validez legal sin pruebas/certificación aplicable. PDF etiquetado de Electron se trata como experimental hasta validación independiente.

### Controles de contenido

Prueba sintética con valores centinela: `36.8 °C`, `500 mg cada 8 horas`, una negación y un campo UNKNOWN. Extraer el texto del PDF y comprobar igualdad exacta con la versión aceptada, además de validar páginas, fuentes, caracteres españoles, saltos, ausencia de clipping y recursos remotos. Revisar visualmente artefactos de desarrollo y empaquetados.

## 7. FHIR y SOAP

FHIR se genera en un adaptador de exportación versionado y validado contra una versión/perfil acordado. Para FHIR R4, un documento requiere `Bundle.type = document`, con `Composition` como primera entrada y recursos referenciados incluidos. `Composition.status = preliminary` representa contenido aún no verificado; solo después de revisión/atestación humana se considera `final`. Correcciones generan versión/estado apropiado y no reescriben historia silenciosamente.

Mapeo inicial propuesto: Oira Patient → `Patient`; consulta → `Encounter`; nota → `Composition`; profesional/dispositivo → autoría real; PDF → `DocumentReference` o adjunto según acuerdo del receptor; cambios/generación → `Provenance`; accesos y exportaciones → `AuditEvent` cuando se implemente intercambio FHIR. Un PDF narrativo por sí solo no es un Bundle FHIR.

No emitir SNOMED CT, RxNorm, LOINC ni otros códigos mediante inferencia libre en el MVP. Codificación terminológica queda fuera hasta escoger país, licencias, value sets, versiones y EHR receptor. SOAP será una vista de presentación derivada de las siete secciones existentes, no una segunda generación LLM ni una sustitución de las fuentes por segmento. El mapeo sección→SOAP requiere revisión clínica y se declara en el perfil del exportador.

Las extensiones FHIR deben tener canonical URL y definición/profiling; no inventar `requires-clinician-review` como extensión interoperable sin publicarla y acordarla. Para el borrador local, usar estado y workflow interno; para exportar, representar autor y atestación reales.

## 8. Secuencia de implementación y gates

| ID | Trabajo | Dependencias | Criterio de salida |
|---|---|---|---|
| R17-0 | Resolver jurisdicción, propósito legal del registro, identidad/autenticación de profesionales, retención, versión/perfil FHIR y receptor | Ninguna | Decisiones registradas; sin afirmaciones de cumplimiento pendientes. |
| R17-1 | Spike de binding SQLite con QVAC según R-3 | R17-0 no bloquea spike técnico | CRUD, foreign keys, cierre/reapertura y package smoke pasan en la plataforma soportada. |
| R17-2 | Spike de cifrado y manejo de clave según R-5 | R17-1 | Prueba de clave incorrecta, datos/WAL cifrados, backend de clave y restore documentados; fallo seguro. |
| R17-3 | Implementar migraciones, repositorios SQLite y transacciones de borrador/aceptación/versionado/auditoría | R17-1, R17-2, R17-0 | Recuperación tras cierre; aislamiento de pacientes; atomicidad; regresiones de NoteStore resueltas. |
| R17-4 | Implementar retención, backup cifrado y restauración | R17-3, política de R17-0 | Expiración por categoría, sin borrar notas oficiales por accidente; restore de backup verificado. |
| R17-5 | Spike y exportador PDF | R-10, R17-3, identidad/autorización | PDF solo desde versión aceptada; pruebas de texto/layout/paquete pasan; cancelación/error correctos. |
| R17-6 | Adaptador Bundle FHIR y presentación SOAP derivada | R17-0, R17-3 | Valida contra el perfil acordado; referencias completas; estados, autores y atestación correctos. |
| R17-7 | Revisión de seguridad, privacidad, accesibilidad y release claims | R17-3 a R17-6 | Amenazas, restore, auditoría y comunicación revisados; solo claims demostrados. |

Los gates R-3, R-5 y R-10 tienen evidencia de investigación previa, pero sus validaciones de empaquetado/perfil quedan pendientes. Ninguna tarea dependiente se marca lista hasta satisfacer su criterio.

## 9. Verificación obligatoria

### Pruebas automatizadas

- Migración desde base vacía y cada versión soportada; checksum y fallo de migración sin pérdida silenciosa.
- CRUD, foreign keys, transacciones y rollback ante fallo intermedio.
- Guardar/recuperar consulta tras cierre abrupto; una nota de paciente A nunca aparece al consultar paciente B.
- Nota aceptada requiere confirmación clínica; fuente debe existir y pertenecer a la misma consulta; edición aceptada crea nueva versión.
- Clave incorrecta, base truncada, permisos denegados, disco lleno, WAL y restauración desde backup.
- IPC rechaza IDs, roles, estados y formatos inválidos; renderer no puede elegir paciente o ruta arbitraria fuera del flujo autorizado.
- PDF rechaza draft/no aceptada, maneja cancelación y no sobrescribe sin consentimiento; verifica bytes/texto y escapado de caracteres.
- Bundle FHIR valida estructura, referencias, perfil, status y autoría; fallan fixtures con referencias huérfanas o `final` sin atestación.
- Fixtures exclusivamente sintéticas. No grabar ni persistir casos reales para pruebas.

### Comandos previstos

Ejecutar y registrar resultados reales al implementar:

```powershell
pnpm typecheck
pnpm test
pnpm lint:desktop
pnpm atlas:check
pnpm --filter oira-desktop build
pnpm --filter oira-desktop package
```

Añadir comandos de prueba de migración/backup y smoke empaquetado cuando se definan scripts reales. No marcar comandos como ejecutados en esta especificación.

## 10. Riesgos, rollback y límites

- Un cambio de binding nativo puede romper la carga de QVAC o el empaquetado Windows; rollback por adaptador detrás de `NoteStorePort` y migración reversible antes de habilitar escritura productiva.
- Un cifrado mal integrado puede perder acceso a toda la historia; probar migración, backup y restauración antes de importar datos existentes; nunca descartar JSON original durante migración.
- Exportación PDF puede recortar, alterar o exponer datos; mantener PDF apagado hasta smoke empaquetado, revisión visual y verificación textual.
- Identidad de paciente/profesional, retención, país y EHR destino están sin especificar; no declarar interoperabilidad productiva ni cumplimiento regulatorio hasta resolverlos.
- Cualquier fallo de integridad o clave debe bloquear lectura/escritura afectada y ofrecer recuperación soportada; nunca degradar a base sin cifrar de manera oculta.

## 11. Fuentes y relación con documentación existente

- HL7, [FHIR R4 Composition](https://hl7.org/fhir/R4/composition.html) y [FHIR Documents](https://www.hl7.org/fhir/documents.html): status, autoría, atestación y estructura Bundle documental.
- HL7, [FHIR R4 Provenance](https://hl7.org/fhir/R4/provenance.html) y [AuditEvent](https://hl7.org/fhir/R4/auditevent.html): procedencia y registro de eventos.
- Electron, [safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage): custodia de secretos con diferencias por sistema operativo; no cifra automáticamente SQLite.
- SQLite, [Backup API](https://www.sqlite.org/backup.html): mecanismo consistente de respaldo.
- Zetetic, [SQLCipher design](https://www.zetetic.net/sqlcipher/design/): cifrado de páginas y WAL.
- HHS, [HIPAA Security Rule summary](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html): seguridad requiere controles organizativos, físicos y técnicos; el hash de transcripción no demuestra cumplimiento.
- Investigación local relacionada: `R-3-sqlite-binding.md`, `R-5-encryption-at-rest.md`, `R-6-os-auth-and-directory-permissions.md`, `R-8-transcript-assembly.md`, `R-9-packaging-and-signing.md`, `R-10-pdf-export.md`, `R-13-domain-invariants-and-ipc.md`, `I8-local-retention-matrix.md`, `I9-R8-export-formats.md`.

## 12. Decisión

**Aprobada como dirección técnica para planificación:** persistencia Main detrás de puertos, cifrado validado, versionado/auditoría, exportación reproducible desde notas aceptadas y FHIR generado por adaptador.

**Pendiente antes de implementación de alcance clínico:** resolver R17-0 y superar los gates empaquetados de R-3, R-5 y R-10. Este documento no afirma certificación EHR/HIPAA, conformidad FHIR por sí solo, firma digital ni validez legal del PDF.
