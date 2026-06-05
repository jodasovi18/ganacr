# CI y controles de calidad

Automatizaciones que mantienen el sistema robusto durante la iteración rápida (clave en beta).

## 1. CI en cada PR — `.github/workflows/ci.yml`

Corre solo en cada Pull Request y push a `main`. Dos jobs:

- **Lint · Build · Unit · Audit**: `npm run lint`, `npm run build` (tsc + vite),
  `npm run test:unit`, y `npm audit --omit=dev` (informativo, no bloquea).
- **Reglas · Backup (emulador)**: instala JDK 17 + el emulador y corre `npm run test:rules`
  (las 42 pruebas de seguridad) y `npm run test:backup` (round-trip de respaldo).

Si algo falla, el PR lo marca en rojo **antes** de mergear.

> Pendiente opcional a futuro: agregar `npm run test:e2e` (Playwright) como tercer job. Se omitió
> por ahora por el costo de descargar navegadores en cada corrida.

## 2. Dependabot — `.github/dependabot.yml`

Abre PRs **semanales** con actualizaciones de dependencias (npm + GitHub Actions), agrupadas en
"producción" y "desarrollo" para reducir ruido. Es el seguimiento continuo del triaje en
`docs/seguridad-dependencias.md`.

## 3. Dos pasos manuales (una sola vez, desde GitHub)

Estos no se configuran por archivo:

1. **CodeQL (análisis de seguridad del código):**
   GitHub → repo → **Settings → Code security and analysis → CodeQL analysis → Set up → Default**.
   Escanea el código JS/TS en cada PR buscando patrones inseguros. (Gratis en repos públicos; en
   privados requiere GitHub Advanced Security.)

2. **Branch protection en `main`:**
   GitHub → **Settings → Branches → Add rule** sobre `main`:
   - ✅ Require a pull request before merging.
   - ✅ Require status checks to pass → seleccionar los checks de CI.
   Así nadie (ni por accidente) mergea a `main` con el CI en rojo.
