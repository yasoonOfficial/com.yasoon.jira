let pem = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDeKTteHwLVwVuy
IvmFl9BnQYMgprY9uQZSD1g+196qftfVQLqxJnOPiaX1Q48MXGxcCY2jQlMGMVl/
lGfJYraxoInSIoTj5jxOOW2iwnkzB3RKbVBvaawl1czjVqe7lxe3gsLqXPG9ozku
bpk38+dFAYEm6OxRC2mmYT8TSfIPNZm1ypxUmwYVERmPOVdtAJGzppfnsc5jUaGg
QL6h9IbLvKNhtO8+Dk+dsEE8wEha3tJbG7N3Yp1XanqUzjqervlVw4d8bePgqLaT
2q9VAzN+IXtz5LIeCra5vqDuXiflE3YOOrDMKACAmKyc7j7ojVGVJMkCV8Ib99pG
CH0WTSlRAgMBAAECggEAMnfbbL5OvpB2bDlVxet/BHX1e+1jaRInRW0G9v/DLagz
D9bskmHRzsHOWbFHRd+ZHi9tZbEjezyqwDjOewlZx3BY3svItJ0RBhQ1u8vCDL2c
xWuf4i93VAEF0n9VC2B/msixztvebt4tl0a4t+VInHyDAnvXc3HMRmfBFHiv7JQs
NWLqD07uhA99kfc62f3/KvH7pTXl9jKgIq3s7LtNtK3ejvhEbyfDN0urBXeKbu0c
rEYIz4pMZbBTX1KWdhcxtk/PNHWzMwFwXFPMvUpm1bZm4DtXGV8LWdieTXBvmgNJ
3ddz14JWGQpGeU9MxKQtykqrnorgNI4BBdXUbX1HoQKBgQD2icKuStFIs3igg14X
ewFzlwvgBu5NOR9m/3GYOdtzH3BWRf/DEzBeaA8Q13fouCp2cOIfwBSQBle68CDF
rl/TD3c/BhrVyu/VwdvdI4etHY8M5M0GikP2Zq49xGDYBKc7vWWJ+tTJ3Zm1SWJE
tbZCgcBDuWC3wmEuF3ecKLCw9wKBgQDmr/dunnlN5+ONhI1Ox+NysfmowpyFOKFE
2p4vcJ9udpaHNo1b6S2vvzWTsdwdfs8fFuKwXszQpxrYr3E+UMeErxfHFPwfZ8QZ
q9HSCXeaLxkGT8bL0qxlYbb4c1S2utGuQoDviUZS6oVe/DvzQLenPnDv356cT7cK
e3thWkEt9wKBgAEkwnJshmv/6R9VfKo/N9KBcNypK5HQIgUoSi6alhoCm1LLIFSX
UjId6XP6i+PYdtn1zBa5nV7NqLqFQqGoHWmtOLBiJt23A0XKkGqGL6rt6Cv3I7xU
B9ysvUIsFwbpfp0YU9BACZymGoBsxrfq392PHIUz5u7zR+Ae278tsSQhAoGAEgou
ukrQR6RbqiR0fHWrNrvuPyFA5jYgfmbuOd1/yj6h1N8SPN7GQNkeEne1M+VHwzGh
9pLjR2nZ8pn9rBbbE2gx3tKoSLhvoGZMWTV+UeNe/Jxeem/2JVN34IP8WvHPFeaD
eLfudOt8FIp7EbG86uo6ILgHCkg9kydG5b0OHc8CgYEApbGYIOwvCVvDT7JwFdcE
Oh0QicUl/a+88GEL9f67255MC4TTZI2J1ocm2u+BcT9t2SIvbNmg87668LNt0ob+
QLBeK4XngocMd4l0gJBfwtFjDJfyzysS3XvPSCNU0SzbWp+EOngDn73vagFbJgfH
vRvu7Ag7Si7q5CY8PW9FOV0=
-----END PRIVATE KEY-----`;

let request = require('request');
let OAuth   = require('oauth-1.0a');
let KJUR  = require('jsrsasign');

function hashFunction(baseString, key) {
    //Der key der hier reinkommt ist encoded :S Können wir nicht im sig.init verwenden...
    console.log('Hash Function key', decodeURI(key));
    var sig = new KJUR.crypto.Signature({ "alg": "SHA1withRSA" });
    // initialize for signature generation
    sig.init(pem);   // rsaPrivateKey of RSAKey object

    // update data

    sig.updateString(baseString);
    // calculate signature
    let hex = sig.sign();
    return hexToBase64(hex);
}

function hexToBase64(str) {
  return Buffer.from(str, 'hex').toString('base64');
}

let oauth = OAuth({
    consumer: {
        key: 'yasoonjira',
        secret: pem
    },
    signature_method: 'RSA-SHA1',
    hash_function: hashFunction,
    last_ampersand: false
});

let request_data = {
    url: 'https://yasoon.atlassian.net/plugins/servlet/oauth/request-token',
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