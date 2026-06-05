# Contenido legal (fuente única)

Estos `.md` son la **fuente única** del texto legal que **renderiza la aplicación** en
`/terminos` y `/privacidad` (vía `react-markdown`). Editá **acá** y se refleja en la app.

- `terminos.md` → página `/terminos`
- `privacidad.md` → página `/privacidad`

> ⚠️ Este README es interno (no se muestra a usuarios). Los `.md` de arriba **sí** se muestran tal
> cual, así que **no** pongas notas internas dentro de ellos.

> Esta es la **fuente única**: se eliminó la copia duplicada que había en `docs/legal/` para evitar
> que el texto divergiera. Editá el contenido legal **solo acá**.

## ⚠️ Pendiente antes de la beta (NO publicar sin esto)

1. **Revisión por un(a) abogado(a) costarricense.** El texto es una base técnica, no asesoría legal.
2. **Datos del titular:** ✅ completados (José Daniel Solís Villalobos / SOLARA Soft, 05/06/2026).
   Actualizá acá si cambian. Confirmar con el abogado la coherencia "responsable (persona) vs.
   titular del software (SOLARA Soft)".
3. **Evaluar inscripción ante PRODHAB** y los requisitos del protocolo de seguridad del Reglamento.

## Versionado del consentimiento

Cuando cambie el texto de forma sustancial, subí `VERSION_TERMINOS` en
`src/contexts/AuthContext.tsx` para registrar qué versión aceptó cada persona usuaria.
