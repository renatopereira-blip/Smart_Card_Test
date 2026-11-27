var slaAjax = (function () {

  function post(url, data, successcb, errorcb, origin) {
    try {

      var json = data ? JSON.stringify(data) : undefined;
      var xhr = new XMLHttpRequest();

      xhr.open('POST', url, true);

      xhr.onreadystatechange = function () {
        if (xhr.readyState > 3 && xhr.status > 0 && xhr.status === 200) {
          jsonResponse = JSON.parse(xhr.responseText);
          successcb(jsonResponse);
        }
        // Dealing with non 200 responses as an error
        else if (xhr.readyState > 3 && xhr.status > 0 && xhr.status !== 200) {
          errorcb(new Error('status:' + xhr.status + ' - ' + xhr.responseText));
        }
      };

      xhr.onerror = function (error) {
        errorcb(new Error('status:' + xhr.status + ' - ' + xhr.responseText));
      };

      if (origin) {
        xhr.setRequestHeader('Access-Control-Allow-Origin', origin);
      }
      xhr.setRequestHeader('Content-Type', 'text/html; charset=utf-8');
      json ? xhr.send(json) : xhr.send();

      return xhr;
    } catch (error) {
      errorcb(error);
    }
  };

  return {
    doPost: post
  };

})();