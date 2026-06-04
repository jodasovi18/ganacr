# GanaCR — Contexto para Claude Code

## ¿Qué es este proyecto?
Sistema web de gestión ganadera para Costa Rica. Permite a ganaderos llevar control
de lotes de ganado, animales individuales, pesajes, gastos y ventas. Soporta el modelo
"ganado a medias" (sociedad con otra persona con porcentaje configurable).
Objetivo a mediano plazo: producto comercializable para ganaderos costarricenses,
con módulos que respondan a la legislación vigente (SENASA, SUGEF, MAG).

**Arquitectura por módulos de explotación:** el sistema se divide por tipo de
ganadería. El módulo en el que estamos trabajando es el de **ENGORDE** (compra,
pesaje, engorde y venta de animales). El **control de partos / reproducción** NO
pertenece a engorde: irá en un **futuro módulo de CRÍA** (ganadería de cría:
madres, montas, partos, peso al nacer, destete).

## Stack
- React 18 + TypeScript + Vite 5
- Firebase: Firestore (base de datos) + Auth (autenticación)
- React Router DOM 6
- **Tailwind CSS v4** + **shadcn/ui** — paleta "Campo Claro" (#1e4d3a verde bosque)
- Offline-first: Firestore IndexedDB persistence
- react-pdf/renderer — exportación PDF de lotes
- xlsx — exportación Excel

## Estado actual (al 30 mayo 2026)

### MVP original — COMPLETO
- Auth (login/registro con Firebase)
- Dashboard con estadísticas globales de finca
- Crear lotes (propio o a medias con socio)
- Agregar animales (arete, raza, peso, precio)
- Registrar pesajes con historial
- Registrar gastos (alimento, veterinario, mano de obra, transporte)
- Vender animales con cálculo automático de utilidad y división a medias
- CRUD completo: editar y borrar animales, gastos, lotes; anular ventas con reversión de contadores

### Fase 2A — Multi-finca — COMPLETO
- Colección `fincas` en Firestore; campo `fincaId` en `lotes`, `animales`, `gastos`, `ventas`
- `FincaContext` + `FincaSelector` — selector de finca activa en el navbar
- `useFincas`, `useLotes(fincaId)` — hooks filtran por finca
- Onboarding: crea primera finca al registrarse
- Mover animales entre lotes de la misma finca (MoverAnimalesModal + writeBatch)
- Gastos a nivel de finca con distribución proporcional entre lotes (GastosFincaTab, GastoFincaModal)
- **Mover animales entre fincas distintas (cross-finca)**: COMPLETO — `useMoverAnimales`
  maneja `isCrossFinca` (migra fincaId de animales y pesos, marca `importado: true`);
  `MoverAnimalesModal` lo expone en la sección "Otras fincas". Verificado 30 mayo 2026.

### Fase 2B — Gestión básica — PARCIALMENTE COMPLETO
- [x] Módulo de sanidad: vacunas y tratamientos por animal (SanidadTab, EventoSanitarioModal)
- [x] Gráficos de evolución de peso por animal (AnimalWeightChart) y por lote (LoteAvgChart)
- [x] Export Excel de inventario y ventas (`exportarLotesExcel`)
- [x] Reporte PDF de lote con datos completos (`ReporteLotePDF`, `ReporteSocioPDF`)
- [x] Registro de muerte/baja de animal: lo retira del inventario y registra la pérdida
  (valor actual estimado = pesoActual × precio/kg) restándola de `utilidadTotal`; aviso
  fiscal (Ley 7092); reparto socio por %; reversión con `useAnularMuerte`; reporte Excel
  de pérdidas para renta (`exportarPerdidasExcel`). Hooks `useRegistrarMuerte`/`useAnularMuerte`,
  `RegistrarMuerteModal`. (30 mayo 2026)
- [x] **Origen del animal** (`Animal.origen`: comprado / nacido_finca / sin_registro): el
  precio de compra es opcional y se re-etiqueta "Valor estimado" para no-comprados; retrocompat
  (ausente = comprado). `AgregarAnimalModal`. (31 mayo 2026)
- [x] **Filtro avanzado de animales** (estado, raza, origen, rango de peso, rango de ganancia):
  función pura `filtrarAnimales` (`src/utils/filtrarAnimales.ts`, test `npm run test:unit`) +
  componente `AnimalesFilterBar`, integrado en la pestaña Animales del lote con contador
  "Mostrando X de Y" y badges de origen. (31 mayo 2026)
- ↪ Control de partos (madre, fecha, peso al nacer): MOVIDO al futuro **módulo de Cría**.
  No va en este módulo (engorde).

### Rediseño UI — COMPLETO (en producción)
- Migración completa de CSS vanilla a **Tailwind CSS v4 + shadcn/ui**
- Paleta "Campo Claro": background `#f8fafc`, primary `#1e4d3a`, border `#d1d9e3`
- 11 componentes shadcn: Button, Card, Dialog, Tabs, Input, Label, Badge, DropdownMenu, Select, Sonner, Drawer
- Login, Dashboard, LoteDetalle + 11 modales migrados
- Cards de lote con botones de acción visibles (Ver lote, Editar, Eliminar)
- Zero archivos CSS individuales — todo en `src/index.css`
- `@theme inline` + `@apply border-border` en base layer (requerido por shadcn/Tailwind v4)

### Bugs post-migración UI corregidos (sesión 30 mayo 2026 — PR #15)
- **CSS Cascade Level 5**: reset `* { margin:0; padding:0 }` estaba fuera de `@layer`, lo que
  sobreescribía TODOS los utilities de Tailwind v4 (`p-*`, `m-*`, `px-*`, `py-*`).
  Fix: mover dentro de `@layer base` en `src/index.css`.
- **Tab activo invisible**: `data-[state=active]:bg-background` = `#f8fafc` (fondo de página).
  Fix: cambiar a `bg-card` en `src/components/ui/tabs.tsx`.
- **PDF perdido en migración**: `handleGenerarPDF()` y `handleGenerarPDFSocio()` eliminados
  accidentalmente al reescribir LoteDetalle. Restaurados con dropdown items en el menú ⋮.

### Usuario demo — FUNCIONANDO ✅ (corregido 30 mayo 2026)
- Script `npm run copy-to-demo` copia TODOS los datos del usuario real a `demo@ganacr.com / GanaCR2026!`
- Script `npm run verify-demo` verifica integridad de los datos copiados
- Script `npx tsx scripts/test-client-query.ts` corre una query vía Client SDK como un usuario
  (replica el browser, pasa por security rules) — útil para diagnosticar 0-resultados.
- **ROOT CAUSE del bug "demo muestra 0 lotes"** (NO eran los índices, eso fue una pista falsa):
  Los documentos seed/copiados traen un campo `id` espurio (UUID) y `_testData`. El mapeo
  `{ id: d.id, ...d.data() }` ponía el spread DESPUÉS, así el UUID sobreescribía el doc id real.
  Resultado: `fincaActiva.id` = UUID basura → `useLotes` consultaba `fincaId == <UUID>` mientras
  los lotes tenían el fincaId real → 0 matches, sin error. Las fincas igual aparecían (usan
  `data.nombre`), enmascarando el bug.
- **FIX**: invertir el spread a `{ ...d.data(), id: d.id }` en los 18 sitios (el doc id real
  siempre gana). Verificado en producción: 5 lotes en La Esperanza, 1 en El Roble, detalle OK.
- Limpieza de campos basura (`id`/`_testData`) del demo: COMPLETO — `npm run clean-demo`
  (script `scripts/clean-demo-fields.ts`), 1404 docs limpiados el 30 mayo 2026.
- ⚠️ **`copy-to-demo` DUPLICA** (no borra antes + IDs nuevos cada corrida). Para resetear el
  demo, el procedimiento correcto es **`npm run wipe-demo` → `npm run copy-to-demo` →
  `npm run clean-demo`** (`wipe-demo` = `scripts/wipe-demo.ts`, borra todo el demo por email).
  Pendiente opcional: que `copy-to-demo` haga el wipe internamente. (2 jun 2026)

### Tooling / DX (30 mayo 2026)
- **`npm run lint` arreglado**: faltaba el archivo de config de ESLint (el script y los
  plugins existían, pero nunca se creó `.eslintrc.cjs`). Agregado config estándar Vite +
  React + TS (`eslint:recommended` + `@typescript-eslint` + `react-hooks`). Pasa limpio.
  Notas: `no-unused-vars` ignora args con prefijo `_`; `react-refresh/only-export-components`
  desactivada (falsos positivos por shadcn `buttonVariants` y context hooks). `tests/` y
  `scripts/` quedan fuera del lint por ahora (env Node/Playwright distinto).

## Pendiente inmediato
- (Nada pendiente de Fase 2B engorde. Próximo gran bloque: Fase 3 — Trazabilidad SENASA.)

## Roadmap — Próximas fases

### Fase 3 — Trazabilidad SENASA (PRIORIDAD ALTA — legislación vigente)
Contexto: SENASA implementó obligatoriedad de areteo y registro de movilización.
Los ganaderos, especialmente en zonas rurales, no tienen herramientas digitales
offline para cumplir. Es el gap más urgente del mercado costarricense hoy.
- [x] **Registro de areteo oficial por animal** (`Animal.areteSenasa` = número DIIO,
  opcional sin validación): campo en `AgregarAnimalModal`, visible en LoteDetalle. (31 may 2026)
- [x] **Alertas de animales sin arete**: ⚠️ por animal activo sin arete (LoteDetalle),
  aviso de finca + badge por lote en Dashboard (hook `useAnimalesSinArete`, onSnapshot), y
  filtro "Solo sin arete SENASA". (31 may 2026)
- [x] **Indicador offline**: la app ya sincroniza offline (IndexedDB); se agregó
  `useOnlineStatus` + `OfflineIndicator` (chip "Sin conexión" en App). (31 may 2026)
- ❌ **Guías de movilización propias — DESCARTADO (no viable legalmente).** Investigación (jun 2026):
  la guía de movilización válida la emite **únicamente Trazar-Agro** (MAG/OIRSA). Requiere notificar
  la salida con el CIIO ≤5 días antes y la guía digital oficial vence en 24h; GanaCR NO puede emitir
  una guía oficial. Lo que sí aporta valor (y es legal): inventario con CIIO listo, una "pre-guía"
  interna **rotulada como NO oficial** para agilizar la notificación, y registro de movimientos.
- [ ] Inventario del hato sincronizable con Trazar-Agro — DIFERIDO (su API no está documentada
  públicamente; una integración requeriría autorización oficial MAG/OIRSA)

### Fase 4 — Finanzas y costos ganaderos
- [x] **Costo por kilo producido** (de engorde y total) — núcleo Fase 4-A, jun 2026
- [x] **Margen por animal vendido** — núcleo Fase 4-A, jun 2026
- [x] **Rentabilidad por lote + comparativa entre lotes** (resultado estimado, ROI, inventario en
  pie con ₡/kg de referencia editable): `utils/finanzas.ts` (puro, TDD), `useFinanzasFinca`,
  pestañas "💰 Finanzas" en LoteDetalle (`FinanzasLoteTab`) y Dashboard (`FinanzasFincaTab`). jun 2026
- [ ] Simulador de escenarios de venta (si vendo hoy vs. en 30 días) — Fase 4-B (usa `gananciaDiariaProm`)
- [ ] Módulo simplificado compatible con líneas de crédito MAG al 6%

### Fase 5 — Gestión de pastos y finca
- [ ] Mapa básico de potreros (polígonos simples)
- [ ] Rotación de potreros con fechas de entrada/salida
- [ ] Estimación de carga animal por potrero
- [ ] Alertas de sobre-pastoreo

### Fase 6 — Cumplimiento subastas/SUGEF (legislación inminente)
Contexto: Expedientes 24.746 y 25.129 buscan incorporar subastas ganaderas
como sujetos obligados ante SUGEF/Ley 7786 y limitar efectivo en transacciones.
- [ ] Registro de compraventas con datos de contraparte (comprador/vendedor)
- [ ] Trazabilidad del dinero por animal
- [ ] Límites y alertas de transacciones en efectivo
- [ ] Reportes compatibles con requerimientos SUGEF/ICD

### Fase 7 — Portal y reportes para socios
- [ ] Vista de solo lectura para el socio (sin login completo)
- [ ] Reporte automático mensual por WhatsApp/email
- [ ] Firma digital de acuerdos de sociedad

## Estructura de archivos clave
- `src/types/index.ts` — todas las interfaces TypeScript
- `src/services/firebase.ts` — configuración Firebase (credenciales aquí)
- `src/contexts/AuthContext.tsx` — manejo de sesión
- `src/contexts/FincaContext.tsx` — finca activa y lista de fincas del usuario
- `src/hooks/` — lógica de datos (useLotes, useAnimales, useGastos, usePesos, useVentas,
  useFincas, useGastosFinca, useEventosSanitarios, useEliminarAnimal, useAnularVenta, etc.)
- `src/utils/calculadora.ts` — cálculos de ventas y formateo (formatColones, formatKg, formatFecha)
- `src/utils/exportExcel.ts` — exportación a Excel
- `src/utils/exportPDF.ts` — exportación a PDF
- `src/pages/` — Dashboard, Login, LoteDetalle
- `src/components/` — modales y tabs (CrearLote, AgregarAnimal, AgregarGasto,
  RegistrarPeso, VenderAnimales, ConfirmarBorrado, MoverAnimales,
  EventoSanitario, AnimalPeso, GastoFinca, PesosTab, SanidadTab, GastosFincaTab)
- `src/components/ui/` — componentes shadcn/ui (Button, Card, Dialog, Tabs, etc.)
- `src/components/svg/` — gráficos SVG (AnimalWeightChart, LoteAvgChart)
- `src/components/pdf/` — componentes react-pdf (ReporteLotePDF, ReporteSocioPDF)
- `src/index.css` — Tailwind v4 + @theme inline + @layer base con paleta Campo Claro
- `src/lib/utils.ts` — función `cn()` de shadcn/ui
- `docs/superpowers/` — specs y planes de implementación (brainstorming sessions)
- `tests/e2e/` — suite E2E sobre Firebase Emulator (Firestore+Auth); `npm run test:e2e`
  (requiere JDK 17). Datos sembrados por `scripts/seed-emulator.ts` (fixtures en `tests/e2e/fixtures.ts`).
- `tests/unit/` — tests Node rápidos (cálculos, filtro, render PDF Lote/Socio); `npm run test:unit`.
- `tests/rules/` — tests de las reglas Firestore (`@firebase/rules-unit-testing`); `npm run test:rules`
  (requiere JDK 17). Reglas **endurecidas**: owner-only + `userId` inmutable + sanity de tipos en
  campos críticos + tope de tamaño por doc. El E2E es verificación cruzada de que las reglas no
  rompen escrituras reales.
- App Check bloquea navegadores automatizados → los E2E usan el emulador (sin App Check).
  `firebase.json` define los emuladores; `firebase.ts` conecta con `VITE_USE_EMULATOR` (`.env.test`).
- `scripts/` — seed, cleanup, copy-to-demo, verify-demo, seed-emulator (tsx con Firebase Admin SDK)

## Flujo de trabajo (Git / PR)
A partir del 31 may 2026 el trabajo de features va **por Pull Request**, no directo a `main`:
1. Crear una rama desde `main` (`feature/...`, `fix/...`, `chore/...`).
2. Implementar + commits frecuentes (mensaje termina con `Co-Authored-By: Claude ...`).
3. Verificar: `npx tsc --noEmit`, `npm run lint`, `npm run build` y `npm run test:unit` (y `npm run test:e2e` con JDK 17).
4. `git push -u origin <rama>` y abrir el PR con `gh pr create`.
5. **NO mergear a `main` hasta que José apruebe el PR.** Al mergear, Vercel despliega `main`.

(Las features previas de esta sesión —muerte, origen/filtro, areteo, lint— se mergearon
directo a `main` antes de adoptar este flujo; ya están en producción.)

## Convenciones del proyecto
- Colones costarricenses (₡) para moneda, formateados con `formatColones()`
- Fechas en ISO string, mostradas con `formatFecha()`
- Pesos en kilogramos con `formatKg()`
- Cada colección Firestore tiene campo `userId` para seguridad por usuario
- Los lotes acumulan contadores con `increment()` para eficiencia
- Diseño mobile-first, responsive (≤640px mobile, 641-1024px tablet, ≥1025px desktop)
- **Tailwind CSS v4** con utilidades semánticas: `bg-background`, `text-foreground`,
  `text-muted-foreground`, `bg-primary`, `text-destructive`, `text-success`, etc.
- **shadcn/ui**: componentes en `src/components/ui/`, usar `cn()` de `@/lib/utils`
- Modales usan shadcn `Dialog`; en mobile pueden usar `Drawer` (bottom-sheet)
- Funciones `cn()` para combinar clases condicionales en componentes

## Base de datos Firestore (colecciones actuales)
- `users` — perfil del usuario
- `fincas` — fincas del usuario (nivel superior en la jerarquía)
- `lotes` — lotes de ganado con contadores acumulados, ligados a una finca
- `animales` — animales individuales ligados a un lote y finca
- `pesos` — historial de pesajes por animal
- `gastos` — gastos por lote
- `ventas` — ventas realizadas con cálculo de utilidad
- `gastosFinca` — gastos a nivel de finca con distribución entre lotes
- `eventosSanitarios` — vacunas y tratamientos por animal

## Índices y reglas Firestore (deploy)
Ver `firestore.indexes.json` (índices) y `firestore.rules` (seguridad).
- **Índices**: `firebase deploy --only firestore:indexes`. (Hoy `indexes.json` está vacío: las
  queries no usan `orderBy`, ordenan en cliente, así que no requieren índices compuestos.)
- **Reglas**: `firebase deploy --only firestore:rules`. **CRÍTICO deployarlas al agregar una
  colección nueva.** Una colección sin regla en producción **deniega toda escritura**
  (`Missing or insufficient permissions`), aunque el repo tenga la regla.
- **Lección (2 jun 2026, BUG-1 del QA)**: `gastosFinca` y `eventosSanitarios` tenían reglas en
  el repo pero **nunca se habían deployado** → Gastos de Finca y Sanidad estaban **rotos en
  producción** (permission-denied) desde que se shipearon. Se deployaron las reglas y ambas
  features quedaron OK. Regla de oro: **al agregar una colección, deployar las reglas en el
  mismo paso.**

## Contexto del desarrollador
- José Daniel, contador en Costa Rica con conocimientos en Python, JS, TypeScript
- Trabaja en empresa de ciberseguridad con equipos de desarrollo (Frontend, Backend, Full Stack)
- El sistema es para uso personal y comercialización a ganaderos costarricenses
- Prioridad: código limpio, funcional, mantenible y escalable
- Decisiones de diseño deben considerar conectividad limitada en zonas rurales de Costa Rica
