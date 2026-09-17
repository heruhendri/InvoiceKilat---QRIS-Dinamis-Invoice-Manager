import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, r, g, b, a = 255) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // color type RGBA (6)
  ihdr.writeUInt8(0, 10); // compression method
  ihdr.writeUInt8(0, 11); // filter method
  ihdr.writeUInt8(0, 12); // interlace method

  function createChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // Generate image data with blue brand background and invoice document icon center
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.42;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      // Rounded background check
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Invoice sheet rect
      const inSheet = (x >= width * 0.25 && x <= width * 0.75 && y >= height * 0.22 && y <= height * 0.78);
      const inQrisSquare = (x >= width * 0.35 && x <= width * 0.65 && y >= height * 0.45 && y <= height * 0.70);
      const inQrisDot = (x >= width * 0.42 && x <= width * 0.58 && y >= height * 0.52 && y <= height * 0.63);

      if (dist <= radius) {
        if (inQrisDot) {
          // Dark navy
          rawData[offset++] = 15;
          rawData[offset++] = 23;
          rawData[offset++] = 42;
          rawData[offset++] = 255;
        } else if (inQrisSquare) {
          // Amber/Light blue
          rawData[offset++] = 224;
          rawData[offset++] = 231;
          rawData[offset++] = 255;
          rawData[offset++] = 255;
        } else if (inSheet) {
          // White paper
          rawData[offset++] = 255;
          rawData[offset++] = 255;
          rawData[offset++] = 255;
          rawData[offset++] = 255;
        } else {
          // Vibrant Royal Blue (#2563eb)
          rawData[offset++] = 37;
          rawData[offset++] = 99;
          rawData[offset++] = 235;
          rawData[offset++] = 255;
        }
      } else {
        // Transparent outside rounded icon
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 implementation for valid PNG
function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    let byte = buf[i];
    crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
  }
  table[i] = c >>> 0;
}

// Write icons
fs.writeFileSync('public/pwa-192x192.png', createPNG(192, 192));
fs.writeFileSync('public/pwa-512x512.png', createPNG(512, 512));
fs.writeFileSync('public/pwa-maskable-512x512.png', createPNG(512, 512));
fs.writeFileSync('public/apple-touch-icon.png', createPNG(180, 180));
fs.writeFileSync('public/favicon.ico', createPNG(64, 64));
console.log('PWA icons created successfully');
