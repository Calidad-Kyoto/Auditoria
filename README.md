# Kyoto Posventa

Página con la solapa **POSVENTA** de Kyoto Automotores: **Check In**, **Check Out** y
**Agendamiento**, idénticos a los PDFs de `fuentes/`. Cada check completado se guarda en un Google
Sheet (una fila por check, una columna SI/NO por ítem y el % de cumplimiento).

- Puesta en marcha (Sheet, Apps Script, GitHub Pages): [INSTALACION.md](INSTALACION.md)
- Diseño completo: [blueprints/kyoto-posventa-blueprint.md](blueprints/kyoto-posventa-blueprint.md)

## Trabajar en local (Git Bash)

```bash
npm test                          # todos los tests (Node 22+, sin dependencias)
node tools/servidor-local.js      # página + Apps Script simulado en http://localhost:8765
```

El servidor local usa los mismos `.gs` del proyecto con un Sheet en memoria: se puede completar y
guardar un check sin tocar Google. `http://localhost:8765/hojas` muestra lo guardado.
`npm run servir` sirve sólo la página (sin backend).

## Agregar un ítem o un check nuevo

1. Copiar el PDF a `fuentes/` y anotar los bordes de su grilla en `tools/extraer_iconos.py`.
2. Agregar los ítems en `js/catalogo.js` con `id` nuevo y una `etiqueta` única (será la columna del Sheet).
3. `npm run iconos` y `npm test`.

Una `etiqueta` publicada no se renombra (crearía otra columna); para cambiar el texto visible se
cambia `lineas`. Detalle completo en `.claude/skills/agregar-check-item/SKILL.md`.
