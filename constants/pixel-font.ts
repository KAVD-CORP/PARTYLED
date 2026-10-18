/**
 * Classic 5×7 dot-matrix font for ASCII 0x20–0x5A. Each glyph is 5 column
 * bytes; bit 0 is the top row.
 */
const GLYPHS =
  '0000000000' + '00005f0000' + '0007000700' + '147f147f14' + '242a7f2a12' + '2313086462' + '3649552250' + '0005030000' +
  '001c224100' + '0041221c00' + '082a1c2a08' + '08083e0808' + '0050300000' + '0808080808' + '0060600000' + '2010080402' +
  '3e5149453e' + '00427f4000' + '4261514946' + '2141454b31' + '1814127f10' + '2745454539' + '3c4a494930' + '0171090503' +
  '3649494936' + '064949291e' + '0036360000' + '0056360000' + '0008142241' + '1414141414' + '4122140800' + '0201510906' +
  '324979413e' + '7e1111117e' + '7f49494936' + '3e41414122' + '7f4141221c' + '7f49494941' + '7f09090101' + '3e41415132' +
  '7f0808087f' + '00417f4100' + '2040413f01' + '7f08142241' + '7f40404040' + '7f0204027f' + '7f0408107f' + '3e4141413e' +
  '7f09090906' + '3e4151215e' + '7f09192946' + '4649494931' + '01017f0101' + '3f4040403f' + '1f2040201f' + '7f2018207f' +
  '6314081463' + '0304780403' + '6151494543';

export const GLYPH_WIDTH = 5;
export const GLYPH_HEIGHT = 7;
/** Columns per character including the 1-column gap. */
export const GLYPH_ADVANCE = 6;

/** Returns the 5 column bitmasks for a character; unknown characters render blank. */
export function glyphColumns(char: string): number[] {
  const code = char.toUpperCase().charCodeAt(0);
  if (code < 0x20 || code > 0x5a) return [0, 0, 0, 0, 0];
  const offset = (code - 0x20) * 10;
  return Array.from({ length: 5 }, (_, i) => parseInt(GLYPHS.slice(offset + i * 2, offset + i * 2 + 2), 16));
}
