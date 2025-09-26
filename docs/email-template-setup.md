# Configuración del Template de Email Personalizado

## Opción 1: Dashboard de Supabase (Recomendado)

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **Authentication > Email Templates**
3. Selecciona **"Confirm signup"**
4. Copia el contenido del archivo `templates/email-confirmation.html`
5. Pégalo en el editor del dashboard
6. Guarda los cambios

## Opción 2: SMTP Personalizado

Si necesitas más control, puedes configurar un proveedor SMTP personalizado:

1. Ve a **Settings > Authentication**
2. Configura tu proveedor SMTP (Gmail, SendGrid, etc.)
3. Usa el template personalizado con tu proveedor

## Variables Disponibles

Supabase reemplaza automáticamente estas variables:
- `{{ .ConfirmationURL }}` - Link de confirmación
- `{{ .Email }}` - Email del usuario
- `{{ .SiteURL }}` - URL de tu sitio

## Notas Importantes

- El template debe ser HTML válido
- Los estilos CSS deben ser inline para mejor compatibilidad
- Prueba el template enviándote un email de confirmación
