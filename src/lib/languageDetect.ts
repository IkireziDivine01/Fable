/**
 * Lightweight heuristic: is this text primarily Ikinyarwanda?
 * Used to choose English↔Kinyarwanda translation direction on manual create.
 */
const RW_MARKERS =
  /\b(nuko|ubwo|mbese|umwana|nyina|amahoro|muraho|neza|cyane|kandi|ariko|noneho|amakuba|ijambo|inkuru|umugabo|umugore|abana|isazi|umuti|ishuri|amaso|ubusambo|abahisi|abagenzi|inararibonye|amata|arushaho|iseseme|ntibyamubuza|arahira|kuvuga|kumva|gukora|kwiga|umuryango|abavandimwe|se|so|mwene|ati|ngo|sinakubwiye|urabona|urinda|utari|intezarubwa|bakimara|acisha|nyamara|kuzongera|adahawe)\b/gi;

const EN_MARKERS =
  /\b(the|and|was|were|said|they|with|that|this|from|have|their|there|when|then|she|he|her|his|into|about|would|could|before|after|while)\b/gi;

export function looksLikeKinyarwanda(text: string): boolean {
  const sample = String(text ?? '').trim();
  if (!sample) return false;

  const rwHits = sample.match(RW_MARKERS)?.length ?? 0;
  const enHits = sample.match(EN_MARKERS)?.length ?? 0;

  // Prefer Kinyarwanda when RW cues clearly outnumber English function words.
  if (rwHits >= 2 && rwHits > enHits) return true;
  if (rwHits >= 1 && enHits === 0 && sample.split(/\s+/).length >= 4) return true;
  return false;
}
