// Converteix HTML (guardat per RichTextEditor) a text pla per a resums curts,
// cerques i tooltips, on renderitzar HTML complet trencaria el disseny
// (line-clamp, truncate, etc.).
export function stripHtmlToText(html: string | undefined | null): string {
  if (!html) return "";
  // Si no sembla HTML (text antic guardat abans de l'editor ric), retorna tal qual.
  if (!/<[a-z][\s\S]*>/i.test(html)) return html;
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").trim();
}
