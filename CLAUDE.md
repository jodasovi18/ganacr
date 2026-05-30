# GanaCR — Contexto para Claude Code

## ¿Qué es este proyecto?
Sistema web de gestión ganadera para Costa Rica. Permite a ganaderos llevar control
de lotes de ganado, animales individuales, pesajes, gastos y ventas. Soporta el modelo
"ganado a medias" (sociedad con otra persona con porcentaje configurable).
Objetivo a mediano plazo: producto comercializable para ganaderos costarricenses,
con módulos que respondan a la legislación vigente (SENASA, SUGEF, MAG).

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
- **Pendiente de Fase 2A**: mover animales entre fincas distintas (cross-finca)

### Fase 2B — Gestión básica — PARCIALMENTE COMPLETO
- [x] Módulo de sanidad: vacunas y tratamientos por animal (SanidadTab, EventoSanitarioModal)
- [x] Gráficos de evolución de peso por animal (AnimalWeightChart) y por lote (LoteAvgChart)
- [x] Export Excel de inventario y ventas (`exportarLotesExcel`)
- [x] Reporte PDF de lote con datos completos (`ReporteLotePDF`, `ReporteSocioPDF`)
- [ ] Control de partos (madre, fecha, peso al nacer) — PENDIENTE
- [ ] Filtro avanzado de animales (por raza, estado, rango de peso) — PENDIENTE

### Rediseño UI — COMPLETO (PR #13 pendiente de merge)
- Migración completa de CSS vanilla a **Tailwind CSS v4 + shadcn/ui**
- Paleta "Campo Claro": background `#f8fafc`, primary `#1e4d3a`, border `#d1d9e3`
- 11 componentes shadcn: Button, Card, Dialog, Tabs, Input, Label, Badge, DropdownMenu, Select, Sonner, Drawer
- Login, Dashboard, LoteDetalle + 11 modales migrados
- Cards de lote con botones de acción visibles (Ver lote, Editar, Eliminar)
- Zero archivos CSS individuales — todo en `src/index.css`
- `@theme inline` + `@apply border-border` en base layer (requerido por shadcn/Tailwind v4)

## Pendiente inmediato
- [ ] **Merge PR #13** — rediseño UI (verificar preview antes de merge)
- [ ] **Usuario demo** — crear usuario de prueba con datos ficticios para demos con clientes
- [ ] Mover animales entre fincas distintas (cross-finca, Fase 2A restante)
- [ ] Control de partos (Fase 2B)

## Roadmap — Próximas fases

### Fase 3 — Trazabilidad SENASA (PRIORIDAD ALTA — legislación vigente)
Contexto: SENASA implementó obligatoriedad de areteo y registro de movilización.
Los ganaderos, especialmente en zonas rurales, no tienen herramientas digitales
offline para cumplir. Es el gap más urgente del mercado costarricense hoy.
- [ ] Registro de areteo oficial por animal (número de arete SENASA)
- [ ] Guías de movilización en PDF listas para presentar
- [ ] Inventario del hato sincronizable con Trazar-Agro cuando haya conectividad
- [ ] Funcionamiento 100% offline-first (zonas sin señal)
- [ ] Alertas de animales sin arete registrado

### Fase 4 — Finanzas y costos ganaderos
- [ ] Costo por kilo producido (inversión + gastos / kg ganado)
- [ ] Margen por animal vendido
- [ ] Rentabilidad por lote y comparativa entre lotes
- [ ] Simulador de escenarios de venta (si vendo hoy vs. en 30 días)
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
- `tests/responsive/` — tests Playwright (`playwright.responsive.config.ts`)
- `scripts/` — seed y cleanup de datos (tsx)

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

## Índices Firestore relevantes
Ver `firestore.indexes.json` — índices compuestos para queries por userId + fincaId + loteId.

## Contexto del desarrollador
- José Daniel, contador en Costa Rica con conocimientos en Python, JS, TypeScript
- Trabaja en empresa de ciberseguridad con equipos de desarrollo (Frontend, Backend, Full Stack)
- El sistema es para uso personal y comercialización a ganaderos costarricenses
- Prioridad: código limpio, funcional, mantenible y escalable
- Decisiones de diseño deben considerar conectividad limitada en zonas rurales de Costa Rica
