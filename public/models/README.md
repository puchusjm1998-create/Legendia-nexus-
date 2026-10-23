# Modelos 3D de personajes (sustitución del modelo provisional)

El combate 3D usa por defecto un **modelo provisional procedural** (ver `src/game3d/rig.ts` y `charSpecs.ts`):
esqueleto articulado + poses clave propias. No es un asset oficial de ninguna franquicia.

Para usar un modelo definitivo **propio o con licencia**:

1. Exporta el personaje como `.glb` (glTF 2.0, con esqueleto si tiene animaciones) y colócalo aquí, p. ej. `public/models/ayame.glb`.
2. Decláralo en `public/models/models.json` (la clave es el `key` del personaje en `src/game/catalog.ts`):

```json
{ "characters": { "ayame": { "url": "/models/ayame.glb", "scale": 1, "yaw": 0 } } }
```
   - `scale`: escala del modelo. `yaw`: giro en radianes si el modelo no mira a +Z. `height`: altura en metros (opcional).
3. Nombra las animaciones del `.glb` así (mayúsculas/minúsculas indiferentes; se aceptan alias):

| Clip | Alias aceptados | Uso |
|---|---|---|
| `idle` | stand | reposo |
| `run` | walk, move | desplazamiento |
| `melee` | attack, attack1, punch, slash | ataque básico cuerpo a cuerpo |
| `shoot` | cast, attack2, range | ataque a distancia |
| `skill` | special, skill1 | habilidad |
| `ultCharge` | charge | carga de la definitiva |
| `ultRelease` | ultimate, ult | liberación de la definitiva |
| `hit` | damage, hurt | recibir daño |
| `guard` | defend, block | defensa («Esperar») |
| `buff`, `heal` | powerup, support | apoyo |
| `defeat` | death, die | derrota |
| `victory` | win, celebrate | victoria |
| `stun` | dizzy | aturdido |
| `intro` | appear, spawn | aparición |

Las animaciones que falten se sustituyen por la más parecida (`melee`/`skill`/`idle`). Huesos reconocidos para anclar efectos:
mano derecha (`hand_r`, `RightHand`…), `Head`, `Chest/Spine`.

Si el `.glb` no carga, se mantiene el modelo provisional (aviso en consola). El modelo se carga en segundo plano
y reemplaza al provisional cuando está listo. **No se ha probado con un `.glb` real en este entorno** (no hay ninguno incluido).
