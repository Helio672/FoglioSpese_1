import { centsToInput, parseEuroToCents } from '@/src/domain/money';

describe('parseEuroToCents', () => {
  it('converte euro con virgola in centesimi', () => {
    expect(parseEuroToCents('12,34')).toBe(1234);
  });

  it('accetta il punto e gli importi interi', () => {
    expect(parseEuroToCents('7.5')).toBe(750);
    expect(parseEuroToCents('10')).toBe(1000);
  });

  it('ignora gli spazi', () => {
    expect(parseEuroToCents(' 1 234,50 ')).toBe(123450);
  });

  it('rifiuta zero, negativi, più di due decimali e testo', () => {
    expect(parseEuroToCents('0')).toBeNull();
    expect(parseEuroToCents('-5')).toBeNull();
    expect(parseEuroToCents('1,234')).toBeNull();
    expect(parseEuroToCents('abc')).toBeNull();
    expect(parseEuroToCents('')).toBeNull();
  });

  it('è l\'inverso di centsToInput', () => {
    expect(parseEuroToCents(centsToInput(1999))).toBe(1999);
  });
});
