const russianPluralRules = new Intl.PluralRules("ru");

type RussianPluralForms = {
  one: string;
  few: string;
  many: string;
};

export function getRussianPluralLabel(
  value: number,
  forms: RussianPluralForms,
) {
  const rule = russianPluralRules.select(value);

  if (rule === "one") {
    return forms.one;
  }

  if (rule === "few") {
    return forms.few;
  }

  return forms.many;
}
