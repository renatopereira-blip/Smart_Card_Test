var slaUtils = (function () {

  // Fisher-Yates shuffle, no side effects
  function shuffleArray(a) {
    var i = a.length, t, j;
    a = a.slice();
    while (--i) (t = a[i]), (a[i] = a[(j = ~~(Math.random() * (i + 1)))]), (a[j] = t);
    return a;
  }

  function isFunction(obj) {
    return !!(obj && obj.constructor && obj.call && obj.apply);
  };

  // Unsigned 8 bit array to Base64 String
  function uint8ArrayToB64(ui8array) {
    return btoa(String.fromCharCode.apply(null, ui8array));
  }

  // Base64 String to Array Buffer
  function b64ToArrayBuffer(base64) {
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // String to Array buffer
  function stringToArrayBuffer(str) {
    return encodeUTF8(str);
  }

  // Array Buffer to String
  function arrayBufferToString(buf) {
    return decodeUTF8(new Uint8Array(buf));
  }

  function encodeUTF8(s) {
    var i = 0, bytes = new Uint8Array(s.length * 4);
    for (var ci = 0; ci != s.length; ci++) {
      var c = s.charCodeAt(ci);
      if (c < 128) {
        bytes[i++] = c;
        continue;
      }
      if (c < 2048) {
        bytes[i++] = c >> 6 | 192;
      } else {
        if (c > 0xd7ff && c < 0xdc00) {
          if (++ci >= s.length)
            throw new Error('UTF-8 encode: incomplete surrogate pair');
          var c2 = s.charCodeAt(ci);
          if (c2 < 0xdc00 || c2 > 0xdfff)
            throw new Error('UTF-8 encode: second surrogate character 0x' + c2.toString(16) + ' at index ' + ci + ' out of range');
          c = 0x10000 + ((c & 0x03ff) << 10) + (c2 & 0x03ff);
          bytes[i++] = c >> 18 | 240;
          bytes[i++] = c >> 12 & 63 | 128;
        } else bytes[i++] = c >> 12 | 224;
        bytes[i++] = c >> 6 & 63 | 128;
      }
      bytes[i++] = c & 63 | 128;
    }
    return bytes.subarray(0, i);
  }

  function decodeUTF8(bytes) {
    var i = 0, s = '';
    while (i < bytes.length) {
      var c = bytes[i++];
      if (c > 127) {
        if (c > 191 && c < 224) {
          if (i >= bytes.length)
            throw new Error('UTF-8 decode: incomplete 2-byte sequence');
          c = (c & 31) << 6 | bytes[i++] & 63;
        } else if (c > 223 && c < 240) {
          if (i + 1 >= bytes.length)
            throw new Error('UTF-8 decode: incomplete 3-byte sequence');
          c = (c & 15) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
        } else if (c > 239 && c < 248) {
          if (i + 2 >= bytes.length)
            throw new Error('UTF-8 decode: incomplete 4-byte sequence');
          c = (c & 7) << 18 | (bytes[i++] & 63) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
        } else throw new Error('UTF-8 decode: unknown multibyte start 0x' + c.toString(16) + ' at index ' + (i - 1));
      }
      if (c <= 0xffff) s += String.fromCharCode(c);
      else if (c <= 0x10ffff) {
        c -= 0x10000;
        s += String.fromCharCode(c >> 10 | 0xd800)
        s += String.fromCharCode(c & 0x3FF | 0xdc00)
      } else throw new Error('UTF-8 decode: code point 0x' + c.toString(16) + ' exceeds UTF-16 reach');
    }
    return s;
  }

  // Returns an enum key from it's value
  function getEnumKeyFromValue(set, value) {
    for (var k in set) {
      if (set.hasOwnProperty(k) && set[k] == value)
        return k;
    }
    return null;
  }

  // Checks if variable is numeric
  function isNumeric(value) {
    //TODO: Check if this method is the most appropriate one and introduce additional parameters (like checking for negative numbers)
    return !isNaN(value - parseFloat(value));
  }

  return {
    shuffleArray: shuffleArray,
    uint8ArrayToB64: uint8ArrayToB64,
    b64ToArrayBuffer: b64ToArrayBuffer,
    stringToArrayBuffer: stringToArrayBuffer,
    arrayBufferToString: arrayBufferToString,
    getEnumKeyFromValue: getEnumKeyFromValue,
    isNumeric: isNumeric,
    isFunction: isFunction
  };

})();