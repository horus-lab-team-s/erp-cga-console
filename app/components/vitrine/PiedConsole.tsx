"use client";

import { useTranslations } from "next-intl";

import { ADRESSE_VITRINE } from "@/app/lib/adresse-vitrine";

/**
 * Le pied des pages publiques de la console.
 *
 * ⚠️ Même raison que l'en-tête : celui de la vitrine listait une vingtaine de
 * liens vers des pages qui n'existent pas ici, sous des libellés qui ne se
 * chargeaient pas. Ce qu'il faut sur une page de connexion tient en une ligne :
 * qui édite ce service, et comment le joindre.
 */
export function PiedConsole() {
  const commun = useTranslations("commun");

  return (
    <footer className="pied-console">
      <p className="pied-console__ligne">
        {commun("cabinet.nom")} ·{" "}
        <a href={`mailto:${commun("cabinet.courriel")}`}>
          {commun("cabinet.courriel")}
        </a>{" "}
        ·{" "}
        <a href={ADRESSE_VITRINE}>{commun("actions.retourAuSite")}</a>
      </p>
      <p className="pied-console__mention">{commun("cabinet.agrement")}</p>
    </footer>
  );
}
