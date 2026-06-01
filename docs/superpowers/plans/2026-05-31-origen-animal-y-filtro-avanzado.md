# Origen del animal y filtro avanzado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Soportar animales que no son compra de subasta (nacidos en finca / sin registro), con precio opcional re-etiquetado como "valor estimado", y agregar un filtro avanzado (estado, raza, origen, peso, ganancia) en la pestaña Animales del lote.

**Architecture:** Un nuevo campo `origen` en `Animal` (retrocompat: ausente = `'comprado'`). El valor sigue viviendo en `precioCompra` (ahora opcional/0), así toda la lógica de inversión/utilidad/venta/muerte queda intacta. El filtro es client-side sobre la lista ya cargada, extraído a una función pura `filtrarAnimales` + un componente `AnimalesFilterBar` para no engordar `LoteDetalle`.

**Tech Stack:** React 18 + TS + Vite, Firebase Firestore (Client SDK), shadcn/ui, Playwright (QA), tsx (scripts/tests puntuales).

**Branch:** trabajar en rama `feature/origen-animal-filtro` (crear desde `main`); merge a `main` al final tras verificación (deploy único en Vercel).

**Testing:** `filtrarAnimales` (pura) se testea con un script `tsx` ejecutable. El resto (UI/hooks Firestore) con `npx tsc --noEmit`, `npm run lint`, build y verificación manual en browser. Comandos desde `C:\Users\Usuario\Desktop\Sistemas\ganacr`. En PowerShell usar `Push-Location "C:\Users\Usuario\Desktop\Sistemas\ganacr"; <cmd>; Pop-Location`.

---

## Task 1: Campo `origen` en el tipo Animal

**Files:**
- Modify: `src/types/index.ts` (interface Animal)

- [ ] **Step 1: Agregar el campo**

En `src/types/index.ts`, dentro de `interface Animal`, después de la línea `numeroSubasta?: string;` (o junto a los campos de identidad; si no existe esa línea, agregarlo después de `raza: string;`), agregar:

```ts
  origen?: 'comprado' | 'nacido_finca' | 'sin_registro'; // ausente = 'comprado' (retrocompat)
```

- [ ] **Step 2: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add origen field to Animal"
```

---

## Task 2: Función pura `filtrarAnimales` (TDD)

**Files:**
- Create: `src/utils/filtrarAnimales.ts`
- Test: `scripts/test-filtrar-animales.ts`

- [ ] **Step 1: Escribir el test (que falla porque el módulo no existe)**

Crear `scripts/test-filtrar-animales.ts`:

```ts
/* Test ejecutable de filtrarAnimales. Uso: npx tsx scripts/test-filtrar-animales.ts */
import { filtrarAnimales, contarFiltrosActivos, FILTRO_VACIO, FiltroAnimales } from '../src/utils/filtrarAnimales';

type A = Parameters<typeof filtrarAnimales>[0][number];

function animal(p: Partial<A>): A {
  return {
    id: p.id ?? 'x', userId: 'u', fincaId: 'f', loteId: 'l',
    numeroArete: p.numeroArete ?? 'A1', raza: p.raza ?? 'Nelore',
    pesoInicial: p.pesoInicial ?? 300, pesoActual: p.pesoActual ?? 400,
    precioCompra: p.precioCompra ?? 0, estado: p.estado ?? 'activo',
    fechaIngreso: '2026-01-01', createdAt: '2026-01-01', updatedAt: '2026-01-01',
    origen: p.origen,
  } as A;
}

let fails = 0;
function eq(name: string, got: unknown, exp: unknown) {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g !== e) { console.error(`FAIL ${name}: got ${g}, exp ${e}`); fails++; }
  else { console.log(`ok ${name}`); }
}

const data: A[] = [
  animal({ id: '1', estado: 'activo', raza: 'Nelore', origen: 'comprado', pesoInicial: 300, pesoActual: 450 }),
  animal({ id: '2', estado: 'vendido', raza: 'Brahman', origen: 'nacido_finca', pesoInicial: 300, pesoActual: 320 }),
  animal({ id: '3', estado: 'muerto', raza: 'Nelore', origen: undefined, pesoInicial: 200, pesoActual: 260 }),
];

// vacío = todos
eq('vacio', filtrarAnimales(data, FILTRO_VACIO).map(a => a.id), ['1', '2', '3']);
// estado
eq('estado', filtrarAnimales(data, { ...FILTRO_VACIO, estados: ['activo', 'muerto'] }).map(a => a.id), ['1', '3']);
// raza
eq('raza', filtrarAnimales(data, { ...FILTRO_VACIO, raza: 'Nelore' }).map(a => a.id), ['1', '3']);
// origen (undefined cuenta como comprado)
eq('origen-comprado', filtrarAnimales(data, { ...FILTRO_VACIO, origen: 'comprado' }).map(a => a.id), ['1', '3']);
eq('origen-nacido', filtrarAnimales(data, { ...FILTRO_VACIO, origen: 'nacido_finca' }).map(a => a.id), ['2']);
// peso actual
eq('peso', filtrarAnimales(data, { ...FILTRO_VACIO, pesoMin: 400 }).map(a => a.id), ['1']);
// ganancia = pesoActual - pesoInicial: 1->150, 2->20, 3->60
eq('ganancia', filtrarAnimales(data, { ...FILTRO_VACIO, gananciaMin: 50, gananciaMax: 100 }).map(a => a.id), ['3']);
// combinado AND
eq('combo', filtrarAnimales(data, { ...FILTRO_VACIO, estados: ['activo'], raza: 'Nelore', pesoMin: 400 }).map(a => a.id), ['1']);
// contador
eq('contar-0', contarFiltrosActivos(FILTRO_VACIO), 0);
eq('contar-3', contarFiltrosActivos({ ...FILTRO_VACIO, estados: ['activo'], raza: 'Nelore', pesoMin: 400 }), 3);

if (fails > 0) { console.error(`\n${fails} test(s) FAILED`); process.exit(1); }
console.log('\nTODOS OK'); process.exit(0);
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx tsx scripts/test-filtrar-animales.ts`
Expected: FALLA (no se puede resolver `../src/utils/filtrarAnimales` — el módulo no existe).

- [ ] **Step 3: Implementar la función**

Crear `src/utils/filtrarAnimales.ts`:

```ts
import type { Animal } from '@/types';

export type EstadoAnimal = 'activo' | 'vendido' | 'muerto';
export type OrigenAnimal = 'comprado' | 'nacido_finca' | 'sin_registro';

export interface FiltroAnimales {
  estados: EstadoAnimal[];          // [] = todos
  raza: string;                     // '' = todas
  origen: '' | OrigenAnimal;        // '' = todos
  pesoMin: number | null;
  pesoMax: number | null;
  gananciaMin: number | null;
  gananciaMax: number | null;
}

export const FILTRO_VACIO: FiltroAnimales = {
  estados: [],
  raza: '',
  origen: '',
  pesoMin: null,
  pesoMax: null,
  gananciaMin: null,
  gananciaMax: null,
};

export function filtrarAnimales(animales: Animal[], f: FiltroAnimales): Animal[] {
  return animales.filter((a) => {
    if (f.estados.length > 0 && !f.estados.includes(a.estado)) return false;
    if (f.raza && a.raza !== f.raza) return false;
    if (f.origen && (a.origen ?? 'comprado') !== f.origen) return false;
    if (f.pesoMin != null && a.pesoActual < f.pesoMin) return false;
    if (f.pesoMax != null && a.pesoActual > f.pesoMax) return false;
    const ganancia = a.pesoActual - a.pesoInicial;
    if (f.gananciaMin != null && ganancia < f.gananciaMin) return false;
    if (f.gananciaMax != null && ganancia > f.gananciaMax) return false;
    return true;
  });
}

export function contarFiltrosActivos(f: FiltroAnimales): number {
  let n = 0;
  if (f.estados.length > 0) n++;
  if (f.raza) n++;
  if (f.origen) n++;
  if (f.pesoMin != null || f.pesoMax != null) n++;
  if (f.gananciaMin != null || f.gananciaMax != null) n++;
  return n;
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx tsx scripts/test-filtrar-animales.ts`
Expected: imprime "ok ..." por cada caso y "TODOS OK", exit 0.

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 6: Commit**

```bash
git add src/utils/filtrarAnimales.ts scripts/test-filtrar-animales.ts
git commit -m "feat(utils): add pure filtrarAnimales with tsx test"
```

---

## Task 3: Hooks aceptan `origen` y precio opcional

**Files:**
- Modify: `src/hooks/useAnimales.ts` (`AgregarAnimalInput`, `agregarAnimal`, `EditarAnimalInput`, `editarAnimal`)

- [ ] **Step 1: Agregar `origen` a `AgregarAnimalInput` y escribirlo en el doc**

En `src/hooks/useAnimales.ts`, en la interface `AgregarAnimalInput`, agregar el campo `origen` (después de `numeroSubasta?: string;`):

```ts
  origen?: 'comprado' | 'nacido_finca' | 'sin_registro';
```

Y en `agregarAnimal`, dentro del objeto que se pasa a `addDoc(collection(db, 'animales'), { ... })`, agregar la línea (junto a `numeroSubasta`):

```ts
      origen: input.origen ?? 'comprado',
```

(El `precioCompra` ya se escribe con `input.precioCompra`; el modal ahora puede pasar `0`. El `increment(input.precioCompra)` con 0 es un no-op correcto.)

- [ ] **Step 2: Agregar `origen` a `EditarAnimalInput` y aplicarlo en `editarAnimal`**

En la interface `EditarAnimalInput`, agregar:

```ts
  origen?: 'comprado' | 'nacido_finca' | 'sin_registro';
```

En `editarAnimal`, en el `batch.update(doc(db, 'animales', animalId), { ...data, pesoActual: data.pesoInicial, updatedAt: now })`, el spread `...data` ya incluye `origen` y `numeroSubasta` si vienen en `data`. No requiere cambio adicional salvo confirmar que `data` se tipa con `EditarAnimalInput` (ya lo hace).

- [ ] **Step 3: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useAnimales.ts
git commit -m "feat(hooks): accept origen and optional price in animal create/edit"
```

---

## Task 4: `AgregarAnimalModal` — origen, label dinámico, valor opcional

**Files:**
- Modify: `src/components/AgregarAnimalModal.tsx`

- [ ] **Step 1: Estado de `origen`**

En `src/components/AgregarAnimalModal.tsx`, después de la línea `const [raza, setRaza] = useState(editData?.raza ?? '');`, agregar:

```tsx
  const [origen, setOrigen] = useState<'comprado' | 'nacido_finca' | 'sin_registro'>(
    editData?.origen ?? 'comprado'
  );
```

- [ ] **Step 2: Quitar el `required` del precio en la validación de submit**

En `handleSubmit`, reemplazar la línea de validación:

```tsx
    if (!numeroArete.trim() || !raza.trim() || !pesoInicial || !precioCompra) {
      setError('Todos los campos marcados son requeridos');
      return;
    }
```

por (el precio ya NO es obligatorio):

```tsx
    if (!numeroArete.trim() || !raza.trim() || !pesoInicial) {
      setError('Arete, raza y peso inicial son requeridos');
      return;
    }
```

- [ ] **Step 3: Pasar `origen` y precio (0 si vacío) a los hooks**

En `handleSubmit`, en la llamada a `editarAnimal(...)`, agregar `origen` y manejar precio vacío. Reemplazar el objeto de datos del `editarAnimal`:

```tsx
        await editarAnimal(editData.id, loteId, editData.precioCompra, {
          raza: raza.trim(),
          numeroSubasta: origen === 'comprado' ? numeroSubasta.trim() : '',
          pesoInicial: Number(pesoInicial),
          precioCompra: precioCompra ? Number(precioCompra) : 0,
          fechaIngreso,
          notas: notas.trim(),
          origen,
        });
```

Y en la llamada a `agregarAnimal(...)`:

```tsx
        await agregarAnimal({
          fincaId,
          loteId,
          numeroArete: numeroArete.trim().toUpperCase(),
          raza: raza.trim(),
          numeroSubasta: origen === 'comprado' ? numeroSubasta.trim() : '',
          pesoInicial: Number(pesoInicial),
          precioCompra: precioCompra ? Number(precioCompra) : 0,
          fechaIngreso,
          notas,
          origen,
        });
```

- [ ] **Step 4: Selector de Origen en el formulario**

En el JSX, después del bloque del `<select>` de Raza (el `</div>` que cierra el grupo "Raza *"), insertar un nuevo bloque:

```tsx
          <div className="space-y-1.5">
            <Label>Origen *</Label>
            <select
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
              value={origen}
              onChange={(e) => setOrigen(e.target.value as 'comprado' | 'nacido_finca' | 'sin_registro')}
            >
              <option value="comprado">Comprado (subasta u otra compra)</option>
              <option value="nacido_finca">Nacido en la finca</option>
              <option value="sin_registro">Sin registro de compra</option>
            </select>
          </div>
```

- [ ] **Step 5: Label dinámico del valor + quitar required; N° subasta condicional**

En el grupo de "Peso inicial / Precio de compra", reemplazar la `<Label>Precio de compra (₡) *</Label>` y su input por una versión con label dinámico y sin `required`:

```tsx
            <div className="space-y-1.5">
              <Label>{origen === 'comprado' ? 'Precio de compra (₡)' : 'Valor estimado (₡)'}</Label>
              <Input type="number" min="0" step="any" placeholder={origen === 'comprado' ? 'Ej: 450000' : 'Opcional'} value={precioCompra} onChange={(e) => setPrecioCompra(e.target.value)} />
            </div>
```

Y el campo "N° subasta" (el bloque con `<Label>N° subasta</Label>`) envolverlo para que solo se muestre cuando `origen === 'comprado'`. Reemplazar ese bloque por:

```tsx
            {origen === 'comprado' && (
              <div className="space-y-1.5">
                <Label>N° subasta</Label>
                <Input placeholder="Ej: 45" value={numeroSubasta} onChange={(e) => setNumeroSubasta(e.target.value)} />
              </div>
            )}
```

(Nota: ese bloque está dentro de un `grid grid-cols-2`. Al ocultarse, el arete queda solo en la fila — es aceptable visualmente.)

- [ ] **Step 6: Verificar compilación y lint**

Run: `npx tsc --noEmit` → sin salida.
Run: `npm run lint` → sin errores (exit 0).

- [ ] **Step 7: Commit**

```bash
git add src/components/AgregarAnimalModal.tsx
git commit -m "feat(ui): animal origin selector with optional value (precio/valor estimado)"
```

---

## Task 5: Componente `AnimalesFilterBar`

**Files:**
- Create: `src/components/AnimalesFilterBar.tsx`

- [ ] **Step 1: Crear el componente**

Crear `src/components/AnimalesFilterBar.tsx`:

```tsx
import { useState } from 'react';
import { FiltroAnimales, FILTRO_VACIO, EstadoAnimal, OrigenAnimal, contarFiltrosActivos } from '@/utils/filtrarAnimales';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SlidersHorizontal } from 'lucide-react';

interface Props {
  filtro: FiltroAnimales;
  onChange: (f: FiltroAnimales) => void;
  razasDisponibles: string[];
}

const ESTADOS: EstadoAnimal[] = ['activo', 'vendido', 'muerto'];
const ORIGENES: { value: OrigenAnimal; label: string }[] = [
  { value: 'comprado', label: 'Comprado' },
  { value: 'nacido_finca', label: 'Nacido en finca' },
  { value: 'sin_registro', label: 'Sin registro' },
];

function numOrNull(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function AnimalesFilterBar({ filtro, onChange, razasDisponibles }: Props) {
  const [open, setOpen] = useState(false);
  const activos = contarFiltrosActivos(filtro);

  function toggleEstado(e: EstadoAnimal) {
    const has = filtro.estados.includes(e);
    onChange({ ...filtro, estados: has ? filtro.estados.filter((x) => x !== e) : [...filtro.estados, e] });
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        <SlidersHorizontal size={14} className="mr-1" />
        Filtros
        {activos > 0 && <Badge variant="secondary" className="ml-2 text-xs">{activos}</Badge>}
      </Button>

      {open && (
        <div className="rounded-lg border border-border bg-card p-3 space-y-3">
          {/* Estado */}
          <div className="space-y-1.5">
            <Label className="text-xs">Estado</Label>
            <div className="flex flex-wrap gap-1.5">
              {ESTADOS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => toggleEstado(e)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    filtro.estados.includes(e)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Raza */}
            <div className="space-y-1.5">
              <Label className="text-xs">Raza</Label>
              <select
                className="w-full border border-border rounded-md px-2 py-1.5 text-sm bg-background"
                value={filtro.raza}
                onChange={(e) => onChange({ ...filtro, raza: e.target.value })}
              >
                <option value="">Todas</option>
                {razasDisponibles.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {/* Origen */}
            <div className="space-y-1.5">
              <Label className="text-xs">Origen</Label>
              <select
                className="w-full border border-border rounded-md px-2 py-1.5 text-sm bg-background"
                value={filtro.origen}
                onChange={(e) => onChange({ ...filtro, origen: e.target.value as FiltroAnimales['origen'] })}
              >
                <option value="">Todos</option>
                {ORIGENES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Rango peso */}
          <div className="space-y-1.5">
            <Label className="text-xs">Peso actual (kg)</Label>
            <div className="flex items-center gap-2">
              <Input type="number" placeholder="Mín" value={filtro.pesoMin ?? ''} onChange={(e) => onChange({ ...filtro, pesoMin: numOrNull(e.target.value) })} />
              <span className="text-muted-foreground text-sm">—</span>
              <Input type="number" placeholder="Máx" value={filtro.pesoMax ?? ''} onChange={(e) => onChange({ ...filtro, pesoMax: numOrNull(e.target.value) })} />
            </div>
          </div>

          {/* Rango ganancia */}
          <div className="space-y-1.5">
            <Label className="text-xs">Ganancia (kg)</Label>
            <div className="flex items-center gap-2">
              <Input type="number" placeholder="Mín" value={filtro.gananciaMin ?? ''} onChange={(e) => onChange({ ...filtro, gananciaMin: numOrNull(e.target.value) })} />
              <span className="text-muted-foreground text-sm">—</span>
              <Input type="number" placeholder="Máx" value={filtro.gananciaMax ?? ''} onChange={(e) => onChange({ ...filtro, gananciaMax: numOrNull(e.target.value) })} />
            </div>
          </div>

          {activos > 0 && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => onChange(FILTRO_VACIO)}>
              Limpiar filtros
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 3: Commit**

```bash
git add src/components/AnimalesFilterBar.tsx
git commit -m "feat(ui): add AnimalesFilterBar component"
```

---

## Task 6: Integrar filtro + badge de origen en `LoteDetalle`

**Files:**
- Modify: `src/pages/LoteDetalle.tsx`

PRIMERO leé `src/pages/LoteDetalle.tsx` para ubicar los puntos exactos (referencias aproximadas).

- [ ] **Step 1: Imports**

Agregar imports cerca de los otros de `@/components` y `@/utils`:

```tsx
import AnimalesFilterBar from '@/components/AnimalesFilterBar';
import { filtrarAnimales, FiltroAnimales, FILTRO_VACIO } from '@/utils/filtrarAnimales';
```

- [ ] **Step 2: Estado del filtro**

Junto al `const [filterText, setFilterText] = useState('');`, agregar:

```tsx
  const [filtro, setFiltro] = useState<FiltroAnimales>(FILTRO_VACIO);
```

- [ ] **Step 3: Aplicar el filtro a la lista**

Localizar la línea que calcula `animalesFiltrados` (actualmente filtra solo por arete):

```tsx
  const animalesFiltrados = animales.filter((a) =>
    a.numeroArete.toLowerCase().includes(filterText.toLowerCase())
  );
```

Reemplazarla por (encadena filtro avanzado + búsqueda por arete) y calcular las razas disponibles:

```tsx
  const animalesFiltrados = filtrarAnimales(animales, filtro).filter((a) =>
    a.numeroArete.toLowerCase().includes(filterText.toLowerCase())
  );
  const razasDisponibles = Array.from(new Set(animales.map((a) => a.raza))).sort();
```

- [ ] **Step 4: Resetear el filtro al cambiar de tab**

En el `onValueChange` del `<Tabs>` (que hoy hace `setTab(...); setFilterText(''); cancelarModo();`), agregar el reset del filtro:

```tsx
        <Tabs value={tab} onValueChange={(v) => { setTab(v as Tab); setFilterText(''); setFiltro(FILTRO_VACIO); cancelarModo(); }}>
```

- [ ] **Step 5: Renderizar el FilterBar + contador junto al buscador de arete**

Localizar el bloque del buscador (el `<div className="flex items-center gap-2">` que contiene el botón "Seleccionar" y el `<Input type="search" ... placeholder="Buscar por arete…">`). Inmediatamente DESPUÉS de ese `<div>` de cierre, insertar:

```tsx
                <AnimalesFilterBar filtro={filtro} onChange={setFiltro} razasDisponibles={razasDisponibles} />
                {animalesFiltrados.length !== animales.length && (
                  <p className="text-xs text-muted-foreground">
                    Mostrando {animalesFiltrados.length} de {animales.length}
                  </p>
                )}
```

- [ ] **Step 6: Badge de origen en la tabla desktop**

En la celda de "Raza" de la tabla desktop (la `<td>` que muestra `{animal.raza}`), reemplazarla para incluir un badge sutil cuando el origen no sea comprado:

```tsx
                                <td className="px-3 py-2">
                                  {animal.raza}
                                  {animal.origen && animal.origen !== 'comprado' && (
                                    <span className="ml-1.5 text-[10px] text-muted-foreground">
                                      ({animal.origen === 'nacido_finca' ? 'nacido' : 'sin reg.'})
                                    </span>
                                  )}
                                </td>
```

- [ ] **Step 7: Badge de origen en las cards mobile**

En las cards mobile, en la fila que muestra la raza (`<span className="text-muted-foreground">Raza</span><span><strong>{animal.raza}</strong></span>`), reemplazar el segundo span por:

```tsx
                                <span>
                                  <strong>{animal.raza}</strong>
                                  {animal.origen && animal.origen !== 'comprado' && (
                                    <span className="ml-1 text-[10px] text-muted-foreground">
                                      ({animal.origen === 'nacido_finca' ? 'nacido' : 'sin reg.'})
                                    </span>
                                  )}
                                </span>
```

- [ ] **Step 8: Verificar compilación y lint**

Run: `npx tsc --noEmit` → sin salida.
Run: `npm run lint` → exit 0.

- [ ] **Step 9: Commit**

```bash
git add src/pages/LoteDetalle.tsx
git commit -m "feat(ui): wire advanced animal filter and origin badges into LoteDetalle"
```

---

## Task 7: Verificación final, build, merge y deploy

**Files:** (ninguno nuevo)

- [ ] **Step 1: Build de producción**

Run: `npm run build`
Expected: `✓ built` sin errores de TypeScript.

- [ ] **Step 2: Verificación manual en browser (dev o producción tras deploy)**

Verificar:
- Agregar un animal con origen "Nacido en finca": el campo de valor se etiqueta "Valor estimado (₡)", se puede dejar vacío, "N° subasta" no aparece, y el animal se crea (inversión del lote no cambia si valor vacío).
- Agregar uno "Comprado" con precio: funciona como antes; "N° subasta" visible.
- En la lista, los animales no-comprado muestran el badge "(nacido)" / "(sin reg.)".
- Filtros: abrir "Filtros", probar estado/raza/origen/peso/ganancia combinados; el contador "Mostrando X de Y" aparece; "Limpiar filtros" resetea.

- [ ] **Step 3: Merge a main y deploy**

```bash
git checkout main
git merge --no-ff feature/origen-animal-filtro -m "Merge feature/origen-animal-filtro: origen del animal y filtro avanzado"
git push origin main
```

Expected: Vercel despliega automáticamente desde `main`.

- [ ] **Step 4: Actualizar CLAUDE.md**

En `CLAUDE.md`, en Fase 2B, marcar "Filtro avanzado de animales" como `[x]` con una línea breve (componentes `AnimalesFilterBar`, `filtrarAnimales`), y registrar el campo `origen` del animal. En "Pendiente inmediato" quitar el filtro avanzado. Commit:

```bash
git add CLAUDE.md
git commit -m "docs: registrar origen del animal y filtro avanzado como completos"
git push origin main
```

---

## Resumen de archivos

| Archivo | Acción |
|---------|--------|
| `src/types/index.ts` | +campo `origen` en Animal |
| `src/utils/filtrarAnimales.ts` | nuevo (función pura) |
| `scripts/test-filtrar-animales.ts` | nuevo (test tsx) |
| `src/hooks/useAnimales.ts` | `origen` + precio opcional en create/edit |
| `src/components/AgregarAnimalModal.tsx` | selector origen, label dinámico, valor opcional |
| `src/components/AnimalesFilterBar.tsx` | nuevo (UI del filtro) |
| `src/pages/LoteDetalle.tsx` | aplicar filtro, badge origen, contador |
| `CLAUDE.md` | documentar features completas |

## Fuera de alcance (YAGNI)

- Migración de datos (origen ausente = comprado).
- Campo `valorEstimado` separado (se reutiliza `precioCompra`).
- Persistir filtro entre sesiones.
- Filtro/origen en Dashboard o exports.
