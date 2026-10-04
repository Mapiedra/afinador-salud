# Capturas para el diálogo de instalación

Los PNG que haya en esta carpeta se añaden solos al manifest como
`screenshots`. Con ellas, Chrome en Android muestra el diálogo de instalación
completo —nombre, descripción e imágenes— en lugar de la barra mínima.

## Cómo añadirlas

Deja aquí los PNG **numerados**, porque el orden alfabético es el orden en que
se ven:

```
01-afinando.png
02-afinado.png
03-instrumentos.png
04-ajustes.png
```

No hay que tocar nada más: `vite.config.js` los recoge al construir, lee su
ancho y alto de la cabecera del propio PNG y marca como `narrow` las que sean
más altas que anchas, que es el formato que mira Chrome en el móvil.

## Requisitos

- Formato **PNG**.
- Capturas de **móvil**, más altas que anchas.
- Entre 320 y 3840 px de lado.
- Todas las `narrow` deben tener **la misma proporción**, o Chrome descarta el
  conjunto y vuelve a la barra mínima.

No entran en el precache: solo se usan al instalar, que siempre pasa con red,
y precacharlas engordaría la app sin conexión sin aportar nada.
