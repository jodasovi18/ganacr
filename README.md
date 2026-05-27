# 🐄 GanaCR — Sistema de Gestión Ganadera

Sistema web para gestión de inventario de ganado, control de pesos, gastos y ventas. Diseñado para ganaderos de Costa Rica, con soporte offline y modelo "a medias".

---

## ✅ Estado del MVP

| Módulo | Estado |
|--------|--------|
| Autenticación (login/registro) | ✅ Completo |
| Dashboard con estadísticas | ✅ Completo |
| Crear lotes (propio / a medias) | ✅ Completo |
| Agregar animales al lote | ✅ Completo |
| Registrar pesajes | ✅ Completo |
| Registrar gastos | ✅ Completo |
| Vender animales con cálculo automático | ✅ Completo |
| División automática utilidades (a medias) | ✅ Completo |
| Funcionamiento offline | ✅ Completo |
| Diseño responsive móvil | ✅ Completo |

---

## 🚀 Instalación y configuración

### Requisitos
- Node.js 18 o superior
- Cuenta en Firebase (gratuita)

### Paso 1: Instalar dependencias

```bash
npm install
```

### Paso 2: Crear proyecto en Firebase

1. Ir a https://console.firebase.google.com/
2. **"Crear proyecto"** → nombre: `ganacr` (o el que querás)
3. Desactivar Google Analytics (no es necesario)

### Paso 3: Habilitar Authentication

1. En Firebase Console → **Authentication** → **Get started**
2. Pestaña **Sign-in method** → Habilitar **Email/Password**

### Paso 4: Crear base de datos Firestore

1. En Firebase Console → **Firestore Database** → **Create database**
2. Elegir **Start in test mode** (luego aplicás las reglas de seguridad)
3. Elegir región: `us-central1` o la más cercana

### Paso 5: Obtener credenciales

1. Firebase Console → ⚙️ **Project settings** → **Your apps**
2. Click en **</>** (Web app) → registrar app con nombre `ganacr`
3. Copiá el objeto `firebaseConfig` que aparece

### Paso 6: Configurar credenciales en el proyecto

Abrí el archivo `src/services/firebase.ts` y reemplazá los valores:

```typescript
const firebaseConfig = {
  apiKey: "TU_API_KEY",              // ← reemplazar
  authDomain: "TU_PROJECT_ID.firebaseapp.com",
  projectId: "TU_PROJECT_ID",        // ← reemplazar
  storageBucket: "TU_PROJECT_ID.appspot.com",
  messagingSenderId: "TU_SENDER_ID", // ← reemplazar
  appId: "TU_APP_ID",               // ← reemplazar
};
```

### Paso 7: Aplicar reglas de seguridad (recomendado)

1. Firebase Console → **Firestore** → pestaña **Rules**
2. Copiá el contenido de `firestore.rules` y pegalo ahí
3. Click en **Publish**

### Paso 8: Ejecutar en desarrollo

```bash
npm run dev
```

La app estará en http://localhost:5173

---

## 📱 Guía de uso

### Crear un lote
1. Click en **"+ Nuevo Lote"** en el dashboard
2. Ingresá nombre, fecha de compra
3. Elegí: **Propio** o **A medias** (con nombre del socio y porcentaje)

### Agregar animales
1. Entrá al lote → click en **"+ Animal"**
2. Completá: arete, raza, peso inicial, precio de compra
3. El sistema registra el animal y actualiza la inversión del lote

### Registrar pesaje
1. En la lista de animales → click en **"⚖️ Peso"**
2. Ingresá el nuevo peso — muestra automáticamente el cambio

### Registrar gastos
1. Click en **"+ Gasto"** dentro del lote
2. Seleccioná tipo: alimento, veterinario, mano de obra, transporte
3. Si es a medias, podés indicar quién pagó

### Vender animales
1. Click en **"💰 Vender"**
2. Seleccioná los animales a vender con checkbox
3. Ingresá precio de venta (y peso final opcional)
4. El sistema calcula automáticamente:
   - Inversión de los animales vendidos
   - Gastos proporcionales
   - Utilidad bruta
   - División por socio (si es a medias)

---

## 🗂️ Estructura del proyecto

```
ganacr/
├── src/
│   ├── components/
│   │   ├── CrearLoteModal.tsx
│   │   ├── AgregarAnimalModal.tsx
│   │   ├── AgregarGastoModal.tsx
│   │   ├── RegistrarPesoModal.tsx
│   │   └── VenderAnimalesModal.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── hooks/
│   │   ├── useLotes.ts
│   │   ├── useAnimales.ts
│   │   ├── useGastos.ts
│   │   ├── usePesos.ts
│   │   └── useVentas.ts
│   ├── pages/
│   │   ├── Login.tsx / Login.css
│   │   ├── Dashboard.tsx / Dashboard.css
│   │   └── LoteDetalle.tsx / LoteDetalle.css
│   ├── services/
│   │   └── firebase.ts         ← AQUÍ van tus credenciales
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   └── calculadora.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── firestore.rules
├── package.json
└── README.md
```

---

## 📌 Próximos pasos sugeridos (con Claude Code)

- [ ] Módulo de vacunas y tratamientos por animal
- [ ] Reporte PDF de lote para enviar al socio
- [ ] Módulo de trazabilidad SENASA (areteo, guías de movilización)
- [ ] Control de partos
- [ ] Gráficos de evolución de peso
- [ ] Export a Excel de inventario y ventas

---

## 🔧 Stack tecnológico

- **Frontend:** React 18 + TypeScript
- **Build:** Vite 5
- **Routing:** React Router DOM 6
- **Backend:** Firebase (Firestore + Auth)
- **Offline:** Firestore IndexedDB Persistence
- **Estilos:** CSS vanilla con variables CSS
