var pem = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDO5xVBoQ+umzly
p/EChGrxwDFSMBheMVyTqxUVkiDRRriUbUHh8rHhOvcasIfPXvV1+hFuqhF7dviM
CL22hRkZFaHRCHxZsiNI1+yktWgIpvn0ltb4SnyGBcwzpPs+1dU/z8Xiy0RrWYn2
698v5gfgtAtEn1NlguKI3NvFzm7NmheXO6IQ2J+P/pVDQ8Ke+wkgEXYMX5/VhV1k
gq256P4PPSsNA/iuA3j46xOshgvdA0OLc3pGf3w+SXqJ/cORuerwxrh7+dntOFTA
7ZqC2zOmE5LT7xyuGPuYDMpQqo7QhoE5RDc3ZLdvYZeAzgCR06a8RobWlYzU37sS
3QLCi2NnAgMBAAECggEASktmMZvREsTAWzB89YdxE4AM9dM5XNFiyc+8EXPYfu1j
KEEXUDgisZrH0nijO86AW63BBrjg8DGnTDlzTg/7FCvVYEcox9iUnPqUCgzt33V9
+dsUNDIjBskcK0tJwKVuHqzQBQEyf022ocjO6tcx6vkbtrdzbdcS20xbSms3FHJk
OdFL2A0uop+AwLPP8oxTH/L9XwKaoZABCcYtXcbZvGbi/BOLvHuoftpICsgtvSVn
y+LJFk6SNhsRDzQ2ZX79EmBxUUiggKJFIMvb6QlXodFaVbRt+qrGLWAqkBCwME1h
2Eyl+RSaLtAYNjg01Cztplg9/yVujMI2nL3FT9IVsQKBgQDto+ePL2T5h/8lLMpL
F6r0fzU1/3/Zw43C+FCwMahbAhFGAXQS9MCy6ta4XnP92OhDUzpgt60Q+bYMmdPD
/6ilRjryIcfRA6gyLsNDISN7YPQYY36rJZaqfSCth9Onv5lLH84fTx4zkptCwZUo
O1Lp0HogI7PJMz/j2XXsDaaKiQKBgQDe4z6ahNgaQe8xQJQReZTV0yC/ZGQA/Eee
JTvHgsoJIYz6zWAv3sESSOxCnw6wC57vGtWVxtPOSTqSx7cmLlSleojGlXCC7o8E
ZMq+4+gqJ1PNKxpuj/lqInUPf+L2w3/OZlKB4xdSbTxv2jToFejxiWIdtjS8kbkK
s3biKy5CbwKBgC7CBErhGW4buzE2WetikcmfyfmA90gCuT72mvHAI48cngd3O76L
F+tcV7lZJFt7NWAh3SewnEXtzEs4bTlwcV9rrSd9TBKtNIgDOXpY5+Fb10uBMCg+
siGDk01xn0yvX1svu9/fMmMVYqVE77NF0O+ejJkMTVC2W8jaPeCfYvh5AoGAXpxh
l5+qR8MTMHn0IFLWrck4DmYj2RM9p1CwxmirMCMQv+lr2gYZOJTBzSnNR0c3iNGA
Nlq2z8rf1Sx3fvqNrcyMwJbwsnNnO/s44LzHcRVOijmwt5vfyICl5hVoF003NDrU
7ROjc7awv94FNTsPrW+euXP9gMnunS8+2JRxx3sCgYBJjNxT8ALKZGKVHVYBR+dC
L1e0djEho4p/b18RD7w4FlGtfmJ/1/GAlDFv+Wn0sgSLPZfxQ2qUTylqT8sPsxxr
1qC0h1leLHcTeU8dA1EMVWi/XSwVrJ/LjlACZS7JLuycTO4s2NAsRvIZtJtICrLN
7brd5k6eijg3W9KgKdrh5g==
-----END PRIVATE KEY-----`;

var request = require('request');
var OAuth   = require('oauth-1.0a');
var KJUR  = require('jsrsasign');

function hashFunction(baseString, key) {
    //Der key der hier reinkommt ist encoded :S Können wir nicht im sig.init verwenden...
    console.log('Hash Function key', decodeURI(key));
    var sig = new KJUR.crypto.Signature({ "alg": "SHA1withRSA" });
    // initialize for signature generation
    sig.init(pem);   // rsaPrivateKey of RSAKey object

    // update data

    sig.updateString(baseString);
    // calculate signature
    var hex = sig.sign();
    return hexToBase64(hex);
}

function hexToBase64(str) {
  //return Buffer.from(str, 'hex').toString('base64');
  return new Buffer(str, 'hex').toString('base64');
}

var oauth = OAuth({
    consumer: {
        key: 'yasoonjira',
        secret: pem
    },
    signature_method: 'RSA-SHA1',
    hash_function: hashFunction,
    last_ampersand: false
});

var request_data = {
    url: 'https://yasoonbox.synology.me:8080/plugins/servlet/oauth/request-token',
    method: 'POST',
    data: {
      oauth_callback: 'oob'
    }
};

request({
    url: request_data.url,
    method: request_data.method,
    form: oauth.authorize(request_data)
}, function(error, response, body) {
    console.log('res', body);
});