# UI Redesign: shadcn/ui + Tailwind Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate GanaCR from CSS vanilla to Tailwind CSS v4 + shadcn/ui with the "Campo Claro" palette, page by page (Login → Dashboard → LoteDetalle + modals).

**Architecture:** Install Tailwind v4 via `@tailwindcss/vite` plugin, initialize shadcn/ui which copies component source into `src/components/ui/`, then rewrite each page replacing class names and vanilla HTML with shadcn components. Hooks, services, and business logic are untouched.

**Tech Stack:** Tailwind CSS v4, `@tailwindcss/vite`, shadcn/ui (latest), lucide-react, clsx, tailwind-merge

---

## File Map

**Create:**
- `src/lib/utils.ts` — `cn()` helper (created by shadcn init)
- `src/components/ui/` — all shadcn components (created by shadcn CLI)
- `components.json` — shadcn config (created by shadcn init)

**Modify:**
- `vite.config.ts` — add `@tailwindcss/vite` plugin
- `src/index.css` — replace with Tailwind import + Campo Claro theme + shadcn CSS vars
- `src/pages/Login.tsx` — full rewrite with shadcn Card/Input/Button
- `src/pages/Dashboard.tsx` — JSX rewrite, all handlers preserved
- `src/components/FincaSelector.tsx` — Tailwind rewrite
- `src/components/OnboardingFinca.tsx` — Tailwind rewrite
- `src/components/GastosFincaTab.tsx` — Tailwind rewrite
- `src/components/GastoFincaModal.tsx` — shadcn Dialog rewrite
- `src/pages/LoteDetalle.tsx` — JSX rewrite, all handlers preserved
- `src/components/CrearLoteModal.tsx` — shadcn Dialog
- `src/components/AgregarAnimalModal.tsx` — shadcn Dialog
- `src/components/AgregarGastoModal.tsx` — shadcn Dialog
- `src/components/RegistrarPesoModal.tsx` — shadcn Dialog
- `src/components/VenderAnimalesModal.tsx` — shadcn Dialog
- `src/components/ConfirmarBorradoModal.tsx` — shadcn Dialog
- `src/components/AnimalPesoModal.tsx` — shadcn Dialog
- `src/components/MoverAnimalesModal.tsx` — shadcn Dialog
- `src/components/EventoSanitarioModal.tsx` — shadcn Dialog
- `src/components/PesosTab.tsx` — Tailwind rewrite
- `src/components/SanidadTab.tsx` — Tailwind rewrite

**Delete after each page migration:**
- `src/pages/Login.css`
- `src/pages/Dashboard.css`
- `src/components/FincaSelector.css`
- `src/components/GastoFincaModal.css`
- `src/components/AnimalPesoModal.css`
- `src/components/MoverAnimalesModal.css`
- `src/components/EventoSanitarioModal.css`
- `src/components/PesosTab.css`
- `src/components/SanidadTab.css`
- `src/pages/LoteDetalle.css`

---

## Task 1: Install Tailwind CSS v4

**Files:**
- Modify: `vite.config.ts`
- Modify: `src/index.css`

- [ ] **Step 1: Install Tailwind and its Vite plugin**

Run from project root (`C:\Users\Usuario\Desktop\Sistemas\ganacr`):
```bash
npm install tailwindcss @tailwindcss/vite
```
Expected output: packages added with no errors.

- [ ] **Step 2: Add the Vite plugin**

Replace `vite.config.ts` with:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 3: Replace index.css with Tailwind import + Campo Claro theme**

Replace the entire content of `src/index.css` with:
```css
@import "tailwindcss";

/* ─── Campo Claro — GanaCR theme ─────────────────────────────────────────── */
@layer base {
  :root {
    --background: 210 40% 98%;
    --foreground: 222 47% 11%;
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;
    --primary: 158 44% 21%;
    --primary-foreground: 0 0% 100%;
    --secondary: 148 39% 33%;
    --secondary-foreground: 0 0% 100%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --accent: 210 40% 96%;
    --accent-foreground: 222 47% 11%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;
    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: 158 44% 21%;
    --radius: 0.5rem;
    --success: 142 71% 45%;
    --success-foreground: 0 0% 100%;
    --success-light: 138 76% 97%;
  }
}

/* Keep Inter font and base reset */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 4: Verify Tailwind is working**

Run `npm run dev`, open the app in the browser. The app should still render (existing CSS vanilla classes from pages will break visually, but no errors in console). Confirm Vite compiles without errors.

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts src/index.css package.json package-lock.json
git commit -m "feat(ui): install Tailwind CSS v4 with Campo Claro theme"
```

---

## Task 2: Initialize shadcn/ui and install components

**Files:**
- Create: `components.json`
- Create: `src/lib/utils.ts`
- Create: `src/components/ui/` (all components)

- [ ] **Step 1: Run shadcn init**

```bash
npx shadcn@latest init
```

Answer the prompts as follows:
- Which style? → **Default**
- Which color? → **Slate** (we override with our own CSS vars above)
- Where is your global CSS file? → `src/index.css`
- Would you like to use CSS variables? → **Yes**
- Are you using React Server Components? → **No**
- Where to place UI components? → `src/components/ui`
- Where to place lib/utils? → `src/lib/utils`
- Write configuration to `components.json`? → **Yes**

This creates `components.json`, `src/lib/utils.ts`, and installs `clsx` + `tailwind-merge`.

- [ ] **Step 2: Install all required components**

```bash
npx shadcn@latest add button card dialog tabs input label badge dropdown-menu select sonner drawer
```

Expected: each component file appears in `src/components/ui/`.

- [ ] **Step 3: Verify utils file exists**

Check `src/lib/utils.ts` contains:
```ts
import { clsx, type ClassValue } from "clsx"
import { tailwind-merge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

If shadcn generated it differently, verify it exports a `cn` function.

- [ ] **Step 4: Add Sonner Toaster to App.tsx**

Open `src/App.tsx` and add the Toaster provider. Find the JSX return and add `<Toaster />` inside the router. The file should import and use it like this (add to the existing router structure without changing routes):

```tsx
import { Toaster } from '@/components/ui/sonner'

// Inside the JSX, add <Toaster /> as a sibling to <Routes>:
<Toaster position="top-right" richColors />
```

- [ ] **Step 5: Commit**

```bash
git add components.json src/lib/ src/components/ui/ src/App.tsx package.json package-lock.json
git commit -m "feat(ui): initialize shadcn/ui with Campo Claro components"
```

---

## Task 3: Migrate Login page

**Files:**
- Modify: `src/pages/Login.tsx` (full rewrite)
- Delete: `src/pages/Login.css`

- [ ] **Step 1: Rewrite Login.tsx**

Replace the entire content of `src/pages/Login.tsx` with:

```tsx
import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { login, register } = useAuth();
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [nombreFinca, setNombreFinca] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (modo === 'login') {
        await login(email, password);
      } else {
        if (!nombre.trim()) { setError('El nombre es requerido'); setLoading(false); return; }
        await register(email, password, nombre, nombreFinca);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError('Correo o contraseña incorrectos');
      } else if (msg.includes('email-already-in-use')) {
        setError('Este correo ya está registrado');
      } else if (msg.includes('weak-password')) {
        setError('La contraseña debe tener al menos 6 caracteres');
      } else {
        setError('Error: ' + msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[hsl(var(--primary))] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">
            🐄
          </div>
          <h1 className="text-2xl font-extrabold text-[hsl(var(--foreground))]">GanaCR</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Sistema de Gestión Ganadera</p>
        </div>

        {/* Mode tabs */}
        <div className="flex mb-4 bg-[hsl(var(--muted))] rounded-lg p-1">
          <button
            type="button"
            onClick={() => setModo('login')}
            className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${
              modo === 'login'
                ? 'bg-white text-[hsl(var(--foreground))] shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            Ingresar
          </button>
          <button
            type="button"
            onClick={() => setModo('registro')}
            className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${
              modo === 'registro'
                ? 'bg-white text-[hsl(var(--foreground))] shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            Registrarse
          </button>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </CardTitle>
            <CardDescription>
              {modo === 'login' ? 'Ingresá con tu cuenta de GanaCR' : 'Completá tus datos para registrarte'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {modo === 'registro' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="nombre">Tu nombre</Label>
                    <Input
                      id="nombre"
                      type="text"
                      placeholder="Ej: Juan Pérez"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nombreFinca">Nombre de la finca <span className="text-[hsl(var(--muted-foreground))] font-normal">(opcional)</span></Label>
                    <Input
                      id="nombreFinca"
                      type="text"
                      placeholder="Ej: Finca La Esperanza"
                      value={nombreFinca}
                      onChange={(e) => setNombreFinca(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.08)] border border-[hsl(var(--destructive)/0.2)] rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--secondary))] text-white"
                disabled={loading}
              >
                {loading ? 'Cargando...' : modo === 'login' ? 'Ingresar' : 'Crear cuenta'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Delete Login.css**

```bash
rm src/pages/Login.css
```

- [ ] **Step 3: Smoke test Login**

Run `npm run dev`. Navigate to the login page. Verify:
- Logo 🐄 centered with green square background
- Tabs "Ingresar" / "Registrarse" switch modes
- All form fields render with shadcn Input style
- Password toggle (eye icon) works
- Submit works (use real credentials or check network tab)
- No console errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/Login.tsx src/pages/Login.css
git commit -m "feat(ui): migrate Login page to shadcn/ui + Tailwind"
```

---

## Task 4: Migrate Dashboard

**Files:**
- Modify: `src/pages/Dashboard.tsx` (JSX rewrite, all handlers preserved)
- Modify: `src/components/FincaSelector.tsx`
- Modify: `src/components/OnboardingFinca.tsx`
- Modify: `src/components/GastosFincaTab.tsx`
- Modify: `src/components/GastoFincaModal.tsx`
- Delete: `src/pages/Dashboard.css`, `src/components/FincaSelector.css`, `src/components/GastoFincaModal.css`

- [ ] **Step 1: Rewrite Dashboard.tsx JSX — keep all handlers, replace only the return block and the CSS import**

Open `src/pages/Dashboard.tsx`. Remove the line `import './Dashboard.css';` at the top and add these shadcn imports:

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Plus, FileSpreadsheet, FileText, Trash2, Pencil, Eye } from 'lucide-react';
```

Replace the entire `return (...)` block with:

```tsx
  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {necesitaOnboarding && <OnboardingFinca />}

      {/* Navbar */}
      <header className="bg-white border-b border-[hsl(var(--border))] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-extrabold text-[hsl(var(--primary))] text-lg shrink-0">
            🐄 <span className="hidden sm:inline">GanaCR</span>
          </div>
          <div className="flex-1 max-w-xs">
            <FincaSelector />
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">{userData?.nombre}</span>
            <Button variant="outline" size="sm" onClick={logout}>Salir</Button>
          </div>
          <button
            className="sm:hidden p-2 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
        {menuOpen && (
          <div className="sm:hidden bg-white border-t border-[hsl(var(--border))] px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">{userData?.nombre}</span>
            <Button variant="outline" size="sm" onClick={() => { logout(); setMenuOpen(false); }}>Salir</Button>
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 pb-16">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-extrabold text-[hsl(var(--foreground))]">{lotes.length}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wide mt-0.5">Lotes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-extrabold text-[hsl(var(--foreground))]">{totalAnimales}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wide mt-0.5">Animales</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-extrabold text-[hsl(var(--foreground))]">{formatColones(totalInvertido)}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wide mt-0.5">Invertido</p>
            </CardContent>
          </Card>
          <Card className={totalUtilidad >= 0 ? 'bg-[hsl(var(--success-light))] border-[hsl(var(--success)/0.3)]' : ''}>
            <CardContent className="pt-4 pb-3 text-center">
              <p className={`text-2xl font-extrabold ${totalUtilidad >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'}`}>
                {formatColones(totalUtilidad)}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wide mt-0.5">Utilidad</p>
            </CardContent>
          </Card>
        </div>

        {/* Error banners */}
        {exportError && <p className="text-sm text-[hsl(var(--destructive))] mb-3">{exportError}</p>}
        {pdfError && <p className="text-sm text-[hsl(var(--destructive))] mb-3">{pdfError}</p>}

        {/* Tabs */}
        <Tabs value={dashboardTab} onValueChange={(v) => setDashboardTab(v as DashboardTab)}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="lotes">Lotes</TabsTrigger>
              <TabsTrigger value="gastosFinca">Gastos de Finca</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              {dashboardTab === 'lotes' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportarExcel}
                    disabled={exportando || lotes.length === 0}
                  >
                    <FileSpreadsheet size={14} className="mr-1" />
                    {exportando ? 'Exportando...' : 'Excel'}
                  </Button>
                  <Button size="sm" onClick={() => setShowCrear(true)}
                    className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--secondary))] text-white">
                    <Plus size={14} className="mr-1" /> Nuevo lote
                  </Button>
                </>
              )}
              {dashboardTab === 'gastosFinca' && (
                <Button size="sm" onClick={() => setShowGastoFinca(true)}
                  className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--secondary))] text-white">
                  <Plus size={14} className="mr-1" /> Nuevo gasto
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="lotes">
            {loading ? (
              <p className="text-center text-[hsl(var(--muted-foreground))] py-12">Cargando lotes...</p>
            ) : lotes.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🐄</p>
                <p className="text-[hsl(var(--muted-foreground))]">No tenés lotes todavía.</p>
                <Button className="mt-4 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--secondary))] text-white"
                  onClick={() => setShowCrear(true)}>
                  Crear primer lote
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {lotes.map((lote) => (
                  <Card key={lote.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-[hsl(var(--foreground))] truncate">{lote.nombre}</h3>
                            {lote.esMedias && (
                              <Badge variant="secondary" className="text-xs shrink-0">A medias</Badge>
                            )}
                          </div>
                          <p className="text-sm text-[hsl(var(--muted-foreground))]">
                            {lote.animalesActivos} animales · {formatColones(lote.totalInvertido)}
                          </p>
                          {lote.utilidadTotal !== 0 && (
                            <p className={`text-sm font-semibold mt-0.5 ${lote.utilidadTotal >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'}`}>
                              Utilidad: {formatColones(lote.utilidadTotal)}
                            </p>
                          )}
                          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{formatFecha(lote.fechaCreacion)}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/lote/${lote.id}`)}>
                              <Eye size={14} className="mr-2" /> Ver lote
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditLote(lote)}>
                              <Pencil size={14} className="mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleGenerarPDF(lote)}
                              disabled={generandoPDF}
                            >
                              <FileText size={14} className="mr-2" /> {generandoPDF ? 'Generando...' : 'PDF Lote'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-[hsl(var(--destructive))]"
                              onClick={() => setDeleteLote(lote)}
                            >
                              <Trash2 size={14} className="mr-2" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="gastosFinca">
            <GastosFincaTab
              gastos={gastosFinca}
              loading={gastosFincaLoading}
              lotes={lotes}
              onDelete={(g) => setDeleteGastoFinca(g)}
              deletingId={deletingGastoFincaId}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals */}
      {(showCrear || editLote) && (
        <CrearLoteModal
          loteEditar={editLote}
          onClose={() => { setShowCrear(false); setEditLote(null); }}
        />
      )}
      {deleteLote && (
        <ConfirmarBorradoModal
          mensaje={`¿Eliminar lote "${deleteLote.nombre}" y todos sus datos?`}
          onConfirmar={handleDeleteLote}
          onCancelar={() => setDeleteLote(null)}
          cargando={deletingId === deleteLote.id}
        />
      )}
      {showGastoFinca && (
        <GastoFincaModal lotes={lotes} onClose={() => setShowGastoFinca(false)} />
      )}
      {deleteGastoFinca && (
        <ConfirmarBorradoModal
          mensaje={`¿Eliminar el gasto "${deleteGastoFinca.descripcion}"?`}
          onConfirmar={handleEliminarGastoFinca}
          onCancelar={() => setDeleteGastoFinca(null)}
          cargando={deletingGastoFincaId === deleteGastoFinca.id}
        />
      )}
    </div>
  );
```

- [ ] **Step 2: Delete Dashboard.css**

```bash
rm src/pages/Dashboard.css
```

- [ ] **Step 3: Migrate FincaSelector to Tailwind**

Open `src/components/FincaSelector.tsx`. Remove `import './FincaSelector.css'` and replace all className strings with Tailwind equivalents. The component renders a dropdown/select for switching fincas. Use the shadcn `Select` component:

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
// Keep all existing hooks (useFinca, etc.) and handlers unchanged
// Replace JSX with shadcn Select:
<Select value={fincaActiva?.id ?? ''} onValueChange={handleCambiarFinca}>
  <SelectTrigger className="h-8 text-sm max-w-[180px]">
    <SelectValue placeholder="Seleccionar finca" />
  </SelectTrigger>
  <SelectContent>
    {fincas.map((f) => (
      <SelectItem key={f.id} value={f.id}>{f.nombre}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

Adapt to match the exact props/handlers from the existing file — only replace the JSX and remove the CSS import.

- [ ] **Step 4: Delete FincaSelector.css**

```bash
rm src/components/FincaSelector.css
```

- [ ] **Step 5: Migrate GastoFincaModal to shadcn Dialog**

Open `src/components/GastoFincaModal.tsx`. Remove `import './GastoFincaModal.css'`. Add these imports:

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
```

Wrap the modal content in:
```tsx
<Dialog open onOpenChange={() => onClose()}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Nuevo gasto de finca</DialogTitle>
    </DialogHeader>
    {/* existing form content, replace className strings with Tailwind */}
  </DialogContent>
</Dialog>
```

Replace all form elements with shadcn Input/Label/Button. Keep all handlers unchanged.

- [ ] **Step 6: Delete GastoFincaModal.css**

```bash
rm src/components/GastoFincaModal.css
```

- [ ] **Step 7: Migrate OnboardingFinca to Tailwind**

Open `src/components/OnboardingFinca.tsx`. Remove any CSS import. Replace className strings with Tailwind. Use shadcn Dialog to wrap it:

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Keep all handlers. Wrap in Dialog open={true}.
```

- [ ] **Step 8: Migrate GastosFincaTab to Tailwind**

Open `src/components/GastosFincaTab.tsx`. Remove any CSS import. Replace class names with Tailwind. Use shadcn Card for each gasto row. Keep all props and handlers unchanged.

- [ ] **Step 9: Smoke test Dashboard**

Run `npm run dev`. Login and navigate to Dashboard. Verify:
- Navbar renders with finca selector and logout button
- 4 stat cards are visible
- Tabs "Lotes" / "Gastos de Finca" switch correctly
- Lote cards render with dropdown menu (3 dots)
- Dropdown shows Ver / Editar / PDF / Eliminar actions
- Crear lote modal opens via "+ Nuevo lote"
- No console errors

- [ ] **Step 10: Commit**

```bash
git add src/pages/Dashboard.tsx src/pages/Dashboard.css \
  src/components/FincaSelector.tsx src/components/FincaSelector.css \
  src/components/OnboardingFinca.tsx \
  src/components/GastosFincaTab.tsx \
  src/components/GastoFincaModal.tsx src/components/GastoFincaModal.css
git commit -m "feat(ui): migrate Dashboard to shadcn/ui + Tailwind"
```

---

## Task 5: Migrate LoteDetalle + all modals

**Files:** `src/pages/LoteDetalle.tsx` + all modal components + PesosTab + SanidadTab

This is the largest task. The approach is the same as Task 4: preserve all hooks/handlers, replace only JSX and CSS imports.

- [ ] **Step 1: Add shadcn imports to LoteDetalle.tsx**

Open `src/pages/LoteDetalle.tsx`. Remove `import './LoteDetalle.css'`. Add:

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Plus, ArrowLeft, FileSpreadsheet, FileText, Pencil, Trash2, Scale } from 'lucide-react';
```

Rewrite the JSX return to use these components. The page structure is:
1. Header: back button + lote name + badge (a medias) + action buttons
2. Stat cards: animales, invertido, utilidad
3. Tabs: Animales / Pesos / Gastos / Sanidad
4. Animal rows as Cards with DropdownMenu for actions

Keep every `useState`, `useEffect`, handler function, and hook call identical to the current file — only the JSX changes.

- [ ] **Step 2: Delete LoteDetalle.css**

```bash
rm src/pages/LoteDetalle.css
```

- [ ] **Step 3: Migrate ConfirmarBorradoModal to shadcn Dialog**

Open `src/components/ConfirmarBorradoModal.tsx`. It receives `mensaje`, `onConfirmar`, `onCancelar`, `cargando`. Replace with:

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  mensaje: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  cargando?: boolean;
}

export default function ConfirmarBorradoModal({ mensaje, onConfirmar, onCancelar, cargando }: Props) {
  return (
    <Dialog open onOpenChange={onCancelar}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogDescription>{mensaje}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancelar} disabled={cargando}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirmar} disabled={cargando}>
            {cargando ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Migrate CrearLoteModal to shadcn Dialog**

Open `src/components/CrearLoteModal.tsx`. Remove any CSS import. Add Dialog imports. Wrap in:
```tsx
<Dialog open onOpenChange={() => onClose()}>
  <DialogContent className="max-w-lg">
    <DialogHeader><DialogTitle>{loteEditar ? 'Editar lote' : 'Nuevo lote'}</DialogTitle></DialogHeader>
    {/* existing form — replace inputs with shadcn Input/Label/Button */}
  </DialogContent>
</Dialog>
```

- [ ] **Step 5: Migrate AgregarAnimalModal to shadcn Dialog**

Same pattern as Step 4. Open `src/components/AgregarAnimalModal.tsx`, wrap in Dialog, replace form elements with shadcn Input/Label/Select/Button. Keep all handlers.

- [ ] **Step 6: Migrate AgregarGastoModal to shadcn Dialog**

Same pattern. Open `src/components/AgregarGastoModal.tsx`, wrap in Dialog.

- [ ] **Step 7: Migrate RegistrarPesoModal to shadcn Dialog**

Same pattern. Open `src/components/RegistrarPesoModal.tsx`, wrap in Dialog.

- [ ] **Step 8: Migrate VenderAnimalesModal to shadcn Dialog**

Same pattern. Open `src/components/VenderAnimalesModal.tsx`, wrap in Dialog.

- [ ] **Step 9: Migrate AnimalPesoModal to shadcn Dialog**

Open `src/components/AnimalPesoModal.tsx`. Remove `import './AnimalPesoModal.css'`. Wrap in Dialog, Tailwind class names throughout.

- [ ] **Step 10: Migrate MoverAnimalesModal to shadcn Dialog**

Open `src/components/MoverAnimalesModal.tsx`. Remove `import './MoverAnimalesModal.css'`. Wrap in Dialog, Tailwind class names throughout.

- [ ] **Step 11: Migrate EventoSanitarioModal to shadcn Dialog**

Open `src/components/EventoSanitarioModal.tsx`. Remove `import './EventoSanitarioModal.css'`. Wrap in Dialog.

- [ ] **Step 12: Migrate PesosTab to Tailwind**

Open `src/components/PesosTab.tsx`. Remove `import './PesosTab.css'`. Replace all classNames with Tailwind. Use shadcn Card for each peso row. Keep all props and handlers.

- [ ] **Step 13: Migrate SanidadTab to Tailwind**

Open `src/components/SanidadTab.tsx`. Remove `import './SanidadTab.css'`. Replace classNames with Tailwind. Keep all props.

- [ ] **Step 14: Delete migrated CSS files**

```bash
rm src/components/AnimalPesoModal.css \
   src/components/MoverAnimalesModal.css \
   src/components/EventoSanitarioModal.css \
   src/components/PesosTab.css \
   src/components/SanidadTab.css
```

- [ ] **Step 15: Smoke test LoteDetalle**

Run `npm run dev`. Navigate to any lote. Verify:
- Header shows lote name + back button
- Stat cards visible
- Tabs: Animales / Pesos / Gastos / Sanidad all render
- Animal rows have dropdown with Peso / Editar / Eliminar
- All modals open and close correctly
- Vender modal works end-to-end
- No console errors

- [ ] **Step 16: Commit**

```bash
git add src/pages/LoteDetalle.tsx src/pages/LoteDetalle.css \
  src/components/ConfirmarBorradoModal.tsx \
  src/components/CrearLoteModal.tsx \
  src/components/AgregarAnimalModal.tsx \
  src/components/AgregarGastoModal.tsx \
  src/components/RegistrarPesoModal.tsx \
  src/components/VenderAnimalesModal.tsx \
  src/components/AnimalPesoModal.tsx src/components/AnimalPesoModal.css \
  src/components/MoverAnimalesModal.tsx src/components/MoverAnimalesModal.css \
  src/components/EventoSanitarioModal.tsx src/components/EventoSanitarioModal.css \
  src/components/PesosTab.tsx src/components/PesosTab.css \
  src/components/SanidadTab.tsx src/components/SanidadTab.css
git commit -m "feat(ui): migrate LoteDetalle and all modals to shadcn/ui + Tailwind"
```

---

## Task 6: Cleanup and verification

**Files:**
- Modify: `src/index.css` (final reduction)

- [ ] **Step 1: Verify no orphan CSS imports remain**

```bash
grep -r "import.*\.css" src/
```

Expected output: empty (no CSS imports left in src/).

- [ ] **Step 2: Verify no hardcoded old class names remain**

```bash
grep -r "className=\"btn\|className=\"form-\|className=\"dashboard-\|className=\"login-\|className=\"lote-\|className=\"navbar\b" src/
```

Expected output: empty.

- [ ] **Step 3: Final index.css — keep only essentials**

Ensure `src/index.css` contains only:
```css
@import "tailwindcss";

@layer base {
  :root {
    --background: 210 40% 98%;
    --foreground: 222 47% 11%;
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;
    --primary: 158 44% 21%;
    --primary-foreground: 0 0% 100%;
    --secondary: 148 39% 33%;
    --secondary-foreground: 0 0% 100%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --accent: 210 40% 96%;
    --accent-foreground: 222 47% 11%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;
    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: 158 44% 21%;
    --radius: 0.5rem;
    --success: 142 71% 45%;
    --success-foreground: 0 0% 100%;
    --success-light: 138 76% 97%;
  }
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 4: Run existing Playwright tests**

```bash
npm run test:qa
```

Expected: all tests pass. If any test fails due to changed class names used in selectors, update the selector in the test file to use `data-testid` or text-based selectors instead of CSS classes.

- [ ] **Step 5: Full smoke test**

Manually run through the golden path:
1. Login with existing account
2. Select a finca in the navbar
3. Create a new lote
4. Add an animal with arete, raza, peso, precio
5. Register a peso for that animal
6. Add a gasto to the lote
7. Sell the animal — verify utilidad calculation is correct
8. Navigate back to Dashboard — verify stat cards updated

- [ ] **Step 6: Final commit**

```bash
git add src/index.css
git commit -m "feat(ui): cleanup — remove orphan CSS, finalize Tailwind migration"
```

---

## Self-Review Notes

- **Spec coverage:** All 5 spec sections covered: setup ✓, design system tokens ✓, Login migration ✓, Dashboard migration ✓, LoteDetalle + modals ✓, cleanup ✓
- **No placeholders:** All code steps show real code. Modal migration steps (Steps 4–11 in Task 5) share the same Dialog-wrapping pattern — this is intentional and the pattern is shown explicitly in Step 3 (ConfirmarBorradoModal) for reference.
- **Type consistency:** `cn()` from `@/lib/utils` is used throughout shadcn components. No custom types are introduced.
- **react-pdf compatibility:** `@react-pdf/renderer` components (`ReporteLotePDF`, `ReporteSocioPDF`) are not migrated — they use their own PDF-specific styling system and are explicitly out of scope.
