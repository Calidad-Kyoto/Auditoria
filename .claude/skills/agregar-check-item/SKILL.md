---
name: agregar-check-item
description: Agregar un ítem o un check nuevo de Posventa (o cambiar el texto visible de uno) sin romper las columnas del Sheet. Usar cuando digan "agregar un ítem", "sumar un check nuevo", "llegó otro PDF de posventa", "cambiar el texto de una celda".
---

# Agregar un ítem o un check de Posventa

## When to use
- Llega un PDF nuevo de posventa o una versión nueva de uno existente.
- Hay que sumar, quitar o reescribir una celda de Check In, Check Out o Agendamiento.

## Steps
1. Copiar el PDF nuevo a `fuentes/` con nombre en minúsculas y guiones.
2. Medir la grilla: correr un script con PyMuPDF que liste las líneas horizontales y verticales
   (`page.get_drawings()`) y anotar los bordes en puntos, como `CI_X` / `FILAS` en
   `tools/extraer_iconos.py`.
3. En `tools/extraer_iconos.py`: agregar los bordes y un `grilla([...ids...], X, Y)`; sumar la tarea
   a `TAREAS` con el tamaño de letra de las etiquetas de ese PDF.
4. En `js/catalogo.js`: agregar los ítems con `id` NUEVO (prefijo del check), `lineas` iguales al PDF
   y una `etiqueta` única dentro del check (será el encabezado de columna). Un check nuevo es una
   clave nueva con `titulo`, `hoja` y `secciones`; además hay que sumarlo a `HOJAS`, `FIJAS` y
   `REQUERIDOS` en `apps-script/Hojas.gs` y a `REQUERIDOS` en `js/logica.js`, más un botón
   `.subsolapa` en `index.html`.
5. Actualizar los conteos de `tests/catalogo.test.js` y `tests/vista.test.js` (contándolos del catálogo).
6. `npm run iconos` y mirar los PNG nuevos al lado del PDF.
7. Para cambiar sólo el texto visible de un ítem existente: cambiar `lineas`, **no** `etiqueta`.

## Verify
```bash
npm run iconos   # expect: "OK <n> iconos en …"
npm test         # expect: exit 0, "fail 0"
```

## Do not
- Renombrar una `etiqueta` publicada: crea una columna nueva y deja la vieja huérfana en el Sheet.
- Reutilizar un `id` borrado.
- Editar PNG a mano.
