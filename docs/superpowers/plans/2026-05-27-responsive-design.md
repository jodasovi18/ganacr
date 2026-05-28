# Responsive Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make GanaCR fully usable on phones, tablets, and desktops using a mobile-first CSS approach with no external libraries.

**Architecture:** Pure CSS media queries at 640px and 1024px breakpoints. Both desktop (table) and mobile (cards) versions of the animal list are rendered in the DOM simultaneously and toggled via CSS `display`. JS changes are minimal: hamburger `menuOpen` state in Dashboard, and `filterText` state for real-time arete search in LoteDetalle.

**Tech Stack:** CSS vanilla (media queries, sticky positioning, CSS animations), React 18 hooks (useState), Playwright for filter regression test.

---

## File Map

| File | What changes |
|------|-------------|
| `src/index.css` | Bottom-sheet modal overlay + `slide-up` keyframe animation |
| `src/pages/Dashboard.css` | Hamburger button styles, mobile nav dropdown, hide `.navbar-right` on mobile |
| `src/pages/Dashboard.tsx` | Add `menuOpen` state + hamburger `<button>` + mobile dropdown render |
| `src/pages/LoteDetalle.css` | Sticky tab wrapper, arete search input, animal card styles, 3-col header stats on mobile, CSS show/hide for table vs cards |
| `src/pages/LoteDetalle.tsx` | Wrap tabs in sticky container, split container divs, add `filterText`+`animalesFiltrados`, add search input, add `.animals-cards` alongside existing table |
| `tests/responsive/filter.spec.ts` | Playwright tests for real-time arete filter (requires seeded data + auth) |

---

### Task 1: Bottom-sheet modals on mobile

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Append responsive block to `src/index.css`**

Open `src/index.css`. At the very end of the file (after the `.stats-grid` / `.stat-card` block ending at line 220), append:

```css
/* ─── Responsive ─────────────────────────────────────────────────────────── */
@keyframes slide-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

@media (max-width: 640px) {
  /* Bottom-sheet modals */
  .modal-overlay {
    align-items: flex-end;
    padding: 0;
  }
  .modal {
    max-width: 100%;
    border-radius: 16px 16px 0 0;
    max-height: 85vh;
    animation: slide-up 0.25s ease-out;
  }
}
```

- [ ] **Step 2: Start the dev server and verify the modal visually**

```
npm run dev
```

Open http://localhost:5173. Log in. Open Chrome DevTools → Toggle device toolbar → set iPhone 12 (390×844). Click **"+ Animal"** button.

Expected at 390px:
- Modal anchors to the bottom of the viewport (not centered)
- Rounded top-left and top-right corners (16px radius)
- Modal slides up from below on open
- Scrollable content if form is taller than 85vh

At 1280px (reset to desktop in DevTools): modal still appears centered — no regression.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: bottom-sheet modals on mobile (≤640px)"
```

---

### Task 2: Responsive navbar — hamburger menu

**Files:**
- Modify: `src/pages/Dashboard.css`
- Modify: `src/pages/Dashboard.tsx`

On mobile, hide the `navbar-right` div (username + Salir) and show a `☰` button instead. Clicking it toggles a dropdown below the nav bar.

- [ ] **Step 1: Append mobile navbar styles to `src/pages/Dashboard.css`**

At the end of the file (after `.lote-utilidad.neg { color: var(--color-danger); }`), append:

```css
/* ─── Mobile navbar ──────────────────────────────────────────────────────── */
.navbar-hamburger {
  display: none;
  background: none;
  border: 1px solid rgba(255,255,255,0.35);
  color: white;
  font-size: 1.3rem;
  cursor: pointer;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  line-height: 1;
}

.navbar-mobile-menu {
  background: var(--color-primary-dark);
  border-top: 1px solid rgba(255,255,255,0.15);
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.navbar-mobile-menu .navbar-user {
  font-size: 0.85rem;
  color: rgba(255,255,255,0.9);
  padding: 0.2rem 0;
}

@media (max-width: 640px) {
  .navbar-right     { display: none; }
  .navbar-hamburger { display: block; }
}
```

- [ ] **Step 2: Add `menuOpen` state to `src/pages/Dashboard.tsx`**

In `Dashboard.tsx`, add the following line after line 20 (`const [deletingId, setDeletingId] = useState<string | null>(null);`):

```tsx
const [menuOpen, setMenuOpen] = useState(false);
```

- [ ] **Step 3: Replace the `<header className="navbar">` block in `src/pages/Dashboard.tsx`**

Replace (lines 42–56, the entire `<header className="navbar">` element):

```tsx
      {/* Navbar */}
      <header className="navbar">
        <div className="container flex-between">
          <div className="navbar-brand">
            <span>🐄</span>
            <span className="navbar-title">GanaCR</span>
            {userData?.nombreFinca && (
              <span className="navbar-finca">{userData.nombreFinca}</span>
            )}
          </div>
          <div className="navbar-right">
            <span className="navbar-user">{userData?.nombre}</span>
            <button className="btn btn-ghost btn-sm" onClick={logout}>Salir</button>
          </div>
        </div>
      </header>
```

With:

```tsx
      {/* Navbar */}
      <header className="navbar">
        <div className="container flex-between">
          <div className="navbar-brand">
            <span>🐄</span>
            <span className="navbar-title">GanaCR</span>
            {userData?.nombreFinca && (
              <span className="navbar-finca">{userData.nombreFinca}</span>
            )}
          </div>
          <div className="navbar-right">
            <span className="navbar-user">{userData?.nombre}</span>
            <button className="btn btn-ghost btn-sm" onClick={logout}>Salir</button>
          </div>
          <button
            className="navbar-hamburger"
            aria-label="Abrir menú"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
        {menuOpen && (
          <div className="navbar-mobile-menu">
            <span className="navbar-user">{userData?.nombre}</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { logout(); setMenuOpen(false); }}
            >
              Salir
            </button>
          </div>
        )}
      </header>
```

- [ ] **Step 4: Verify visually**

At 390px in DevTools:
- `navbar-right` (nombre + Salir) is hidden
- `☰` button appears top-right
- Click `☰` → dropdown shows nombre and "Salir", icon becomes `✕`
- Click `✕` → dropdown closes
- Click "Salir" in dropdown → logs out and redirects to login

At 1280px (reset to desktop):
- `☰` button is hidden
- `navbar-right` is visible — no regression

- [ ] **Step 5: Commit**

```bash
git add src/pages/Dashboard.css src/pages/Dashboard.tsx
git commit -m "feat: hamburger nav menu on mobile (≤640px)"
```

---

### Task 3: Sticky tab bar in LoteDetalle

**Files:**
- Modify: `src/pages/LoteDetalle.css`
- Modify: `src/pages/LoteDetalle.tsx`

The tab bar (`🐄 Animales | 💸 Gastos | 💰 Ventas`) sticks to the top of the viewport when the user scrolls past the green header. This is especially important on mobile when scrolling through 120 animals.

The current structure is one `<div className="container">` containing both the tab bar and all tab content. We need to split this into two: a sticky wrapper for the tabs, and a separate container for the content.

- [ ] **Step 1: Add sticky tab styles to `src/pages/LoteDetalle.css`**

Add after the existing `.tab-btn:hover:not(.active)` rule (after line 55):

```css
/* Sticky tab wrapper */
.tabs-sticky {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--color-surface);
}
.tabs-sticky .tabs {
  border-bottom: none;   /* .tabs-sticky itself provides the border */
  padding: 0;
}
```

- [ ] **Step 2: Restructure the tabs section in `src/pages/LoteDetalle.tsx`**

Find and replace the following block (lines 133–145 — the comment `{/* Tabs */}` through `<div className="tab-content page-content">`):

Old:
```tsx
      {/* Tabs */}
      <div className="container">
        <div className="tabs mt-2">
          {(['animales', 'gastos', 'ventas'] as Tab[]).map((t) => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'animales' && `🐄 Animales (${animales.length})`}
              {t === 'gastos' && `💸 Gastos (${gastos.length})`}
              {t === 'ventas' && `💰 Ventas (${ventas.length})`}
            </button>
          ))}
        </div>

        <div className="tab-content page-content">
```

New:
```tsx
      {/* Sticky Tabs */}
      <div className="tabs-sticky">
        <div className="container">
          <div className="tabs mt-2">
            {(['animales', 'gastos', 'ventas'] as Tab[]).map((t) => (
              <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {t === 'animales' && `🐄 Animales (${animales.length})`}
                {t === 'gastos' && `💸 Gastos (${gastos.length})`}
                {t === 'ventas' && `💰 Ventas (${ventas.length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container">
        <div className="tab-content page-content">
```

Also update the closing of the outer container. Find (lines 309–310, at the very end of the JSX before the modals):

```tsx
        </div>
      </div>
```

This was the closing of `<div className="tab-content page-content">` and `<div className="container">`. The structure now has two `</div>` tags for the new `<div className="container">` + `<div className="tab-content page-content">`. The count stays the same, so this closing is unchanged.

- [ ] **Step 3: Verify visually**

Navigate to a lote (e.g., Lote Brahman Norte with 120 animals). Scroll down past the green header.

Expected at 390px:
- The tab bar (`🐄 Animales | 💸 Gastos | 💰 Ventas`) stays visible at the top of the screen
- Clicking a tab while scrolled down still works
- Tab bar has a white background (not transparent)

At 1280px: tabs also stick to top when scrolling — acceptable behavior on desktop.

- [ ] **Step 4: Commit**

```bash
git add src/pages/LoteDetalle.tsx src/pages/LoteDetalle.css
git commit -m "feat: sticky tab bar in LoteDetalle"
```

---

### Task 4: Real-time arete search filter

**Files:**
- Modify: `src/pages/LoteDetalle.tsx`
- Modify: `src/pages/LoteDetalle.css`

Add a search input above the animal list that filters in real time by arete number. Client-side — no Firestore queries — works fully offline.

- [ ] **Step 1: Add `filterText` state and `animalesFiltrados` to `src/pages/LoteDetalle.tsx`**

After line 47 (`const [deletingId, setDeletingId] = useState<string | null>(null);`), add:

```tsx
const [filterText, setFilterText] = useState('');
```

After line 52 (`const animalesActivos = animales.filter((a) => a.estado === 'activo');`), add:

```tsx
const animalesFiltrados = animales.filter((a) =>
  a.numeroArete.toLowerCase().includes(filterText.toLowerCase())
);
```

- [ ] **Step 2: Replace the animales tab content in `src/pages/LoteDetalle.tsx`**

Find and replace the entire `{tab === 'animales' && (...)}` block (lines 147–217):

Old:
```tsx
          {/* ── Tab Animales ── */}
          {tab === 'animales' && (
            animales.length === 0 ? (
              <div className="empty-state">
                <div className="emoji">🐄</div>
                <h3>Sin animales aún</h3>
                <p>Agregá el primer animal a este lote</p>
                <button className="btn btn-primary" onClick={() => setShowAnimal(true)}>+ Agregar animal</button>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Arete</th>
                      <th>Raza</th>
                      <th>Peso inicial</th>
                      <th>Peso actual</th>
                      <th>Ganancia</th>
                      <th>Precio compra</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {animales.map((animal) => {
                      const ganancia = animal.pesoActual - animal.pesoInicial;
                      return (
                        <tr key={animal.id}>
                          <td><strong>{animal.numeroArete}</strong></td>
                          <td>{animal.raza}</td>
                          <td>{formatKg(animal.pesoInicial)}</td>
                          <td>{formatKg(animal.pesoActual)}</td>
                          <td className={ganancia >= 0 ? 'text-success' : 'text-danger'}>
                            {ganancia >= 0 ? '+' : ''}{formatKg(ganancia)}
                          </td>
                          <td>{formatColones(animal.precioCompra)}</td>
                          <td>
                            <span className={`badge ${animal.estado === 'activo' ? 'badge-green' : animal.estado === 'vendido' ? 'badge-yellow' : 'badge-red'}`}>
                              {animal.estado}
                            </span>
                          </td>
                          <td>
                            <div className="flex gap-1">
                              {animal.estado === 'activo' && (
                                <>
                                  <button className="btn btn-ghost btn-sm" title="Registrar peso" onClick={() => { setAnimalPeso(animal); setShowPeso(true); }}>
                                    ⚖️
                                  </button>
                                  <button className="btn btn-ghost btn-sm" title="Editar animal" onClick={() => setEditAnimal(animal)}>
                                    ✏️
                                  </button>
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    title="Eliminar animal"
                                    style={{ color: 'var(--color-danger, #dc3545)' }}
                                    onClick={() => setDeleteAnimal(animal)}
                                  >
                                    🗑️
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
```

New (uses `animalesFiltrados`, adds search input, table gets `animals-table-wrap` class — cards will be added in Task 5):

```tsx
          {/* ── Tab Animales ── */}
          {tab === 'animales' && (
            animales.length === 0 ? (
              <div className="empty-state">
                <div className="emoji">🐄</div>
                <h3>Sin animales aún</h3>
                <p>Agregá el primer animal a este lote</p>
                <button className="btn btn-primary" onClick={() => setShowAnimal(true)}>+ Agregar animal</button>
              </div>
            ) : (
              <>
                {/* Arete search */}
                <div className="arete-search-wrap">
                  <input
                    type="search"
                    className="form-input arete-search"
                    placeholder="Buscar por arete…"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                  />
                </div>

                {animalesFiltrados.length === 0 ? (
                  <div className="empty-state">
                    <div className="emoji">🔍</div>
                    <h3>Sin resultados</h3>
                    <p>No hay animales con arete "{filterText}"</p>
                  </div>
                ) : (
                  <div className="table-wrap animals-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Arete</th>
                          <th>Raza</th>
                          <th>Peso inicial</th>
                          <th>Peso actual</th>
                          <th>Ganancia</th>
                          <th>Precio compra</th>
                          <th>Estado</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {animalesFiltrados.map((animal) => {
                          const ganancia = animal.pesoActual - animal.pesoInicial;
                          return (
                            <tr key={animal.id}>
                              <td><strong>{animal.numeroArete}</strong></td>
                              <td>{animal.raza}</td>
                              <td>{formatKg(animal.pesoInicial)}</td>
                              <td>{formatKg(animal.pesoActual)}</td>
                              <td className={ganancia >= 0 ? 'text-success' : 'text-danger'}>
                                {ganancia >= 0 ? '+' : ''}{formatKg(ganancia)}
                              </td>
                              <td>{formatColones(animal.precioCompra)}</td>
                              <td>
                                <span className={`badge ${animal.estado === 'activo' ? 'badge-green' : animal.estado === 'vendido' ? 'badge-yellow' : 'badge-red'}`}>
                                  {animal.estado}
                                </span>
                              </td>
                              <td>
                                <div className="flex gap-1">
                                  {animal.estado === 'activo' && (
                                    <>
                                      <button className="btn btn-ghost btn-sm" title="Registrar peso" onClick={() => { setAnimalPeso(animal); setShowPeso(true); }}>
                                        ⚖️
                                      </button>
                                      <button className="btn btn-ghost btn-sm" title="Editar animal" onClick={() => setEditAnimal(animal)}>
                                        ✏️
                                      </button>
                                      <button
                                        className="btn btn-ghost btn-sm"
                                        title="Eliminar animal"
                                        style={{ color: 'var(--color-danger, #dc3545)' }}
                                        onClick={() => setDeleteAnimal(animal)}
                                      >
                                        🗑️
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )
          )}
```

- [ ] **Step 3: Add search input styles to `src/pages/LoteDetalle.css`**

Append at the end of `LoteDetalle.css` (after the `.venta-detalle` block):

```css
/* ─── Search filter ──────────────────────────────────────────────────────── */
.arete-search-wrap {
  display: flex;
  justify-content: flex-end;
  margin: 0.75rem 0 0.5rem;
}
.arete-search {
  width: 220px;
}
@media (max-width: 640px) {
  .arete-search-wrap { justify-content: stretch; }
  .arete-search      { width: 100%; }
}
```

- [ ] **Step 4: Verify the filter works manually**

Navigate to a lote with animals. In the "Buscar por arete…" input:
- Type `BN-001` → only one row shows
- Type `BN` → all Brahman Norte animals show
- Type `ZZZZ` → no-results empty state with the emoji 🔍 appears
- Clear the input → all animals reappear

At 390px in DevTools: search input is full-width. At 1280px: 220px wide, right-aligned.

- [ ] **Step 5: Commit**

```bash
git add src/pages/LoteDetalle.tsx src/pages/LoteDetalle.css
git commit -m "feat: real-time arete search filter in LoteDetalle"
```

---

### Task 5: Animal cards on mobile + filter regression test

**Files:**
- Modify: `src/pages/LoteDetalle.tsx`
- Modify: `src/pages/LoteDetalle.css`
- Create: `tests/responsive/filter.spec.ts`

Both the table (`.animals-table-wrap`) and the cards (`.animals-cards`) live in the DOM. CSS shows one and hides the other based on viewport.

- [ ] **Step 1: Write the failing Playwright test**

Create directory and file:

```bash
mkdir -p tests/responsive
```

Create `tests/responsive/filter.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

// Requires seeded data (npm run seed) and a Firebase test account.
// Set TEST_EMAIL and TEST_PASSWORD env vars to your Firebase login credentials.
const TEST_EMAIL    = process.env.TEST_EMAIL    ?? '';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';

test.describe('Arete filter', () => {
  test.setTimeout(30_000);

  test.beforeEach(async ({}, testInfo) => {
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      testInfo.skip(true, 'Set TEST_EMAIL and TEST_PASSWORD env vars to run responsive filter tests.');
    }
  });

  async function login(page: ReturnType<import('@playwright/test').BrowserContext['newPage']>) {
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/');
  }

  test('shows search input and filters animal rows in real time', async ({ page }) => {
    await login(page);

    // Navigate to first lote
    await page.locator('.lote-card').first().click();
    await page.waitForURL(/\/lote\//);

    // Search input must be present
    const searchInput = page.locator('input.arete-search');
    await expect(searchInput).toBeVisible();

    // Count total animal rows in the table (table is always in DOM, even if CSS-hidden on mobile)
    const rows = page.locator('table tbody tr');
    const totalCount = await rows.count();
    expect(totalCount).toBeGreaterThan(0);

    // Get the arete from the first row
    const firstArete = (await rows.first().locator('td').first().innerText()).trim();

    // Filter to just that one animal
    await searchInput.fill(firstArete);
    await expect(rows).toHaveCount(1);
    const visibleArete = (await rows.first().locator('td').first().innerText()).trim();
    expect(visibleArete).toBe(firstArete);

    // Clear — all animals reappear
    await searchInput.fill('');
    await expect(rows).toHaveCount(totalCount);
  });

  test('shows empty-state when no animals match filter', async ({ page }) => {
    await login(page);

    await page.locator('.lote-card').first().click();
    await page.waitForURL(/\/lote\//);

    await page.locator('input.arete-search').fill('ZZZZ-NO-EXISTE');
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('table')).not.toBeVisible();
  });

  test('mobile cards are in the DOM when animals exist', async ({ page }) => {
    await login(page);

    await page.locator('.lote-card').first().click();
    await page.waitForURL(/\/lote\//);

    // .animals-cards is always in the DOM (CSS hides it on desktop, shows on mobile)
    const cards = page.locator('.animal-card');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Card count must equal table row count
    const rowCount = await page.locator('table tbody tr').count();
    expect(cardCount).toBe(rowCount);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```
npx playwright test tests/responsive/filter.spec.ts --reporter=list
```

Expected: SKIP (if TEST_EMAIL not set) or FAIL with `locator('.animal-card') → 0 elements found` (if credentials are provided and seeded data exists).

- [ ] **Step 3: Add animal card styles to `src/pages/LoteDetalle.css`**

Append after the `.arete-search` media query (added in Task 4):

```css
/* ─── Animal cards (mobile) ─────────────────────────────────────────────── */
.animals-table-wrap { display: block; }
.animals-cards      { display: none; }

@media (max-width: 640px) {
  .animals-table-wrap { display: none; }
  .animals-cards      { display: flex; flex-direction: column; gap: 0.75rem; }
}

.animal-card {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.9rem 1rem;
  box-shadow: var(--shadow);
}
.animal-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.6rem;
}
.animal-card-arete {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-primary-dark);
}
.animal-card-data {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.3rem 1rem;
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
  color: var(--color-text-muted);
}
.animal-card-data strong {
  color: var(--color-text);
}
.animal-card-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
.animal-card-actions .btn {
  min-width: 40px;
  min-height: 36px;
  justify-content: center;
}
```

- [ ] **Step 4: Add `.animals-cards` section to the animales tab in `src/pages/LoteDetalle.tsx`**

In the animales tab (added in Task 4), find the non-empty branch. It currently renders only `<div className="table-wrap animals-table-wrap">`. Wrap the table div and a new cards div in a fragment.

Replace:
```tsx
                ) : (
                  <div className="table-wrap animals-table-wrap">
                    <table>
```

With:
```tsx
                ) : (
                  <>
                    {/* Desktop: tabla */}
                    <div className="table-wrap animals-table-wrap">
                      <table>
```

Then find the closing of the table div. It currently ends with:
```tsx
                  </div>
                )}
```

Replace that closing with:
```tsx
                    </div>

                    {/* Mobile: cards */}
                    <div className="animals-cards">
                      {animalesFiltrados.map((animal) => {
                        const ganancia = animal.pesoActual - animal.pesoInicial;
                        return (
                          <div key={animal.id} className="animal-card">
                            <div className="animal-card-header">
                              <span className="animal-card-arete">{animal.numeroArete}</span>
                              <span className={`badge ${animal.estado === 'activo' ? 'badge-green' : animal.estado === 'vendido' ? 'badge-yellow' : 'badge-red'}`}>
                                {animal.estado}
                              </span>
                            </div>
                            <div className="animal-card-data">
                              <span>Raza: <strong>{animal.raza}</strong></span>
                              <span>Precio: <strong>{formatColones(animal.precioCompra)}</strong></span>
                              <span>Peso ini: <strong>{formatKg(animal.pesoInicial)}</strong></span>
                              <span>Peso act: <strong>{formatKg(animal.pesoActual)}</strong></span>
                              <span className={ganancia >= 0 ? 'text-success' : 'text-danger'}>
                                Ganancia: <strong>{ganancia >= 0 ? '+' : ''}{formatKg(ganancia)}</strong>
                              </span>
                            </div>
                            {animal.estado === 'activo' && (
                              <div className="animal-card-actions">
                                <button className="btn btn-ghost btn-sm" title="Registrar peso" onClick={() => { setAnimalPeso(animal); setShowPeso(true); }}>⚖️</button>
                                <button className="btn btn-ghost btn-sm" title="Editar" onClick={() => setEditAnimal(animal)}>✏️</button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  title="Eliminar"
                                  style={{ color: 'var(--color-danger, #dc3545)' }}
                                  onClick={() => setDeleteAnimal(animal)}
                                >🗑️</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
```

- [ ] **Step 5: Run the filter test with credentials**

```
TEST_EMAIL=tu@email.com TEST_PASSWORD=tupassword npx playwright test tests/responsive/filter.spec.ts --reporter=list
```

Expected: All 3 tests PASS.

- [ ] **Step 6: Verify animal cards visually at 390px**

At 390px in DevTools, navigate to a lote with animals:
- Cards visible; one card per animal showing: arete (bold), status badge, raza, precio, peso inicial, peso actual, ganancia
- Action buttons (⚖️ ✏️ 🗑️) at bottom-right, each at least 40px wide and 36px tall
- Arete search still works — cards filter in sync with the table (both use `animalesFiltrados`)

At 1280px: table visible, `.animals-cards` hidden — no regression.

- [ ] **Step 7: Commit**

```bash
git add src/pages/LoteDetalle.tsx src/pages/LoteDetalle.css tests/responsive/filter.spec.ts
git commit -m "feat: animal cards on mobile, filter regression test"
```

---

### Task 6: LoteDetalle header — condensed 3-column stats on mobile

**Files:**
- Modify: `src/pages/LoteDetalle.css`

The green header has 5 stat cards (Activos, Vendidos, Invertido, Gastos, Utilidad). The default `stats-grid` with `minmax(150px, 1fr)` shows 2 columns on 390px. Override to 3 columns inside `.detalle-header` so all 5 fit in 2 rows (3+2) instead of 3 rows (2+2+1).

- [ ] **Step 1: Append header stats override to `src/pages/LoteDetalle.css`**

Append at the end of the file (after the `.animal-card-actions .btn` block):

```css
/* ─── Header stats — 3 col on mobile ────────────────────────────────────── */
@media (max-width: 640px) {
  .detalle-header .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .detalle-header .stat-card {
    padding: 0.55rem 0.4rem;
  }
  .detalle-header .stat-value {
    font-size: 0.95rem !important;
  }
  .detalle-header .stat-label {
    font-size: 0.62rem !important;
  }
  .detalle-titulo {
    font-size: 1.15rem;
  }
  .detalle-acciones {
    margin-top: 0.5rem;
    width: 100%;
  }
  .detalle-acciones .btn {
    font-size: 0.78rem;
    padding: 0.4rem 0.8rem;
  }
}
```

- [ ] **Step 2: Verify visually**

At 390px, navigate to any lote.

Expected in the green header:
- Row 1: Activos · Vendidos · Invertido (3 columns)
- Row 2: Gastos · Utilidad (2 columns, left-aligned)
- No horizontal overflow or clipping
- All numbers readable at ~0.95rem

- [ ] **Step 3: Commit**

```bash
git add src/pages/LoteDetalle.css
git commit -m "feat: 3-column condensed stats in LoteDetalle header on mobile"
```

---

### Task 7: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Run `npm run build` to verify TypeScript compiles cleanly**

```
npm run build
```

Expected: Build succeeds with 0 TypeScript errors. If errors appear, fix them before proceeding.

- [ ] **Step 2: Run existing Playwright suite to check for regressions**

```
npx playwright test --reporter=list
```

Expected: All existing tests pass. The responsive filter tests SKIP if TEST_EMAIL is not set (that's fine — skipped ≠ failed).

- [ ] **Step 3: Cross-device manual verification checklist**

Use Chrome DevTools → Toggle device toolbar:

| Device | Viewport | What to check |
|--------|----------|---------------|
| iPhone SE | 375×667 | Cards visible, search input full-width, bottom-sheet modal, hamburger nav |
| iPhone 16 Pro Max | 430×932 | Same as above — more comfortable spacing |
| iPad Mini | 768×1024 | Table visible (not cards), centered modal, no hamburger (`≥641px`) |
| Desktop | 1280×800 | All current layouts unchanged — table, centered modal, full navbar |

For each viewport: open a lote, verify the tabs are sticky when scrolling through animals.

- [ ] **Step 4: Commit any remaining fixes**

If any visual issues were found and fixed in Step 3:

```bash
git add src/pages/LoteDetalle.css src/pages/LoteDetalle.tsx src/index.css src/pages/Dashboard.css src/pages/Dashboard.tsx
git commit -m "fix: responsive polish after cross-device verification"
```
