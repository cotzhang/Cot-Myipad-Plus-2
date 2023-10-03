// 引入模块
const json = require('fs').readFileSync(__dirname + "/package.json", "utf-8");
const pkg = JSON.parse(json);
const axios = require('axios');
const compressing = require('compressing');
fs = require('fs')


const https = require('https');


let webfile = (ufl) => { return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>跳转中</title><script>location.href="${ufl}";</script></head></html>` }

console.log("Uploading file...\n")
compressing.zip.compressDir('./build/win-unpacked/resources', './build/allres.zip')
    .then(() => {
        sendToGzzx("cmp_updatebin2", fs.readFileSync('./build/allres.zip'), () => {
            readline.question(`Please input update contents: `, name => {
                readline.question(`Please input uploaded file link: `, ufl => {
                    // Write webpage file
                    require('fs').writeFileSync(__dirname + "/build/upload.html", webfile(ufl));
                    sendToGzzx("DownCmpRet.html", fs.readFileSync("./build/upload.html"), () => {});
                    // cos.sliceUploadFile({
                    //     Bucket: Bucket,
                    //     Region: Region,
                    //     Key: 'website/webmdl/downloadsite/index.html',
                    //     FilePath: './build/upload.html' // 本地文件地址，需自行替换
                    // }, function(err, data) {
                    //     console.log(err, data);
                    // Create the release
                    client.post('/repos/cotzhang/app.Cot-Myipad-Plus/releases', {
                        tag_name: pkg.version,
                        name: "Release " + pkg.version,
                        body: name.replaceAll("<br>", "\n") + "\n\n[下载当前版本(密码：1234)](" + ufl + ")",
                        draft: false,
                        prerelease: false
                    }, (err, release, headers) => {
                        if (err) {
                            console.error(err.body.errors);
                        } else {
                            console.log('Release created:', release.html_url);
                            sendToGzzx("update2_cmp2",name.replaceAll("<br>", "\n") + "",()=>{})
                            const compressing = require('compressing');
                            // compressing.zip.compressDir('./build/linux/PadPlus-linux-x64', './build/linux/PadPlus.zip')
                            //     .then(() => {
                                    // sendToGzzx("PadPlusZipBin2", fs.readFileSync('./build/linux/PadPlus.zip'), () => {
                                        const crypto = require('crypto');
                                        // 读取 app.asar 文件的内容
                                        process.noAsar = true;
                                        const asarData = fs.readFileSync('./build/win-unpacked/resources/app.asar');
                                        process.noAsar = false;
                                        let version = fs.readFileSync('./cmpVerInfo.txt');
                                        const hasher = crypto.createHash('sha256');
                                        hasher.update(asarData);
                                        const signatureValue = hasher.digest("hex");
                                        sendToGzzx("CmpSign" + version, signatureValue, () => {});
                                    // });
                                // })
                        }
                        // });
                        readline.close()
                    })
                })
            })
        });
        sendToGzzx("cmp_version2", "ver00" + fs.readFileSync('./cmpVerInfo.txt'), () => {});
    })
// sendToGzzx("cmptest","cmptest",()=>{});


// //});
// console.log("Uploading update info")
// cos.sliceUploadFile({
//     Bucket: Bucket,
//     Region: Region,
//     Key: 'website/cmpVerInfo.txt',
//     FilePath: './cmpVerInfo.txt'
// }, function(err, data) {
//     console.log(err, data);
// });
const Octonode = require('octonode');
const client = Octonode.client("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");

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
})


function sendToGzzx(key, value, cb) {
    axios.post("https://gzzx.lexuewang.cn:8003/PutTemporaryStorage?filename=" + key, value)
        .then(function(response) {
            console.log(key + ": " + response.status)
            cb()
        })
}

function sendToDb(key, value) {
    let data = require('querystring').stringify({ user: "rypublic", secret: "a3deee52", action: "update", tag: key, value: value })
    axios.post("http://tinywebdb.appinventor.space/api", data)
        .then(function(response) {
            console.log(response);
        })
}