# 🌀 LEGENDIA NEXUS — Servidor Privado

RPG táctico de anime con invocaciones gacha, colección de 16 héroes originales (inspirados en el espíritu de Naruto, Dragon Ball y Final Fantasy, **sin usar personajes ni assets oficiales**), combate por turnos en cuadrícula al estilo *Ultimate Ninja Blazing*, campaña con diálogos, jefes con fases, eventos, tienda, logros y panel de administración.

**Stack:** Next.js (App Router) · Node.js · PostgreSQL + Drizzle ORM · Tailwind CSS · WebAudio (música y SFX 100% originales sintetizados) · Canvas para partículas.

> Se eligió Next.js + PostgreSQL en lugar de Express + SQLite porque el entorno ya los provee, son igual de fáciles de mantener y ofrecen mejor persistencia y despliegue. El frontend y el backend viven en el mismo proyecto y se despliegan con una sola URL.

---

## 🚀 Puesta en marcha

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno (.env)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
ADMIN_USERNAME=nexusadmin          # cuenta admin (se crea sola al primer arranque)
ADMIN_PASSWORD=elige-una-clave-segura

# 3. Crear las tablas
npx drizzle-kit push

# 4a. Desarrollo
npm run dev
# 4b. Producción
npm run build && npm start
```

Abre `http://localhost:3000`, crea una cuenta y juega. Empiezas con **4 héroes, 1600 gemas y materiales**: puedes hacer una invocación ×10 y completar el capítulo 1 desde el primer minuto. Los banners y el evento inicial se siembran automáticamente en la primera petición.

El panel de administración está en **`/admin`** (usa las credenciales de entorno). Nunca hay contraseñas admin escritas en el código.

## 🎮 Contenido

- **Combate táctico 7×5 decidido en el servidor**: movimiento validado por casillas, iniciativa por velocidad, chakra, combos por aliados adyacentes (+10% cada uno), críticos, ventajas elementales (🔥→🌪️→⚡→💧→🔥; ✨↔🌑), estados, regeneración, IA ofensiva y sanadora, jefes con **fase 2** al 50% de vida.
- **Técnicas definitivas** con zoom, partículas Canvas y daño/estados calculados en el servidor. La pantalla reproduce fotogramas de cada acción validada; no calcula recompensas.
- **Gacha autoritativo**: tiradas `crypto`, pity (50; 40 en evento), 4★ garantizado en ×10, rate-up 50%, duplicados → resonancia + Polvo Estelar. Probabilidades visibles e historial persistente.
- **Progresión**: cuenta y héroes, habilidades, transformaciones originales, 3 equipos guardados, energía regenerable (1/4 min), daily con racha y 9 logros.
- **Campaña**: 2 capítulos (10 misiones) + versiones difíciles ×2 recompensas + jefe de evento, con diálogos previos. Los eventos se pueden caducar mediante fecha y hora desde admin.
- **Admin**: usuarios y recursos, banners, eventos y expiración, balance por personaje, registro de errores, backup JSON (incluye batallas en curso).

## 🛡️ Seguridad y persistencia

- Contraseñas con **scrypt + salt** (`crypto`), sesiones por token aleatorio en BD. El alta de cuenta y héroes iniciales se realiza en una transacción. Un nombre de admin ocupado no se promociona si no coincide la contraseña configurada.
- **Combate autoritativo**: `POST /api/battle/start` crea un estado JSONB; `POST /api/battle/action` valida turno, casilla, alcance, tipo/objetivo, chakra, recargas y revisión del estado antes de calcular IA, daño y estados. `GET /api/battle/active` reanuda una partida en las siguientes **12 horas**; `POST /api/battle/retreat` cierra sin premio. Enviar `victory:true` al antiguo endpoint `finish` devuelve 400.
- Al vencer, el mismo `SELECT ... FOR UPDATE` de la sesión guarda el resultado y concede recompensas en **una sola transacción**. Acciones repetidas devuelven 409; una victoria no se puede reclamar dos veces. Pity, daily y costes también se calculan en el servidor.
- La energía se regenera con bloqueo de fila para que un refresco simultáneo no anule el gasto de una misión. Los eventos caducados desaparecen y ya no permiten iniciar combate; los iniciados antes del cierre pueden terminarse.
- Errores registrados en `error_logs`, visibles en `/admin`. El backup JSON contiene tokens de batalla y debe guardarse de forma privada.

## 💾 Copias de seguridad

- Panel `/admin → Backup`: JSON con todo el estado del juego (sin hashes de contraseñas).
- Nivel de base de datos: `pg_dump postgresql://postgres:postgres@127.0.0.1:5432/app_db > backup.sql`

## 🧯 Errores frecuentes

| Síntoma | Solución |
|---|---|
| `DATABASE_URL is required` | Crea el `.env` con la URL de PostgreSQL. |
| `relation "users" does not exist` | Ejecuta `npx drizzle-kit push`. |
| No puedo entrar a `/admin` | Define `ADMIN_USERNAME`/`ADMIN_PASSWORD` y reinicia; la cuenta se crea/asciende al primer login o petición. |
| No suena la música | Los navegadores móviles exigen un toque previo; toca cualquier botón. Revisa volúmenes en Ajustes. |
| "Energía insuficiente" | Regenera 1⚡/4 min, sube de nivel (restaura) o compra energía en la Tienda. |
| La invocación no descuenta/duplica | Es transaccional; si ves un error, recarga: el estado real está en el servidor (`game/state`). |

## 📱 APK Android con Capacitor

El juego es mobile-first (táctil, sin hover obligatorio). Para empaquetarlo como APK apuntando a tu servidor desplegado:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Legendia Nexus" com.legendia.nexus --web-dir=public
```

Como el juego necesita backend, la vía recomendada es una app *remote-hosted*: en `capacitor.config.json`:

```json
{ "appId": "com.legendia.nexus", "appName": "Legendia Nexus", "webDir": "public",
  "server": { "url": "https://TU-DOMINIO.com", "cleartext": false } }
```

```bash
npx cap add android
npx cap sync
npx cap open android   # compila la APK desde Android Studio (Build > Build APK)
```

`public/index.html` es la pantalla de respaldo exigida por Capacitor; con `server.url` configurado, el juego real se sirve desde la URL HTTPS. **No uses `output: 'export'` tal cual:** esta aplicación tiene rutas API dinámicas y PostgreSQL; un paquete completamente offline necesitaría separar y volver a conectar frontend y backend. La APK no se ha compilado en este entorno.

## 🌐 Despliegue web

Cualquier hosting Node + PostgreSQL sirve (Replit, Railway, Render, Fly.io, VPS):

1. Provisiona PostgreSQL y pon `DATABASE_URL`.
2. `npm install && npx drizzle-kit push && npm run build && npm start`.
3. La URL pública del hosting es tu servidor privado; comparte la URL y cada jugador tendrá su cuenta persistente.

## 🗂️ Arquitectura

```
src/
├── app/               # interfaz (App Router) + rutas API (backend)
│   ├── api/           # auth, game, summon, battle, admin, health
│   └── admin/         # panel de administración
├── components/        # UI, combate, ficha, misión, pantallas
├── game/              # catálogo, misiones, motor de combate, audio (compartido)
├── server/            # lógica autoritativa: gacha, recompensas, admin
├── lib/               # auth (scrypt/sesiones), cliente API, store
└── db/                # esquema Drizzle + conexión
```

Añadir un personaje nuevo = añadir una entrada en `src/game/catalog.ts` (+ retrato en una hoja `public/art/sheetN.jpg`). Nada más se rehace: gacha, álbum, combate y admin lo recogen automáticamente.

## ✅ Pruebas reproducibles

Con el servidor y PostgreSQL levantados:

```bash
node scripts/smoke-game.mjs
# Para apuntar a otro servidor:
GAME_URL=https://TU-DOMINIO.com node scripts/smoke-game.mjs
```

La prueba registra una cuenta temporal, hace login, daily, invoca, verifica que `/api/admin/*` devuelve 403, que una victoria falsa devuelve 400, que un movimiento imposible devuelve 400, que una revisión repetida devuelve 409 y que solo hay una batalla activa. Después juega una misión completa mediante acciones legales, verifica daño y recompensa persistente, carga una definitiva real, se retira y vuelve a entrar para comprobar el guardado.

Se probaron además en vivo: caducidad de eventos y bloqueo de misión sin descontar energía (con restauración del evento), compilación TypeScript, build de producción y `/api/health`.

## 🟡 Trabajo todavía pendiente

- El panel permite **crear eventos**, pero aún no permite crear una misión arbitraria desde cero; las misiones del evento se eligen del catálogo de `src/game/missions.ts`.
- No hay PvP, equipo de armas/runas ni capítulos posteriores al 2.
- No se ha generado una APK en este entorno: requiere Android Studio; la URL remota de Capacitor es la ruta recomendada para mantener el servidor independiente.
- Si el navegador pierde la respuesta justo después de la victoria, las recompensas ya quedan guardadas. Tras reabrir, consúltalas en el perfil/historia; el resumen cinematográfico de esa batalla no se recupera todavía.