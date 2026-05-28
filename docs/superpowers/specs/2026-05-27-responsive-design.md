# Responsive Design — GanaCR

**Date:** 2026-05-27  
**Status:** Approved

---

## Goal

Make GanaCR fully usable on any device (phone, tablet, desktop) with a mobile-first approach, targeting ganaderos who primarily use their phones in the field — often with gloves, in low-connectivity zones.

---

## Breakpoints

Three breakpoints, defined as CSS custom properties and media queries:

| Name    | Range         | Target use case                        |
|---------|---------------|----------------------------------------|
| Mobile  | ≤ 640 px      | Phones (iPhone SE → 390 px baseline)   |
| Tablet  | 641 – 1024 px | iPad mini, small laptops               |
| Desktop | ≥ 1025 px     | Full-size screens, existing layout     |

Implementation: CSS-only via `@media (max-width: 640px)` / `@media (min-width: 641px) and (max-width: 1024px)`. No JS breakpoint logic.

---

## 1 — Navbar / Header

- **Desktop (≥1025px):** current layout unchanged — horizontal nav, logo left, links right.
- **Tablet (641–1024px):** same as desktop; no change needed.
- **Mobile (≤640px):** full-width top bar with app name centered; hide nav links; add hamburger icon → dropdown menu overlay with links (Inicio, Lotes, Cerrar sesión). Hamburger state managed with a CSS checkbox hack or minimal vanilla JS toggle (no library).

---

## 2 — Dashboard

- **Desktop:** current card grid unchanged.
- **Mobile:** lote cards stack to single column. Stats numbers increase font size slightly for readability. "Nuevo lote" button: full-width at bottom of screen as a fixed action button, or inline top-right — decision at implementation time, prefer inline to avoid covering content.

---

## 3 — LoteDetalle — animal table → cards

### Desktop (≥1025px)
Current `<table>` with all 8 columns remains unchanged.

### Mobile (≤640px)
Replace the table with a **card-per-animal** layout:

Each card shows:
```
┌─────────────────────────────────┐
│ BN-001                [activo]  │
│ Raza: Brahman   Precio: ₡295k   │
│ Peso ini: 380 kg  Peso act: 420 kg │
│            [⚖️]  [✏️]  [🗑️]    │
└─────────────────────────────────┘
```

- Arete as card title (bold, 14px)
- Status badge top-right
- 2-column grid for data fields
- Action buttons bottom-right, large touch targets (min 36×36 px)

### Tablet (641–1024px)
Table remains visible but with smaller font and tighter padding. Optionally hide the "Ganancia" column to fit better — decided at implementation.

### Arete search/filter
A real-time search input appears **above the table/cards on all breakpoints**:
- Input: `placeholder="Buscar por arete…"`
- Client-side filtering (no Firestore queries) → works fully offline
- Filters as user types (no submit button needed)
- On mobile: full-width input; on desktop: right-aligned, ~200px wide
- Implementation in `LoteDetalle.tsx`: maintain a `filterText` state, apply `.filter()` on the local animals array before render

---

## 4 — LoteDetalle — sticky tabs

On mobile, the tab bar (`Animales | Gastos | Pesajes | Ventas`) becomes **sticky** at the top of the viewport (below the page header) so the user can switch tabs without scrolling back up.

- CSS: `position: sticky; top: 0; z-index: 10; background: white`
- Applies at all breakpoints but matters most on mobile
- Active tab: green underline / bold, same as current style

---

## 5 — Modals → Bottom-sheet on mobile

On mobile (≤640px), all modals (`CrearLote`, `AgregarAnimal`, `AgregarGasto`, `RegistrarPeso`, `VenderAnimales`) switch from centered overlay to **bottom-sheet**:

- Anchored to bottom of viewport
- `width: 100%; border-radius: 16px 16px 0 0`
- Slides up with a CSS transition: `transform: translateY(0)` from `translateY(100%)`
- Max-height: 85vh with internal scroll
- Close button (×) top-right, min 44px touch target
- Backdrop remains (tap to close)

On tablet and desktop: current centered modal layout unchanged.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Mobile navbar, hamburger, global layout adjustments |
| `src/pages/Dashboard.css` | Mobile card stacking, action button |
| `src/pages/LoteDetalle.css` | Sticky tabs, animal cards, bottom-sheet modals, search input |
| `src/pages/Login.css` | Minor: center form on mobile (likely already works) |
| `src/pages/LoteDetalle.tsx` | Add `filterText` state + filter logic; conditionally render table vs cards based on `window.innerWidth` or CSS-driven with a hidden/visible class approach |

### Preferred approach for table↔cards toggle
Use **CSS-only**: the table has class `.animals-table` (hidden on mobile via `display:none`), and a `.animals-cards` container is shown on mobile (`display:none` on desktop). Both rendered in the DOM, toggled purely with CSS media queries. No JS resize listeners. This keeps `LoteDetalle.tsx` changes minimal — only add the `filterText` state and filter logic.

---

## Out of Scope

- Multiple fincas support (separate feature)
- Excel bulk import (separate feature)
- PWA / install prompt (future phase)
- Landscape-specific layouts
- Dark mode

---

## Success Criteria

1. On a 390px viewport, the animal list displays as cards with large touch targets.
2. On a 390px viewport, the arete search input is visible and filters in real time.
3. On a 390px viewport, tabs are sticky — visible at top while scrolling through 120 animals.
4. On a 390px viewport, opening any modal slides a bottom-sheet from below.
5. On a 1280px viewport, all current layouts are visually unchanged.
6. No external libraries added.
7. Works offline (all filtering is client-side).
