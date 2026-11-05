# Puesta en marcha — Kyoto Posventa

Se hace una sola vez y lleva unos 20 minutos. Necesitás la cuenta de Google de Calidad y la cuenta
de GitHub **Calidad-Kyoto**.

## 1. Crear el Sheet

1. Entrá a Google Sheets y creá una hoja de cálculo nueva.
2. Ponele de nombre **Posventa – Checks Kyoto**.
3. No hace falta crear pestañas: el script las arma solo (`Config`, `Check In`, `Check Out`,
   `Agendamiento`, `General`, `Auditoría de OR`, `Listas` y `Resumen`).

## 2. Pegar el Apps Script

1. En el Sheet: **Extensiones → Apps Script**.
2. En el editor, borrá el contenido de `Código.gs` y renombralo a `Hojas.gs` (tres puntitos → Cambiar nombre).
3. Pegá ahí el contenido de `apps-script/Hojas.gs`.
4. Con el botón **+ → Secuencia de comandos** creá `Guardar` y `Resumen`, y pegá el contenido de
   `apps-script/Guardar.gs` y `apps-script/Resumen.gs`.
5. Guardá (ícono del disquete).
6. Arriba, en el selector de funciones, elegí **instalar** y tocá **Ejecutar**. Google pide permisos:
   aceptalos con la cuenta de Calidad. Esto crea las hojas y el disparador que actualiza el
   `Resumen` cada hora.
7. Volvé al Sheet y recargalo: aparece el menú **Posventa** (Actualizar resumen / Configurar hojas).

## 3. Publicar como aplicación web

1. En el editor de Apps Script: **Implementar → Nueva implementación**.
2. Tipo: **Aplicación web**.
3. Ejecutar como: **Yo**. Quién tiene acceso: **Cualquier persona**.
4. **Implementar** y copiá la URL que termina en `/exec`.
5. Probala: pegá en el navegador `<URL>?accion=config`. Tiene que mostrar `{"ok":true,"sucursales":[…]}`.

> Para publicar cambios del script más adelante **no** crees otra implementación (cambia la URL):
> Implementar → Gestionar implementaciones → lápiz → Versión: Nueva versión → Implementar.

## 4. Configurar la página

1. Abrí `js/config.js` y reemplazá `PEGAR_AQUI_LA_URL_DEL_APPS_SCRIPT` por la URL `/exec`:
   ```js
   window.POSVENTA_CONFIG = { ENDPOINT: 'https://script.google.com/macros/s/XXXXXXXX/exec' };
   ```
2. En Git Bash, desde la carpeta `kyoto-posventa`, corré `npm test`: tiene que terminar con `fail 0`.

## 5. Publicar en GitHub Pages

1. En GitHub creá el repositorio **Calidad-Kyoto/Auditoria** (público; ya creado).
2. En Git Bash, desde `kyoto-posventa`:
   ```bash
   git add -A && git commit -m "config: url del apps script"
   git remote add origin https://github.com/Calidad-Kyoto/Auditoria.git
   git push -u origin main
   ```
3. En GitHub: **Settings → Pages → Branch: main / (root) → Save**.
4. En 1 o 2 minutos la página queda en `https://calidad-kyoto.github.io/Auditoria/`.
5. Abrila en cada tablet y guardala como acceso directo (menú del navegador → Agregar a pantalla de inicio).

## 6. Cargar asesores

1. En el Sheet, pestaña **Config**: una fila por asesor, con `Sucursal`, `Asesor` y `Activo` (SI/NO).
2. Reemplazá las filas de "Asesor de prueba" por los asesores reales. El nombre de la sucursal
   tiene que quedar escrito igual en todas sus filas.
3. Para dar de baja a alguien, poné `Activo` = **NO** (no borres la fila).
4. Para probar: en la página, recargá, elegí sucursal y asesor, guardá un Check In de prueba y
   fijate que aparezca la fila en la pestaña **Check In**. Después borrá esa fila a mano.

### Si algo no anda

| Síntoma | Qué revisar |
|---|---|
| "Falta configurar la URL del Apps Script" | Paso 4 |
| "No se pudo leer la lista de asesores" | La URL de `config.js` y que la implementación tenga acceso "Cualquier persona" |
| "Sin asesores cargados en la hoja Config" | Paso 6: la sucursal no tiene asesores con `Activo` = SI |
| "N checks pendientes de envío" que no baja | Conexión de la tablet; tocá Reintentar |
| "El Sheet rechazó un check: Asesor no habilitado…" | El asesor fue dado de baja o cambió de nombre en `Config` |

## 7. Desplegables de Auditoría de OR (APS y mecánicos)

1. En el Sheet, pestaña **Listas**: una fila por opción, con `Lista` (`APS` o `Mecánico`), `Opción`
   (por ejemplo `94 - Britos Cristian`) y la casilla `Activo`.
2. **Para sacar a alguien del desplegable: destildá su casilla.** Al recargar la página ya no aparece.
   No borres la fila: las auditorías viejas siguen mostrando su nombre.
3. Para sumar a alguien: agregá una fila nueva y tildá la casilla (Insertar → Casilla de verificación
   si la celda no la tiene).
4. Las fotos de cada auditoría se guardan en la carpeta de Drive **Auditoría de OR – fotos** (se crea
   sola con la primera foto) y el link queda en la columna `Fotos`. La primera vez Google pide
   permiso para usar Drive: aceptalo con la cuenta de Calidad.
