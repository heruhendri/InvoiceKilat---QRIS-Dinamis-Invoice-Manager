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
  originalPayload: string;
}

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

export function parseQris(qrisString: string): QrisParsed {
  const clean = (qrisString || '').trim();
  let index = 0;
  let isDynamic = false;
  let merchantName: string | undefined;
  let merchantCity: string | undefined;
  let postalCode: string | undefined;
  let countryCode: string | undefined;
  let currency: string | undefined;
  let amount: number | undefined;

  while (index < clean.length - 4) {
    const tag = clean.substring(index, index + 2);
    const lengthStr = clean.substring(index + 2, index + 4);
    const length = parseInt(lengthStr, 10);
    if (isNaN(length) || length <= 0) break;

    const value = clean.substring(index + 4, index + 4 + length);

    if (tag === '01') {
      isDynamic = value === '12';
    } else if (tag === '53') {
      currency = value; // 360 = IDR
    } else if (tag === '54') {
      amount = parseFloat(value);
    } else if (tag === '58') {
      countryCode = value; // ID
    } else if (tag === '59') {
      merchantName = value;
    } else if (tag === '60') {
      merchantCity = value;
    } else if (tag === '61') {
      postalCode = value;
    }

    index += 4 + length;
  }

  return {
    version: '01',
    isDynamic,
    merchantName,
    merchantCity,
    postalCode,
    countryCode: countryCode || 'ID',
    currency: currency || '360',
    amount,
    originalPayload: clean,
  };
}

export function convertStaticToDynamicQris(
  staticQris: string,
  amount: number,
  invoiceRef?: string
): string {
  let clean = (staticQris || '').trim();
  if (!clean.startsWith('000201')) {
    clean = '00020101021126590014ID.DANA.WWW0118936009153000000001021000000000000303UMI51440014ID.CO.QRIS.WWW0215ID10200210000010303UMI5204541153033605802ID5914DANA BISNIS MER59146007JAKARTA6105123406304ABCD';
  }

  // Remove existing CRC tag
  const crcPos = clean.lastIndexOf('6304');
  let rawBody = crcPos !== -1 ? clean.substring(0, crcPos) : clean;

  // Change initiation method to dynamic (12)
  if (rawBody.includes('010211')) {
    rawBody = rawBody.replace('010211', '010212');
  } else if (!rawBody.includes('010212')) {
    rawBody = '000201010212' + rawBody.substring(6);
  }

  // Tag 54 (Nominal Amount)
  const formattedAmount = Math.round(amount).toString();
  const amountTag = `54${formattedAmount.length.toString().padStart(2, '0')}${formattedAmount}`;

  const tag54Regex = /54(\d{2})(\d+)/;
  if (tag54Regex.test(rawBody)) {
    rawBody = rawBody.replace(tag54Regex, amountTag);
  } else {
    const tag58Pos = rawBody.indexOf('5802');
    if (tag58Pos !== -1) {
      rawBody = rawBody.substring(0, tag58Pos) + amountTag + rawBody.substring(tag58Pos);
    } else {
      rawBody += amountTag;
    }
  }

  // Tag 62 (Additional Data / Invoice Reference)
  if (invoiceRef) {
    const cleanRef = invoiceRef.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 25);
    if (cleanRef) {
      const subtag = `01${cleanRef.length.toString().padStart(2, '0')}${cleanRef}`;
      const tag62 = `62${subtag.length.toString().padStart(2, '0')}${subtag}`;
      const tag62Regex = /62(\d{2})([0-9a-zA-Z]+)/;
      if (tag62Regex.test(rawBody)) {
        rawBody = rawBody.replace(tag62Regex, tag62);
      } else {
        rawBody += tag62;
      }
    }
  }

  // Append 6304 and calculate CRC16
  const payloadWithTag = rawBody + '6304';
  const crc = calculateCRC16(payloadWithTag);
  return payloadWithTag + crc;
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
