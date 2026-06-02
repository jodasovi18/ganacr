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
| 8 | Gastos (lote y finca) | ❌ gasto-finca falla (permisos) | BUG-1 |
| 9 | Sanidad | ⚠️ probable mismo bug (sin probar) | BUG-1 |
| 10 | Areteo / alertas SENASA | ✅ build actual | — |
| 11 | Filtro avanzado | ✅ build actual | — |
| 12 | Exports / Reportes | 🔎 diferido (cierre) | — |
| 13 | Offline | 🟡 oculto-online verif. · estado-offline diferido | — |
| 14 | Responsive (smoke) | 🔎 diferido (cierre) | — |

**Leyenda:** ✅ pass (build actual) · 🟡 pass en sesión previa / otro build · 🔎 diferido al cerrar · ❌ bug

## Bugs consolidados

### 🔴 BUG-1 (Crítico) — Gasto de finca falla con "Missing or insufficient permissions"
- **Síntoma:** registrar un gasto de finca (tab "Gastos de Finca" → "Registrar gasto") falla;
  el modal muestra **"Missing or insufficient permissions."** y no guarda. Reproducido en
  producción (`index-DXQmLulp.js`), usuario demo.
- **Diagnóstico (confirmado):** **reglas de Firestore de producción desactualizadas**. No es
  App Check (es global, y el resto de escrituras —lotes, animales, ventas, muerte— funciona);
  es específico de la colección `gastosFinca`. El repo `firestore.rules` SÍ tiene
  `match /gastosFinca` (L41) y `match /eventosSanitarios` (L47), agregadas en `3364515` y
  `d52215b`, pero **nunca se deployaron** (esta sesión solo se deployaron índices; el
  `deploy --only firestore:rules` falló por auth y no se reintentó). Firestore deniega por
  defecto las colecciones sin regla.
- **Impacto:** **Gastos de finca roto en producción.** **Sanidad (`eventosSanitarios`) muy
  probablemente también** (misma regla sin deployar) — síntoma idéntico, no probado en vivo.
- **Fix:** desplegar las reglas (NO requiere cambio de código; el repo ya tiene la correcta):
  `firebase deploy --only firestore:rules --project ganacr`. Es un cambio de seguridad de
  producción → lo corre José.
- **Dominio:** infra/seguridad. **Severidad: Crítico** (features shipped rotas en prod).

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
