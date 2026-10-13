# Publicación de prueba en Vercel

Esta guía configura una instancia para probar el flujo completo con un emprendimiento. No agregues claves secretas al repositorio ni uses la clave `service_role` en variables `NEXT_PUBLIC_*`.

## 1. Preparar Supabase

1. En el proyecto de Supabase, abrí **SQL Editor**.
2. Pegá y ejecutá el contenido de [`src/lib/supabase/schema.sql`](./src/lib/supabase/schema.sql). Crea las tablas, activa RLS, aplica las políticas y los permisos, y solicita recargar el esquema de la Data API.
3. Confirmá en **Table Editor** que existan `business_profiles` y `products`.
4. En **Authentication → URL Configuration**, configurá:
   - **Site URL** con el dominio de producción de Vercel.
   - **Redirect URLs** con `http://localhost:3000/auth/callback`, el dominio de producción seguido de `/auth/callback` y, si vas a usar Preview Deployments, `https://*-<team-or-account-slug>.vercel.app/auth/callback` usando el slug de tu equipo/cuenta.
5. En **Authentication → Providers → Email**, decidí si las cuentas de prueba requieren confirmación de correo. Si la confirmación está activa, los enlaces deben abrirse en el mismo entorno donde se registró el usuario (local, preview o producción).

Si la app muestra que falta una tabla después de ejecutar el SQL, verificá que esté en el esquema `public`, que `public` esté expuesto en la configuración de la Data API y que la recarga de esquema haya terminado. El mensaje de la app identifica este caso.

## 2. Desplegar en Vercel

1. Importá el repositorio `Tekobc/CalculadoraCostos` en Vercel. Se detecta como Next.js; no requiere un `vercel.json` personalizado.
2. En **Settings → Environment Variables**, agregá para los entornos que vayas a probar:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave publishable del proyecto.
   - Opcional: `GEMINI_API_KEY` o `GROQ_API_KEY` para análisis asistido. Sin estas variables, el onboarding usa la propuesta heurística local.
3. Guardá las variables y lanzá un nuevo deployment para que queden incluidas en el build.
4. Añadí el dominio asignado por Vercel a **Redirect URLs** de Supabase antes de probar el registro o la confirmación de correo.

No configures una clave `service_role` o `secret` en Vercel como variable pública. La app utiliza la clave publishable en el navegador y las políticas RLS para aislar los datos.

## 3. Prueba de punta a punta

1. Abrí el dominio desplegado e iniciá sesión con el usuario de prueba.
2. Completá el onboarding y guardá el perfil del emprendimiento.
3. Creá un producto o servicio, ingresá costos reales y recargá la página.
4. Confirmá que el perfil y el producto persistan y que los costos/precios sigan iguales.
5. Cerrá sesión y volvé a iniciarla para verificar la carga de la cuenta.

El modo demostración usa ejemplos locales; no se guardan en la cuenta ni reemplazan los datos del emprendimiento.
