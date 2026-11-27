// Stores the app status and all relevant status info (errors, address, etc.)
var AppStatusEnum = {
  UNKNOWN: 0,
  STARTED: 1,
  FAILED: 2,
  properties: {
    0: {},
    1: {
      isConnected: false,
      connectedURL: null,
      cardReaderPresent: null,
      cardType: null,
      errorCode: null,
      errorDescription: null,
      appVersion: null
    },
    2: {
      errorCode: null,
      errorDescription: null
    }
  }
};

// Because IE only has console when dev tools are open
if (typeof console == "undefined")
  this.console = {
    log: function () {
    }
  };