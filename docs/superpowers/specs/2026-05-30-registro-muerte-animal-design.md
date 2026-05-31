# Diseño — Registro de muerte de animal, limpieza demo y verificación cross-finca

**Fecha:** 2026-05-30
**Estado:** Aprobado, pendiente plan de implementación

## Resumen

Tres tareas que cierran pendientes de Fase 2A y agregan una feature nueva:

1. **Limpieza de datos demo** (mecánico) — eliminar campos espurios `id`/`_testData`.
2. **Cross-finca** (verificación) — ya está implementado; probar y documentar.
3. **Registro de muerte de animal** (feature nueva) — retirar del inventario, registrar
   como pérdida deducible, con aviso fiscal y reporte para renta.

---

## 1. Limpieza de datos demo

**Contexto:** los documentos del usuario demo traen campos basura (`id` con un UUID,
`_testData`) heredados de datos seed/copiados. Tras el fix de spread `{ ...d.data(), id: d.id }`
son inofensivos, pero conviene limpiarlos por higiene.

**Solución:** `scripts/clean-demo-fields.ts` (Admin SDK, patrón de los otros scripts).
- Recorre las colecciones del demo: `fincas`, `lotes`, `animales`, `pesos`, `gastos`,
  `gastosFinca`, `ventas`, `eventosSanitarios`, `users`.
- Para cada doc del usuario demo (`userId == demoUid`), si tiene `id` o `_testData`,
  los elimina con `admin.firestore.FieldValue.delete()` en batches de 490.
- Imprime resumen de cuántos docs se limpiaron por colección.
- Idempotente (correrlo dos veces no hace daño).

**Sin cambios de UI.** Una sola corrida manual: `npx tsx scripts/clean-demo-fields.ts`.

---

## 2. Cross-finca (verificación)

**Hallazgo:** ya está implementado:
- `useMoverAnimales` maneja `isCrossFinca` (migra `fincaId` de animales y pesos, marca
  `importado: true` en los pesos migrados).
- `MoverAnimalesModal` expone la sección desplegable "Otras fincas" con sus lotes.

**Acción:** verificar en el browser (mover un animal entre fincas del demo, confirmar
contadores de ambos lotes y migración de pesos). Si pasa → actualizar CLAUDE.md marcando
cross-finca como completo. Si hay bug → arreglarlo (entonces se replantea como tarea de fix).

---

## 3. Registro de muerte de animal

### Modelo de datos (Enfoque A — campos en el animal)

`Animal` (en `src/types/index.ts`) — agregar dos campos opcionales:
- `causaMuerte?: string`
- `documentoVeterinario?: string`  (texto libre, **opcional** — no todos los productores
  tramitan el dictamen)

Ya existen y se reutilizan: `estado: 'muerto'`, `fechaSalida`, `Lote.animalesMuertos`.

**No se crea colección nueva.** La muerte es 1:1 con un animal; la pérdida = `precioCompra`
(valor en libros) se deriva consultando los muertos. (Se descartó una colección `muertes`
por sobre-ingeniería: a diferencia de las ventas, no agrupa varios animales ni tiene
cálculo complejo que congelar.)

### Hooks (en `src/hooks/useAnimales.ts`)

**`useRegistrarMuerte`** → `registrarMuerte(animal, { fecha, causa?, documentoVeterinario? })`:
- `writeBatch` atómico:
  - Animal: `estado='muerto'`, `fechaSalida=fecha`, `causaMuerte`, `documentoVeterinario`,
    `updatedAt`.
  - Lote: `animalesActivos: increment(-1)`, `animalesMuertos: increment(+1)`,
    `utilidadTotal: increment(-animal.precioCompra)`  ← la pérdida (valor en libros),
    `updatedAt`.
- Solo permitido si `animal.estado === 'activo'`.

**`useAnularMuerte`** → `anularMuerte(animal)`:
- Revierte: `estado='activo'`, `fechaSalida=deleteField()`, `causaMuerte=deleteField()`,
  `documentoVeterinario=deleteField()`.
- Lote: `animalesActivos: increment(+1)`, `animalesMuertos: increment(-1)`,
  `utilidadTotal: increment(+animal.precioCompra)`.

### Reparto socio

La pérdida atribuible al socio = `precioCompra × socio.porcentaje / 100`, calculada en el
**reporte** (no se congela en el doc), consistente con cómo `calculadora.ts` reparte la
utilidad en ventas. En lote `propio`, toda la pérdida es del propietario.

### Impacto en estadísticas

- `totalInvertido` del lote **NO se modifica** (el capital se invirtió de verdad).
- `utilidadTotal` baja por `precioCompra` → la pérdida se refleja en la utilidad del lote
  y del Dashboard. Coherente con "Pérdida: restar de utilidad".

### UI

**Acción "Registrar muerte"** — en el menú ⋮ de cada fila de animal (tab Animales del
`LoteDetalle`), junto a editar/eliminar. Solo visible si el animal está activo.

**`RegistrarMuerteModal`** (shadcn `Dialog`):
- Campos: **fecha de muerte** (obligatoria, default hoy), **causa** (opcional),
  **documento veterinario** (opcional, texto). (Sin campo "notas" propio para no chocar
  con `Animal.notas` de la compra; la causa cubre la descripción.)
- Muestra el **valor en libros** (`precioCompra`) que se registrará como pérdida.
- **Caja de aviso fiscal** (informativa, no bloqueante):
  > 📋 Recordatorio: con un documento de respaldo emitido por un médico veterinario, el
  > valor en libros de este animal puede considerarse pérdida deducible en tu declaración
  > de renta (Ley 7092, art. 8), sujeto a los requisitos de la Dirección General de
  > Tributación. Si lo tenés, guardá el dictamen. Consultá con tu contador.
- Botones: Cancelar / Registrar muerte.

**Animal muerto en la lista:**
- Badge gris **"muerto"**, fila atenuada (estilo consistente con `vendido`).
- En el ⋮: opción **"Revertir muerte"** (llama `anularMuerte`, con confirmación).

### Confirmación legal (CR)

Ley 7092 (Impuesto sobre la Renta), art. 8: deducción de gastos/pérdidas necesarios para
generar renta; empresas agropecuarias arrastran pérdidas hasta 5 periodos. La pérdida de un
activo (animal muerto) es deducible **si está debidamente documentada y registrada**; el
detalle está en el Reglamento. **Caveat:** no es asesoría legal/fiscal definitiva; la
aplicación depende del criterio de Tributación. Por eso el aviso en la app es un
**recordatorio informativo**, no una garantía.

---

## 4. Reporte de pérdidas para renta

**`exportarPerdidasExcel(animalesMuertos, lotesMap, nombreFinca)`** en `src/utils/exportExcel.ts`:
- Hoja Excel con columnas: arete, raza, lote, fecha de muerte, causa, valor en libros
  (pérdida ₡), % socio, pérdida socio ₡, pérdida propietario ₡, documento veterinario.
- Fila de totales al final.

**Botón "Reporte de pérdidas"** en el Dashboard (junto a "Excel"), habilitado solo si hay
muertos en la finca activa. Consulta `animales where fincaId==fincaActiva.id and
estado=='muerto'` (orden y split calculados en cliente).

---

## Archivos afectados

- `scripts/clean-demo-fields.ts` (nuevo)
- `src/types/index.ts` (Animal: +`causaMuerte?`, +`documentoVeterinario?`)
- `src/hooks/useAnimales.ts` (+`useRegistrarMuerte`, +`useAnularMuerte`)
- `src/components/RegistrarMuerteModal.tsx` (nuevo)
- `src/pages/LoteDetalle.tsx` (acción en ⋮, badge muerto, revertir)
- `src/utils/exportExcel.ts` (+`exportarPerdidasExcel`)
- `src/pages/Dashboard.tsx` (botón "Reporte de pérdidas")
- `CLAUDE.md` (cross-finca completo; feature muerte documentada)

## Fuera de alcance (YAGNI)

- Colección `muertes` dedicada.
- Subida de archivos del dictamen veterinario (la app no sube archivos; solo referencia
  de texto).
- Reporte PDF de pérdidas (por ahora solo Excel).
- Muerte en lote (batch) — se registra animal por animal.

## Fuentes legales

- [Ley 7092 — Impuesto sobre la Renta (SCIJ)](https://pgrweb.go.cr/scij/Busqueda/Normativa/Normas/nrm_texto_completo.aspx?nValor1=1&nValor2=10969)
- [Reglamento a la Ley del Impuesto sobre la Renta (SCIJ)](https://pgrweb.go.cr/scij/Busqueda/Normativa/Normas/nrm_texto_completo.aspx?nValor1=1&nValor2=7241)
