# Gráficos de Evolución de Peso — Design Spec

**Fecha:** 2026-05-28  
**Fase:** 2B — Gestión básica  
**Estado:** Aprobado

---

## Objetivo

Dar al ganadero visibilidad del progreso de peso de sus animales: cuáles necesitan ser pesados pronto, cuál está por encima o por debajo del promedio del lote, y la curva histórica de un animal individual.

---

## Decisiones de diseño clave

| Pregunta | Decisión |
|---|---|
| ¿Dónde aparece el gráfico? | Tab "Pesos" en LoteDetalle (macro) + modal individual (micro) |
| ¿Qué muestra el gráfico individual? | Curva del animal vs. promedio actual del lote (línea horizontal) |
| ¿Qué muestra la Tab Pesos? | Semáforo 🔴🟡🟢 por animal + gráfico promedio del lote |
| ¿Librería de gráficos? | Pure SVG — sin dependencias nuevas, offline-safe |
| ¿Umbrales configurables? | Sí — por finca, guardados en Firestore |

---

## Arquitectura y componentes

### Archivos nuevos

| Archivo | Responsabilidad |
|---|---|
| `src/components/PesosTab.tsx` | Tab de pesos a nivel de lote: banner de alerta, gráfico promedio, lista semáforo |
| `src/components/PesosTab.css` | Estilos de la tab |
| `src/components/AnimalPesoModal.tsx` | Bottom-sheet con curva individual del animal + historial + stat cards |
| `src/components/AnimalPesoModal.css` | Estilos del modal |
| `src/components/svg/LoteAvgChart.tsx` | Componente SVG reutilizable: promedio del lote a lo largo del tiempo |
| `src/components/svg/AnimalWeightChart.tsx` | Componente SVG reutilizable: peso del animal + línea de referencia del lote |

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/types/index.ts` | Agregar `pesoUmbralAmarillo?: number` y `pesoUmbralRojo?: number` a `Finca` |
| `src/pages/LoteDetalle.tsx` | Agregar tab "Pesos" que renderiza `<PesosTab>` |
| `src/pages/LoteDetalle.css` | Estilos mínimos para la 4.ª tab |
| `src/components/FincaSelector.tsx` | Agregar formulario de configuración de umbrales por finca |

---

## Modelo de datos

### Cambios en `fincas` (Firestore)

```typescript
pesoUmbralAmarillo: number  // días sin pesar → 🟡 (default: 15)
pesoUmbralRojo:     number  // días sin pesar → 🔴 (default: 30)
```

- Campos opcionales; si no existen se usan los defaults.
- Se persisten con `updateDoc` desde el formulario de ajustes de la finca.
- Validación: `umbralAmarillo > 0`, `umbralRojo > umbralAmarillo`.

### Sin colecciones nuevas

Toda la información viene de `pesos` (colección existente) y de los contadores del documento `lotes` (`pesoPromedio`).

### Queries

**`PesosTab`:**
1. `pesos` donde `loteId == loteId`, `orderBy('fecha', 'desc')` — para calcular días desde el último pesaje de cada animal.
2. `useAnimales(loteId)` — ya existente, se cruza con los pesos para el semáforo.

**`AnimalPesoModal`:**
1. `usePesos(animalId)` — ya existente, historial completo del animal ordenado por fecha.
2. `lote.pesoPromedio` — ya en memoria desde `useLotes`, sin queries extra.

---

## Flujo del usuario

```
LoteDetalle
  └─ Tab "Pesos"
       ├─ [si hay 🔴] Banner: "N animales sin pesar en +X días"
       ├─ LoteAvgChart — evolución del promedio del lote
       └─ Lista semáforo (orden: 🔴 → ⚪ → 🟡 → 🟢)
            └─ Toca un animal
                 └─ AnimalPesoModal (bottom-sheet)
                      ├─ Stat cards: peso actual, kg ganados, kg/día, vs. promedio
                      ├─ AnimalWeightChart — curva del animal + línea del promedio
                      ├─ Historial: tabla fecha / peso / delta
                      └─ Botón "Registrar peso" (abre RegistrarPeso existente)
```

---

## Lógica del semáforo

```typescript
const diasSinPesar = Math.floor(
  (Date.now() - new Date(ultimoPeso.fecha).getTime()) / 86_400_000
);

if (!tienePesajes)              → ⚪  // nunca pesado
else if (dias <= umbralAmarillo) → 🟢
else if (dias <= umbralRojo)     → 🟡
else                             → 🔴
```

**Orden de la lista:** 🔴 primero (acción urgente), luego ⚪ (sin datos), luego 🟡, luego 🟢.

**Banner de alerta:** aparece solo si hay al menos un animal 🔴. Muestra cuántos animales están en ese estado y cuál es el umbral rojo configurado.

---

## Gráfico del promedio del lote (`LoteAvgChart`)

- **Eje X:** fechas de pesaje registradas en el lote (todos los `pesos` del lote agrupados por fecha)
- **Eje Y:** peso promedio de los animales activos en esa fecha
- **Renderizado:** SVG vanilla, área con gradiente + línea + puntos
- **Escala:** se normaliza al rango [min - 10%, max + 10%] del dataset

---

## Gráfico individual (`AnimalWeightChart`)

- **Línea sólida verde:** pesajes del animal en orden cronológico
- **Línea punteada:** `lote.pesoPromedio` como referencia horizontal fija
- **Puntos:** círculo en cada pesaje, el último destacado con borde de acento
- **Sin filtro de rango en MVP** — se muestran todos los pesajes
- **Si >12 pesajes:** el eje X colapsa etiquetas (muestra primera y últimas)

### Stat cards

| Card | Cálculo |
|---|---|
| Peso actual | `pesos[last].peso` |
| Kg ganados totales | `pesos[last].peso - pesos[0].peso` |
| Kg/día promedio | `(pesoActual - pesoInicial) / diasTranscurridos` |
| vs. promedio del lote | `pesos[last].peso - lote.pesoPromedio` |

---

## Configuración de umbrales

Formulario inline en `FincaSelector` (sección "Ajustes"):
- Dos inputs numéricos: "Días → amarillo" y "Días → rojo"
- `updateDoc` al perder el foco (`onBlur`)
- Valores default si los campos no existen en Firestore: 15 y 30
- Validación cliente: `amarillo > 0`, `rojo > amarillo`

---

## Edge cases

| Situación | Comportamiento |
|---|---|
| Animal con 0 pesajes | Modal muestra estado vacío + botón "Registrar primer peso" |
| Animal con 1 pesaje | Gráfico muestra un punto sin línea; delta y kg/día se omiten |
| Lote sin `pesoPromedio` | Se omite la línea de referencia silenciosamente (sin error) |
| Lote sin pesajes | `LoteAvgChart` muestra estado vacío con mensaje "Sin pesajes registrados" |
| Umbrales no configurados | Se usan defaults (15/30) sin mostrar error |

---

## Lo que NO entra en esta feature (YAGNI)

- Filtro de rango de fechas en el gráfico individual
- Comparación entre múltiples animales en el mismo gráfico
- Exportar el gráfico como imagen
- Notificaciones push de animales atrasados
- Histórico del promedio del lote calculado desde todos los pesos (diferido a Fase 4)
- UI de configuración de umbrales fuera de `FincaSelector`
