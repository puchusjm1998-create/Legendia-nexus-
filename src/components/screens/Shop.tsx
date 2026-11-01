"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useGame } from "@/lib/store";
import { Btn, SectionTitle } from "../ui";
import { getAudio } from "@/game/audio";

interface ShopItem {
  id: string; name: string; icon: string; currency: string; price: number;
}

export function ShopScreen() {
  const { state, refresh, toast } = useGame();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const p = state!.player;

  useEffect(() => {
    api<{ items: ShopItem[] }>("game/shop").then((r) => setItems(r.items)).catch(() => {});
  }, []);

  const buy = async (item: ShopItem) => {
    setBusy(item.id);
    try {
      await api("game/shop", { itemId: item.id });
      getAudio().sfx("levelup");
      toast(`Comprado: ${item.name}`, "gold");
      await refresh();
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(null);
    }
  };

  const curIcon = (c: string) => (c === "gold" ? "🪙" : "✨");
  const balance = (c: string) => (c === "gold" ? p.gold : p.stardust);

  return (
    <div className="pb-4">
      <SectionTitle icon="🏪" sub="Todo se compra con monedas ganadas jugando — progresión 100% gratuita">Tienda del Nexus</SectionTitle>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded bg-white/5 py-2">🪙 <b className="text-amber-300">{p.gold.toLocaleString("es")}</b><p className="text-[9px] text-slate-500">Oro</p></div>
        <div className="rounded bg-white/5 py-2">✨ <b className="text-purple-300">{p.stardust}</b><p className="text-[9px] text-slate-500">Polvo Estelar</p></div>
        <div className="rounded bg-white/5 py-2">🔷 <b className="text-cyan-300">{p.gems}</b><p className="text-[9px] text-slate-500">Gemas</p></div>
      </div>
      <div className="grid grid-cols-2 gap-2 stagger">
        {items.map((item) => (
          <div key={item.id} className="tile-cut border border-white/10 bg-gradient-to-b from-[#152342] to-[#0d1730] p-3 text-center transition-all hover:border-amber-400/40">
            <span className="text-3xl">{item.icon}</span>
            <p className="mt-1 font-display text-sm font-bold text-slate-100">{item.name}</p>
            <p className="mb-2 text-[11px] text-slate-400">{curIcon(item.currency)} {item.price.toLocaleString("es")} {item.currency === "gold" ? "oro" : "polvo"}</p>
            <Btn small className="w-full" disabled={busy === item.id || balance(item.currency) < item.price} onClick={() => buy(item)}>
              {busy === item.id ? "…" : "Comprar"}
            </Btn>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded bg-white/5 p-3 text-[11px] leading-relaxed text-slate-400">
        ✨ El <b className="text-purple-300">Polvo Estelar</b> se obtiene con invocaciones duplicadas (3★ +3, 4★ +10, 5★ +25).
        <br />🔷 Las <b className="text-cyan-300">Gemas Nexus</b> (moneda premium configurable) se ganan con misiones, logros, recompensas diarias y subidas de nivel. Este servidor privado no incluye pagos reales.
      </div>
    </div>
  );
}