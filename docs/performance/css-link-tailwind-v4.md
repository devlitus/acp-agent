# Performance Analysis - CSS Link Migration (Tailwind v4)

**Fecha**: 2026-04-18
**Feature**: Mover import de CSS de app.tsx al index.html como etiqueta `<link>`

---

## Overview

Se analizaron los archivos modificados (`src/web/index.html`, `src/web/app.tsx`) y el fichero de estilos (`src/web/styles/global.css`) tras la migración del import CSS desde el módulo TSX hacia una etiqueta `<link>` en el HTML, para que el bundler CSS de Bun active el procesamiento de Tailwind v4 (`@import "tailwindcss"`).

El cambio es una corrección de configuración del pipeline de build, no lógica de aplicación. El análisis de performance se centra en el impacto en tiempo de carga del navegador (Critical Rendering Path) y en el proceso de build.

---

## Findings

### High — Eliminación del bloqueo de render por doble carga de CSS

- **Impact**: High
- **Effort**: Ninguno (ya resuelto con el cambio)
- **Location**: `src/web/index.html:10`, anteriormente `src/web/app.tsx:6`
- **Issue**: Al importar el CSS desde un módulo ES (`import "./styles/global.css"`), el navegador debía primero parsear y ejecutar JavaScript para descubrir la hoja de estilos. Esto creaba una cadena de dependencias: HTML → JS bundle → CSS, retrasando el primer pintado con estilos aplicados (FCP con estilos). Adicionalmente, Bun no procesaba `@import "tailwindcss"` en ese contexto, por lo que Tailwind no generaba las clases utilitarias, resultando en layout roto.
- **Recommendation**: El cambio ya aplicado es la solución óptima. La etiqueta `<link rel="stylesheet">` en `<head>` permite al navegador descubrir y descargar el CSS en paralelo con el JS, reduciendo el bloqueo de render.
- **Expected Improvement**: Eliminación de una cascada de carga innecesaria. El CSS se descarga en paralelo con el bundle JS en lugar de después de él. FCP (First Contentful Paint) con estilos correctos en la primera carga.

---

### Medium — Orden de carga: fuentes externas antes que CSS local

- **Impact**: Medium
- **Effort**: Low
- **Location**: `src/web/index.html:7-10`
- **Issue**: El CSS local (`global.css`) se carga después de la fuente de Google Fonts. Dado que `global.css` referencia `Inter` y `Space Grotesk` en sus reglas, el orden actual es correcto funcionalmente. Sin embargo, el `<link>` de Google Fonts usa `display=swap` implícito por la URL pero no se especifica explícitamente en el CSS de las fuentes, lo que puede causar FOUT (Flash of Unstyled Text) al intercambiar fuentes.

  Actualmente `global.css` fija `font-family: 'Inter', sans-serif` en `html, body, #root` como fallback — esto es correcto. No hay acción urgente.

- **Recommendation**: Si se detecta FOUT en producción, añadir `font-display: swap` explícitamente en el `@font-face` o usar `font-display=swap` en la URL de Google Fonts (ya lo tiene por defecto con `display=swap` en el query param). No es un cambio necesario ahora.
- **Expected Improvement**: Reducción menor de FOUT en conexiones lentas.

---

### Low — Tailwind v4: tree-shaking automático de clases no usadas

- **Impact**: Low (positivo, ya funciona)
- **Effort**: Ninguno
- **Location**: `src/web/styles/global.css:1`
- **Issue**: No es un problema, sino una aclaración positiva. Al mover el CSS al pipeline de Bun con `<link>`, Tailwind v4 ahora puede escanear los archivos TSX y generar únicamente las clases utilitarias realmente utilizadas. Esto reduce el tamaño final del CSS respecto a incluir Tailwind completo.
- **Recommendation**: Verificar que la configuración de content scanning de Tailwind v4 incluya `src/web/**/*.tsx`. Con Bun + Tailwind v4, el scanning es automático por defecto para archivos en el mismo proyecto.
- **Expected Improvement**: Reducción del bundle CSS en producción (potencialmente significativa si se usa un subconjunto pequeño de utilidades).

---

### Low — Ausencia de `media` hint o `print` en el stylesheet

- **Impact**: Low
- **Effort**: Low
- **Location**: `src/web/index.html:10`
- **Issue**: El `<link rel="stylesheet">` no especifica `media`, lo que es correcto para estilos de pantalla. No hay CSS de impresión en `global.css`, por lo que no se necesita separación.
- **Recommendation**: Sin acción requerida. Si en el futuro se añaden estilos de impresión, separarlos con `media="print"` para evitar bloqueo de render con esos estilos en pantalla.
- **Expected Improvement**: Ninguno en el estado actual.

---

## Recommendations Summary

1. **Ya resuelto** — La migración de `import` a `<link>` elimina la cascada JS→CSS y activa el pipeline de Tailwind v4. Este es el cambio de mayor impacto y ya está aplicado.
2. **Verificar content scanning de Tailwind v4** — Confirmar que los archivos TSX se escanean para tree-shaking de clases CSS. Impacto en tamaño del bundle en producción.
3. **FOUT de fuentes** — Monitorizar en producción. Si hay parpadeo de texto, revisar `font-display` en las fuentes de Google.

---

## Next Steps

- [ ] Verificar en browser DevTools (Network tab) que `global.css` se carga en paralelo con `app.tsx` (sin dependencia en cascada).
- [ ] Confirmar en la pestaña Elements que las clases Tailwind (`flex`, `min-h-screen`, `bg-gray-950`, etc.) tienen estilos aplicados correctamente.
- [ ] En una revisión futura, evaluar si el CSS de fuentes de Google puede servirse con `font-display: optional` para eliminar FOUT completamente en conexiones lentas.
