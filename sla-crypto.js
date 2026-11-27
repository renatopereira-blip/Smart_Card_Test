var slaCrypto = (function () {

  /**
   * Generates a cryptographic hash key and iv for use in subsequent requests
   *
   * @author bruno.meira
   * @date 29/08/2018
   * @version 1.1
   * @changes removed async and await due to incompatibility with IE
   *
   * @returns {Promise<any>} representing JSON object containing hash key and iv
   */
  function generateKeyAndIv() {
    return new Promise(function (resolve, reject) {
      window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])
        .then(function (key) {
          return window.crypto.subtle.exportKey('raw', key)
            .then(function (keyData) {
              resolve({ 'key': keyData, 'iv': crypto.getRandomValues(new Uint8Array(12)), 'rawKey': key });
            })
            .catch(function (error) {
              reject(error);
            });
        })
        .catch(function (error) {
          reject(error);
        });
    })
  }

  /**
   * Deciphers hashed data.
   *
   * @author bruno.meira
   * @date 29/08/2018
   * @version 1.1
   * @changes removed async and await due to incompatibility with IE
   *
   * @param {CryptoKey} rawKey - Raw CryptoKey as returned by generateKeyAndIv()
   * @param {String} iv - IV used in generateKeyAndIv()
   * @param {String} cipheredData - Base64 string to be decoded and deciphered
   * @param {boolean} doStringConversion - Flag to indicate if returned value should be converted to a String
   * @returns {Promise<any>} representing the decrypted data
   */
  function decrypt(rawKey, iv, cipheredData, doStringConversion) {
    var addData = slaUtils.stringToArrayBuffer('spms:sla:autenticao');

    return new Promise(function (resolve, reject) {
      window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv, additionalData: addData, tagLength: 128 },
        rawKey, //from generateKey or importKey above
        slaUtils.b64ToArrayBuffer(cipheredData) //ArrayBuffer of the data
      )
        .then(function (decData) {
          return resolve(doStringConversion ? slaUtils.arrayBufferToString(decData) : decData);
        })
        .catch(function (error) {
          reject(error);
        });
    });
  }

  /**
   * Deciphers authentication data.
   *
   * @author bruno.meira
   * @date 29/08/2018
   * @version 1.0
   *
   * @param {CryptoKey} rawKey - Raw CryptoKey as returned by generateKeyAndIv()
   * @param {String} iv - IV used in generateKeyAndIv()
   * @param {JSON} authResponsePayload - payload attribute of authentication response
   * @returns {Promise<any>} representing the decrypted authentication response
   *
   */
  function decryptAuthResponse(rawKey, iv, authResponsePayload) {
    return new Promise(function (resolve, reject) {
      var promises = [];
      promises.push(decrypt(rawKey, iv, authResponsePayload.signerId, true));
      promises.push(decrypt(rawKey, iv, authResponsePayload.plainXmlDocument, true));
      promises.push(decrypt(rawKey, iv, authResponsePayload.userCertificate, false));
      promises.push(decrypt(rawKey, iv, authResponsePayload.subCaCertificate, false));

      Promise.all(promises)
        .then(function (resolveData) {
          authResponsePayload.signerId = resolveData[0];
          authResponsePayload.plainXmlDocument = resolveData[1];
          authResponsePayload.userCertificate = resolveData[2];
          authResponsePayload.subCaCertificate = resolveData[3];
          resolve(authResponsePayload);
        })
        .catch(function (error) {
          reject(error);
        })
    });
  }

  function decryptReadResponse(rawKey, iv, authResponsePayload) {
    return new Promise(function (resolve, reject) {
      var promises = [];
      promises.push(decrypt(rawKey, iv, authResponsePayload.plainXmlDocument, true));

      Promise.all(promises)
        .then(function (resolveData) {
          authResponsePayload.plainXmlDocument = resolveData[0];
          resolve(authResponsePayload);
        })
        .catch(function (error) {
          reject(error);
        })
    });
  }


  return {
    generateKeyAndIv: generateKeyAndIv,
    decrypt: decrypt,
    decryptAuthResponse: decryptAuthResponse,
    decryptReadResponse: decryptReadResponse
  }
})();