# GanaCR — Contexto para Claude Code

## ¿Qué es este proyecto?
Sistema web de gestión ganadera para Costa Rica. Permite a ganaderos llevar control
de lotes de ganado, animales individuales, pesajes, gastos y ventas. Soporta el modelo
"ganado a medias" (sociedad con otra persona con porcentaje configurable).
Objetivo a mediano plazo: producto comercializable para ganaderos costarricenses,
con módulos que respondan a la legislación vigente (SENASA, SUGEF, MAG).

## Stack
- React 18 + TypeScript + Vite
- Firebase: Firestore (base de datos) + Auth (autenticación)
- React Router DOM 6
- CSS vanilla con variables CSS (no Tailwind, no Material UI)
- Offline-first: Firestore IndexedDB persistence

## Estado actual del MVP (COMPLETO)
- Auth (login/registro con Firebase)
- Dashboard con estadísticas de todos los lotes
- Crear lotes (propio o a medias con socio)
- Agregar animales (arete, raza, peso, precio)
- Registrar pesajes
- Registrar gastos (alimento, veterinario, mano de obra, transporte)
- Vender animales con cálculo automático de utilidad y división a medias
- CRUD completo: editar y borrar animales, gastos, lotes; anular ventas con reversión de contadores
- Diseño responsive mobile-first (móvil ≤640px, tablet 641–1024px, desktop ≥1025px); hamburger nav, bottom-sheet modals, cards por animal, filtro de arete offline

## Roadmap — Próximas fases

### Fase 2A — Arquitectura multi-finca (FUNDACIÓN — hacer antes que Fase 2B y 3)
Contexto: hoy la jerarquía es Usuario → Lotes. Introducir Fincas es el cambio
arquitectónico más importante porque todas las features siguientes dependen de él.
Jerarquía objetivo: Usuario → Fincas → Lotes → Animales/Gastos/Ventas.
- [ ] Nueva colección `fincas` en Firestore; campo `fincaId` en `lotes`, `animales`, `gastos`, `ventas`
- [ ] Hooks actualizados (`useLotes`, `useAnimales`, `useGastos`, `usePesos`, `useVentas`) para filtrar por `fincaId`
- [ ] Pantalla de selección/gestión de fincas antes del Dashboard actual
- [ ] Migración de datos: asignar lotes existentes a una "Finca por defecto" sin romper cuentas activas
- [ ] Mover animales entre lotes de la misma finca: actualizar `loteId` + ajustar contadores con `writeBatch`
- [ ] Mover animales entre fincas distintas: actualizar `fincaId` + `loteId` + manejar utilidad parcial en lotes a medias
- [ ] Gastos a nivel de finca: el usuario crea el gasto, selecciona los lotes a los que aplica, y el sistema distribuye el monto proporcionalmente según animales activos de cada lote seleccionado (los lotes a medias se incluyen solo si el usuario los selecciona explícitamente)

### Fase 2B — Completar gestión básica
- [ ] Módulo de vacunas y tratamientos por animal
- [ ] Control de partos (madre, fecha, peso al nacer)
- [ ] Gráficos de evolución de peso por animal/lote
- [ ] Export a Excel de inventario y ventas
- [ ] Reporte PDF de lote para enviar al socio por WhatsApp

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
Contexto: los ganaderos no conocen su costo real por kilo producido ni su
rentabilidad por animal, lo que les impide acceder a créditos del MAG/BNCR
o tomar decisiones informadas.
- [ ] Costo por kilo producido (inversión + gastos / kg ganado)
- [ ] Margen por animal vendido
- [ ] Rentabilidad por lote y comparativa entre lotes
- [ ] Simulador de escenarios de venta (si vendo hoy vs. en 30 días)
- [ ] Módulo simplificado compatible con líneas de crédito MAG al 6%

### Fase 5 — Gestión de pastos y finca
Contexto: tecnología académica (UCR, CATIE) no llega al productor promedio.
Se necesita una versión práctica sin sensores.
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
- `src/hooks/` — lógica de datos (useLotes, useAnimales, useGastos, usePesos, useVentas, useEditarAnimal, useEliminarAnimal, useActualizarGasto, useEliminarGasto, useEliminarLoteConCascada, useAnularVenta)
- `src/utils/calculadora.ts` — cálculos de ventas y formateo
- `src/pages/` — Dashboard, Login, LoteDetalle (con sus `.css` individuales)
- `src/components/` — modales (CrearLote, AgregarAnimal, AgregarGasto, RegistrarPeso, VenderAnimales, ConfirmarBorrado)
- `src/index.css` — variables CSS, estilos globales y responsive (bottom-sheet, breakpoints)
- `tests/responsive/` — tests Playwright de filtro y responsive (`playwright.responsive.config.ts`)

## Convenciones del proyecto
- Colones costarricenses (₡) para moneda, formateados con `formatColones()`
- Fechas en ISO string, mostradas con `formatFecha()`
- Pesos en kilogramos con `formatKg()`
- Cada colección Firestore tiene campo `userId` para seguridad por usuario
- Los lotes acumulan contadores con `increment()` para eficiencia
- Diseño mobile-first, responsive
- Sin librerías de UI externas — CSS vanilla con variables

## Base de datos Firestore (colecciones actuales)
- `users` — perfil del usuario
- `lotes` — lotes de ganado con contadores acumulados
- `animales` — animales individuales ligados a un lote
- `pesos` — historial de pesajes por animal
- `gastos` — gastos por lote
- `ventas` — ventas realizadas con cálculo de utilidad

## Base de datos Firestore (planeada — Fase 2A)
- `fincas` — fincas del usuario (nivel superior antes de lotes)
- `lotes` — se agrega campo `fincaId`
- `animales`, `gastos`, `ventas` — se agrega campo `fincaId` para filtrado eficiente

## Contexto del desarrollador
- José Daniel, contador en Costa Rica con conocimientos en Python, JS, TypeScript
- Trabaja en empresa de ciberseguridad con equipos de desarrollo (Frontend, Backend, Full Stack)
- El sistema es para uso personal y comercialización a ganaderos costarricenses
- Prioridad: código limpio, funcional, mantenible y escalable
- Decisiones de diseño deben considerar conectividad limitada en zonas rurales de Costa Rica