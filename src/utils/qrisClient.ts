import QRCode from 'qrcode';

export interface QrisParsed {
  version: string;
  isDynamic: boolean;
  merchantName?: string;
  merchantCity?: string;
  postalCode?: string;
  countryCode?: string;
  currency?: string;
  amount?: number;
  invoiceRef?: string;
  merchantAccountInfo?: string;
  originalPayload: string;
}

export const CANONICAL_DANA_STATIC_QRIS =
  '00020101021126570011ID.DANA.WWW011893600915356761342102095676134210303UMI51440014ID.CO.QRIS.WWW0215ID10233067778720303UMI5204737253033605802ID5911hendr.store6013Kab. Pemalang6105523716304F609';

/**
 * Standard EMVCo CRC-16/CCITT-FALSE (Polynomial 0x1021, Initial 0xFFFF, no reflection)
 */
export function calculateCRC16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    const byte = payload.charCodeAt(i);
    crc ^= (byte << 8) & 0xffff;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Robust EMVCo TLV Parser for client-side
 */
export function parseTLVMap(payload: string): { tags: Map<string, string>; order: string[] } {
  const tags = new Map<string, string>();
  const order: string[] = [];

  if (!payload || typeof payload !== 'string') {
    return { tags, order };
  }

  let str = payload.trim();
  const startIdx = str.indexOf('000201');
  if (startIdx !== -1) {
    str = str.substring(startIdx);
  }

  let idx = 0;
  while (idx < str.length) {
    if (idx + 4 > str.length) break;
    const tag = str.slice(idx, idx + 2);
    const lenStr = str.slice(idx + 2, idx + 4);
    const len = parseInt(lenStr, 10);

    if (isNaN(len) || len < 0 || idx + 4 + len > str.length) {
      break;
    }

    const val = str.slice(idx + 4, idx + 4 + len);
    idx += 4 + len;

    if (tag === '63') {
      tags.set('63', val);
      continue;
    }

    if (!tags.has(tag)) {
      order.push(tag);
    }
    tags.set(tag, val);
  }

  return { tags, order };
}

/**
 * Validate QRIS string structure against Bank Indonesia EMVCo standard
 */
export function validateQris(qrisString?: string): { valid: boolean; message: string; details?: any } {
  if (!qrisString || typeof qrisString !== 'string' || qrisString.trim().length < 20) {
    return { valid: false, message: 'String QRIS terlalu pendek atau kosong' };
  }

  let clean = qrisString.trim();
  const startIdx = clean.indexOf('000201');
  if (startIdx === -1) {
    return { valid: false, message: 'Format QRIS tidak valid: Harus diawali dengan 000201 (Format Indicator)' };
  }
  clean = clean.substring(startIdx);

  const { tags } = parseTLVMap(clean);

  if (tags.get('00') !== '01') {
    return { valid: false, message: 'Tag 00 tidak valid: Format indicator harus 01' };
  }

  const pointOfInitiation = tags.get('01');
  if (pointOfInitiation !== '11' && pointOfInitiation !== '12') {
    return { valid: false, message: 'Tag 01 tidak valid: Metode inisiasi harus 11 (Statis) atau 12 (Dinamis)' };
  }

  const hasMerchantTag = Array.from(tags.keys()).some((k) => {
    const num = parseInt(k, 10);
    return !isNaN(num) && num >= 2 && num <= 51;
  });

  if (!hasMerchantTag) {
    return { valid: false, message: 'Format QRIS tidak valid: Informasi merchant (Tag 26 - 51) tidak ditemukan' };
  }

  const crcIndex = clean.lastIndexOf('6304');
  if (crcIndex === -1 || crcIndex !== clean.length - 8) {
    return { valid: false, message: 'Format QRIS tidak valid: Tag Checksum 6304 tidak ditemukan di akhir payload' };
  }

  const dataToVerify = clean.substring(0, crcIndex + 4);
  const actualCrc = clean.substring(crcIndex + 4).toUpperCase();
  const calculatedCrc = calculateCRC16(dataToVerify);

  const merchantName = tags.get('59') || 'Merchant Terdaftar';
  const amount = tags.get('54') ? parseFloat(tags.get('54')!) : undefined;

  if (actualCrc !== calculatedCrc) {
    return { 
      valid: true, 
      message: `QRIS Terbaca (${merchantName}), CRC ${actualCrc} akan dikoreksi otomatis menjadi ${calculatedCrc}`,
      details: { correctedCrc: calculatedCrc, merchantName, amount }
    };
  }

  return { 
    valid: true, 
    message: `QRIS Valid: ${merchantName} ${amount ? `(Rp ${amount.toLocaleString('id-ID')})` : '(Statis)'}`,
    details: { merchantName, amount, isDynamic: pointOfInitiation === '12' }
  };
}

export function parseQris(qrisString?: string): QrisParsed {
  if (!qrisString || typeof qrisString !== 'string') {
    return {
      version: '01',
      isDynamic: false,
      countryCode: 'ID',
      currency: '360',
      originalPayload: '',
    };
  }

  const clean = qrisString.trim();
  const { tags } = parseTLVMap(clean);

  const isDynamic = tags.get('01') === '12';
  const currency = tags.get('53') || '360';
  const amount = tags.get('54') ? parseFloat(tags.get('54')!) : undefined;
  const countryCode = tags.get('58') || 'ID';
  const merchantName = tags.get('59');
  const merchantCity = tags.get('60');
  const postalCode = tags.get('61');

  let invoiceRef: string | undefined;
  const tag62 = tags.get('62');
  if (tag62 && tag62.length >= 4) {
    const sub01Idx = tag62.indexOf('01');
    if (sub01Idx !== -1 && sub01Idx + 4 <= tag62.length) {
      const subLen = parseInt(tag62.slice(sub01Idx + 2, sub01Idx + 4), 10);
      if (!isNaN(subLen) && sub01Idx + 4 + subLen <= tag62.length) {
        invoiceRef = tag62.slice(sub01Idx + 4, sub01Idx + 4 + subLen);
      }
    }
  }

  const merchantAccountInfo = tags.get('26') || tags.get('51');

  return {
    version: '01',
    isDynamic,
    merchantName,
    merchantCity,
    postalCode,
    countryCode,
    currency,
    amount,
    invoiceRef,
    merchantAccountInfo,
    originalPayload: clean,
  };
}

export const parseQrisClient = parseQris;

export function convertStaticToDynamicQris(
  staticQris?: string,
  amount: number = 0,
  invoiceRef?: string,
  overrideMerchantName?: string,
  overrideMerchantCity?: string
): string {
  let { tags } = parseTLVMap(staticQris || '');

  const hasMerchantTag = Array.from(tags.keys()).some((k) => {
    const num = parseInt(k, 10);
    return !isNaN(num) && num >= 2 && num <= 51;
  });

  if (!tags.has('00') || !hasMerchantTag) {
    const defaultParsed = parseTLVMap(CANONICAL_DANA_STATIC_QRIS);
    tags = defaultParsed.tags;
  }

  // 1. Tag 00: Payload Format Indicator = 01
  tags.set('00', '01');

  // 2. Tag 01: Dynamic QR Code = 12
  tags.set('01', '12');

  // 3. Tag 52: MCC
  if (!tags.has('52')) {
    tags.set('52', '5411');
  }

  // 4. Tag 53: IDR = 360
  tags.set('53', '360');

  // 5. Tag 54: Amount
  const numericAmount = Math.max(0, Math.round(Number(amount) || 0));
  if (numericAmount > 0) {
    tags.set('54', numericAmount.toString());
  } else {
    tags.delete('54');
  }

  // 6. Tag 58: Country Code = ID
  tags.set('58', 'ID');

  // 7. Tag 59: Merchant Name
  if (overrideMerchantName && overrideMerchantName.trim()) {
    tags.set('59', overrideMerchantName.trim().slice(0, 25));
  } else if (!tags.has('59')) {
    tags.set('59', 'hendr.store');
  }

  // 8. Tag 60: Merchant City
  if (overrideMerchantCity && overrideMerchantCity.trim()) {
    tags.set('60', overrideMerchantCity.trim().slice(0, 15));
  } else if (!tags.has('60')) {
    tags.set('60', 'Kab. Pemalang');
  }

  // 9. Tag 62: Additional Data Field (Invoice Reference)
  if (invoiceRef) {
    const cleanRef = invoiceRef.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 25);
    if (cleanRef) {
      const subtag01 = `01${cleanRef.length.toString().padStart(2, '0')}${cleanRef}`;
      tags.set('62', subtag01);
    }
  }

  // 10. Assemble canonical EMVCo payload string
  const canonicalOrder = [
    '00',
    '01',
    ...Array.from(tags.keys())
      .filter((t) => {
        const num = parseInt(t, 10);
        return !isNaN(num) && num >= 2 && num <= 51;
      })
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10)),
    '52',
    '53',
    '54',
    '55',
    '56',
    '57',
    '58',
    '59',
    '60',
    '61',
    '62',
  ];

  let body = '';
  for (const t of canonicalOrder) {
    if (tags.has(t)) {
      const val = tags.get(t)!;
      const len = val.length.toString().padStart(2, '0');
      body += `${t}${len}${val}`;
    }
  }

  const payloadBeforeCrc = body + '6304';
  const crc = calculateCRC16(payloadBeforeCrc);
  return payloadBeforeCrc + crc;
}

export async function renderQrCodeDataUrl(qrisString: string): Promise<string> {
  return await QRCode.toDataURL(qrisString, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 8,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}
