---
name: publicar-cambios
description: Publicar cambios de Kyoto Posventa en GitHub Pages y en el Apps Script sin cambiar la URL del backend. Usar cuando digan "subir los cambios", "publicar", "actualizar la página", "actualizar el Apps Script".
---

# Publicar cambios

## When to use
- Hay cambios en `index.html`, `css/`, `js/`, `img/` (página) o en `apps-script/` (backend).

## Steps
1. `npm test` en 0 fallas.
2. Pedir confirmación al usuario antes de cualquier `git push`.
3. Página: `git push` a `main`; GitHub Pages se actualiza en ~1 minuto.
4. Apps Script (si cambió `apps-script/`): el usuario pega los `.gs` en el editor, guarda, y va a
   Implementar → Gestionar implementaciones → lápiz → Versión: **Nueva versión** → Implementar.
   La URL `/exec` queda igual.
5. Probar `{ENDPOINT}?accion=config` en el navegador: debe responder `"ok":true`.

## Verify
```bash
npm test                                                    # expect: exit 0, "fail 0"
curl -sL "$(node -e "global.window={};require('./js/config.js');console.log(window.POSVENTA_CONFIG.ENDPOINT)")?accion=config" | grep -q '"ok":true'   # expect: exit 0 (sólo con ENDPOINT real)
```

## Do not
- Crear una implementación NUEVA del Apps Script: cambia la URL y la página deja de guardar.
- Pushear sin pedido explícito del usuario.
