// Le moteur de pdf.js, importé pour ses effets (il s'inscrit sur `globalThis`) : le paquet
// ne publie pas de déclaration pour lui. Voir `app/components/ApercuPdf.tsx`.
declare module "pdfjs-dist/build/pdf.worker.mjs";
