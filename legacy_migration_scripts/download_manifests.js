import { createWriteStream, mkdirSync } from 'fs';
import request from 'request-promise';
import crypto from 'crypto';

/*
let versions = [
    "2.3.6186.29817",
    "2.3.6191.27000",
    "2.3.6193.28964",
    "2.3.6199.24053",
    "2.3.6200.19361",
    "2.3.6200.22540",
    "2.3.6200.24538",
    "2.3.6222.26119",
    "2.3.6246.22924",
    "2.3.6246.23420",
    "2.3.6260.22969",
    "2.3.6260.23237",
    "2.3.6260.23663",
    "2.3.6262.25996",
    "2.3.6262.26102",
    "2.3.6263.30202",
    "2.3.6269.21958",
    "2.3.6269.25248",
    "2.3.6269.27927",
    "2.3.6277.19050",
    "2.3.6281.27800",
    "2.3.6297.24611",
    "2.3.6297.27672",
    "2.3.6297.29140",
    "2.3.6297.30821",
    "2.3.6298.18639",
    "2.3.6298.19623",
    "2.3.6312.15873",
    "2.3.6382.18902",
    "2.3.6382.23016",
    "2.3.6382.23745",
    "2.3.6386.15058",
    "2.3.6386.15352",
    "2.3.6386.20418",
    "2.4.6338.29351",
    "2.4.6388.23568",
    "2.4.6388.24368",
    "2.4.6393.20720",
    "2.4.6396.13461",
    "2.4.6404.14268",
    "2.4.6421.22303",
    "2.4.6421.23746",
    "2.4.6425.19271",
    "2.4.6429.17062",
    "2.4.6446.13282",
    "2.4.6460.16696",
    "2.4.6477.39161",
    "2.4.6498.24500",
    "2.5.6498.25887",
    "2.5.6498.27281",
    "2.5.6500.20808",
    "2.5.6500.26063",
    "2.5.6501.28386",
    "2.5.6501.39590",
    "2.5.6502.22555",
    "2.5.6508.17663",
    "2.5.6508.22818",
    "2.5.6512.18364",
    "2.5.6535.28468",
    "2.6.6561.20239",
    "2.6.6561.27382",
    "2.6.6561.28260",
    "2.6.6599.31955",
    "2.6.6617.17919",
    "2.6.6631.22135",
    "2.6.6635.16270",
    "2.6.6635.20399",
    "2.6.6740.28149",
    "2.6.6760.24008",
    "2.6.6765.24603",
    "2.6.6801.30345",
    "2.7.6821.34835",
    "2.7.6821.40299",
    "2.7.6822.40496",
    "2.7.6823.28381",
    "2.7.6829.26684",
    "2.7.6866.24354",
    "2.7.6918.20424",
    "2.7.6918.20528",
    "2.7.6947.31693",
    "2.8.6969.41833",
    "2.8.7016.27336",
    "2.8.7017.20202",
    "2.8.7017.24769",
    "2.8.7017.26762",
    "2.8.7017.26912",
    "2.8.7046.23657",
    "2.8.7046.27508",
    "2.8.7086.25128",
    "2.8.7086.25803",
    "2.8.7109.19697",
    "2.8.7111.16904",
    "2.8.7122.23528",
    "2.8.7149.14423"
];
*/
let versions = ["2.9.7583.38105"];

var secret = 'THISisTOTALLYsafe!?%%$^';
var createSHA1 = function (input, encoding) {
    var shasum = crypto.createHash('sha1');
    shasum.update(input, encoding);
    return shasum.digest('hex');
};

//for (let companyId = 1; companyId <= 5757; companyId++) {
for (let companyId = 1; companyId <= 5758; companyId++) {
    let companyKey = createSHA1(secret + companyId);
    for (let version of versions) {
        try {
            // ;
            //var url = info.ServerUrl + "/api/app/" + appId + "/generateManifestFile" + parameter
            await new Promise(resolve =>
                request(`https://store.yasoon.com/api/app/0/generateManifestFile?from=install&clientVersion=${version}&company=${companyId}&key=${companyKey}`)
                    .pipe(createWriteStream(`./download/${companyId}/app-0-${version}.json`))
                    .on('finish', resolve));

            await new Promise(resolve =>
                request(`https://store.yasoon.com/api/app/16/generateManifestFile?from=install&clientVersion=${version}&company=${companyId}&key=${companyKey}`)
                    .pipe(createWriteStream(`./download/${companyId}/app-16-${version}.json`))
                    .on('finish', resolve));
        }
        catch (e) {
            console.log(e, version, companyId);
        }
    }

    console.log(`Downloading for company ${companyId}`);
}

