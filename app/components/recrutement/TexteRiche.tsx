import type { BlocDeTexte, Segment } from "@/app/lib/recrutement-etats";

/**
 * Les blocs d'un texte du mini-éditeur, rendus en JSX (16 octobre 2026). Aucun HTML n'est
 * injecté : un texte saisi ne devient jamais du balisage, il est affiché tel quel.
 */
export function TexteRiche({ blocs }: { blocs: BlocDeTexte[] }) {
  if (blocs.length === 0) return <p className="texte-riche__vide">Rien à afficher.</p>;
  return (
    <div className="texte-riche">
      {blocs.map((b, i) =>
        b.type === "intertitre" ? (
          <h4 key={i}>{b.texte}</h4>
        ) : b.type === "liste" ? (
          <ul key={i}>
            {b.points.map((p, j) => (
              <li key={j}>
                <Segments segments={p} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            <Segments segments={b.segments} />
          </p>
        ),
      )}
    </div>
  );
}

function Segments({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((s, i) =>
        s.gras ? <strong key={i}>{s.texte}</strong> : s.italique ? <em key={i}>{s.texte}</em> : <span key={i}>{s.texte}</span>,
      )}
    </>
  );
}
