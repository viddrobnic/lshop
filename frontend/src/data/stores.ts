export type Store = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
};

export type Section = {
  id: number;
  store_id: number;
  name: string;
  created_at: string;
  updated_at: string;
};

export function reorderSections(
  sections: Section[],
  activeId: number,
  targetId: number
): Section[] {
  const fromIndex = sections.findIndex((section) => section.id === activeId);
  const toIndex = sections.findIndex((section) => section.id === targetId);

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return sections;
  }

  const nextSections = [...sections];
  const [section] = nextSections.splice(fromIndex, 1);
  nextSections.splice(toIndex, 0, section);
  return nextSections;
}
