# Mover Animales entre Lotes y Fincas — Design Spec

**Fecha:** 2026-05-28
**Fase:** 2A (pendientes)

---

## Objetivo

Permitir al usuario mover uno o varios animales activos de un lote a otro (misma finca o finca distinta), registrando un precio de traspaso por kilogramo. El historial de pesajes viaja con el animal.

---

## Decisiones de diseño

| Pregunta | Decisión |
|---|---|
| ¿Desde dónde se mueve? | Individual (botón en card) + multi-select (checkbox en tab Animales) |
| ¿Cómo se registra el precio? | Precio por kg (₡/kg × pesoActual). El usuario ingresa un valor único; el sistema calcula el monto por animal automáticamente. |
| ¿Qué pasa con los pesos históricos? | Migran al nuevo lote (se actualiza `pesos.loteId`). Si es cross-finca, también se actualiza `pesos.fincaId` y se marca `importado: true`. |
| ¿Destino UI? | Modal de un paso con lotes agrupados: "Esta finca" primero, "Otras fincas" colapsado por defecto. |

---

## Modelo de datos

### Cambio al tipo `Peso`

```typescript
export interface Peso {
  id: string;
  userId: string;
  fincaId: string;
  animalId: string;
  loteId: string;
  peso: number;
  fecha: string;
  notas?: string;
  importado?: boolean;  // NEW: true si fue migrado desde otra finca
  createdAt: string;
}
```

Sin cambios en `Animal`, `Lote`, ni `Finca`.

---

## Arquitectura

### Nuevos archivos

| Archivo | Responsabilidad |
|---|---|
| `src/hooks/useMoverAnimales.ts` | Lógica de escritura en dos fases |
| `src/components/MoverAnimalesModal.tsx` | Modal bottom-sheet de selección de destino y precio |
| `src/components/MoverAnimalesModal.css` | Estilos del modal |

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/types/index.ts` | Agregar `importado?: boolean` a `Peso` |
| `src/hooks/useLotes.ts` | Agregar `useAllLotes()` — lista todos los lotes del usuario sin filtro de finca |
| `src/pages/LoteDetalle.tsx` | Agregar botón "Seleccionar" + barra multi-select + botón "Mover" en cada card |
| `src/pages/LoteDetalle.css` | Estilos de barra multi-select y checkbox en cards |

### Hook auxiliar `useAllLotes`

Necesario para que `MoverAnimalesModal` pueda listar lotes de todas las fincas como destinos posibles.

```typescript
// src/hooks/useLotes.ts — función adicional
export function useAllLotes() {
  const { user } = useAuth();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const q = query(
      collection(db, 'lotes'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setLotes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lote)));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  return { lotes, loading };
}
```

`LoteDetalle` llama `useAllLotes()` y pasa el resultado al modal. `todasLasFincas` viene del `useFinca()` context (ya disponible en LoteDetalle).

---

## Hook `useMoverAnimales`

Archivo: `src/hooks/useMoverAnimales.ts`

```typescript
interface MoverAnimalesInput {
  animales: Animal[];   // 1 o más, todos activos
  loteSrc: Lote;        // lote origen
  loteDst: Lote;        // lote destino (distinto de loteSrc)
  precioKg: number;     // ₡/kg > 0
}

export function useMoverAnimales(): { moverAnimales: (input: MoverAnimalesInput) => Promise<void> }
```

### Fase 1 — writeBatch atómico

Escribe en un único batch (siempre < 32 docs para hasta 30 animales):

1. **Por cada animal:** `loteId = loteDst.id`, `fincaId = loteDst.fincaId`, `precioCompra = round(precioKg × animal.pesoActual)`, `updatedAt = now`
2. **Lote origen:** `animalesActivos -= n`, `totalAnimales -= n`, `totalInvertido -= Σ(precioCompra_viejo)`
3. **Lote destino:** `animalesActivos += n`, `totalAnimales += n`, `totalInvertido += Σ(precioTraspaso)`

### Fase 2 — Migración de pesos

Solo después de que Fase 1 commitea exitosamente.

- Consulta pesos por `animalId in [...]` (chunks de 30 por límite de Firestore `in`)
- Actualiza por cada peso: `loteId = loteDst.id`
- Si cross-finca (`loteSrc.fincaId !== loteDst.fincaId`): también `fincaId = loteDst.fincaId`, `importado = true`
- Escribe en writeBatches de 500 docs

**Si Fase 2 falla:** La Fase 1 ya es irrevocable. Se muestra error descriptivo al usuario; la operación es idempotente (puede reintentarse desde el nuevo lote buscando el animal).

---

## Componente `MoverAnimalesModal`

### Props

```typescript
interface MoverAnimalesModalProps {
  animales: Animal[];           // animales a mover (1 o más)
  loteSrc: Lote;                // lote actual
  todosLosLotes: Lote[];        // todos los lotes del usuario (todas las fincas)
  todasLasFincas: Finca[];      // para mostrar nombre de cada finca
  onClose: () => void;
  onSuccess: () => void;        // limpia la selección multi-select al terminar
}
```

### Layout (bottom-sheet)

```
Mover N animal(es)                          ×

Destino
── Esta finca (Nombre Finca) ─────────────
  ○ Lote A   (12 activos)
  ○ Lote B   (8 activos)   ← origen: deshabilitado
── Otras fincas ─────────────────── [▼ ver]
  (sección colapsada por defecto)

Precio de traspaso
  ₡ [______] / kg
  Total estimado: ₡ X  (N animales · Y kg totales)

[Cancelar]        [Mover animales]
```

### Comportamiento

- El lote origen aparece en la lista pero deshabilitado y marcado como "lote actual"
- El botón "Mover animales" se habilita solo cuando hay lote destino seleccionado y `precioKg > 0`
- Durante el guardado: spinner + texto "Moviendo animales..." con botones deshabilitados
- Al terminar exitosamente: modal se cierra, `onSuccess()` limpia la selección

---

## Flujo en LoteDetalle

### Activación del modo selección

- Header de la tab Animales agrega botón **"Seleccionar"**
- Al hacer clic: cada animal card muestra un checkbox
- Los animales `vendido` o `muerto` no muestran checkbox (solo activos son movibles)

### Barra multi-select (fija abajo)

Visible cuando hay ≥ 1 animal seleccionado:

```
  3 animales seleccionados    [Mover]   [Cancelar]
```

- "Mover" abre `MoverAnimalesModal` con los animales seleccionados
- "Cancelar" limpia la selección y desactiva el modo selección

### Acción individual

- Cada animal card (en modo normal, sin selección activa) muestra un botón "Mover" junto a editar/eliminar
- Al tocarlo abre `MoverAnimalesModal` con ese animal individual

---

## Validaciones

| Condición | Manejo |
|---|---|
| `precioKg` ≤ 0 | Input con `min=1`; botón deshabilitado |
| Lote destino = lote origen | Opción deshabilitada en la lista |
| Sin lote destino seleccionado | Botón "Mover" deshabilitado |
| Animal vendido/muerto | No aparece en multi-select ni tiene botón "Mover" |
| Mover a lote "a medias" | El animal entra con `precioTraspaso`; la utilidad del socio se calcula normalmente sobre futuras ventas |

---

## Índices Firestore

No se requieren índices nuevos. La consulta de pesos en Fase 2 usa `where('userId', '==', uid) + where('animalId', 'in', chunk)`, que Firestore soporta sin índice compuesto.

---

## Testing

### Tests unitarios (lógica del hook)

- Mover 1 animal mismo lote → error / botón deshabilitado (no llega al hook)
- Mover 1 animal entre lotes de la misma finca → contadores correctos, pesos.loteId actualizado, pesos.fincaId sin cambio
- Mover 1 animal entre fincas distintas → contadores correctos, pesos.loteId y pesos.fincaId actualizados, `importado: true`
- Mover 3 animales → Σ de precioTraspaso correcto en ambos lotes
- Precio de traspaso = `round(precioKg × pesoActual)` por animal

### Tests Playwright (E2E)

- Abrir tab Animales → botón "Seleccionar" visible
- Seleccionar 2 animales → barra multi-select aparece con conteo correcto
- Abrir MoverAnimalesModal desde multi-select → lista de lotes visible, origen deshabilitado
- Completar movimiento → modal se cierra, animales desaparecen del lote origen
- Verificar en lote destino → animales aparecen con nuevo precioCompra
- Botón "Mover" individual en card → abre modal con ese animal

---

## Criterios de éxito

1. Un animal movido entre lotes de la misma finca aparece en el lote destino con su historial de pesajes completo
2. Un animal movido entre fincas distintas aparece en el lote destino; sus pesos tienen `importado: true`
3. Los contadores de ambos lotes (animalesActivos, totalInvertido) reflejan correctamente el movimiento
4. El flujo multi-select funciona en mobile (bottom bar, checkboxes en cards)
5. Si Fase 2 falla, el usuario ve un mensaje de error claro y puede reintentar
