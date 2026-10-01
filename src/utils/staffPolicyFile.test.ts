import { describe, it, expect } from 'vitest';
import { safeS3FileName, contentDisposition } from './staffPolicyFile';

describe('safeS3FileName', () => {
  it('saca acentos y caracteres que rompen la URL de S3', () => {
    expect(safeS3FileName('Póliza #3 100%.pdf')).toBe('Poliza-3-100.pdf');
    expect(safeS3FileName('seguro?ana&co.PDF')).toBe('seguro-ana-co.pdf');
  });
  it('nombre vacío o raro → poliza.pdf', () => {
    expect(safeS3FileName('###.pdf')).toBe('poliza.pdf');
    expect(safeS3FileName('')).toBe('poliza.pdf');
  });
});

describe('contentDisposition', () => {
  it('fallback ASCII + filename* UTF-8 para acentos', () => {
    expect(contentDisposition('Póliza Ana.pdf')).toBe(
      `inline; filename="Poliza Ana.pdf"; filename*=UTF-8''P%C3%B3liza%20Ana.pdf`
    );
  });
  it('quita comillas del fallback', () => {
    expect(contentDisposition('a"b.pdf')).toBe(`inline; filename="ab.pdf"; filename*=UTF-8''a%22b.pdf`);
  });
});
