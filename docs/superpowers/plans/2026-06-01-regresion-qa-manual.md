# Regresión QA manual completa — Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: este plan se ejecuta **inline** (superpowers:executing-plans), NO subagent-driven: es un barrido manual de browser, stateful y secuencial, conducido por el controlador en una sola sesión. Steps usan checkbox (`- [ ]`).

**Goal:** Recorrer manualmente todos los flujos del sistema sobre el demo en producción, documentar bugs por área en un reporte, y dejar los fixes agrupados por dominio (PRs) con el demo restaurado.

**Architecture:** Controlador conduce Chrome MCP sobre `https://ganacr.vercel.app` (demo). Verificación con screenshots + queries al DOM (`javascript_tool`). Hallazgos → `docs/qa/2026-06-01-regresion-demo.md`. Fixes → PRs por dominio (ver spec). Restauración final → `npm run copy-to-demo` + `clean-demo`.

**Tech Stack:** Chrome MCP (claude-in-chrome), Firebase (demo prod), tsx scripts.

**Regla transversal:** registrar pass/fail por área en el reporte a medida que avanzo. No arreglar a mitad salvo bloqueante (ese se arregla/mergea como Crítico). Demás bugs → PRs por dominio al cerrar áreas.

---

## Task 0: Setup — reporte, login y baseline

**Files:** Create `docs/qa/2026-06-01-regresion-demo.md`

- [ ] **Step 1: Crear el esqueleto del reporte**

Crear `docs/qa/2026-06-01-regresion-demo.md` con encabezado: título, fecha, entorno (demo prod), y una sección por cada una de las 14 áreas con estado inicial `⏳ pendiente`. Tabla resumen al inicio (Área | Estado | Bugs).

- [ ] **Step 2: Abrir browser y login**

Chrome MCP: nueva tab, navegar a `https://ganacr.vercel.app/login`, login demo (sesión suele estar activa). Verificar Dashboard visible.

- [ ] **Step 3: Capturar baseline para restaurar después**

Vía DOM/screenshot anotar el estado actual del demo: fincas (La Esperanza, El Roble), nº de lotes por finca, totales (Animales, Invertido, Utilidad). Guardar en el reporte como "Baseline pre-QA" para comparar tras la restauración.

---

## Task 1: Auth & Dashboard & Multi-finca

**Verificar (registrar pass/fail + detalle en el reporte):**

- [ ] **Step 1:** Stats del Dashboard coinciden con la suma de los lotes (Animales/Invertido/Utilidad). Verificar con DOM: leer las 4 stat cards.
- [ ] **Step 2:** Selector de finca: cambiar entre "La Esperanza" y "El Roble"; confirmar que lotes, stats y "Reporte de pérdidas"/Excel se actualizan a la finca activa.
- [ ] **Step 3:** Persistencia de finca activa: recargar la página; debe mantener la última finca seleccionada (localStorage).
- [ ] **Step 4:** Logout y re-login: el botón "Salir" cierra sesión y vuelve a `/login`.
- [ ] **Step 5:** Registrar resultados en el reporte (Área 1).

---

## Task 2: Lotes (crear / editar / borrar)

- [ ] **Step 1:** Crear lote **propio** ("QA-TEST Propio"): aparece en la lista, stats de finca suben en 1 lote.
- [ ] **Step 2:** Crear lote **a medias** ("QA-TEST Medias", socio "QA Socio" 40%): badge de socio visible; el % se guarda.
- [ ] **Step 3:** Editar "QA-TEST Propio" (cambiar nombre/fecha): cambios persisten.
- [ ] **Step 4:** Borrar "QA-TEST Medias" con cascade: confirma modal, el lote desaparece y el contador de lotes de la finca baja. (Dejar "QA-TEST Propio" para las áreas siguientes.)
- [ ] **Step 5:** Registrar resultados (Área 2).

---

## Task 3: Animales (agregar / editar / borrar)

Usar el lote "QA-TEST Propio".

- [ ] **Step 1:** Agregar **Comprado con precio** (arete QA-001, raza Nelore, peso 300, precio 400000, N° subasta 12, arete SENASA "CR188-QA1"): se crea; inversión del lote sube 400000; sin ⚠️ (tiene arete).
- [ ] **Step 2:** Agregar **Nacido en finca sin valor** (QA-002, peso 250, valor vacío): label "Valor estimado" visible, N° subasta oculto; se crea con ⚠️ (sin arete) y badge "(nacido)"; inversión NO cambia.
- [ ] **Step 3:** Agregar **Sin registro** (QA-003, peso 280, valor 150000): badge "(sin reg.)"; inversión sube 150000.
- [ ] **Step 4:** Editar QA-002 (poner precio/valor 200000 y arete SENASA "CR188-QA2"): inversión sube 200000; el ⚠️ y badge "nacido" cambian según corresponda (sigue nacido pero ya con arete → sin ⚠️).
- [ ] **Step 5:** Borrar QA-003: desaparece; inversión baja 150000; contador animales del lote baja.
- [ ] **Step 6:** Registrar resultados (Área 3). (Dejar QA-001 y QA-002 activos.)

---

## Task 4: Pesajes

- [ ] **Step 1:** Registrar peso para QA-001 (350 kg): pesoActual se actualiza a 350; ganancia +50.
- [ ] **Step 2:** Registrar un 2º peso (370 kg): historial muestra ambos; pesoActual 370.
- [ ] **Step 3:** Tab Pesos: gráfico de evolución por animal y promedio por lote renderizan sin error; semáforo de umbrales coherente.
- [ ] **Step 4:** Registrar resultados (Área 4).

---

## Task 5: Ventas y anulación

- [ ] **Step 1:** Vender QA-001 (precio de venta que dé utilidad): se calcula utilidad bruta, inversión y gastos proporción; el animal pasa a "vendido"; stats del lote actualizan (Vendidos +1, Ventas, Utilidad).
- [ ] **Step 2:** En un lote **a medias** existente del demo (ej. con socio), verificar una venta muestra utilidad socio / propietario según %.
- [ ] **Step 3:** Anular la venta de QA-001: vuelve a "activo"; contadores y utilidad revierten al estado previo.
- [ ] **Step 4:** Registrar resultados (Área 5).

---

## Task 6: Muerte / baja y reporte de pérdidas

- [ ] **Step 1:** Registrar muerte de QA-002 (precio/kg 2000, causa "QA"): badge "muerto"; Activos −1; Utilidad del lote baja por peso×2000; aviso fiscal visible en el modal con wording "pérdida registrada".
- [ ] **Step 2:** "Reporte de pérdidas" (Dashboard): descarga Excel — **NO** disparar el download real (verificar que el botón está habilitado y la query no falla); validar lógica por DOM/console si es posible.
- [ ] **Step 3:** Revertir la muerte de QA-002: vuelve a "activo"; Activos +1; Utilidad restaurada.
- [ ] **Step 4:** Registrar resultados (Área 6).

---

## Task 7: Mover animales (mismo lote y cross-finca)

- [ ] **Step 1:** Mover QA-001 a otro lote de la **misma finca** (precio traspaso): desaparece del origen, aparece en destino con nuevo precio; contadores de ambos lotes correctos.
- [ ] **Step 2:** Mover QA-001 a un lote de **otra finca** (cross-finca): expandir "Otras fincas", elegir destino, mover; verificar en la otra finca que el animal aparece y su historial de pesos migró.
- [ ] **Step 3:** Registrar resultados (Área 7).

---

## Task 8: Gastos (lote y finca)

- [ ] **Step 1:** Agregar gasto al lote "QA-TEST Propio" (alimento, 50000): totalGastos del lote sube; aparece en la tab Gastos.
- [ ] **Step 2:** Editar el gasto (75000) y luego borrarlo: totalGastos ajusta en cada paso.
- [ ] **Step 3:** Gasto de **finca** (tab "Gastos de Finca", concepto, monto, seleccionar ≥2 lotes): se distribuye proporcional; cada lote recibe su parte (badge 📌 Finca en sus gastos).
- [ ] **Step 4:** Borrar el gasto de finca: revierte los hijos en cada lote.
- [ ] **Step 5:** Registrar resultados (Área 8).

---

## Task 9: Sanidad

- [ ] **Step 1:** Registrar evento sanitario para QA-001 (vacuna, producto, fecha): aparece en la tab Sanidad y en el historial individual del animal.
- [ ] **Step 2:** Eliminar el evento: desaparece; si generaba gasto, se revierte.
- [ ] **Step 3:** Registrar resultados (Área 9).

---

## Task 10: Areteo / alertas SENASA

- [ ] **Step 1:** Confirmar que los animales activos sin `areteSenasa` muestran ⚠️ (tabla y cards) y que el Dashboard muestra el aviso de finca + badge "N sin arete" por lote (ya verificado parcialmente; re-confirmar tras las mutaciones de QA).
- [ ] **Step 2:** Completar el arete SENASA de un animal que no lo tenía (editar): el ⚠️ de ese animal desaparece y los contadores (aviso de finca / badge de lote) bajan en 1 en tiempo real.
- [ ] **Step 3:** Filtro "Solo sin arete SENASA": aísla los pendientes.
- [ ] **Step 4:** Registrar resultados (Área 10).

---

## Task 11: Filtro avanzado

- [ ] **Step 1:** Abrir "Filtros"; probar cada filtro por separado (estado activo/vendido/muerto, raza, origen, rango peso, rango ganancia) — verificar que la lista y "Mostrando X de Y" responden.
- [ ] **Step 2:** Combinar 2-3 filtros (AND) y confirmar el resultado; badge del nº de filtros activos correcto.
- [ ] **Step 3:** "Limpiar filtros" resetea; el buscador por arete sigue funcionando junto al filtro.
- [ ] **Step 4:** Registrar resultados (Área 11).

---

## Task 12: Exports / Reportes

- [ ] **Step 1:** Excel de inventario (botón "Excel"): verificar que se dispara sin error (sin descargar archivo real si es evitable; validar que no lanza excepción en consola).
- [ ] **Step 2:** PDF de lote (menú ⋮ → "PDF Lote"): genera sin error.
- [ ] **Step 3:** En un lote **a medias**: "PDF Socio" genera sin error.
- [ ] **Step 4:** Registrar resultados (Área 12). (Nota: los downloads reales requieren permiso; verificar generación sin guardar archivos salvo necesario.)

---

## Task 13: Offline

- [ ] **Step 1:** Activar modo offline (DevTools Network → Offline, vía Chrome MCP si es posible, o `navigator` override): confirmar que aparece el chip "Sin conexión — tus cambios se guardan…".
- [ ] **Step 2:** Volver online: el chip desaparece.
- [ ] **Step 3:** Registrar resultados (Área 13). (Si no se puede forzar offline desde el MCP, documentar como "verificación limitada" y dejar para prueba manual de José.)

---

## Task 14: Responsive (smoke mobile/tablet)

- [ ] **Step 1:** Redimensionar a mobile (375px): Dashboard (navbar colapsa a ☰, cards apiladas) y LoteDetalle (tabs, cards de animales en vez de tabla, botones de acción) se ven usables.
- [ ] **Step 2:** Tablet (768px): layout intermedio coherente.
- [ ] **Step 3:** Abrir un modal en mobile (ej. Agregar Animal) y confirmar que es usable (scroll, botones accesibles).
- [ ] **Step 4:** Registrar resultados (Área 14). Restaurar viewport a desktop.

---

## Task 15: Cierre — restaurar demo, finalizar reporte y abrir PRs

- [ ] **Step 1:** Completar el reporte `docs/qa/2026-06-01-regresion-demo.md`: tabla resumen con estado final por área y lista consolidada de bugs (severidad + dominio asignado).
- [ ] **Step 2:** **Restaurar el demo**: `npm run copy-to-demo` y luego `npm run clean-demo`. Verificar con `npm run verify-demo` que los datos quedan consistentes (fincas/lotes/animales) y que las entidades QA-TEST ya no están.
- [ ] **Step 3:** Verificar en el browser que el demo volvió al baseline (recargar Dashboard, comparar con "Baseline pre-QA").
- [ ] **Step 4:** **Abrir los PRs de fixes agrupados por dominio** (según la estrategia del spec): por cada dominio con bugs, rama desde `main` → aplicar fix(es) → `tsc`/`lint`/`build` (+ test TDD si es lógica pura) → `gh pr create`. Críticos ya fueron a su PR inmediato. Nits triviales → `chore(qa): nits`. **No mergear sin aprobación de José.**
- [ ] **Step 5:** Commit del reporte QA en la rama `qa/regresion-demo` y abrir su PR (con el reporte + referencias a los PRs de fixes).

---

## Notas de ejecución

- Si un área **no tiene bugs**, no se abre PR; queda como pass en el reporte.
- Si un bug es **bloqueante** (impide seguir el barrido), arreglarlo y mergearlo de inmediato (Crítico, su propio PR) antes de continuar.
- Preferir verificación por **DOM** (`javascript_tool`) cuando los screenshots den timeout.
- Las entidades de prueba se nombran con prefijo **"QA-..."** para identificarlas; igual se hace `copy-to-demo` al final que las elimina.
