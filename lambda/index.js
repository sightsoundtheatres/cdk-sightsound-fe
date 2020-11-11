'use strict';

exports.handler = async (event, context, callback) => {
  const response = event.Records[0].cf.response;
  const headers = response.headers;

    headers['strict-transport-security'] = [{
        key: 'strict-transport-security',
        value: 'max-age=63072000; includeSubDomains; preload',
    }];
    
    headers['x-xss-protection'] = [{
        key: 'x-xss-protection',
        value: '1; mode=block',
    }];

    headers['x-content-type-options'] = [{
        key: 'x-content-type-options',
        value: 'nosniff',
    }];

    headers['x-frame-options'] = [{
        key: 'x-frame-options',
        value: 'SAMEORIGIN',
    }];

    headers['referrer-policy'] = [{ 
        key: 'referrer-policy', 
        value: 'strict-origin'
     }];
     
    callback(null, response);
}