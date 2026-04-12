# TASK-002 — ChatBubble

**Estado:** 🟡 Ready  
**Asignado a:** GLM-4.7  
**Prioridad:** Alta  
**Depende de:** —  
**Desbloquea:** TASK-005

---

## Objetivo

Crear el componente `ChatBubble` que renderiza un mensaje de la conversación. Hay dos variantes: mensajes del **usuario** (derecha, fondo indigo) y mensajes del **agente** (izquierda, fondo blanco). El texto del agente debe renderizarse como Markdown.

---

## Instalación de dependencia

Antes de implementar, instala la librería de markdown:

```bash
bun add marked
bun add -d @types/marked
```

Verifica que `package.json` incluye `"marked"` en `dependencies`.

---

## Archivo a crear

```
src/web/components/ChatBubble.tsx
```

---

## Tipos de mensaje

Define estos tipos en el archivo (los usará también `ChatView`):

```tsx
export type UserMessage = {
  role: "user";
  text: string;
};

export type AgentMessage = {
  role: "agent";
  text: string;
  streaming: boolean; // true mientras el agente sigue escribiendo
};

export type ChatMessage = UserMessage | AgentMessage;
```

---

## Interfaz del componente

```tsx
interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) { ... }
```

---

## Comportamiento

### Mensaje del usuario
- Alineado a la derecha
- Fondo indigo, texto blanco
- Texto plano (no Markdown)

### Mensaje del agente
- Alineado a la izquierda  
- Fondo blanco, borde gris, texto gris-900
- **Texto renderizado como Markdown** usando `marked`
- Si `streaming: true`, mostrar un cursor parpadeante al final: `▋`

---

## Cómo usar `marked`

```tsx
import { marked } from "marked";

// Convierte markdown a HTML string
const html = marked.parse(message.text) as string;

// Renderiza el HTML en React (el contenido viene del agente, no del usuario — no es XSS)
<div dangerouslySetInnerHTML={{ __html: html }} />
```

**Estilos para el HTML generado por marked:**  
`marked` genera `<p>`, `<code>`, `<pre>`, `<ul>`, etc. Aplica estilos con Tailwind usando `className` en el contenedor:

```tsx
<div
  className="prose prose-sm max-w-none"
  dangerouslySetInnerHTML={{ __html: html }}
/>
```

> `prose` es una clase de Tailwind Typography. Si no está disponible, usa esta alternativa manual:

```tsx
<div
  className="[&_p]:mb-2 [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
  dangerouslySetInnerHTML={{ __html: html }}
/>
```

Usa la alternativa manual ya que `@tailwindcss/typography` no está instalado.

---

## Apariencia

```
                                     ┌─────────────────────┐
                                     │  Hola, ¿me puedes   │  ← usuario (derecha, indigo)
                                     │  ayudar con Python? │
                                     └─────────────────────┘

┌──────────────────────────────────┐
│ Claro! Aquí tienes un ejemplo:   │  ← agente (izquierda, blanco)
│                                  │
│ ```python                        │
│ print("Hello, world!")           │
│ ```                              │
│                                  │
│ ▋                                │  ← cursor si streaming: true
└──────────────────────────────────┘
```

Clases Tailwind sugeridas:

```tsx
// Contenedor del mensaje usuario
"flex justify-end mb-4"
// Burbuja usuario
"bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm max-w-[75%] text-sm"

// Contenedor del mensaje agente
"flex justify-start mb-4"
// Burbuja agente
"bg-white border border-gray-200 text-gray-900 px-4 py-3 rounded-2xl rounded-tl-sm max-w-[75%] text-sm"
```

---

## Cursor de streaming

```tsx
{message.role === "agent" && message.streaming && (
  <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse" />
)}
```

---

## Criterios de aceptación

- [ ] Mensajes de usuario: texto plano, alineados a la derecha, fondo indigo
- [ ] Mensajes del agente: Markdown renderizado, alineados a la izquierda, fondo blanco
- [ ] Código inline renderizado con fondo gris claro
- [ ] Bloques de código renderizados con fondo oscuro y scroll horizontal
- [ ] Cursor parpadeante visible cuando `streaming: true`
- [ ] Tipos `UserMessage`, `AgentMessage`, `ChatMessage` exportados
- [ ] Sin errores de TypeScript
- [ ] Archivo ≤ 60 líneas

---

## Notas del senior

- `dangerouslySetInnerHTML` es seguro aquí porque el HTML viene del modelo de IA, no de input directo del usuario. El texto del usuario se muestra como texto plano (nunca se parsea como HTML).
- No uses `useEffect` para parsear el markdown. `marked.parse()` es síncrono — llámalo directamente en el render.
- Si el archivo se acerca a 80 líneas, probablemente estás añadiendo lógica que no corresponde a este componente.

---

## Notas del junior

> _Escribe aquí tus decisiones de diseño y cambia el estado de la tarea cuando termines._
