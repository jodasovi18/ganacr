# Registro de muerte de animal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir registrar la muerte de un animal (retirarlo del inventario como pérdida con valor actual estimado, aviso fiscal y reporte para renta), limpiar campos basura del demo y verificar el movimiento cross-finca existente.

**Architecture:** Enfoque A — los datos de la muerte viven en el documento del animal (`estado='muerto'`, `fechaSalida`, nuevos `causaMuerte`/`documentoVeterinario`/`valorPerdida`). Un hook actualiza el animal y los contadores del lote en un `writeBatch` atómico, restando la pérdida de `utilidadTotal`. El reporte para renta consulta los animales muertos y calcula el reparto socio en cliente.

**Tech Stack:** React 18 + TS + Vite, Firebase Firestore (Client SDK), shadcn/ui, xlsx, Playwright (QA), firebase-admin (scripts).

**Nota sobre testing:** el proyecto NO tiene unit tests (vitest/jest); usa **Playwright** E2E en `tests/qa/`. Los hooks de Firestore no son unit-testeables sin un runner nuevo (fuera de alcance). Por tanto cada tarea de código usa como gate automático `npx tsc --noEmit` + `npm run lint`, más un **spec Playwright** para el flujo de muerte y verificación manual en browser al final. Todos los comandos corren desde `C:\Users\Usuario\Desktop\Sistemas\ganacr`.

---

## Task 1: Verificar movimiento cross-finca (ya implementado)

`useMoverAnimales` y `MoverAnimalesModal` ya soportan cross-finca. Esta tarea es **verificación**, no construcción.

**Files:**
- Verify (no edit unless bug): `src/hooks/useMoverAnimales.ts`, `src/components/MoverAnimalesModal.tsx`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Verificación manual en el browser (demo)**

Abrir https://ganacr.vercel.app (demo), entrar a un lote con animales activos, ⋮ de un animal → "Mover a otro lote" → expandir "Otras fincas" → elegir un lote de otra finca → ingresar precio/kg → Mover.
Expected: el animal desaparece del lote origen; al cambiar a la otra finca y entrar al lote destino, el animal aparece con el nuevo `precioCompra` (precio/kg × peso) y su historial de pesos visible. Contadores de ambos lotes correctos (activos −1 / +1).

- [ ] **Step 2: Si hay bug, detenerse y crear tarea de fix**

Si el animal no migra, los pesos no aparecen, o los contadores quedan mal: documentar el síntoma y crear una tarea de corrección antes de continuar. Si todo funciona, seguir.

- [ ] **Step 3: Actualizar CLAUDE.md**

En `CLAUDE.md`, en la sección "Fase 2A", reemplazar la línea de pendiente cross-finca:

```markdown
- **Mover animales entre fincas distintas (cross-finca)**: COMPLETO — `useMoverAnimales`
  maneja `isCrossFinca` (migra fincaId de animales y pesos, marca `importado: true`);
  `MoverAnimalesModal` lo expone en la sección "Otras fincas". Verificado 30 mayo 2026.
```

Y en "## Pendiente inmediato" eliminar la línea "Mover animales entre fincas distintas".

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: marcar movimiento cross-finca como completo (verificado)"
```

---

## Task 2: Script de limpieza de campos basura del demo

**Files:**
- Create: `scripts/clean-demo-fields.ts`
- Modify: `package.json` (script `clean-demo`)

- [ ] **Step 1: Crear el script**

Crear `scripts/clean-demo-fields.ts`:

```ts
/**
 * clean-demo-fields.ts — elimina los campos espurios `id` y `_testData` de todos
 * los documentos del usuario demo. Idempotente. Uso: npm run clean-demo
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const serviceAccount = JSON.parse(
  readFileSync(resolve(process.cwd(), 'scripts/service-account.json'), 'utf8')
);
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
db.settings({ preferRest: true });

const DEMO_EMAIL = 'demo@ganacr.com';
const COLECCIONES = [
  'fincas', 'lotes', 'animales', 'pesos', 'gastos',
  'gastosFinca', 'ventas', 'eventosSanitarios',
];

async function main() {
  console.log('\n🧹  Limpieza de campos basura del demo\n');
  const auth = admin.auth();
  const demo = await auth.getUserByEmail(DEMO_EMAIL);
  const demoUid = demo.uid;
  console.log('Demo UID:', demoUid, '\n');

  let totalLimpiados = 0;
  for (const col of COLECCIONES) {
    const snap = await db.collection(col).where('userId', '==', demoUid).get();
    const sucios = snap.docs.filter((d) => {
      const data = d.data();
      return 'id' in data || '_testData' in data;
    });
    for (let i = 0; i < sucios.length; i += 490) {
      const chunk = sucios.slice(i, i + 490);
      const batch = db.batch();
      for (const d of chunk) {
        batch.update(d.ref, {
          id: admin.firestore.FieldValue.delete(),
          _testData: admin.firestore.FieldValue.delete(),
        });
      }
      await batch.commit();
    }
    console.log(`  ${col}: ${sucios.length} limpiados (de ${snap.size})`);
    totalLimpiados += sucios.length;
  }

  // users/{demoUid}
  const userRef = db.collection('users').doc(demoUid);
  const userSnap = await userRef.get();
  if (userSnap.exists) {
    const ud = userSnap.data()!;
    if ('id' in ud || '_testData' in ud) {
      await userRef.update({
        id: admin.firestore.FieldValue.delete(),
        _testData: admin.firestore.FieldValue.delete(),
      });
      console.log('  users: 1 limpiado');
      totalLimpiados += 1;
    }
  }

  console.log(`\n✅  Total: ${totalLimpiados} documentos limpiados\n`);
  process.exit(0);
}
main().catch((e) => { console.error('ERROR:', e); process.exit(1); });
```

- [ ] **Step 2: Agregar el script a package.json**

En `package.json`, en `"scripts"`, después de la línea `"verify-demo"`, agregar:

```json
    "clean-demo": "tsx --tsconfig scripts/tsconfig.json scripts/clean-demo-fields.ts",
```

(Recordá agregar la coma al final de la línea anterior si hace falta.)

- [ ] **Step 3: Correr el script**

Run: `npm run clean-demo`
Expected: imprime el conteo por colección y "✅ Total: N documentos limpiados". Correrlo una segunda vez debe imprimir 0 en todas (idempotente).

- [ ] **Step 4: Commit**

```bash
git add scripts/clean-demo-fields.ts package.json
git commit -m "chore(scripts): add clean-demo-fields to strip stray id/_testData from demo docs"
```

---

## Task 3: Agregar campos de muerte al tipo Animal

**Files:**
- Modify: `src/types/index.ts:72-89` (interface Animal)

- [ ] **Step 1: Agregar los campos**

En `src/types/index.ts`, dentro de `interface Animal`, después de la línea `notas?: string;`, agregar:

```ts
  causaMuerte?: string;          // motivo de la muerte (opcional)
  documentoVeterinario?: string; // referencia al dictamen veterinario (opcional)
  valorPerdida?: number;         // ₡ valor actual estimado registrado como pérdida al morir
```

- [ ] **Step 2: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin salida (sin errores).

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add causaMuerte, documentoVeterinario, valorPerdida to Animal"
```

---

## Task 4: Hooks useRegistrarMuerte y useAnularMuerte

**Files:**
- Modify: `src/hooks/useAnimales.ts` (imports + dos hooks nuevos al final)

- [ ] **Step 1: Agregar `deleteField` al import de firestore**

En `src/hooks/useAnimales.ts`, en el bloque de import de `firebase/firestore`, agregar `deleteField` a la lista (queda junto a `increment`, `writeBatch`, etc.).

- [ ] **Step 2: Agregar los dos hooks al final del archivo**

Al final de `src/hooks/useAnimales.ts`, agregar:

```ts
// ─── Registrar muerte de un animal ───────────────────────────────────────────

interface RegistrarMuerteInput {
  fecha: string;            // ISO date de la muerte
  precioKg: number;         // ₡/kg estimado de mercado, > 0
  causa?: string;
  documentoVeterinario?: string;
}

export function useRegistrarMuerte() {
  const { user } = useAuth();

  // Devuelve el valorPerdida calculado (para mostrarlo en un toast si se desea).
  async function registrarMuerte(animal: Animal, input: RegistrarMuerteInput): Promise<number> {
    if (!user) throw new Error('No autenticado');
    if (animal.estado !== 'activo') throw new Error('Solo se puede registrar la muerte de un animal activo');
    if (input.precioKg <= 0) throw new Error('El precio por kg debe ser mayor que cero');
    if (animal.pesoActual <= 0) throw new Error('El animal no tiene peso registrado');

    const valorPerdida = Math.round(animal.pesoActual * input.precioKg);
    const now = new Date().toISOString();
    const batch = writeBatch(db);

    batch.update(doc(db, 'animales', animal.id), {
      estado: 'muerto',
      fechaSalida: input.fecha,
      causaMuerte: input.causa?.trim() || '',
      documentoVeterinario: input.documentoVeterinario?.trim() || '',
      valorPerdida,
      updatedAt: now,
    });

    batch.update(doc(db, 'lotes', animal.loteId), {
      animalesActivos: increment(-1),
      animalesMuertos: increment(1),
      utilidadTotal: increment(-valorPerdida), // la pérdida reduce la utilidad del lote
      updatedAt: now,
    });

    await batch.commit();
    return valorPerdida;
  }

  return { registrarMuerte };
}

// ─── Anular (revertir) la muerte de un animal ────────────────────────────────

export function useAnularMuerte() {
  const { user } = useAuth();

  async function anularMuerte(animal: Animal): Promise<void> {
    if (!user) throw new Error('No autenticado');
    if (animal.estado !== 'muerto') throw new Error('El animal no está registrado como muerto');

    const valorPerdida = animal.valorPerdida ?? 0;
    const now = new Date().toISOString();
    const batch = writeBatch(db);

    batch.update(doc(db, 'animales', animal.id), {
      estado: 'activo',
      fechaSalida: deleteField(),
      causaMuerte: deleteField(),
      documentoVeterinario: deleteField(),
      valorPerdida: deleteField(),
      updatedAt: now,
    });

    batch.update(doc(db, 'lotes', animal.loteId), {
      animalesActivos: increment(1),
      animalesMuertos: increment(-1),
      utilidadTotal: increment(valorPerdida), // restaura la utilidad
      updatedAt: now,
    });

    await batch.commit();
  }

  return { anularMuerte };
}
```

- [ ] **Step 3: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useAnimales.ts
git commit -m "feat(hooks): add useRegistrarMuerte and useAnularMuerte"
```

---

## Task 5: Componente RegistrarMuerteModal

**Files:**
- Create: `src/components/RegistrarMuerteModal.tsx`

- [ ] **Step 1: Crear el modal**

Crear `src/components/RegistrarMuerteModal.tsx`:

```tsx
import { useState } from 'react';
import { useRegistrarMuerte } from '@/hooks/useAnimales';
import { Animal } from '@/types';
import { formatColones, formatKg } from '@/utils/calculadora';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  animal: Animal;
  onClose: () => void;
}

export default function RegistrarMuerteModal({ animal, onClose }: Props) {
  const { registrarMuerte } = useRegistrarMuerte();
  const hoy = new Date().toISOString().substring(0, 10);
  const [fecha, setFecha] = useState(hoy);
  const [precioKg, setPrecioKg] = useState('');
  const [causa, setCausa] = useState('');
  const [documentoVeterinario, setDocumentoVeterinario] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const precioKgNum = Number(precioKg);
  const valorPerdida = precioKgNum > 0 ? Math.round(animal.pesoActual * precioKgNum) : 0;
  const canSubmit = fecha !== '' && precioKgNum > 0 && !saving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setSaving(true);
    try {
      await registrarMuerte(animal, {
        fecha,
        precioKg: precioKgNum,
        causa,
        documentoVeterinario,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar la muerte');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar muerte — {animal.numeroArete}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="muerte-fecha">Fecha de muerte</Label>
            <Input
              id="muerte-fecha"
              type="date"
              value={fecha}
              max={hoy}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="muerte-precio">Precio/kg estimado de mercado</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">₡</span>
              <Input
                id="muerte-precio"
                type="number"
                min={1}
                step={1}
                placeholder="0"
                value={precioKg}
                onChange={(e) => setPrecioKg(e.target.value)}
                required
                autoFocus
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">/ kg</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Peso actual: {formatKg(animal.pesoActual)}
              {valorPerdida > 0 && (
                <> · Pérdida estimada: <strong>{formatColones(valorPerdida)}</strong></>
              )}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="muerte-causa">Causa (opcional)</Label>
            <Input
              id="muerte-causa"
              type="text"
              placeholder="Enfermedad, accidente, etc."
              value={causa}
              onChange={(e) => setCausa(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="muerte-doc">Documento veterinario (opcional)</Label>
            <Input
              id="muerte-doc"
              type="text"
              placeholder="N° o descripción del dictamen"
              value={documentoVeterinario}
              onChange={(e) => setDocumentoVeterinario(e.target.value)}
            />
          </div>

          {/* Aviso fiscal */}
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            📋 <strong>Recordatorio:</strong> con un documento de respaldo emitido por un
            médico veterinario, el valor en libros de este animal puede considerarse pérdida
            deducible en tu declaración de renta (Ley 7092, art. 8), sujeto a los requisitos
            de la Dirección General de Tributación. Si lo tenés, guardá el dictamen. Consultá
            con tu contador.
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={!canSubmit}>
              {saving ? 'Registrando...' : 'Registrar muerte'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 3: Commit**

```bash
git add src/components/RegistrarMuerteModal.tsx
git commit -m "feat(ui): add RegistrarMuerteModal with fiscal notice"
```

---

## Task 6: Integrar muerte en LoteDetalle (acción + revertir)

**Files:**
- Modify: `src/pages/LoteDetalle.tsx`

- [ ] **Step 1: Imports y hooks**

En `src/pages/LoteDetalle.tsx`:

1. En el import de `@/hooks/useAnimales`, agregar `useAnularMuerte` (línea 4 actual: `import { useAnimales, useEliminarAnimal } from '@/hooks/useAnimales';` → `import { useAnimales, useEliminarAnimal, useAnularMuerte } from '@/hooks/useAnimales';`).
2. Agregar import del modal después de `import MoverAnimalesModal ...` (línea 19):
   ```tsx
   import RegistrarMuerteModal from '@/components/RegistrarMuerteModal';
   ```
3. Después de `const { anularVenta } = useAnularVenta();` (línea 47), agregar:
   ```tsx
   const { anularMuerte } = useAnularMuerte();
   ```

- [ ] **Step 2: Estado de los nuevos modales/acciones**

Después de `const [deleteVenta, setDeleteVenta] = useState<Venta | null>(null);` (línea 73), agregar:

```tsx
  const [muerteAnimal, setMuerteAnimal] = useState<Animal | null>(null);
  const [revertMuerteAnimal, setRevertMuerteAnimal] = useState<Animal | null>(null);
```

- [ ] **Step 3: Handler de revertir muerte**

Después de `handleAnularVenta` (después de la línea 144), agregar:

```tsx
  async function handleRevertMuerte() {
    if (!revertMuerteAnimal) return;
    setDeletingId(revertMuerteAnimal.id);
    try {
      await anularMuerte(revertMuerteAnimal);
      setRevertMuerteAnimal(null);
    } catch (err) {
      console.error('[handleRevertMuerte]', err);
    } finally {
      setDeletingId(null);
    }
  }
```

- [ ] **Step 4: Item "Registrar muerte" en el ⋮ de la tabla desktop**

En el `DropdownMenuContent` del animal activo (desktop), después del `DropdownMenuItem` de "Editar" y antes del de "Eliminar" (entre líneas 417 y 418), agregar:

```tsx
                                        <DropdownMenuItem
                                          className="text-destructive"
                                          onClick={() => setMuerteAnimal(animal)}
                                        >
                                          💀 Registrar muerte
                                        </DropdownMenuItem>
```

- [ ] **Step 5: Acción de revertir para animales muertos (desktop)**

La celda de acciones desktop (líneas 394-427) solo renderiza el ⋮ si `animal.estado === 'activo'`. Reemplazar ese bloque condicional para también manejar muertos. Cambiar:

```tsx
                                <td className="px-3 py-2">
                                  {animal.estado === 'activo' && (
                                    <DropdownMenu>
```

por:

```tsx
                                <td className="px-3 py-2">
                                  {animal.estado === 'muerto' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => setRevertMuerteAnimal(animal)}
                                    >
                                      Revertir muerte
                                    </Button>
                                  )}
                                  {animal.estado === 'activo' && (
                                    <DropdownMenu>
```

(El resto del bloque del DropdownMenu y su cierre `)}` quedan igual.)

- [ ] **Step 6: Acciones de muerte/revertir en las cards mobile**

En las cards mobile: dentro del bloque `{animal.estado === 'activo' && ( ... )}` (líneas 462-474), agregar un botón de muerte antes del botón de eliminar (antes del `<Button ... setDeleteAnimal ...>`):

```tsx
                                  <Button variant="outline" size="sm" className="h-7 text-xs text-destructive" onClick={(e) => { e.stopPropagation(); setMuerteAnimal(animal); }}>💀</Button>
```

Y después del cierre de ese bloque `activo` (después de la línea 474, antes del bloque de Historial sanitario en la línea 475), agregar el botón de revertir para muertos:

```tsx
                              {animal.estado === 'muerto' && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setRevertMuerteAnimal(animal); }}>
                                    Revertir muerte
                                  </Button>
                                </div>
                              )}
```

- [ ] **Step 7: Renderizar los modales**

Antes del modal de mover animales (antes de la línea 664 `{/* ── Modal mover animales ── */}`), agregar:

```tsx
      {/* ── Modal registrar muerte ── */}
      {muerteAnimal && (
        <RegistrarMuerteModal
          animal={muerteAnimal}
          onClose={() => setMuerteAnimal(null)}
        />
      )}

      {/* ── Confirmar revertir muerte ── */}
      {revertMuerteAnimal && (
        <ConfirmarBorradoModal
          titulo={`¿Revertir la muerte de ${revertMuerteAnimal.numeroArete}?`}
          descripcion="El animal volverá a estado activo y la pérdida registrada será revertida en la utilidad del lote."
          labelConfirmar="Revertir muerte"
          loading={deletingId === revertMuerteAnimal.id}
          onConfirm={handleRevertMuerte}
          onClose={() => setRevertMuerteAnimal(null)}
        />
      )}
```

- [ ] **Step 8: Verificar compilación y lint**

Run: `npx tsc --noEmit`
Expected: sin salida.
Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 9: Commit**

```bash
git add src/pages/LoteDetalle.tsx
git commit -m "feat(ui): wire animal death registration and revert into LoteDetalle"
```

---

## Task 7: Reporte de pérdidas para renta (Excel + botón Dashboard)

**Files:**
- Modify: `src/utils/exportExcel.ts` (nueva función)
- Modify: `src/pages/Dashboard.tsx` (handler + botón)

- [ ] **Step 1: Función de export en exportExcel.ts**

En `src/utils/exportExcel.ts`, al final del archivo, agregar:

```ts
// ─── Reporte de pérdidas por muerte (para declaración de renta) ───────────────

export function exportarPerdidasExcel(
  animalesMuertos: Animal[],
  lotesMap: Map<string, Lote>,
  nombreFinca: string
): void {
  const rows: (string | number)[][] = [];
  rows.push(['REPORTE DE PÉRDIDAS POR MUERTE — ' + nombreFinca]);
  rows.push([]);
  rows.push([
    'Arete', 'Raza', 'Lote', 'Fecha muerte', 'Causa', 'Peso (kg)',
    'Valor estimado pérdida (₡)', '% socio', 'Pérdida socio (₡)',
    'Pérdida propietario (₡)', 'Documento veterinario',
  ]);

  let totalPerdida = 0;
  for (const a of animalesMuertos) {
    const lote = lotesMap.get(a.loteId);
    const valor = a.valorPerdida ?? 0;
    totalPerdida += valor;
    const pctSocio = lote?.tipoPropiedad === 'medias' && lote.socio ? lote.socio.porcentaje : 0;
    const perdidaSocio = Math.round(valor * (pctSocio / 100));
    const perdidaPropietario = valor - perdidaSocio;
    rows.push([
      a.numeroArete,
      a.raza,
      lote?.nombreLote ?? '',
      fechaExcel(a.fechaSalida),
      a.causaMuerte ?? '',
      a.pesoActual,
      valor,
      pctSocio,
      perdidaSocio,
      perdidaPropietario,
      a.documentoVeterinario ?? '',
    ]);
  }

  rows.push([]);
  rows.push(['', '', '', '', '', 'TOTAL', totalPerdida]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sanitizarNombreHoja('Pérdidas'));

  const fecha = new Date().toISOString().substring(0, 10);
  const safeFinca = nombreFinca.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `GanaCR_Perdidas_${safeFinca}_${fecha}.xlsx`);
}
```

- [ ] **Step 2: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 3: Handler en Dashboard.tsx**

En `src/pages/Dashboard.tsx`:

1. En el import de `@/utils/exportExcel` (línea 17), agregar `exportarPerdidasExcel`:
   ```tsx
   import { exportarLotesExcel, exportarPerdidasExcel } from '@/utils/exportExcel';
   ```
2. Agregar estado junto a los otros `useState` (después de `const [exportError, setExportError] = useState('');`):
   ```tsx
   const [exportandoPerdidas, setExportandoPerdidas] = useState(false);
   ```
3. Después de `handleExportarExcel` (después de su `}` de cierre, ~línea 156), agregar:

```tsx
  async function handleReportePerdidas() {
    if (!fincaActiva || !user) return;
    setExportandoPerdidas(true);
    try {
      const snap = await getDocs(query(
        collection(db, 'animales'),
        where('userId', '==', user.uid),
        where('fincaId', '==', fincaActiva.id),
        where('estado', '==', 'muerto'),
      ));
      const muertos = snap.docs.map(d => ({ ...d.data(), id: d.id } as Animal));
      muertos.sort((a, b) => ((b.fechaSalida ?? '') < (a.fechaSalida ?? '') ? -1 : 1));
      const lotesMap = new Map(lotes.map(l => [l.id, l]));
      exportarPerdidasExcel(muertos, lotesMap, fincaActiva.nombre);
    } catch (err) {
      console.error('[Dashboard] Error reporte pérdidas:', err);
    } finally {
      setExportandoPerdidas(false);
    }
  }
```

- [ ] **Step 4: Botón en el Dashboard**

En `src/pages/Dashboard.tsx`, dentro del bloque de botones de la pestaña lotes (donde está el botón "Excel", dentro de `{dashboardTab === 'lotes' && (`), agregar después del botón Excel:

```tsx
                  <Button variant="outline" size="sm" onClick={handleReportePerdidas} disabled={exportandoPerdidas}>
                    <FileSpreadsheet size={14} className="mr-1" />
                    {exportandoPerdidas ? 'Generando...' : 'Reporte de pérdidas'}
                  </Button>
```

- [ ] **Step 5: Verificar compilación y lint**

Run: `npx tsc --noEmit`
Expected: sin salida.
Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/utils/exportExcel.ts src/pages/Dashboard.tsx
git commit -m "feat(report): add death-loss Excel report for renta declaration"
```

---

## Task 8: Spec Playwright + verificación final y deploy

**Files:**
- Create: `tests/qa/muerte.spec.ts`

- [ ] **Step 1: Revisar el patrón de un spec existente**

Leer `tests/qa/lote-detalle.spec.ts` para copiar el patrón de login/navegación (selectores, helpers, baseURL). El nuevo spec debe seguir ese mismo patrón (no inventar uno nuevo).

- [ ] **Step 2: Escribir el spec del flujo de muerte**

Crear `tests/qa/muerte.spec.ts` siguiendo el patrón del paso 1. Cubrir: login → entrar a un lote con un animal activo → abrir ⋮ → "Registrar muerte" → llenar fecha + precio/kg → confirmar → verificar que el animal queda con badge "muerto", que el contador de Activos baja en 1, y que aparece el botón "Revertir muerte". (Usar los selectores reales del patrón existente; el cuerpo exacto se adapta a los helpers de `lote-detalle.spec.ts`.)

- [ ] **Step 3: Build de producción**

Run: `npm run build`
Expected: `✓ built` sin errores de TypeScript.

- [ ] **Step 4: Verificación manual en el browser (dev o producción)**

Registrar la muerte de un animal de prueba y verificar:
- El animal pasa a badge "muerto", sale de Activos (−1), Muertos +1.
- La Utilidad del lote baja por el valor estimado (pesoActual × precio/kg).
- "Revertir muerte" restaura el animal a activo y la utilidad.
- En el Dashboard, "Reporte de pérdidas" descarga un Excel con el animal muerto, su valor de pérdida y el reparto socio.

- [ ] **Step 5: Commit y push (deploy)**

```bash
git add tests/qa/muerte.spec.ts
git commit -m "test(qa): add Playwright spec for animal death flow"
git push origin main
```

Expected: Vercel despliega automáticamente desde `main`.

- [ ] **Step 6: Actualizar CLAUDE.md (feature completa)**

En `CLAUDE.md`, en Fase 2B, marcar la feature de muerte de animal como completa con una línea breve, y quitar de "Pendiente inmediato" lo que ya se hizo (limpieza demo, cross-finca). Commit:

```bash
git add CLAUDE.md
git commit -m "docs: registrar feature de muerte de animal como completa"
git push origin main
```

---

## Resumen de archivos

| Archivo | Acción |
|---------|--------|
| `scripts/clean-demo-fields.ts` | nuevo |
| `package.json` | +script clean-demo |
| `src/types/index.ts` | +3 campos en Animal |
| `src/hooks/useAnimales.ts` | +useRegistrarMuerte, +useAnularMuerte |
| `src/components/RegistrarMuerteModal.tsx` | nuevo |
| `src/pages/LoteDetalle.tsx` | acción muerte + revertir |
| `src/utils/exportExcel.ts` | +exportarPerdidasExcel |
| `src/pages/Dashboard.tsx` | botón "Reporte de pérdidas" |
| `tests/qa/muerte.spec.ts` | nuevo |
| `CLAUDE.md` | cross-finca + muerte documentados |
