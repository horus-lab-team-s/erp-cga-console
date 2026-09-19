/**
 * Déclencher, dans le navigateur, l'enregistrement d'un fichier reçu en base64 (pas 88).
 *
 * ⚠️ Partagé par l'export comptable (pas 85) et le document d'une pièce : les octets sont
 * reconstitués tels quels dans un `Blob` typé, sans passer par du texte, qui abîmerait un
 * export cp1252 ou un PDF. Deux copies de ces lignes auraient divergé au premier correctif.
 *
 * Module client : il touche `document` et `URL`, et ne s'importe pas côté serveur.
 */
export function declencherTelechargement(fichier: { nom: string; typeMime: string; base64: string }): void {
  const binaire = atob(fichier.base64);
  const octets = Uint8Array.from(binaire, (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([octets], { type: fichier.typeMime }));
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = fichier.nom;
  lien.click();
  URL.revokeObjectURL(url);
}
