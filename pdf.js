/**
 * sign-pdf.js
 * Digitally sign a PDF with pdf-lib, where:
 *   - the hash is computed by YOUR external function, and
 *   - the CMS / PKCS#7 SignedData (built from userCert, caCert and the
 *     signature value) is produced by YOUR external function.
 *
 * Flow:
 *   1. preparePdfForSigning(pdfBase64)  -> placeholder injected, real
 *      ByteRange written, returns the exact bytes that must be hashed.
 *   2. (external) hash = yourHashFn(dataToSign)
 *   3. (external) cmsDer = yourCmsBuilder(hash, userCert, caCert, ...)
 *      NOTE: must be a *detached* CMS (no encapsulated content).
 *   4. embedCmsIntoPdf(preparedPdf, byteRange, cmsDer) -> final signed PDF.
 *
 * Works in Node and in the browser (no Buffer dependency).
 */

import {
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFString,
  PDFHexString,
  PDFArray,
  PDFDict,
  StandardFonts,
  rgb,
} from 'pdf-lib';

import * as asn1js from "https://cdn.jsdelivr.net/npm/asn1js/+esm";
import * as pkijs from "https://cdn.jsdelivr.net/npm/pkijs/+esm";

// Bytes reserved for the DER-encoded CMS. Increase if your CMS is bigger
// (e.g. long cert chains, embedded timestamp token, OCSP/CRL data).
const DEFAULT_SIGNATURE_LENGTH = 46080;

const BYTE_RANGE_TOKEN = '**********';

/* ------------------------------------------------------------------ */
/* Step 1: add placeholder + finalize ByteRange                         */
/* ------------------------------------------------------------------ */

/**
 * @param {string} pdfBase64 - the input PDF as base64
 * @param {object} [opts]
 * @param {string} [opts.text]             - text shown in the signature box;
 *                                           if omitted, signature is invisible
 * @param {number} [opts.x]                - box lower-left X (PDF points,
 *                                           origin = bottom-left of the page)
 * @param {number} [opts.y]                - box lower-left Y
 * @param {number} [opts.pageIndex]        - 0-based page for the box
 * @param {number} [opts.boxWidth]         - box width  (default 180)
 * @param {number} [opts.boxHeight]        - box height (default 40)
 * @param {number} [opts.fontSize]         - max font size (auto-shrinks to fit)
 * @param {string} [opts.reason]
 * @param {string} [opts.location]
 * @param {string} [opts.contactInfo]
 * @param {string} [opts.fieldName]        - signature field name
 * @param {number} [opts.signatureLength]  - bytes reserved for the CMS
 * @param {string} [opts.subFilter]        - 'adbe.pkcs7.detached' (default)
 *                                           or 'ETSI.CAdES.detached' (PAdES)
 * @returns {Promise<{
 *   pdfWithPlaceholder: Uint8Array, // PDF with zeros in /Contents, real ByteRange
 *   byteRange: number[],            // [0, a, b, c]
 *   dataToSign: Uint8Array          // bytes covered by the signature -> hash these
 * }>}
 */
export async function preparePdfForSigning(pdfBase64, opts = {}) {
  const {
    text = '',
    x = 0,
    y = 0,
    pageIndex = 0,
    boxWidth = 180,
    boxHeight = 40,
    fontSize = 10,
    reason = 'Assinatura Digital SPMS',
    location = 'CUF',
    contactInfo = '',
    fieldName = 'Signature1',
    signatureLength = DEFAULT_SIGNATURE_LENGTH,
    subFilter = 'adbe.pkcs7.detached',
  } = opts;

  const pdfDoc = await PDFDocument.load(base64ToBytes(pdfBase64), {
    updateMetadata: false,
  });
  const ctx = pdfDoc.context;

  const pages = pdfDoc.getPages();
  if (pageIndex < 0 || pageIndex >= pages.length) {
    throw new Error(`pageIndex ${pageIndex} out of range (PDF has ${pages.length} pages)`);
  }
  const page = pages[pageIndex];

  const xx = parseInt(x, 10);
  const yy = parseInt(y, 10);
  const xboxWidth = parseInt(boxWidth, 10);
  const yboxHeight = parseInt(boxHeight, 10);

  // 1. Draw direct text content on the page (no borders)
  if (text) {
    const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Calculate auto-fit font size
    let size = fontSize;
    const maxTextWidth = xboxWidth - 8;
    while (size > 4 && helv.widthOfTextAtSize(text, size) > maxTextWidth) {
      size -= 0.5;
    }

    // Write text to the page directly
    page.drawText(text, {
      x: xx,
      y: yy + (yboxHeight / 2),
      size: size,
      font: helv,
      color: rgb(0, 0, 0),
      lineHeight: size + 2,
    });
  }

  // 2. Prepare Signature Placeholder Dictionary
  const byteRangePlaceholder = PDFArray.withContext(ctx);
  byteRangePlaceholder.push(PDFNumber.of(0));
  byteRangePlaceholder.push(PDFName.of(BYTE_RANGE_TOKEN));
  byteRangePlaceholder.push(PDFName.of(BYTE_RANGE_TOKEN));
  byteRangePlaceholder.push(PDFName.of(BYTE_RANGE_TOKEN));

  const sigDict = ctx.obj({
    Type: 'Sig',
    Filter: 'Adobe.PPKLite',
    SubFilter: subFilter,
    ByteRange: byteRangePlaceholder,
    Contents: PDFHexString.of('00'.repeat(signatureLength)),
    Reason: PDFString.of(reason),
    Location: PDFString.of(location),
    ContactInfo: PDFString.of(contactInfo),
    M: PDFString.fromDate(new Date()),
  });
  const sigDictRef = ctx.register(sigDict);

  // 3. Invisible Signature Widget
  const widget = ctx.obj({
    Type: 'Annot',
    Subtype: 'Widget',
    FT: 'Sig',
    Rect: [xx, yy, xx + xboxWidth, yy + yboxHeight],
    V: sigDictRef,
    T: PDFString.of(fieldName),
    F: 4, // Print flag
    P: page.ref,
  });
  const widgetRef = ctx.register(widget);

  // Attach signature widget annotation to the page
  const annotsKey = PDFName.of('Annots');
  let annots = page.node.lookupMaybe(annotsKey, PDFArray);
  if (!annots) {
    annots = ctx.obj([]);
    page.node.set(annotsKey, annots);
  }
  annots.push(widgetRef);

  // Register in AcroForm
  const acroFormKey = PDFName.of('AcroForm');
  let acroForm = pdfDoc.catalog.lookupMaybe(acroFormKey, PDFDict);
  if (!acroForm) {
    acroForm = ctx.obj({ Fields: [] });
    pdfDoc.catalog.set(acroFormKey, acroForm);
  }
  acroForm.set(PDFName.of('SigFlags'), PDFNumber.of(3));

  let fields = acroForm.lookupMaybe(PDFName.of('Fields'), PDFArray);
  if (!fields) {
    fields = ctx.obj([]);
    acroForm.set(PDFName.of('Fields'), fields);
  }
  fields.push(widgetRef);

  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  return finalizeByteRange(pdfBytes);
}

/**
 * Locates the placeholders in the saved bytes, writes the real ByteRange
 * (padded so byte offsets don't shift) and extracts the bytes to be signed.
 */
function finalizeByteRange(pdfBytes) {
  const pdfStr = bytesToLatin1(pdfBytes);

  const brPlaceholder =
    `/ByteRange [ 0 /${BYTE_RANGE_TOKEN} /${BYTE_RANGE_TOKEN} /${BYTE_RANGE_TOKEN} ]`;
  const brPos = pdfStr.indexOf(brPlaceholder);
  if (brPos === -1) throw new Error('ByteRange placeholder not found');

  // /Contents <0000...> comes after /ByteRange in the same dict
  const contentsKeyPos = pdfStr.indexOf('/Contents', brPos);
  if (contentsKeyPos === -1) throw new Error('/Contents not found');
  const contentsStart = pdfStr.indexOf('<', contentsKeyPos); // offset of '<'
  const contentsEnd = pdfStr.indexOf('>', contentsStart);    // offset of '>'

  // Signature covers everything EXCEPT the hex string incl. < >
  const byteRange = [
    0,
    contentsStart,
    contentsEnd + 1,
    pdfBytes.length - (contentsEnd + 1),
  ];

  // Overwrite the placeholder with real values, space-padded to same length
  let actualBr = `/ByteRange [0 ${byteRange[1]} ${byteRange[2]} ${byteRange[3]}]`;
  if (actualBr.length > brPlaceholder.length) {
    throw new Error('ByteRange does not fit placeholder');
  }
  actualBr = actualBr.padEnd(brPlaceholder.length, ' ');

  const out = new Uint8Array(pdfBytes); // copy
  for (let i = 0; i < actualBr.length; i++) {
    out[brPos + i] = actualBr.charCodeAt(i);
  }

  // Bytes to hash = [0, a) + [b, end)
  const dataToSign = new Uint8Array(byteRange[1] + byteRange[3]);
  dataToSign.set(out.subarray(0, byteRange[1]), 0);
  dataToSign.set(out.subarray(byteRange[2]), byteRange[1]);

  return { pdfWithPlaceholder: out, byteRange, dataToSign };
}

/* ------------------------------------------------------------------ */
/* Step 2: embed the externally built CMS                              */
/* ------------------------------------------------------------------ */

/**
 * @param {Uint8Array} pdfWithPlaceholder - output of preparePdfForSigning
 * @param {number[]}   byteRange          - output of preparePdfForSigning
 * @param {Uint8Array} cmsDer             - DER-encoded detached CMS/PKCS#7
 * @returns {Uint8Array} signed PDF
 */
export function embedCmsIntoPdf(pdfWithPlaceholder, byteRange, cmsDer) {
  const contentsStart = byteRange[1]; // offset of '<'
  const contentsEnd = byteRange[2];   // offset just past '>'
  const hexCapacity = contentsEnd - contentsStart - 2; // chars between < >

  let cmsHex = bytesToHex(cmsDer);
  if (cmsHex.length > hexCapacity) {
    throw new Error(
      `CMS too large: needs ${cmsHex.length} hex chars, placeholder has ` +
      `${hexCapacity}. Re-run preparePdfForSigning with a bigger signatureLength.`
    );
  }
  cmsHex = cmsHex.padEnd(hexCapacity, '0'); // zero-pad is allowed and standard

  const out = new Uint8Array(pdfWithPlaceholder); // copy
  for (let i = 0; i < cmsHex.length; i++) {
    out[contentsStart + 1 + i] = cmsHex.charCodeAt(i);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Helpers (Node + browser, no Buffer)                                 */
/* ------------------------------------------------------------------ */

function base64ToBytes(b64) {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'));
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToLatin1(bytes) {
  let s = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return s;
}

function bytesToHex(bytes) {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export function bytesToBase64(bytes) {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

/**
 * Builds a CMS (Cryptographic Message Syntax) structure for PDF signing.
 * @param {Array} certChain - The certificate chain for the signer and CAs.
 * @param {Uint8Array} signatureBytes - The signature bytes to include in the CMS.
 * @returns {Uint8Array} - The DER-encoded CMS structure.
 */
export function buildCMS(certChain, signatureBytes) {
    // Lets first take care of the certificate
    const bytes = pemToBytes(certChain[0]);
    const asn1 = asn1js.fromBER(bytes.buffer);
    const cert = new pkijs.Certificate({ schema: asn1.result });
    const subCA = parseCert(certChain[1]);

    if (!cert || !subCA) {
        return 0;
    }
    certChain = [cert, subCA];

    const signerCert = certChain[0]; // signer must be first / the sid reference
    const signedData = new pkijs.SignedData({
        version: 1,
        digestAlgorithms: [
        new pkijs.AlgorithmIdentifier({ algorithmId: "1.3.14.3.2.26" })
        ],
        encapContentInfo: new pkijs.EncapsulatedContentInfo({
        eContentType: "1.2.840.113549.1.7.1"
        }),
        certificates: certChain,                  // <-- signer + sub-CA (+ root if you want)
        signerInfos: [
        new pkijs.SignerInfo({
            version: 1,
            sid: new pkijs.IssuerAndSerialNumber({
            issuer: signerCert.issuer,
            serialNumber: signerCert.serialNumber
            }),
            digestAlgorithm: new pkijs.AlgorithmIdentifier({ algorithmId: "1.3.14.3.2.26" }),
            signatureAlgorithm: new pkijs.AlgorithmIdentifier({ algorithmId: "1.2.840.113549.1.1.1" }),
            signature: new asn1js.OctetString({ valueHex: signatureBytes.buffer })
        })
        ]
    });

    const cms = new pkijs.ContentInfo({
        contentType: "1.2.840.113549.1.7.2",
        content: signedData.toSchema(true)
    });
    return new Uint8Array(cms.toSchema().toBER(false));
}

/**
 * Converts a PEM-encoded certificate to a byte array.  
 * @param {*} pem Base64 Certifficate
 * @returns Byte Array
 */
function pemToBytes(pem) {
    const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;    
}

/**
 * 
 * @param {*} certBytes Certificate bytes
 * @returns SHA1 Fingerprint
 */
async function sha1Fingerprint(certBytes) {
    const hash = await crypto.subtle.digest("SHA-1", certBytes);
    return [...new Uint8Array(hash)]
        .map(b => b.toString(16).padStart(2, "0")).join(":");
}

/**
 * 
 * @param {*} bytes DER Certificate
 * @param {*} offset start of compute
 * @returns Cert Nodes
 */
function parseDER(bytes, offset = 0) {
    const nodes = [];
    while (offset < bytes.length) {
        const tag = bytes[offset++];
        let len = bytes[offset++];
        if (len & 0x80) {                 // long form length
        const n = len & 0x7f;
        len = 0;
        for (let i = 0; i < n; i++) len = (len << 8) | bytes[offset++];
        }
        const value = bytes.subarray(offset, offset + len);
        const constructed = (tag & 0x20) !== 0;
        nodes.push({
        tag,
        tagName: tagName(tag),
        length: len,
        value,
        children: constructed ? parseDER(value) : null,
        });
        offset += len;
    }
    return nodes;
}

/**
 * Gets the name of a DER tag.
 * @param {*} tag 
 * @returns 
 */
function tagName(tag) {
    const t = tag & 0x1f;
    return ({ 0x02:"INTEGER",0x03:"BIT STRING",0x04:"OCTET STRING",
        0x05:"NULL",0x06:"OID",0x0c:"UTF8String",0x13:"PrintableString",
        0x16:"IA5String",0x17:"UTCTime",0x18:"GeneralizedTime",
        0x10:"SEQUENCE",0x11:"SET" }[t]) || `[0x${tag.toString(16)}]`;
}

/**
 * Converts a base64-encoded string to a byte array.
 * @param {*} b64 Base64 string
 * @returns Byte Array
 */
function b64ToBytes(b64) {
    const bin = atob(b64.replace(/\s/g, ""));
    return Uint8Array.from(bin, c => c.charCodeAt(0));
}

/**
 * Converts a hexadecimal string to a byte array.
 * @param {*} hex Hexadecimal string
 * @returns Byte Array
 */
function hexToBytes(hex) {
    hex = hex.replace(/[\s:]/g, "");
    return Uint8Array.from({ length: hex.length / 2 },
        (_, i) => parseInt(hex.substr(i * 2, 2), 16));
}

/**
 * 
 * @param {*} b64 Certificate
 * @returns pkijs Certificate
 */
function parseCert(b64) {
    const bytes = b64ToBytes(b64);              // helper from before
    const asn1 = asn1js.fromBER(bytes.buffer);
    if (asn1.offset === -1) throw new Error("Bad DER");
    return new pkijs.Certificate({ schema: asn1.result });
}

 // ---- 3. inject the CMS into the /Contents placeholder ----
export function embedSignature(pdfBytes, cmsBytes) {
    const { cStart, cEnd } = getByteRangeData(pdfBytes);
    const slot = cEnd - cStart - 2; // hex chars available between < >
    let hex = [...cmsBytes].map(b => b.toString(16).padStart(2, "0")).join("");
    if (hex.length > slot) throw new Error("CMS larger than placeholder");
    hex = hex.padEnd(slot, "0");
    const out = pdfBytes.slice();
    const enc = new TextEncoder();
    out.set(enc.encode(hex), cStart + 1);
    return out;
}

/**
 * 
 * @param {*} pdfBytes PDF File
 * @returns 
 */
 // ---- compute ByteRange + digest input from a placeholder-prepared PDF ----
function getByteRangeData(pdfBytes) {
    const ascii = new TextDecoder("latin1").decode(pdfBytes);
    const cStart = ascii.indexOf("/Contents <") + "/Contents ".length; // points at '<'
    const cEnd = ascii.indexOf(">", cStart) + 1;                        // past '>'
    // bytes that get hashed: everything except the <...> placeholder
    const part1 = pdfBytes.subarray(0, cStart);
    const part2 = pdfBytes.subarray(cEnd);
    const toHash = new Uint8Array(part1.length + part2.length);
    toHash.set(part1); toHash.set(part2, part1.length);
    return { toHash, cStart, cEnd, byteRange: [0, cStart, cEnd, pdfBytes.length - cEnd] };
}