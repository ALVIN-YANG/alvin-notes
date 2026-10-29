function separateNotes(value = '') {
  let label = '', note = '', depth = 0;
  const notes = [];
  for (const char of value) {
    if (char === '(' || char === '（') {
      if (depth) note += char;
      depth++;
    } else if ((char === ')' || char === '）') && depth) {
      depth--;
      if (depth) note += char;
      else { if (note.trim()) notes.push(note.trim()); note = ''; label += ' '; }
    } else if (depth) note += char;
    else label += char;
  }
  if (depth) return { label: value, notes: [] };
  return { label: label.replace(/\s+/g, ' ').trim() || value, notes };
}

/** Presentation only: retain original names, IDs, speech and source data. */
export function conceptLabels(term) {
  const english = separateNotes(term.term), chinese = separateNotes(term.zh);
  const notes = [...new Set([...english.notes, ...chinese.notes])];
  const note = notes.join('；');
  return { ...term, displayTerm: english.label, displayZh: chinese.label,
    parentheticalNote: note, displaySummary: note ? `${note}。${term.summary}` : term.summary };
}
