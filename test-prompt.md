# Test Prompts — ACP Agent

Prompts organizados por agente para testeo manual. Configurar `AGENT_ID` antes de cada sección.

---

## Orchestrator (`AGENT_ID=orchestrator`)

Delega automáticamente al sub-agente apropiado. Para saludos simples responde directamente.

### Delegación a Coding

```
Tengo un bug en mi código TypeScript, el compilador dice "Cannot find module". ¿Puedes ayudarme?
```

```
Refactoriza el archivo src/tools/registry.ts para usar un Map en vez de un objeto plano
```

### Delegación a Writing

```
Escribe un email profesional para mi equipo anunciando que el proyecto acp-agent ya está en producción
```

### Delegación a Research

```
Investiga cuáles son los principales frameworks de agentes de IA en 2025 y hazme un informe comparativo
```

### Delegación a Personal

```
Necesito organizar mi semana: tengo reunión lunes 10am, gym martes 7am, y revisar PRs miércoles
```

### Delegación a Data

```
Analiza el archivo data.csv y dame estadísticas descriptivas de las columnas numéricas
```

### Delegación a DevOps

```
Necesito configurar un pipeline de CI/CD con GitHub Actions para un proyecto Bun
```

### Respuesta directa (sin delegación)

```
Hola, ¿cómo estás?
```

```
¿Qué es el protocolo ACP?
```

---

## Coding (`AGENT_ID=coding`)

Herramientas: read_file, write_file, run_command, list_directory, search_files, save_memory, recall_memory

### Lectura de archivos

```
Lee el archivo package.json y dime qué dependencias tiene el proyecto
```

```
Lee el archivo src/config.ts y explicame qué hace cada variable de entorno
```

### Listado y búsqueda

```
Lista los archivos del directorio src/tools/
```

```
Busca todas las ocurrencias de "LLMProvider" en el proyecto
```

### Escritura con permiso

```
Crea un archivo llamado test-manual.txt con el contenido "Esto es una prueba manual"
```

```
Sobrescribe el archivo test-manual.txt con "Contenido actualizado"
```

> Verificar que solicita permiso interactivo (Allow write / Skip write)

### Ejecución de comandos con permiso

```
Ejecuta el comando git log --oneline -5
```

```
Ejecuta el comando ls -la en el directorio /tmp
```

```
Corre los tests del proyecto
```

> Verificar que solicita permiso interactivo (Run command / Skip)

### Rechazo de permiso

```
Sobrescribe el archivo README.md con "hola"
```

> Probar rechazar el permiso y verificar que no se modifica el archivo

### Flujo multi-herramienta

```
Lee el archivo src/agent/agent.ts, busca todos los métodos que usan la base de datos, crea un archivo resumen-db.md con la lista, y ejecuta bun test para verificar que nada se rompe
```

```
Lista el directorio src/llm/, lee cada archivo de provider, y escribe un archivo providers-summary.txt con una tabla comparativa de todos los providers soportados
```

---

## Writing (`AGENT_ID=writing`)

Herramientas: read_file, write_file, save_memory, recall_memory, web_search, fetch_url, get_datetime

### Escritura creativa

```
Escribe un artículo de blog sobre testing manual de agentes de IA, tono técnico pero accesible, unos 500 palabras
```

```
Redacta un email formal para un cliente explicando un retraso en la entrega del proyecto
```

```
Escribe la documentación README para un módulo que gestiona sesiones de usuario con SQLite
```

### Corrección y mejora

```
Lee el archivo src/config.ts y mejora la documentación de las variables con comentarios más descriptivos
```

### Con búsqueda web

```
Busca las mejores prácticas para escribir prompts de IA en 2025 y escribe un artículo resumen
```

### Con memoria

```
Recuerda que mi estilo de escritura preferido es directo y sin adornos, sin emojis
```

---

## Research (`AGENT_ID=research`)

Herramientas: web_search, fetch_url, write_file, save_memory, recall_memory

### Búsqueda y síntesis

```
Investiga y resume las diferencias entre los protocolos ACP, MCP y A2A para comunicación de agentes
```

```
Busca las últimas noticias sobre el protocolo MCP de Anthropic y dame un resumen ejecutivo
```

### Fetch de URLs

```
Descarga el contenido de esta URL y resúmemelo: https://agentclientprotocol.com
```

### Informe completo

```
Investiga qué es el Agent Communication Protocol, busca fuentes en internet, y escribe un informe en informe-acp.md con secciones de introducción, características principales y conclusiones
```

### Con memoria

```
Recuerda que me interesan los protocolos de agentes: ACP, MCP y A2A
```

---

## Personal (`AGENT_ID=personal`)

Herramientas: save_memory, recall_memory, write_file, read_file, list_directory, web_search, fetch_url, get_datetime

### Notas y organización

```
Apunta esto: [CITA] Dentista jueves 15:30, [TAREA] Entregar informe viernes, [PREF] Prefiero respuestas concisas
```

```
Organízame la semana: tengo reunión lunes 10am, gym martes 7am, revisión de PRs miércoles, deploy jueves
```

### Consulta de memoria

```
¿Qué recuerdas sobre mí?
```

```
¿Qué tareas tengo pendientes?
```

### Fecha y hora

```
¿Qué día es hoy y qué hora es?
```

```
¿Qué hora es en Tokio? ¿Y en Nueva York?
```

### Búsqueda rápida

```
Busca en internet cómo hacer arroz blanco perfecto y dame la receta resumida
```

---

## Data (`AGENT_ID=data`)

Herramientas: read_file, write_file, run_command, list_directory, search_files

### Análisis de datos

```
Crea un archivo CSV de ejemplo con datos de ventas (fecha, producto, cantidad, precio) con al menos 20 filas y luego analízalo mostrando totales por categoría
```

### Procesamiento con comandos

```
Lee el archivo package.json y genera un archivo deps-report.md con una tabla de todas las dependencias y sus versiones
```

### Transformación

```
Busca todos los archivos TypeScript en src/tools/ y genera un archivo tools-catalog.md con el nombre, descripción y herramientas que exportan
```

---

## DevOps (`AGENT_ID=devops`)

Herramientas: read_file, write_file, run_command, list_directory, search_files

### Docker

```
Genera un Dockerfile multi-stage para un proyecto Bun que escuche en el puerto 3000
```

```
Crea un archivo docker-compose.yml con un servicio de base de datos SQLite y la app del agente
```

### CI/CD

```
Genera un workflow de GitHub Actions para correr tests automáticamente en cada push a main
```

### Diagnóstico

```
Ejecuta git status y git log --oneline -10, y dame un informe del estado actual del repositorio
```

```
Lista los archivos del directorio raíz del proyecto y busca todos los archivos de configuración (tsconfig, eslint, prettier)
```

---

## Casos extremos (cualquier agente)

### Sin resultados

```
Busca archivos con el patrón "xyzabc123nonexistent"
```

### Archivo inexistente

```
Lee el archivo /no/existe/archivo.txt
```

### Input mínimo

```
hola
```

### Tarea sin herramientas

```
Escribe un poema sobre programación
```

### Sin memoria previa

```
¿Qué recuerdas de mí?
```

### Contexto implícito para memoria automática

```
Me llamo Carles y soy desarrollador senior de Barcelona, trabajo principalmente con TypeScript y me interesan los agentes de IA
```

> No pedir explícitamente guardar. Luego verificar en la BD si se extrajo automáticamente:
```sql
SELECT * FROM memory WHERE source='auto' ORDER BY created_at DESC LIMIT 10;
```

### Persistencia de memoria entre sesiones

```
Recuerda que mi proyecto se llama acp-agent y usa el protocolo ACP
```

> Reiniciar sesión y preguntar:
```
¿Qué sabes de mi proyecto?
```
