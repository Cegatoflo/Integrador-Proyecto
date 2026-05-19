# Configuración de "Olvidé mi Contraseña" ✅

## Flujo Implementado

### **Frontend** 📱
1. Usuario hace clic en "¿Olvidaste tu contraseña?" desde el login
2. Se redirige a `/forgot-password`
3. **Paso 1**: Ingresa su correo electrónico
4. **Paso 2**: Recibe un código temporal por correo y lo ingresa junto con su nueva contraseña
5. Contraseña se actualiza exitosamente

### **Backend** 🔧
1. Ruta `POST /api/auth/forgot-password` → Genera código temporal y envía correo
2. Ruta `POST /api/auth/reset-password` → Valida código y actualiza contraseña

## Variables de Entorno Necesarias

Asegúrate de tener estas en tu `.env`:

```env
# Correo (Gmail)
EMAIL_USER="tu-email@gmail.com"
EMAIL_PASS="tu-contraseña-app-gmail"
ADMIN_EMAIL="admin@tomodas.com"

# Servidor
FRONTEND_URL="http://localhost:3000"

# Base de datos
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

### ⚠️ Importante para Gmail:
1. Habilita la verificación en dos pasos en tu cuenta de Google
2. Genera una **contraseña de aplicación**: https://myaccount.google.com/apppasswords
3. Usa esa contraseña en `EMAIL_PASS`, no tu contraseña normal

## Archivos Modificados ✨

- ✅ `/frontend/src/frontend/components/auth/loginForm.tsx` - Removido modal, ahora redirige
- ✅ `/frontend/src/app/forgot-password/page.tsx` - Implementado flujo de 2 pasos
- ✅ `/frontend/src/app/page.tsx` - Removido código duplicado
- ✅ `/backend/src/routes/auth.ts` - Ya tiene `forgot-password` y `reset-password`
- ✅ `/backend/src/lib/email.ts` - Ya tiene función para enviar correos

## Cómo Probar

1. **Iniciar backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Iniciar frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **En el navegador:**
   - Ir a `http://localhost:3000`
   - Hacer clic en "¿Olvidaste tu contraseña?"
   - Ingresar correo de usuario
   - Revisar el correo y copiar el código temporal
   - Ingresar código y nueva contraseña
   - ¡Listo! ✅

## Notas 📝

- El código temporal expira en **1 hora**
- El correo enviado muestra el código en formato: `A1B2C3D4`
- El correo también contiene un botón directo a la página de reset
