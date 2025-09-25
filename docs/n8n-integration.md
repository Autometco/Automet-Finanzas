# Integración con n8n - Automet Finanzas

Esta documentación explica cómo integrar la aplicación Automet Finanzas con n8n para automatizar la entrada de transacciones mediante bots de audio.

## Configuración de Variables de Entorno

Agrega estas variables a tu proyecto de Vercel:

\`\`\`env
N8N_API_KEY=tu-clave-secreta-para-n8n
\`\`\`

## Endpoints Disponibles

### 1. Crear Transacción
**POST** `/api/transactions`

Headers:
\`\`\`
x-api-key: tu-clave-secreta-para-n8n
Content-Type: application/json
\`\`\`

Body:
\`\`\`json
{
  "email": "usuario@ejemplo.com",
  "type": "expense", // "expense" o "income"
  "amount": 500,
  "description": "Compra de mesa para el hogar",
  "category": "Hogar", // Opcional
  "date": "2024-01-15" // Opcional, por defecto hoy
}
\`\`\`

### 2. Obtener Transacciones
**GET** `/api/transactions?email=usuario@ejemplo.com&limit=10`

### 3. Crear Meta de Ahorro
**POST** `/api/savings-goals`

### 4. Obtener Dashboard
**GET** `/api/dashboard?email=usuario@ejemplo.com`

### 5. Webhook para n8n (Recomendado)
**POST** `/api/webhook/n8n`

Este endpoint está optimizado para n8n y procesa automáticamente texto de audio transcrito.

Body:
\`\`\`json
{
  "email": "usuario@ejemplo.com",
  "text": "Gasté 500 dólares en hogar para comprar una mesa",
  "action": "add_transaction"
}
\`\`\`

## Flujo de Trabajo n8n Recomendado

### 1. Recepción de Audio
- **Trigger**: Webhook o integración con WhatsApp/Telegram
- **Input**: Audio del usuario

### 2. Transcripción
- **Nodo**: OpenAI Whisper o Google Speech-to-Text
- **Output**: Texto transcrito

### 3. Procesamiento con IA (Opcional)
- **Nodo**: OpenAI GPT o Claude
- **Prompt**: "Extrae de este texto: monto, tipo (gasto/ingreso), categoría y descripción: {texto}"
- **Output**: Datos estructurados

### 4. Envío a API
- **Nodo**: HTTP Request
- **URL**: `https://tu-app.vercel.app/api/webhook/n8n`
- **Method**: POST
- **Headers**: `x-api-key: tu-clave-secreta`

### 5. Respuesta al Usuario
- **Nodo**: Respuesta por WhatsApp/Telegram
- **Mensaje**: "✅ Registré tu gasto de $500 en Hogar"

## Ejemplo de Procesamiento de Audio

**Audio**: "Gasté quinientos dólares en hogar para comprar una mesa"

**Procesamiento automático**:
\`\`\`json
{
  "type": "expense",
  "amount": 500,
  "category": "Hogar",
  "description": "Gasté quinientos dólares en hogar para comprar una mesa"
}
\`\`\`

## Categorías Soportadas

- Alimentación
- Transporte  
- Entretenimiento
- Servicios
- Salud
- Educación
- Ropa
- Hogar
- Ahorro

## Seguridad

- Todos los endpoints requieren API key en el header `x-api-key`
- Los usuarios se identifican por email
- Se usa Supabase RLS para proteger los datos

## Ejemplos de Uso

### WhatsApp Bot con n8n
1. Usuario envía audio: "Pagué 50 dólares de gasolina"
2. n8n transcribe el audio
3. n8n envía a `/api/webhook/n8n`
4. Se crea transacción automáticamente
5. Bot responde: "✅ Registré tu gasto de $50 en Transporte"

### Telegram Bot
Similar al flujo de WhatsApp, pero usando la integración de Telegram en n8n.

## Troubleshooting

- **Error 401**: Verificar API key
- **Error 404**: Usuario no encontrado, verificar email
- **Error 400**: Campos requeridos faltantes
- **Error 500**: Error interno, revisar logs de Vercel
