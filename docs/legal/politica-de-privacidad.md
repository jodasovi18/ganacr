# Política de Privacidad — GanaCR

> ⚠️ **BORRADOR — requiere revisión de un(a) abogado(a) costarricense antes de publicarse.**
> Este texto es una base técnica preparada según el funcionamiento real del sistema; **no constituye
> asesoría legal**. Completá los campos entre `[corchetes]` y validalo con un profesional antes de
> mostrarlo a usuarios reales.

**Última actualización:** [fecha] · **Vigencia a partir de:** [fecha]

GanaCR ("la Aplicación", "el Servicio", "nosotros") respeta tu privacidad y protege tus datos
personales conforme a la **Ley N° 8968 — Protección de la Persona frente al tratamiento de sus datos
personales** de Costa Rica y su Reglamento (Decreto Ejecutivo N° 37554-JP). Esta política explica qué
datos tratamos, con qué fin, con quién los compartimos y cuáles son tus derechos.

## 1. Responsable del tratamiento

- **Responsable:** [Nombre completo o razón social]
- **Identificación:** [cédula de identidad o jurídica]
- **Domicilio:** [domicilio en Costa Rica]
- **Correo de contacto para privacidad:** [ej. privacidad@ganacr.com]

## 2. Qué datos personales tratamos

| Categoría | Datos | Origen |
|---|---|---|
| **Datos de cuenta** | Nombre, correo electrónico, contraseña | Los proporcionás al registrarte |
| **Datos de uso del Servicio** | Información de fincas, lotes, animales, pesajes, gastos y ventas | Los ingresás vos |
| **Datos de terceros que ingresás** | Nombre de socios (en sociedades "a medias") | Los ingresás vos |
| **Datos técnicos** | Registros de errores de la aplicación | Generados automáticamente |

- La **contraseña** se gestiona mediante Firebase Authentication (Google) de forma cifrada;
  **nosotros no almacenamos ni vemos tu contraseña en texto claro**.
- Los **registros de errores** se capturan con Sentry y están configurados para **no enviar datos
  personales por defecto** (`sendDefaultPii: false`).
- **Datos de terceros (socios):** al ingresar el nombre de un socio, declarás que contás con base
  legítima para hacerlo (por ejemplo, la relación contractual de la sociedad).

## 3. Finalidad del tratamiento

Tratamos tus datos para:

1. Prestarte el servicio de gestión ganadera (crear y administrar fincas, lotes, animales, etc.).
2. Autenticarte y mantener la seguridad de tu cuenta.
3. Brindar soporte y responder tus consultas.
4. Detectar y corregir errores y mejorar el Servicio.
5. Cumplir obligaciones legales aplicables.

**No vendemos tus datos** ni los usamos para publicidad de terceros.

## 4. Base de legitimación

El tratamiento se basa en tu **consentimiento informado** (que otorgás al aceptar esta política y los
Términos y Condiciones al registrarte) y en la **ejecución de la relación contractual** para prestarte
el Servicio.

## 5. Encargados y destinatarios (sub-procesadores)

Para operar, el Servicio se apoya en proveedores que tratan datos por cuenta nuestra:

| Proveedor | Función | Tratamiento |
|---|---|---|
| **Google Firebase** (Firestore, Authentication, App Check) | Base de datos y autenticación | Almacena tus datos del Servicio y credenciales |
| **Vercel** | Alojamiento de la aplicación web | Sirve la aplicación |
| **Sentry** | Monitoreo de errores | Recibe registros técnicos de errores |

**Transferencia internacional de datos:** estos proveedores procesan y almacenan datos en servidores
**fuera de Costa Rica** (por ejemplo, en Estados Unidos). Al usar el Servicio, consentís dicha
transferencia. Cada proveedor mantiene sus propias medidas de seguridad y cumplimiento.

## 6. Conservación de los datos

Conservamos tus datos mientras mantengas una cuenta activa y durante el período posterior necesario
para cumplir obligaciones legales o resolver disputas. Podés solicitar la eliminación según la
sección 8. Por motivos de seguridad, los datos pueden permanecer en **copias de respaldo** por un
tiempo limitado antes de ser sobreescritas.

## 7. Medidas de seguridad

Aplicamos medidas técnicas y organizativas razonables, entre ellas:

- **Cifrado en tránsito** (HTTPS) en toda la comunicación.
- **Aislamiento por usuario** a nivel de base de datos: reglas de seguridad que garantizan que cada
  usuario solo accede a **sus** datos.
- **Control anti-abuso** (App Check / reCAPTCHA) contra accesos automatizados.
- **Respaldos** periódicos de la información.

Ningún sistema es 100% infalible, pero trabajamos para proteger tu información de accesos no
autorizados, pérdida o alteración.

## 8. Tus derechos (Ley 8968)

Tenés derecho a **acceder, rectificar, actualizar y eliminar** tus datos personales, así como a
**revocar tu consentimiento**. Para ejercerlos, escribí a **[correo de contacto]**. Responderemos en
los plazos que establece la normativa (en general, **cinco días hábiles**).

Si considerás que tus derechos no fueron atendidos, podés acudir a la **Agencia de Protección de
Datos de los Habitantes (PRODHAB)**, órgano competente en Costa Rica.

## 9. Menores de edad

El Servicio está dirigido a personas mayores de edad. No recopilamos conscientemente datos de menores.

## 10. Cambios a esta política

Podemos actualizar esta política. Publicaremos la versión vigente con su fecha y, ante cambios
sustanciales, te lo notificaremos por un medio razonable.

## 11. Contacto

Para cualquier consulta sobre privacidad: **[correo de contacto]**.

---

*Nota interna (borrar antes de publicar): evaluar con asesoría legal si la base de datos debe
inscribirse ante PRODHAB y los requisitos del protocolo de seguridad que exige el Reglamento.*
