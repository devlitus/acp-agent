---
description: Ejecuta un refactor usando el workflow completo: code → code-review → performance
---

Vas a ejecutar el **workflow completo multi-agente** para el siguiente refactor:

**Refactor:** $ARGUMENTS

## Instrucciones de ejecución

Ejecuta los agentes en este orden estricto usando el tool `Agent`:

### Paso 1 — Agente `code`
Invoca el agente `code` (subagent_type: "code") con este prompt:

```
Ejecuta el siguiente refactor siguiendo los principios SOLID y las convenciones del proyecto (CLAUDE.md):

Refactor: $ARGUMENTS

Pasos obligatorios:
1. Lee `.claude/memory/team-memory.md` para entender el trabajo reciente
2. Lee `CLAUDE.md` para respetar las convenciones y reglas SOLID
3. Analiza el código a refactorizar antes de hacer cambios
4. Aplica el refactor de forma incremental y segura
5. Ejecuta los tests con `bun test` y asegúrate de que no se rompe nada
6. Actualiza `.claude/memory/team-memory.md` con los cambios realizados
7. Lista los archivos modificados en tu respuesta final

Principios a aplicar:
- Single Responsibility: un archivo, una razón de cambio
- Open/Closed: extensión sin modificar código existente
- Dependency Inversion: depender de abstracciones
- Regla de 100-200 líneas: si un archivo supera ese límite, dividir
```

### Paso 2 — Agente `code-review`
Una vez el agente `code` complete su trabajo, invoca el agente `code-review` (subagent_type: "code-review") con:

```
Revisa el siguiente refactor: $ARGUMENTS

Archivos modificados: [lista retornada por el agente code]

Presta especial atención a:
- ¿Se mantiene la misma funcionalidad? (no regressions)
- ¿Se respetan los principios SOLID?
- ¿Los tests siguen pasando?
- ¿Se mejoró la legibilidad y mantenibilidad?
- ¿Hay deuda técnica introducida?

Formato de issues:
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
Con el refactor aprobado, invoca el agente `performance` (subagent_type: "performance") con:

```
El refactor ha sido aprobado. Analiza si el código refactorizado de: $ARGUMENTS

Archivos relevantes: [lista de archivos modificados]

Compara el estado anterior vs el nuevo:
- ¿Mejoró la complejidad algorítmica?
- ¿Hay nuevos bottlenecks introducidos?
- ¿Hay oportunidades de mejora adicionales?

Genera un reporte en `docs/performance/` con findings y recomendaciones.
Actualiza `.claude/memory/team-memory.md` con el resultado.
```

## Al finalizar

Reporta un resumen con:
- ✅ Refactor completado
- ✅ Code review aprobado (N iteraciones)
- ✅ Análisis de performance completado
- 📄 Reporte: `docs/performance/[archivo].md`
