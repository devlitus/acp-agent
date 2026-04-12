---
description: Implementa una nueva feature usando el workflow completo: code → code-review → performance
---

Vas a ejecutar el **workflow completo multi-agente** para implementar la siguiente feature:

**Feature:** $ARGUMENTS

## Instrucciones de ejecución

Ejecuta los agentes en este orden estricto usando el tool `Agent`:

### Paso 1 — Agente `code`
Invoca el agente `code` (subagent_type: "code") con este prompt:

```
Implementa la siguiente feature siguiendo las convenciones del proyecto (CLAUDE.md y AGENTS.md):

Feature: $ARGUMENTS

Pasos obligatorios:
1. Lee `.claude/memory/team-memory.md` para entender el trabajo reciente
2. Lee `CLAUDE.md` para respetar las convenciones
3. Implementa la feature completa
4. Ejecuta los tests con `bun test`
5. Actualiza `.claude/memory/team-memory.md` con los cambios realizados
6. Lista los archivos modificados en tu respuesta final
```

### Paso 2 — Agente `code-review`
Una vez el agente `code` complete su trabajo, invoca el agente `code-review` (subagent_type: "code-review") con:

```
Revisa la implementación de la siguiente feature: $ARGUMENTS

Archivos modificados: [lista retornada por el agente code]

Verifica:
- Correctitud de la implementación
- Bugs y casos límite
- Seguridad
- Cumplimiento de SOLID y convenciones de CLAUDE.md

Si encuentras issues, descríbelos con formato:
**Issue #N**: título
- Severity: Critical/High/Medium/Low
- Location: archivo:línea
- Description: qué está mal
- Fix Required: qué hay que cambiar

Actualiza `.claude/memory/team-memory.md` con el resultado del review.
```

### Paso 3 (condicional) — Correcciones
Si `code-review` reporta issues, vuelve al Paso 1 con el agente `code` para corregirlos. Repite hasta obtener `✅ APPROVED`.

### Paso 4 — Agente `performance`
Con el código aprobado, invoca el agente `performance` (subagent_type: "performance") con:

```
El código ha sido aprobado. Analiza el código nuevo/modificado de la feature: $ARGUMENTS

Archivos relevantes: [lista de archivos modificados]

Genera un reporte en `docs/performance/` con:
- Bottlenecks identificados
- Recomendaciones priorizadas por impacto vs esfuerzo
- Next steps

Actualiza `.claude/memory/team-memory.md` con el resultado.
```

## Al finalizar

Reporta un resumen con:
- ✅ Feature implementada
- ✅ Code review aprobado (N iteraciones)
- ✅ Análisis de performance completado
- 📄 Reporte: `docs/performance/[archivo].md`
