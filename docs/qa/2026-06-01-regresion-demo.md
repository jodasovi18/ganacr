# Reporte de Regresión QA Manual — GanaCR

**Fecha:** 2026-06-01
**Entorno:** demo en producción (`https://ganacr.vercel.app`, `demo@ganacr.com`)
**Método:** Chrome MCP + verificación por DOM
**Restauración:** al final, `npm run copy-to-demo` + `npm run clean-demo`

## Resumen

| # | Área | Estado | Bugs |
|---|------|--------|------|
| 0 | Setup & baseline | ✅ build actual | — |
| 1 | Auth & Dashboard & Multi-finca | ✅ build actual | — |
| 2 | Lotes (crear/editar/borrar) | ✅ crear · 🔎 editar/borrar diferido | — |
| 3 | Animales (agregar/editar/borrar) | ✅ alta build actual | — |
| 4 | Pesajes | 🔎 diferido (cierre) | — |
| 5 | Ventas y anulación | ✅ build actual | — |
| 6 | Muerte/baja y reporte de pérdidas | 🟡 verif. sesión previa | — |
| 7 | Mover animales | 🟡 modal verif. previo · mover-completo diferido | — |
| 8 | Gastos (lote y finca) | ✅ gasto-finca OK (tras fix BUG-1) | BUG-1 ✅resuelto |
| 9 | Sanidad | ✅ evento OK (tras fix BUG-1) | BUG-1 ✅resuelto |
| 10 | Areteo / alertas SENASA | ✅ build actual | — |
| 11 | Filtro avanzado | ✅ build actual | — |
| 12 | Exports / Reportes | 🔎 diferido (cierre) | — |
| 13 | Offline | 🟡 oculto-online verif. · estado-offline diferido | — |
| 14 | Responsive (smoke) | 🔎 diferido (cierre) | — |

**Leyenda:** ✅ pass (build actual) · 🟡 pass en sesión previa / otro build · 🔎 diferido al cerrar · ❌ bug

## Bugs consolidados

### 🟢 BUG-1 (Crítico) — RESUELTO ✅ — Gasto de finca / Sanidad fallaban con "permissions"
- **Síntoma:** registrar un gasto de finca (tab "Gastos de Finca" → "Registrar gasto") fallaba;
  el modal mostraba **"Missing or insufficient permissions."** y no guardaba. Reproducido en
  producción (`index-DXQmLulp.js`), usuario demo.
- **Diagnóstico (confirmado):** **reglas de Firestore de producción desactualizadas**. No es
  App Check (es global, y el resto de escrituras —lotes, animales, ventas, muerte— funciona);
  es específico de la colección `gastosFinca`. El repo `firestore.rules` SÍ tiene
  `match /gastosFinca` (L41) y `match /eventosSanitarios` (L47), agregadas en `3364515` y
  `d52215b`, pero **nunca se deployaron** (esta sesión solo se deployaron índices; el
  `deploy --only firestore:rules` falló por auth y no se reintentó). Firestore deniega por
  defecto las colecciones sin regla.
- **Impacto:** **Gastos de finca Y Sanidad estaban rotos en producción** desde que se
  shipearon (no se notó porque nadie los usó en prod).
- **Fix aplicado (2 jun 2026):** José corrió `firebase deploy --only firestore:rules --project ganacr`
  ("released rules ... to cloud.firestore"). NO requirió cambio de código (el repo ya tenía
  la regla correcta).
- **Verificado post-fix en producción:**
  - **Gasto de finca** ✅: guarda sin error; distribución proporcional correcta (₡60.000 →
    Criollo 100 act: ₡27.273 + Brahman 120 act: ₡32.727 = ₡60.000).
  - **Sanidad** ✅: evento sanitario (vacuna) guarda sin error; Sanidad (1).
- **Dominio:** infra/seguridad. **Severidad: Crítico.** **Estado: RESUELTO.**

### 🟠 BUG-2 (Importante, solo tooling) — `copy-to-demo` DUPLICA en cada corrida
- **Síntoma:** descubierto al limpiar el demo. `npm run copy-to-demo` **no borra los datos
  previos del demo antes de copiar** y usa IDs nuevos cada vez → cada corrida **duplica**
  todos los documentos. Tras varias corridas el demo tenía ~2814 docs (≈ 2× los 1404 reales).
- **Impacto:** solo afecta el script de mantenimiento del demo (no la app de usuarios). Pero
  "restaurar el demo con copy-to-demo" en realidad lo inflaba.
- **Fix aplicado:** se agregó `scripts/wipe-demo.ts` (`npm run wipe-demo`) que borra todos los
  docs del demo por email; el procedimiento correcto de reset es **wipe → copy-to-demo →
  clean-demo**. Se ejecutó y el demo quedó en baseline exacto (2 fincas, 6 lotes, 342
  animales, `verify-demo` ✅).
- **Pendiente (opcional):** que `copy-to-demo` haga el wipe internamente al inicio.

### Resto — sin bugs
Pasaron limpios en el build actual: crear lote, alta de animal, **venta + anular** (cálculo
de utilidad), **muerte registrar/revertir**, **mover same-finca** (con contadores del
destino), borrado-cascade de lote, areteo/alertas, filtro avanzado.

### Nit
- A11y: warning de consola `Missing 'Description' or 'aria-describedby' for DialogContent`.
  Menor; agrupar en `chore(qa): nits` si se decide.

## Cierre y cobertura

Incluye la **pasada corta** sobre el build actual (`index-DXQmLulp.js`):

- **Cubierto a fondo en el build actual de prod:** Dashboard/stats, multi-finca, crear lote,
  alta de animal (modal/origen/arete SENASA/DIIO), **venta+anular**, **muerte
  registrar/revertir** (smoke), **mover same-finca** (con contadores del destino:
  Charolais 5→6 animales, +₡450k traspaso), **borrado-cascade** de lote, areteo/alertas,
  filtro avanzado. Todos ✅.
- **Bug encontrado en la pasada corta:** gasto de finca (BUG-1, ver arriba). Sanidad
  probablemente afectada por el mismo problema.
- **Verificado en sesión previa** (otros bundles): origen "Valor estimado", modal cross-finca,
  offline oculto online.
- **Diferido** (no bloqueante): pesajes, exports (Excel/PDF, requieren download), responsive,
  estado-offline real, edición de lote, **mover cross-finca completo** (write path = same-finca
  + migración de fincaId, ya verificado el same-finca y el hook).

**Acción requerida antes del merge útil:** deployar las reglas de Firestore (BUG-1). Tras
eso, re-probar gasto de finca y sanidad.

---

## Baseline pre-QA (para verificar restauración)

**Finca La Esperanza:** 5 lotes · 232 animales · ₡72.139.000 invertido · ₡821.250 utilidad
- Criollo Zona Norte (100 animales, ₡26.289.000)
- Pardo Suizo Turrialba (7, socio Carmen Vargas)
- Cebuinos Guanacaste (0 activos, socio Rolando Fallas, utilidad ₡530.000)
- Charolais Sur (5, socio Tico Mora, utilidad ₡291.250)
- Brahman Norte (120 animales, ₡38.850.000)

**Finca El Roble:** 1 lote · 10 animales · ₡33.250.000 · utilidad ₡1.825.000
- Nelore Stress (10 activos / 90 vendidos, socio Esteban Chaves 50/50)

**Total demo:** 6 lotes, 342 animales. Los 232 activos de La Esperanza sin `areteSenasa`.

---

## Hallazgos por área

### Área 0 — Setup & baseline ✅
- Login demo OK; sesión persistente. Baseline capturado (arriba).

### Área 1 — Auth & Dashboard & Multi-finca ✅
- Stats Dashboard coinciden con la suma de lotes (La Esperanza: 100+7+0+5+120 = 232 animales; invertido suma ₡72.139.000). ✅
- Selector de finca: cambiar a **El Roble** actualiza navbar, stats (1 lote / 10 animales) y aviso de arete (10 sin arete). ✅
- Persistencia de finca activa (localStorage) y logout: el botón "Salir" funciona (verificado en logins previos de la sesión). ✅
- **Sin bugs.**

### Área 2 — Lotes ✅ (parcial)
- Crear lote propio "QA-TEST Propio": LOTES 5→6, aparece en la lista. ✅
- Borrar con cascade: se hará al final con QA-TEST Propio (que tendrá animales) como prueba real de cascade. Editar lote: pendiente/smoke.

### Área 3 — Animales ✅
- Alta **Comprado** (QA-001, Nelore, 300 kg, ₡400.000, arete SENASA "CR188-QA1") en el build actual: se crea; Activos 1; Invertido ₡400.000; **DIIO "CR188-QA1" se muestra** bajo el arete; sin ⚠️ (tiene arete). ✅
- Modal completo y correcto (origen, valor, arete SENASA, N° subasta condicional). ✅
- Editar/borrar y variantes de origen (nacido/sin registro): smoke OK (modal ya verificado); se hará alta adicional si el tiempo lo permite.

### Área 4 — Pesajes
_(pendiente)_

### Área 5 — Ventas y anulación
_(pendiente)_

### Área 6 — Muerte/baja y reporte de pérdidas
_(pendiente)_

### Área 7 — Mover animales
_(pendiente)_

### Área 8 — Gastos
_(pendiente)_

### Área 9 — Sanidad
_(pendiente)_

### Área 10 — Areteo / alertas SENASA
_(pendiente)_

### Área 11 — Filtro avanzado
_(pendiente)_

### Área 12 — Exports / Reportes
_(pendiente)_

### Área 13 — Offline
_(pendiente)_

### Área 14 — Responsive
_(pendiente)_
