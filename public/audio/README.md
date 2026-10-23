# Música propia

El juego trae dos pistas **procedurales originales** (sintetizadas con WebAudio), así que funciona sin archivos.

Para usar tu propia música (propia o con licencia adecuada):

1. Copia los archivos aquí, p. ej. `menu.mp3` y `battle.mp3`.
2. Edita `tracks.json`:

```json
{ "menu": "menu.mp3", "battle": "battle.mp3" }
```

- `menu` suena en la pantalla inicial, el login y todo el menú principal, **sin reiniciarse** al navegar.
- `battle` suena sólo en combate; al salir se reanuda la del menú.
- Recomendado: 128 kbps, bucle sin silencios, < 4 MB por pista para móviles.
