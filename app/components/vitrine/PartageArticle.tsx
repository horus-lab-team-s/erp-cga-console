"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { adresseAbsolue } from "@/app/lib/site";
import { usePathname } from "@/i18n/navigation";
import { IconeVitrine } from "./IconeVitrine";

/**
 * Partager un article — Facebook, WhatsApp, copie du lien.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CES TROIS-LÀ
 *
 * Ce sont les trois canaux réels de la clientèle du cabinet. **WhatsApp compte
 * au moins autant que Facebook** : au Cameroun, un lien utile circule d'abord de
 * conversation en conversation, entre un chef d'entreprise et son comptable. La
 * copie du lien couvre tout le reste — courriel, SMS, groupe professionnel.
 *
 * L'accroche part avec le lien sur WhatsApp, dont l'aperçu est plus avare que
 * celui de Facebook : le message doit se tenir même si aucune vignette ne se
 * charge. Facebook, lui, lit les métadonnées Open Graph de la page et n'a besoin
 * que de l'adresse.
 *
 * L'ADRESSE SE CALCULE, ELLE NE SE LIT PAS
 *
 * Elle est reconstruite à partir du domaine public, de la langue et du chemin,
 * plutôt que lue dans `window.location`. Deux raisons : les boutons sont bons
 * dès le rendu serveur, sans attendre l'hydratation ; et l'adresse partagée est
 * toujours la **canonique**, sans le paramètre de campagne ni l'ancre que le
 * visiteur traîne parfois derrière lui. `NEXT_PUBLIC_SITE_URL` couvre le cas de
 * la préproduction.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Durée d'affichage du « lien copié ». Assez pour être lu, trop court pour gêner. */
const CONFIRMATION_MS = 2600;

export function PartageArticle({ titre, accroche }: { titre: string; accroche: string }) {
  const t = useTranslations("vitrine.blog");
  const langue = useLocale();
  const chemin = usePathname();
  const [copie, setCopie] = useState(false);

  const adresse = adresseAbsolue(`/${langue}${chemin}`);

  useEffect(() => {
    if (!copie) return;
    const minuterie = window.setTimeout(() => setCopie(false), CONFIRMATION_MS);
    return () => window.clearTimeout(minuterie);
  }, [copie]);

  async function copierLien() {
    try {
      await navigator.clipboard.writeText(adresse);
      setCopie(true);
    } catch {
      // Presse-papiers refusé — page non sécurisée, permission retirée. On ne
      // ment pas au visiteur : pas de confirmation, il verra que rien ne s'est
      // passé et pourra copier depuis la barre d'adresse.
    }
  }

  const versFacebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(adresse)}`;
  const versWhatsApp = `https://wa.me/?text=${encodeURIComponent(`${titre}\n\n${accroche}\n\n${adresse}`)}`;

  return (
    <div className="partage">
      <span className="partage__intitule">{t("partager")}</span>

      <a
        className="partage__bouton partage__bouton--facebook"
        href={versFacebook}
        target="_blank"
        rel="noopener noreferrer"
      >
        <IconeVitrine nom="facebook" taille={16} plein />
        Facebook
      </a>

      <a
        className="partage__bouton partage__bouton--whatsapp"
        href={versWhatsApp}
        target="_blank"
        rel="noopener noreferrer"
      >
        <IconeVitrine nom="whatsappPlein" taille={16} plein />
        WhatsApp
      </a>

      <button type="button" className="partage__bouton" onClick={copierLien}>
        <IconeVitrine nom={copie ? "coche" : "copier"} taille={16} />
        {copie ? t("lienCopie") : t("copierLien")}
      </button>

      {/* La confirmation est déjà dans le bouton, mais un lecteur d'écran ne
          relit pas un libellé qui change sous ses doigts : on l'annonce ici. */}
      <span role="status" aria-live="polite" className="visuellement-cache">
        {copie ? t("lienCopie") : ""}
      </span>
    </div>
  );
}
