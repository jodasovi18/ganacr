# Areteo SENASA, alertas e indicador offline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar el arete oficial SENASA (DIIO) por animal, alertar de animales activos sin arete (Dashboard + lote + filtro), y mostrar un indicador de "sin conexión" reutilizando la persistencia offline que ya existe.

**Architecture:** Campo nuevo `Animal.areteSenasa` (opcional, sin validación). Las alertas se calculan sin contadores: en LoteDetalle client-side sobre los animales cargados, y en el Dashboard con un hook `useAnimalesSinArete(fincaId)` que escucha (onSnapshot) los animales activos de la finca y deriva total + por-lote. El indicador offline es un hook `useOnlineStatus` + un componente montado en el root.

**Tech Stack:** React 18 + TS + Vite, Firebase Firestore (Client SDK), shadcn/ui, tsx (test de función pura).

**Branch:** trabajar en rama `feature/areteo-senasa` (crear desde `main`); merge a `main` al final tras verificación (deploy único en Vercel).

**Testing:** la función pura `filtrarAnimales` con `npm run test:filtro` (tsx). El resto con `npx tsc --noEmit`, `npm run lint`, build y verificación manual en browser. Comandos desde `C:\Users\Usuario\Desktop\Sistemas\ganacr` (en PowerShell: `Push-Location "C:\Users\Usuario\Desktop\Sistemas\ganacr"; <cmd>; Pop-Location`).

---

## Task 1: Campo `areteSenasa` en el tipo Animal

**Files:** Modify `src/types/index.ts`

- [ ] **Step 1:** En `interface Animal`, después de la línea `origen?: 'comprado' | 'nacido_finca' | 'sin_registro'; ...`, agregar:

```ts
  areteSenasa?: string;       // número DIIO oficial SENASA (opcional). Vacío = sin arete registrado
```

- [ ] **Step 2:** Run `npx tsc --noEmit` → sin salida.
- [ ] **Step 3:** Commit:
```bash
git add src/types/index.ts
git commit -m "feat(types): add areteSenasa (official SENASA tag) to Animal"
```

---

## Task 2: Hooks aceptan `areteSenasa`

**Files:** Modify `src/hooks/useAnimales.ts`

- [ ] **Step 1:** En `interface AgregarAnimalInput`, después de `origen?: ...;`, agregar:
```ts
  areteSenasa?: string;
```

- [ ] **Step 2:** En `agregarAnimal`, dentro del objeto pasado a `addDoc(collection(db, 'animales'), { ... })`, junto a `origen: input.origen ?? 'comprado',` agregar:
```ts
      areteSenasa: input.areteSenasa ?? '',
```

- [ ] **Step 3:** En `interface EditarAnimalInput`, después de `origen?: ...;`, agregar:
```ts
  areteSenasa?: string;
```
(En `editarAnimal` el `...data` ya propaga `areteSenasa`. Sin cambio adicional.)

- [ ] **Step 4:** Run `npx tsc --noEmit` → sin salida.
- [ ] **Step 5:** Commit:
```bash
git add src/hooks/useAnimales.ts
git commit -m "feat(hooks): accept areteSenasa in animal create/edit"
```

---

## Task 3: Campo de arete SENASA en `AgregarAnimalModal`

**Files:** Modify `src/components/AgregarAnimalModal.tsx`

PRIMERO leé el archivo para ubicar los puntos exactos.

- [ ] **Step 1:** Estado — después de `const [origen, setOrigen] = useState<...>(editData?.origen ?? 'comprado');` agregar:
```tsx
  const [areteSenasa, setAreteSenasa] = useState(editData?.areteSenasa ?? '');
```

- [ ] **Step 2:** Pasar a los hooks — en `handleSubmit`, en el objeto de `editarAnimal({...})` y en el de `agregarAnimal({...})`, agregar (junto a `origen,`):
```tsx
          areteSenasa: areteSenasa.trim(),
```

- [ ] **Step 3:** Campo en el formulario — localizar el primer `<div className="grid grid-cols-2 gap-3">` (el que contiene "Número de arete *" y el bloque condicional de "N° subasta"). Inmediatamente DESPUÉS del `</div>` que cierra ese grid, insertar:
```tsx
          <div className="space-y-1.5">
            <Label>Arete oficial SENASA (DIIO)</Label>
            <Input
              placeholder="Número oficial del dispositivo"
              value={areteSenasa}
              onChange={(e) => setAreteSenasa(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Opcional. Podés completarlo después.</p>
          </div>
```

- [ ] **Step 4:** Run `npx tsc --noEmit` → sin salida. Run `npm run lint` → exit 0.
- [ ] **Step 5:** Commit:
```bash
git add src/components/AgregarAnimalModal.tsx
git commit -m "feat(ui): add official SENASA tag (DIIO) field to animal form"
```

---

## Task 4: Filtro "Sin arete SENASA" en `filtrarAnimales` (TDD)

**Files:** Modify `src/utils/filtrarAnimales.ts`, `scripts/test-filtrar-animales.ts`

- [ ] **Step 1: Actualizar el test PRIMERO.** En `scripts/test-filtrar-animales.ts`:

(a) En la función `animal(p)`, agregar al objeto devuelto la propiedad (junto a `origen: p.origen,`):
```ts
    areteSenasa: p.areteSenasa,
```

(b) En el array `data`, agregar `areteSenasa` a algunos animales — reemplazar las 3 líneas del array por:
```ts
  animal({ id: '1', estado: 'activo', raza: 'Nelore', origen: 'comprado', pesoInicial: 300, pesoActual: 450, areteSenasa: 'CR188-001' }),
  animal({ id: '2', estado: 'vendido', raza: 'Brahman', origen: 'nacido_finca', pesoInicial: 300, pesoActual: 320 }),
  animal({ id: '3', estado: 'muerto', raza: 'Nelore', origen: undefined, pesoInicial: 200, pesoActual: 260 }),
```

(c) Antes de la línea `if (fails > 0)`, agregar dos casos nuevos:
```ts
eq('sin-arete', filtrarAnimales(data, { ...FILTRO_VACIO, sinAreteSenasa: true }).map(a => a.id), ['2', '3']);
eq('contar-sin-arete', contarFiltrosActivos({ ...FILTRO_VACIO, sinAreteSenasa: true }), 1);
```

- [ ] **Step 2: Correr el test → debe FALLAR** (el campo `sinAreteSenasa` no existe en `FiltroAnimales`):
Run: `npm run test:filtro` → falla (tsx/tipo o aserción).

- [ ] **Step 3: Implementar.** En `src/utils/filtrarAnimales.ts`:

(a) En `interface FiltroAnimales`, después de `gananciaMax: number | null;`, agregar:
```ts
  sinAreteSenasa: boolean;          // true = solo animales sin areteSenasa
```

(b) En `FILTRO_VACIO`, después de `gananciaMax: null,`, agregar:
```ts
  sinAreteSenasa: false,
```

(c) En `filtrarAnimales`, antes de `return true;`, agregar:
```ts
    if (f.sinAreteSenasa && a.areteSenasa) return false;
```

(d) En `contarFiltrosActivos`, antes de `return n;`, agregar:
```ts
  if (f.sinAreteSenasa) n++;
```

- [ ] **Step 4: Correr el test → debe PASAR.** Run: `npm run test:filtro` → "TODOS OK", exit 0.
- [ ] **Step 5:** Run `npx tsc --noEmit` → sin salida.
- [ ] **Step 6:** Commit:
```bash
git add src/utils/filtrarAnimales.ts scripts/test-filtrar-animales.ts
git commit -m "feat(utils): add sinAreteSenasa filter (TDD)"
```

---

## Task 5: Toggle "Sin arete SENASA" en `AnimalesFilterBar`

**Files:** Modify `src/components/AnimalesFilterBar.tsx`

- [ ] **Step 1:** Localizar el bloque del rango de "Ganancia (kg)" (el último `<div className="space-y-1.5">` antes del botón "Limpiar filtros"). Inmediatamente DESPUÉS de ese `</div>`, insertar:
```tsx
          {/* Sin arete SENASA */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="accent-primary"
              checked={filtro.sinAreteSenasa}
              onChange={(e) => onChange({ ...filtro, sinAreteSenasa: e.target.checked })}
            />
            Solo sin arete SENASA
          </label>
```

- [ ] **Step 2:** Run `npx tsc --noEmit` → sin salida. Run `npm run lint` → exit 0.
- [ ] **Step 3:** Commit:
```bash
git add src/components/AnimalesFilterBar.tsx
git commit -m "feat(ui): add 'sin arete SENASA' toggle to filter bar"
```

---

## Task 6: Badge ⚠️ por animal y arete SENASA visible en `LoteDetalle`

**Files:** Modify `src/pages/LoteDetalle.tsx`

PRIMERO leé el archivo para ubicar los puntos exactos.

- [ ] **Step 1: Badge en la celda de Arete (tabla desktop).** Localizar la celda `<td className="px-3 py-2"><strong>{animal.numeroArete}</strong></td>`. Reemplazarla por:
```tsx
                                <td className="px-3 py-2">
                                  <strong>{animal.numeroArete}</strong>
                                  {animal.estado === 'activo' && !animal.areteSenasa && (
                                    <span className="ml-1.5 text-xs text-amber-600" title="Sin arete SENASA">⚠️</span>
                                  )}
                                  {animal.areteSenasa && (
                                    <span className="block text-[10px] text-muted-foreground">DIIO: {animal.areteSenasa}</span>
                                  )}
                                </td>
```

- [ ] **Step 2: Badge en las cards mobile.** Localizar `<span className="font-bold text-sm">{animal.numeroArete}</span>` (en las cards mobile). Reemplazarlo por:
```tsx
                                <span className="font-bold text-sm">
                                  {animal.numeroArete}
                                  {animal.estado === 'activo' && !animal.areteSenasa && (
                                    <span className="ml-1 text-xs text-amber-600" title="Sin arete SENASA">⚠️</span>
                                  )}
                                </span>
```

- [ ] **Step 3:** Run `npx tsc --noEmit` → sin salida. Run `npm run lint` → exit 0.
- [ ] **Step 4:** Commit:
```bash
git add src/pages/LoteDetalle.tsx
git commit -m "feat(ui): show SENASA tag and missing-tag warning per animal"
```

---

## Task 7: Hook `useAnimalesSinArete` (Dashboard)

**Files:** Create `src/hooks/useAnimalesSinArete.ts`

- [ ] **Step 1:** Crear `src/hooks/useAnimalesSinArete.ts`:
```ts
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Escucha en tiempo real los animales ACTIVOS de la finca y deriva cuántos no tienen
 * areteSenasa, en total y por lote. Query con 3 igualdades (sin orderBy) → no requiere
 * índice compuesto. El cache offline sirve estas lecturas localmente.
 */
export function useAnimalesSinArete(fincaId: string | null) {
  const { user } = useAuth();
  const [total, setTotal] = useState(0);
  const [porLote, setPorLote] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !fincaId) { setTotal(0); setPorLote({}); setLoading(false); return; }
    const q = query(
      collection(db, 'animales'),
      where('userId', '==', user.uid),
      where('fincaId', '==', fincaId),
      where('estado', '==', 'activo'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const map: Record<string, number> = {};
      let t = 0;
      snap.docs.forEach((d) => {
        const data = d.data();
        if (!data.areteSenasa) {
          t++;
          map[data.loteId] = (map[data.loteId] || 0) + 1;
        }
      });
      setTotal(t);
      setPorLote(map);
      setLoading(false);
    }, (err) => {
      console.error('[useAnimalesSinArete] onSnapshot error:', err);
      setLoading(false);
    });
    return unsub;
  }, [user, fincaId]);

  return { total, porLote, loading };
}
```

- [ ] **Step 2:** Run `npx tsc --noEmit` → sin salida.
- [ ] **Step 3:** Commit:
```bash
git add src/hooks/useAnimalesSinArete.ts
git commit -m "feat(hooks): add useAnimalesSinArete (realtime missing-tag counts per finca)"
```

---

## Task 8: Aviso de finca + badge por lote en `Dashboard`

**Files:** Modify `src/pages/Dashboard.tsx`

PRIMERO leé el archivo para ubicar los puntos exactos.

- [ ] **Step 1: Import del hook.** Junto a los otros imports de `@/hooks`, agregar:
```tsx
import { useAnimalesSinArete } from '@/hooks/useAnimalesSinArete';
```

- [ ] **Step 2: Usar el hook.** Junto a `const { lotes, loading } = useLotes(fincaActiva?.id ?? null);`, agregar:
```tsx
  const { total: sinAreteTotal, porLote: sinAretePorLote } = useAnimalesSinArete(fincaActiva?.id ?? null);
```

- [ ] **Step 3: Aviso de finca.** Localizar, dentro del `<TabsContent value="lotes">`, el punto justo antes de la grilla de cards de lote (el `<div className="grid gap-3 sm:grid-cols-2">` o el bloque de "No tenés lotes"). Inmediatamente ANTES de ese contenido (dentro del TabsContent, al inicio), insertar:
```tsx
            {sinAreteTotal > 0 && (
              <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                ⚠️ {sinAreteTotal} animal{sinAreteTotal !== 1 ? 'es' : ''} sin arete SENASA registrado.
              </div>
            )}
```

- [ ] **Step 4: Badge por lote en cada card.** Localizar, dentro del `lotes.map((lote) => ...)`, la línea que muestra los stats del lote (ej. `{lote.animalesActivos} animales · {formatColones(lote.totalInvertido)}`). Inmediatamente DESPUÉS del `</p>` que la contiene, insertar:
```tsx
                      {sinAretePorLote[lote.id] > 0 && (
                        <span className="inline-block mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                          ⚠️ {sinAretePorLote[lote.id]} sin arete
                        </span>
                      )}
```

- [ ] **Step 5:** Run `npx tsc --noEmit` → sin salida. Run `npm run lint` → exit 0.
- [ ] **Step 6:** Commit:
```bash
git add src/pages/Dashboard.tsx
git commit -m "feat(ui): finca-wide missing-SENASA-tag alert and per-lote badge"
```

---

## Task 9: Indicador offline (`useOnlineStatus` + `OfflineIndicator` + montaje)

**Files:** Create `src/hooks/useOnlineStatus.ts`, `src/components/OfflineIndicator.tsx`; Modify `src/App.tsx`

- [ ] **Step 1: Hook.** Crear `src/hooks/useOnlineStatus.ts`:
```ts
import { useState, useEffect } from 'react';

/** Devuelve true si el navegador reporta conexión. Reacciona a online/offline. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);
  return online;
}
```

- [ ] **Step 2: Componente.** Crear `src/components/OfflineIndicator.tsx`:
```tsx
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function OfflineIndicator() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs sm:text-sm text-amber-800 shadow-md">
      📡 Sin conexión — tus cambios se guardan y se sincronizarán al volver la señal.
    </div>
  );
}
```

- [ ] **Step 3: Montar en App.** En `src/App.tsx`, agregar el import junto a los otros:
```tsx
import OfflineIndicator from '@/components/OfflineIndicator';
```
Y dentro de `<BrowserRouter>`, inmediatamente después de `<Toaster position="top-right" richColors />`, agregar:
```tsx
        <OfflineIndicator />
```

- [ ] **Step 4:** Run `npx tsc --noEmit` → sin salida. Run `npm run lint` → exit 0.
- [ ] **Step 5:** Commit:
```bash
git add src/hooks/useOnlineStatus.ts src/components/OfflineIndicator.tsx src/App.tsx
git commit -m "feat(ui): offline indicator (useOnlineStatus + OfflineIndicator)"
```

---

## Task 10: Build, verificación, merge y deploy

**Files:** ninguno nuevo (excepto CLAUDE.md)

- [ ] **Step 1:** Run `npm run build` → `✓ built` sin errores.
- [ ] **Step 2: Verificación manual en browser (tras deploy o local):**
  - Agregar/editar un animal con "Arete oficial SENASA (DIIO)" → se guarda; el ⚠️ desaparece de ese animal.
  - En un lote con animales sin arete: aparece ⚠️ por animal y el filtro "Solo sin arete SENASA" los aísla.
  - En el Dashboard: aviso "⚠️ N animales sin arete SENASA" y badge en las cards de lote con pendientes.
  - Offline: en DevTools → Network → "Offline", recargar/usar la app → aparece el chip "Sin conexión"; al volver online desaparece.
- [ ] **Step 3: Merge y deploy:**
```bash
git checkout main
git merge --no-ff feature/areteo-senasa -m "Merge feature/areteo-senasa: areteo oficial, alertas e indicador offline"
git push origin main
```
- [ ] **Step 4: CLAUDE.md.** En `CLAUDE.md`, en la sección de Fase 3, registrar como completos: registro de arete oficial SENASA (`Animal.areteSenasa`), alertas de animales sin arete (Dashboard + lote + filtro) e indicador offline. Aclarar que la integración Trazar-Agro y las guías de movilización quedan pendientes. Commit y push:
```bash
git add CLAUDE.md
git commit -m "docs: registrar areteo SENASA, alertas e indicador offline como completos"
git push origin main
```

---

## Resumen de archivos

| Archivo | Acción |
|---------|--------|
| `src/types/index.ts` | +`areteSenasa` |
| `src/hooks/useAnimales.ts` | inputs aceptan `areteSenasa` |
| `src/components/AgregarAnimalModal.tsx` | campo arete SENASA |
| `src/utils/filtrarAnimales.ts` | +filtro `sinAreteSenasa` |
| `scripts/test-filtrar-animales.ts` | casos del filtro |
| `src/components/AnimalesFilterBar.tsx` | toggle sin arete |
| `src/pages/LoteDetalle.tsx` | badge ⚠️ + DIIO por animal |
| `src/hooks/useAnimalesSinArete.ts` | nuevo (conteo realtime) |
| `src/pages/Dashboard.tsx` | aviso de finca + badge por lote |
| `src/hooks/useOnlineStatus.ts` | nuevo |
| `src/components/OfflineIndicator.tsx` | nuevo |
| `src/App.tsx` | montar OfflineIndicator |
| `CLAUDE.md` | documentar |

## Fuera de alcance (YAGNI)
- Integración Trazar-Agro/SIRECO, guías de movilización PDF, validación formato 188, regla de 6 meses, contadores en el lote, distinguir paleta vs botón RFID.
