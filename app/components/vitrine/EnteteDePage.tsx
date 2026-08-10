import Image from "next/image";

/**
 * Bandeau d'ouverture des pages intérieures.
 *
 * Reprend le héros de l'accueil : **même hauteur**, même photographie sous le
 * même voile, mais sans carrousel ni formulaire. Le visiteur reconnaît la maison
 * en changeant de page, ce qu'un simple titre sur fond uni ne donnerait pas — et
 * il ne subit aucune rupture de gabarit entre l'accueil et les pages.
 */
export function EnteteDePage({
  kicker,
  titre,
  detail,
  image,
  enfants,
}: {
  kicker: string;
  titre: string;
  detail: string;
  image: string;
  enfants?: React.ReactNode;
}) {
  return (
    <section className="entete-page">
      <Image src={image} alt="" fill priority sizes="100vw" className="heros__image" />
      <div className="heros__voile" />
      <div className="bloc entete-page__contenu">
        <span className="heros__kicker">{kicker}</span>
        <h1 className="heros__titre">{titre}</h1>
        <p className="heros__detail">{detail}</p>
        {enfants}
      </div>
    </section>
  );
}
