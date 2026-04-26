export const SCHOOL_SYSTEM_CONTEXT = `# Eesti koolisüsteem — kontekst AI agentidele

## Kooliastmed (school levels)
- Põhikool I aste: 1.–3. klass (ages 7–10)
- Põhikool II aste: 4.–6. klass (ages 10–13)
- Põhikool III aste: 7.–9. klass (ages 13–16) — PEAMINE SIHTRÜHM
- Gümnaasium: 10.–12. klass (ages 16–19)

## Kontrolltöö (test) types in Estonian schools:
- Kontrolltöö — standard class test (20–45 min)
- Iseseisev töö / tunnikontrolltöö — short in-class check (10–15 min)
- Kordamisülesanded — revision tasks
- Kodutöö — homework (less common as formal assessment)
- Arvestustöö — end-of-unit test (counting towards grade)
- Eksam — formal exam (gümnaasiumi lõpueksam, riigieksam)

## Grading authority:
- Classroom teacher grades all coursework
- National exams (riigieksamid) are externally marked
- AI is NEVER the final grader — it assists the teacher who makes the final call

## Typical class sizes: 20–35 students per class

## Language: ALL student-facing feedback must be in Estonian (eesti keel).
Teacher-facing notes can mix Estonian and English but prefer Estonian.

## Student age considerations:
- 7.–9. klass (ages 13–16): feedback should be direct, respectful, and concrete
- Gümnaasium (ages 16–19): feedback can be slightly more technical
- Never use condescending language regardless of age

## Privacy rules (GDPR + Estonian data protection):
- Student real names are NEVER sent to external AI APIs
- The AI receives only a placeholder ("Õpilane") — never a real name
- All feedback is generated with "Sa" (you) — personalized via DB after generation
- Student work images may contain personal info — treat as confidential

## Common Estonian school subjects with typical test topics:
- Füüsika: valgusõpetus, mehaanika, elekter, magnetism, termodünaamika, optika
- Matemaatika: algebra, geomeetria, trigonomeetria, funktsioonid, statistika
- Keemia: aatom, perioodilisustabel, reaktsioonid, orgaaniline keemia
- Bioloogia: rakud, evolutsioon, ökoloogia, inimkeha
- Ajalugu: Eesti ajalugu, maailma ajalugu
- Eesti keel: grammatika, kirjand, teksti analüüs
`;
