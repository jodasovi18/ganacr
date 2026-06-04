# Seguridad de dependencias — triaje

> Estado al 4 jun 2026. Revisar tras cada `npm audit` o aviso de Dependabot.

`npm audit` reporta vulnerabilidades en el árbol de dependencias. **No todas son explotables**: lo
que importa es si llegan al **navegador del usuario** y si la **forma de uso** las activa. Este
documento deja el análisis por escrito.

## Resumen

- Tras `npm audit fix` (no-breaking): **29** en total / **13** en producción (11 moderadas, 2 altas).
- **Exposición real al usuario de las 2 altas de producción: ≈ nula** (ver abajo).
- Las restantes son **solo de desarrollo** (no se shipean) o **no explotables** en nuestro uso.
- Lo que requiere `npm audit fix --force` se **difiere**: son bumps mayores de herramientas de
  build (Vite/esbuild) y de `firebase-tools`, todo **dev-only**. Forzarlos antes de la beta arriesga
  romper el build sin beneficio de seguridad para el usuario.

## Las 2 altas de producción (no explotables en GanaCR)

| Paquete | Aviso | Por qué NO nos afecta |
|---|---|---|
| **`undici`** | Valores aleatorios insuficientes / descompresión sin límite | Cliente HTTP de Node, transitiva de Firebase para entornos servidor. GanaCR es un **SPA de navegador** que usa `fetch` nativo → **undici no entra al bundle** que recibe el usuario. |
| **`xlsx`** | Prototype Pollution + ReDoS | Ambas requieren **parsear** un archivo malicioso (`XLSX.read`). GanaCR **solo escribe** Excel (`XLSX.writeFile`), nunca lee archivos de terceros → la ruta vulnerable **nunca se ejecuta**. |

> Regla a mantener: **nunca** usar `XLSX.read`/`XLSX.readFile` sobre archivos subidos por el usuario.
> Si en el futuro se necesita importar Excel, reevaluar (migrar a la build oficial de SheetJS desde
> su CDN, o a `exceljs`).

## Dev-only (no llegan al usuario)

`esbuild`, `vite` (dev server), `tar`, `minimatch`, `uuid`, etc. vienen de `firebase-tools` y del
toolchain de build. Solo corren en la máquina de desarrollo / CI, **no** se incluyen en `dist/`.
Riesgo para el usuario final: ninguno. Se actualizarán cuando haya versiones estables (vía
Dependabot) sin presión.

## Seguimiento

- **Dependabot** (configurado en `.github/dependabot.yml`) abre PRs semanales con actualizaciones de
  seguridad → se revisan y mergean.
- **`npm audit`** corre en CI en cada PR (no bloquea, informa).
- Antes de una versión comercial seria: pentest con el equipo de ciberseguridad.

## Cómo reproducir este análisis

```bash
npm audit                 # todo
npm audit --omit=dev      # solo lo que llega al usuario (producción)
```
