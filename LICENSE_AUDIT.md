# Auditoría de licencias de dependencias (borrador)

Fecha: 2026-09-29. Rama: `chore/add-apache-2-license`.

## Alcance y método

- Se revisaron las dependencias directas y transitivas fijadas en `pnpm-lock.yaml` (887 entradas de paquetes, incluidas las de desarrollo, opcionales y de otras plataformas) y `scripts/architecture/atlas/package-lock.json` (3 entradas de paquetes). Hay 22 dependencias externas directas distintas entre ambos proyectos.
- Para el workspace se consultó el campo `license` de los `package.json` instalados para 799 entradas, los metadatos de versión del [registro público de npm](https://registry.npmjs.org/) para 87 paquetes opcionales no instalados en este Windows y el manifiesto instalado de `@electron/node-gyp` para su dependencia fijada mediante tarball de GitHub. Las 3 entradas del atlas se comprobaron con su lockfile. No quedaron entradas sin un identificador de licencia declarado.
- Esta es una auditoría de **metadatos de paquetes fijados**, no una revisión de cada archivo distribuido, binario, modelo descargado durante la ejecución ni derechos de los contribuidores. Antes de publicar o distribuir un instalador, se deben comprobar los avisos y licencias incluidos en el artefacto final.

## Resultado

No se encontraron dependencias directas ni transitivas declaradas como GPL, AGPL, de uso no comercial o sin licencia. Ninguna de las 22 dependencias externas directas requiere atención por esas categorías. Las siguientes dependencias **transitivas** merecen revisión de atribuciones o de sus términos particulares; su presencia no demuestra por sí sola una incompatibilidad con Apache-2.0:

| Dependencia fijada | Licencia declarada | Motivo de atención |
|---|---|---|
| `argparse@2.0.1` | [Python-2.0](https://spdx.org/licenses/Python-2.0.html) | Conservar los avisos y condiciones de la licencia al redistribuirla. Llega por `js-yaml`. |
| `caniuse-lite@1.0.30001809` | [CC-BY-4.0](https://spdx.org/licenses/CC-BY-4.0.html) | Datos sujetos a atribución si se redistribuyen. Llega por `browserslist`. |
| `spdx-exceptions@2.5.0` | [CC-BY-3.0](https://spdx.org/licenses/CC-BY-3.0.html) | Datos sujetos a atribución si se redistribuyen. Llega por `spdx-expression-parse`. |
| `minimatch@10.2.6` | [BlueOak-1.0.0](https://spdx.org/licenses/BlueOak-1.0.0.html) | Licencia permisiva diferente de Apache-2.0; comprobar sus avisos al redistribuir. Llega por `@typescript-eslint/typescript-estree`. |
| `minipass-flush@1.0.7` | [BlueOak-1.0.0](https://spdx.org/licenses/BlueOak-1.0.0.html) | Licencia permisiva diferente de Apache-2.0; comprobar sus avisos al redistribuir. Llega por `cacache` y `make-fetch-happen`. |

La aplicación de Apache-2.0 al código propio queda pendiente de la aprobación de quienes poseen derechos sobre las contribuciones. Este informe no modifica las licencias de terceros.
