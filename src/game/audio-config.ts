// ============================================================
// LEGENDIA NEXUS — Configuración de música
// Para usar tus propias pistas (música propia o con licencia adecuada):
//   1. copia los archivos a /public/audio
//   2. indícalos en /public/audio/tracks.json, por ejemplo:
//        { "menu": "menu.mp3", "battle": "battle.ogg" }
//      (null = usar la pista procedural original incluida en el juego)
//
//   menu   → pantalla inicial, login y menú principal (misma pista, sin cortes)
//   battle → combates
//
// Admite cualquier formato que reproduzca el navegador (mp3, ogg, m4a, wav).
// ============================================================
export type MusicTrack = "menu" | "battle";

/** Manifiesto editable: public/audio/tracks.json → { "menu": "menu.mp3", "battle": "battle.mp3" } */
export const MUSIC_MANIFEST_URL = "/audio/tracks.json";

/** Tiempos de fundido (segundos). */
export const MUSIC_FADE = { out: 0.45, in: 0.6 };

/** Volumen relativo de cada pista (compensa pistas externas más fuertes/débiles). */
export const MUSIC_TRACK_GAIN: Record<MusicTrack, number> = { menu: 1, battle: 1 };
