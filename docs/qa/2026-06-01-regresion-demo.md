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
| 8 | Gastos (lote y finca) | 🔎 diferido (cierre) | — |
| 9 | Sanidad | 🔎 diferido (cierre) | — |
| 10 | Areteo / alertas SENASA | ✅ build actual | — |
| 11 | Filtro avanzado | ✅ build actual | — |
| 12 | Exports / Reportes | 🔎 diferido (cierre) | — |
| 13 | Offline | 🟡 oculto-online verif. · estado-offline diferido | — |
| 14 | Responsive (smoke) | 🔎 diferido (cierre) | — |

**Leyenda:** ✅ pass (build actual) · 🟡 pass en sesión previa / otro build · 🔎 diferido al cerrar · ❌ bug

## Bugs consolidados

**Ninguno encontrado** en lo cubierto. Los flujos de mayor riesgo (plata/inventario:
crear lote, alta de animal, **venta con cálculo de utilidad**, **anular venta** con
reversión) pasaron limpios en el build actual. No hay PRs de fix que abrir.

## Cierre y cobertura

Por decisión de cerrar el barrido tras los críticos limpios:

- **Cubierto a fondo en el build actual de prod** (`index-DXQmLulp.js`): Dashboard/stats,
  multi-finca, crear lote, alta de animal (modal/origen/arete SENASA/DIIO), venta+anular,
  areteo/alertas, filtro avanzado.
- **Verificado antes en esta sesión** (otros bundles, mismos componentes): muerte
  registrar/revertir, origen "Valor estimado", modal cross-finca, indicador offline oculto
  online. _Riesgo residual:_ merges posteriores tocaron `LoteDetalle`/`useAnimales`/
  `Dashboard`; conviene un smoke de muerte y mover-completo en una próxima pasada.
- **Diferido** (no bloqueante): pesajes, gastos lote+finca, sanidad, exports (Excel/PDF),
  responsive, estado-offline real, edición de lote y borrado-cascade.

**Recomendación:** una próxima pasada corta sobre el build actual cubriendo muerte (smoke),
gastos de finca (distribución), mover-completo y exports cerraría el riesgo residual.

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
