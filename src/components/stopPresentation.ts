export interface StopPresentation {
  name: string;
  addressNumber: string | null;
  fullName: string;
}

const PORTUGUESE_ACCENTS: Record<string, string> = {
  antonio: 'antônio',
  agua: 'água',
  barao: 'barão',
  coracao: 'coração',
  conceicao: 'conceição',
  estacao: 'estação',
  joao: 'joão',
  pca: 'praça',
  praca: 'praça',
  rodoviaria: 'rodoviária',
  rodoviario: 'rodoviário',
  sao: 'são',
};

function titleCase(value: string): string {
  const hasLetters = /\p{L}/u.test(value);
  const isAllCaps = hasLetters && value === value.toLocaleUpperCase('pt-BR');
  const normalized = isAllCaps
    ? value.toLocaleLowerCase('pt-BR').replace(/\p{L}[\p{L}\p{M}]*/gu, word =>
        word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1),
      )
    : value.trim();

  return normalized.replace(/\p{L}[\p{L}\p{M}]*/gu, word => {
    const accented = PORTUGUESE_ACCENTS[word.toLocaleLowerCase('pt-BR')];
    return accented
      ? accented.charAt(0).toLocaleUpperCase('pt-BR') + accented.slice(1)
      : word;
  });
}

export function formatStopDescription(description: string): StopPresentation {
  const normalized = titleCase(description.trim());
  const addressMatch = normalized.match(/^(.*?),\s*(\d+[A-Za-z]?)$/u);
  const name = addressMatch?.[1]?.trim() || normalized;
  const addressNumber = addressMatch?.[2] ?? null;

  return {
    name,
    addressNumber,
    fullName: addressNumber ? `${name}, ${addressNumber}` : name,
  };
}
