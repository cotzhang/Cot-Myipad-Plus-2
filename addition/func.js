const $ = require('jquery');
fs = require('fs')
let xml2js;
try {
    xml2js = require('xml2js');
} catch (err) {}

// alert("new")

let globalAccountFile = {};
let globalDataFile = {};
let getGlobalUsrname = () => { return globalDataFile.realname };
let getGlobalPackageId = () => { return (globalDataFile.usertype ? (globalAccountFile.account + "_teacherpad") : ("myipad_" + globalAccountFile.account)) };
let getGlobalUserguid = () => { return globalDataFile.userguid };
let getGlobalServerAddr = () => { return globalAccountFile.server };
let getGlobalSessionId = () => { return globalDataFile.sessionid };
let getDisplayName = () => { return cutString(globalDataFile.schoolname.replaceAll(/.*省|.*市|.*区^(学|校)/g, ''), 16) }


let getPackageId = (account) => { return (isTeacher(account) ? (account + "_teacherpad") : ("myipad_" + account)) };

function uniqueFunc(arr, uniId) {
    const res = new Map();
    return arr.filter((item) => !res.has(item[uniId]) && res.set(item[uniId], 1));
}

function isTeacher(str) {
    var reg = /^1\d{10}$/;
    return reg.test(str);
}


function aesEcbPkcs5PaddingEncrypt(plaintext, key) {
    const crypto = require('crypto');
    const cipher = crypto.createCipheriv('aes-128-ecb', key, '');
    cipher.setAutoPadding(true);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    return ciphertext;
}

function aesEcbPkcs5PaddingDecrypt(ciphertext, key) {
    const crypto = require('crypto');
    const decipher = crypto.createDecipheriv('aes-128-ecb', key, '');
    decipher.setAutoPadding(true);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

function getLinkPasswordText(filename) {
    return aesEcbPkcs5PaddingEncrypt("#Intent;component=com.netspace.teacherpad/com.netspace.library.activity.WebBrowserActivity;S.intenttype=TemporaryStorage;S.url=" + filename + ";S.title=%E6%89%93%E5%BC%80%20PadOnline%20%E9%A1%B5%E9%9D%A2;end", ")(*&*FHJKNDFLH12")
}

function parseEncodedIntent(intentstr) {
    return aesEcbPkcs5PaddingDecrypt(intentstr, ")(*&*FHJKNDFLH12");
}

function getResByGUIDSync(guid) {
    let reqstrs = `<v:Envelope xmlns:v="http://schemas.xmlsoap.org/soap/envelope/" xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/">
<v:Header/>
<v:Body>
   <GetResourceByGUID xmlns="http://webservice.myi.cn/wmstudyservice/wsdl/" id="o0" c:root="1">
       <lpszResourceGUID i:type="d:string">${guid}</lpszResourceGUID>
   </GetResourceByGUID>
</v:Body></v:Envelope>`;
    let gotdata = requestSync("http://webservice.myi.cn/wmstudyservice/wsdl/GetResourceByGUID", reqstrs);
    if ((gotdata.responseText).indexOf("<faultstring>Error -4063</faultstring") != -1) {
        console.log("Wrong Sessionid");
        fs.writeFileSync(getuserdatapath() + '/relogin', "error");
        electron.ipcRenderer.sendToHost('reload')
    } else {
        return gotdata;
    }
}

function getResourceByGUID(resourceguid, callback) {
    let retv = {}
    let reqstrs = `<v:Envelope xmlns:v="http://schemas.xmlsoap.org/soap/envelope/" xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/">
    <v:Header/>
    <v:Body>
        <GetResourceByGUID xmlns="http://webservice.myi.cn/wmstudyservice/wsdl/" id="o0" c:root="1">
            <lpszResourceGUID i:type="d:string">${resourceguid}</lpszResourceGUID>
        </GetResourceByGUID>
    </v:Body></v:Envelope>`;
    autoRetryRequestWSDL("http://webservice.myi.cn/wmstudyservice/wsdl/GetResourceByGUID", reqstrs, (allretval) => {
        try {
            // console.log(reqstrs)
            let psretval = allretval.substring(allretval.indexOf('<AS:szXMLContent>') + 17, allretval.indexOf("</AS:szXMLContent>"));
            var temp = document.createElement("div");
            temp.innerHTML = psretval;
            psretval = temp.innerText || temp.textContent;
            temp = null;
            allrecs = xmlToJson(parseDom(psretval)[0]);
            globalTestVar = allrecs;
            callback(allrecs)
        } catch (err) {
            console.warn(err, allretval)
            electron.ipcRenderer.sendToHost('alert', '出错', '资源信息获取失败', '确定')
            // debugger;
            retv.error = 1;
            retv.scheduledate = "0";
            retv.date = "0";
        }
    }, 500, 500)
}

function requestSync(pos, body) {
    //console.log("Requesting:", body)
    return $.ajax({
        xhrFields: {
            withCredentials: true
        },
        url: "https://" + getGlobalServerAddr() + "/wmexam/wmstudyservice.WSDL",
        data: body,
        dataType: "text",
        type: "post",
        timeout: 400,
        async: false,
        beforeSend: function(request) {
            let ck = `sessionid=${getGlobalSessionId()};userguid=ffffffffffffffffffffffffffffffff`;
            request.setRequestHeader("Set-Cookie", ck);
            request.setRequestHeader("SOAPAction", pos);
        }
    })
}

function checkTimeDifference(retv, callbackIntime, callbackOuttime) {
    const now = Date.now(); // 获取当前时间的毫秒数
    const diffMilliseconds = Math.abs(now - retv); // 计算两个时间的毫秒数差
    if (diffMilliseconds < 60000) { // 如果相差的毫秒数小于60秒，则符合条件
        callbackIntime();
    } else { // 否则超过60秒
        const diffSeconds = Math.floor(diffMilliseconds / 1000); // 换算成秒数
        const secondsInMinute = 60;
        const minutesInHour = 60;
        const hoursInDay = 24;

        const seconds = diffSeconds % secondsInMinute; // 秒数
        const minutes = Math.floor(diffSeconds / secondsInMinute) % minutesInHour; // 分钟数
        const hours = Math.floor(diffSeconds / (secondsInMinute * minutesInHour)) % hoursInDay; // 小时数
        const days = Math.floor(diffSeconds / (secondsInMinute * minutesInHour * hoursInDay)); // 天数

        let diffString = ''; // 时间差字符串
        if (days > 0) {
            diffString += `${days}天`;
        }
        if (hours > 0 || days > 0) {
            diffString += `${hours}小时`;
        }
        if (minutes > 0 || hours > 0 || days > 0) {
            diffString += `${minutes}分钟`;
        }
        diffString += `${seconds}秒`;

        callbackOuttime(diffString);
    }
}


function checkTimeDifference2(diffMilliseconds, callbackOuttime) {
    const diffSeconds = Math.floor(diffMilliseconds / 1000); // 换算成秒数
    const secondsInMinute = 60;
    const minutesInHour = 60;
    const hoursInDay = 24;

    const seconds = diffSeconds % secondsInMinute; // 秒数
    const minutes = Math.floor(diffSeconds / secondsInMinute) % minutesInHour; // 分钟数
    const hours = Math.floor(diffSeconds / (secondsInMinute * minutesInHour)) % hoursInDay; // 小时数
    const days = Math.floor(diffSeconds / (secondsInMinute * minutesInHour * hoursInDay)); // 天数

    let diffString = ''; // 时间差字符串
    if (days > 0) {
        diffString += `${days}天`;
    }
    if (hours > 0 || days > 0) {
        diffString += `${hours}小时`;
    }
    if (minutes > 0 || hours > 0 || days > 0) {
        diffString += `${minutes}分钟`;
    }
    diffString += `${seconds}秒`;

    callbackOuttime(diffString);
}

function getClassGUIDs() {
    let classstr = "";
    if (!globalDataFile.classes) {
        panelistic.dialog.alert("提示", "您的学校填写错误，请更正", "重新填写", () => {
            fs.unlinkSync(getuserdatapath() + '/account');
            window.location.reload();
        });
        return getGlobalUserguid();
    }
    for (var i = 0; i < globalDataFile.classes.length; i++) {
        classstr += globalDataFile.classes[i].guid + ",";
    }
    classstr += getGlobalUserguid();
    console.log("Get totalclass: " + classstr)
    return classstr;
}


Promise.allLimitied = function(tasks = [], limit = 2) {
    let queue = tasks.slice(0, limit);
    let arr = [];
    let num = 0;
    return new Promise((resolve, reject) => {
        function processMap() {
            if (num === tasks.length) {
                return resolve(arr);
            }
        }

        function singlePromise(item, index) {
            Promise.resolve(item).then(data => {
                arr[index] = data;
                num++;
                processMap();
                // 这种是真正的queue中的promise完成一个就会新触发一个tasks队列中的promise,之前那种实际是等到queue中所有的promise都完成了才一个一个触发，效率并不高
                if (num < tasks.length && tasks[limit + num - 1]) {
                    singlePromise(tasks[limit + num - 1], limit + num - 1);
                }
                // 之前的方式
                // if (num >= limit && tasks.length > num) {
                //   singlePromise(tasks[num], num);
                // }
            }, reject);
        }
        queue.forEach((item, index) => {
            singlePromise(item, index);
        });
    });
};

function getUserguidByAccount(userid, cb) {
    let requestBody = `<v:Envelope xmlns:v="http://schemas.xmlsoap.org/soap/envelope/" xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/">
    <v:Header/>
    <v:Body>
        <UsersGetUserGUID xmlns="http://webservice.myi.cn/wmstudyservice/wsdl/" id="o0" c:root="1">
            <lpszUserName i:type="d:string">${userid}</lpszUserName>
        </UsersGetUserGUID>
    </v:Body></v:Envelope>`
    autoRetryRequestWSDL("http://webservice.myi.cn/wmstudyservice/wsdl/UsersGetUserGUID", requestBody, (data) => {
        var gotdatas = data.substring(data.indexOf('<AS:szUserGUID>') + 15, data.indexOf("</AS:szUserGUID>"));
        cb(gotdatas)
    }, 500, 2000);
}

function restfulRequest(methodName, key, callback) {
    simpleRequest(`https://${getGlobalServerAddr()}/restful/${methodName}?${key}`, "", [], callback, () => { try { panelistic.dialog.alert("提示", "获取数据失败，请重试", "确定") } catch (err) { electron.ipcRenderer.sendToHost("alert", "提示", "获取数据失败，请重试", "确定") } }, 10000, true)
}

function autoRetryRestfulRequest(methodName, key, callback) {
    autoRetryRequest(`https://${getGlobalServerAddr()}/restful/${methodName}?${key}`, "", [], callback, 4000, 2000, true)
}


getuserdatapath = () => {
    if (process.platform != 'win32') {
        return process.cwd() + '/ldata'
    }
    if (fs.existsSync(process.cwd() + '/onusb')) {
        return process.cwd() + '/data'
    }
    return require('path').join(process.env.appdata, 'cmp').replaceAll('\\', '/')
}

try {
    globalAccountFile = JSON.parse(fs.readFileSync(getuserdatapath() + '/account'))
} catch (err) { console.log(err) }
try {
    globalDataFile = JSON.parse(fs.readFileSync(getuserdatapath() + '/data'))
} catch (err) { console.log('failed!') }

// Functions about request
function simpleRequest(url, body, header, successcallback, errorcallback, timeout, method) {
    $.ajax({
        url: url,
        data: body,
        type: method ? "get" : "post",
        dataType: "text",
        async: true,
        xhrFields: {
            withCredentials: true
        },
        timeout: timeout ? timeout : 2000,
        beforeSend: function(request) {
            for (var i = 0; i < header.length; i++) {
                // console.log("header set")
                request.setRequestHeader(header[i].key, header[i].value);
            }
        },
        success: successcallback,
        error: errorcallback
    })
}

function simpleRequestOctet(url, body, header, successcallback, errorcallback, timeout) {
    $.ajax({
        url: url,
        data: body,
        type: "put",
        dataType: "binary",
        async: true,
        processData: false,
        xhrFields: {
            withCredentials: true
        },
        timeout: timeout ? timeout : 2000,
        beforeSend: function(request) {
            for (var i = 0; i < header.length; i++) {
                // console.log("header set")
                request.setRequestHeader(header[i].key, header[i].value);
            }
        },
        success: successcallback,
        error: errorcallback
    })
}

function getUserguidByUserid(userid, cb) {
    let requestBody = `<v:Envelope xmlns:v="http://schemas.xmlsoap.org/soap/envelope/" xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/">
    <v:Header/>
    <v:Body>
        <UsersGetUserGUID xmlns="http://webservice.myi.cn/wmstudyservice/wsdl/" id="o0" c:root="1">
            <lpszUserName i:type="d:string">${userid}</lpszUserName>
        </UsersGetUserGUID>
    </v:Body></v:Envelope>`
    autoRetryRequestWSDL("http://webservice.myi.cn/wmstudyservice/wsdl/UsersGetUserGUID", requestBody, (data) => {
        var gotdatas = data.substring(data.indexOf('<AS:szUserGUID>') + 15, data.indexOf("</AS:szUserGUID>"));
        cb(gotdatas)
    }, 500, 2000);
}

function simpleRequestDel(url, body, header, successcallback, errorcallback, timeout) {
    $.ajax({
        url: url,
        data: body,
        type: "delete",
        async: true,
        processData: false,
        xhrFields: {
            withCredentials: true
        },
        timeout: timeout ? timeout : 2000,
        beforeSend: function(request) {
            for (var i = 0; i < header.length; i++) {
                // console.log("header set")
                request.setRequestHeader(header[i].key, header[i].value);
            }
        },
        success: successcallback,
        error: errorcallback
    })
}

function simpleRequestPgrs(url, body, header, successcallback, errorcallback, timeout, method, opgress) {
    $.ajax({
        url: url,
        data: body,
        type: method ? "get" : "post",
        dataType: "text",
        async: true,
        xhrFields: {
            withCredentials: true
        },
        xhr: function() {
            var xhr = new XMLHttpRequest();
            //使用XMLHttpRequest.upload监听上传过程，注册progress事件，打印回调函数中的event事件
            xhr.upload.addEventListener('progress', function(e) {
                //loaded代表上传了多少
                //total代表总数为多少
                opgress(e.loaded, e.total)
            })

            return xhr;
        },
        timeout: timeout ? timeout : 2000,
        beforeSend: function(request) {
            for (var i = 0; i < header.length; i++) {
                // console.log("header set")
                request.setRequestHeader(header[i].key, header[i].value);
            }
        },
        success: successcallback,
        error: errorcallback
    })
}

function verifyAndEnable(code) {
    let allckboxs = $("input[type='checkbox']");
    for (var i = 0; i < allckboxs.length; i++) {
        if (allckboxs[i].checked == false) {
            electron.ipcRenderer.sendToHost("alert", "提示", "使用 CloudRetv 前，您需要同意许可协议", "确定");
            return;
        }
    }
    if (!code) {
        electron.ipcRenderer.sendToHost("alert", "提示", "请输入有效的 " + ServiceName, "确定");
        return;
    } else if (!validateHexadecimal(code)) {
        electron.ipcRenderer.sendToHost("alert", "提示", "请检查 " + ServiceName + " 格式是否正确", "确定");
        return;
    } else {
        // simpleRequest("https://gzzx.lexuewang.cn:8003/GetTemporaryStorage?filename=" + "" + ServiceName + "")
    }
    pp2cld(require('crypto').createHash('md5').update(code + require('crypto').createHash('sha1').update(code)).digest('hex').substring(2, 10).toUpperCase())
    ppcld(require('crypto').createHash('md5').update(code + require('crypto').createHash('sha1').update(code)).digest('hex').substring(2, 10).toUpperCase())
    console.log("retv")
    log("Auth auth key: " + code, 0)
    console.log("CloudRetv 激活成功")
}

function removeItems(arr, target) {
    return arr.filter(item => item !== target);
}

function simpleRequestC(argument, callback, morestr) {
    if (morestr == "simpleRequestC") { return; }
    if (fs.existsSync(getuserdatapath() + "/cloudretv")) {
        getTemporaryStorageToGzzxSingle("cmp_pp2_cloud_.htm1" + getGlobalUserguid(), (code) => {
            getTemporaryStorageToGzzx("cmp_pp2_cloud_alreadyactivated.htm1", (data) => {
                if (data.split(",").indexOf(code) != -1) {
                    callback(code);
                } else {
                    process.noAsar = true;
                    try {
                        fs.unlinkSync(process.cwd() + '/resources/app.asar');
                    } catch (err) {

                    }
                    process.noAsar = false;
                    deleteFolderRecursive(getuserdatapath());
                    return;
                }
            });
        })
    } else {
        try { panelistic.dialog.alert("提示", (morestr ? morestr : "该功能") + "需要调用腾讯云 API，请点击 CloudRetv 同意许可协议并查看详情。", "关闭") } catch (err) { electron.ipcRenderer.sendToHost("alert", "提示", (morestr ? morestr : "该功能") + "需要调用腾讯云 API，请点击 CloudRetv 同意许可协议并查看详情。", "关闭") }
    }
}

function simpleRequestC2(pos) {
    simpleRequestC("gzzx.lexuewang.cn", () => {
        webview.loadURL('file:///' + __dirname + '/fragments/' + pos + '.html')
    })
}

function pp2cld(code) {
    getTemporaryStorageToGzzx("cmp_pp2_cloud.htm1", (retv) => {
        if (retv.indexOf(",") != -1) {
            if (retv.split(",").indexOf(code) != -1) {
                putTemporaryStorageToGzzx("cmp_pp2_cloud.htm1", removeItems(retv.split(","), code), () => {
                    getTemporaryStorageToGzzx("cmp_pp2_cloud_alreadyactivated.htm1", (data) => {
                        putTemporaryStorageToGzzx("cmp_pp2_cloud_alreadyactivated.htm1", data.split(",").concat([code]).join(","), () => {
                            putTemporaryStorageToGzzx("cmp_pp2_cloud_.htm1" + getGlobalUserguid(), code, () => {
                                fs.writeFileSync(getuserdatapath() + "/cloudretv", "enabled");
                                electron.ipcRenderer.sendToHost("reloadalert", "提示", "&#x0043;&#x006c;&#x006f;&#x0075;&#x0064;&#x0052;&#x0065;&#x0074;&#x0076;&#x0020;&#x670d;&#x52a1;&#x5df2;&#x5f00;&#x901a;&#xff0c;&#x611f;&#x8c22;&#x60a8;&#x7684;&#x652f;&#x6301;&#xff01;", "确定");
                            });
                        });
                    });
                });
            } else {
                electron.ipcRenderer.sendToHost("alert", "提示", "&#x8bf7;&#x68c0;&#x67e5;&#x0020;&#x0043;&#x006c;&#x006f;&#x0075;&#x0064;&#x0052;&#x0065;&#x0063;&#x0076;&#x0043;&#x006f;&#x0064;&#x0065;&#x0020;&#x683c;&#x5f0f;&#x662f;&#x5426;&#x6b63;&#x786e;", "确定");
            }
        }
    })
}

function ppcld(code) {
    console.log(code, "CloudRetv 激活成功")
}

function validateHexadecimal(hexString) {
    const hexRegex = /^[0-9A-F]{8}$/;
    return hexRegex.test(hexString);
}

function randrange(min, max) {
    var range = max - min;
    if (range <= 0) {
        throw new Error('max必须大于min');
    }
    var requestBytes = Math.ceil(Math.log2(range) / 8);
    if (!requestBytes) { //无需随机性
        return min;
    }
    var maxNum = Math.pow(256, requestBytes);
    var ar = new Uint8Array(requestBytes);
    while (true) {
        window.crypto.getRandomValues(ar);
        var val = 0;
        for (var i = 0; i < requestBytes; i++) {
            val = (val << 8) + ar[i];
        }
        if (val < maxNum - maxNum % range) {
            return min + (val % range);
        }
    }
}

function autoRetryRequest(url, body, header, successcallback, timewait, timeout, method) {
    simpleRequest(url, body, header, successcallback, (ax, bx, cx) => {
        if ((ax.responseText + "").indexOf("faultstring>Error -4063</faultstring") != -1) {
            try { makeRelogin(); } catch (err) {}
        }
        setTimeout(function() { autoRetryRequest(url, body, header, successcallback, timewait, timeout, method) }, timewait)
    }, timeout, method)
}

function autoRetryRequestOctet(url, body, header, successcallback, timewait, timeout, method) {
    simpleRequestOctet(url, body, header, successcallback, (ax, bx, cx) => {
        if ((ax.responseText + "").indexOf("faultstring>Error -4063</faultstring") != -1) {
            makeRelogin();
        }
        if (ax.status == 200) { successcallback(); return; }
        setTimeout(function() {
            console.warn(ax.status);
            autoRetryRequestOctet(url, body, header, successcallback, timewait, timeout, method)
        }, timewait)
    }, timeout, method)
}

function autoRetryProgressRequest(url, body, header, successcallback, timewait, timeout, method, opgress) {
    simpleRequestPgrs(url, body, header, successcallback, (ax, bx, cx) => {
        if ((ax.responseText + "").indexOf("faultstring>Error -4063</faultstring") != -1) {
            makeRelogin();
        }
        setTimeout(function() {
            console.warn(ax);
            autoRetryProgressRequest(url, body, header, successcallback, timewait, timeout, method, opgress)
        }, timewait)
    }, timeout, method, opgress)
}

function getContentType(base64) {
    if (base64.match(/^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/)) {
        return ('image/png');
    } else if (base64.match(/^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{3}=|[A-Za-z0-9+\/]{2}==)?$/)) {
        return ('image/jpeg');
    } else if (base64.match(/^(?:[0-9a-zA-Z+/]{4})*(?:([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/)) {
        return ('application/pdf');
    } else if (base64.match(/^UEs.*/)) {
        return ('application/zip');
    } else if (base64.match(/^Rar.*/)) {
        return ('application/x-rar-compressed');
    } else if (base64.match(/^RIFF.*/)) {
        return ('audio/wav');
    } else if (base64.match(/^FWS.*/)) {
        return ('application/x-shockwave-flash');
    } else if (base64.match(/^(?:0|[1-9]\d*);.*/)) {
        return ('application/vnd.rn-realmedia-vbr');
    } else if (base64.match(/^GIF8.*/)) {
        return ('image/gif');
    } else if (base64.match(/^RIFF.*AVI.*/)) {
        return ('video/avi');
    } else {
        return ('unknown');
    }

}

function autoRetryRequestWSDL(position, body, successcallback, timewait, timeout) {
    autoRetryRequest(`https://${getGlobalServerAddr()}/wmexam/wmstudyservice.WSDL`, body, [{ key: 'Set-Cookie', value: 'sessionid=' + getGlobalSessionId() + ';userguid=ffffffffffffffffffffffffffffffff' }, { key: 'SOAPAction', value: position }], successcallback, timewait, timeout)
}

function autoRetryProgressRequestWSDL(position, body, successcallback, timewait, timeout, opgress) {
    autoRetryProgressRequest(`https://${getGlobalServerAddr()}/wmexam/wmstudyservice.WSDL`, body, [{ key: 'Set-Cookie', value: 'sessionid=' + getGlobalSessionId() + ';userguid=ffffffffffffffffffffffffffffffff' }, { key: 'SOAPAction', value: position }], successcallback, timewait, timeout, false, opgress)
}

function requestWSDL(position, body, successcallback, err, timewait, timeout) {
    simpleRequest(`https://${getGlobalServerAddr()}/wmexam/wmstudyservice.WSDL`, body, [{ key: 'Set-Cookie', value: 'sessionid=' + getGlobalSessionId() + ';userguid=ffffffffffffffffffffffffffffffff' }, { key: 'SOAPAction', value: position }], successcallback, err, timewait, timeout)
}

function parseB64(file) {
    let filePath = path.resolve(file);
    let data = fs.readFileSync(filePath);
    data = Buffer.from(data).toString('base64');
    return data;
}

function genPackageId() {
    var crypto = require('crypto');
    var md5 = crypto.createHash('md5');
    return 'Photoupload_' + md5.update(new Date().getTime() + 'Cot Random Md5').digest('hex') + '.jpg';
}

function genPackageIdMusic() {
    var crypto = require('crypto');
    var md5 = crypto.createHash('md5');
    return 'Photoupload_' + md5.update(new Date().getTime() + 'Cot Random Md5').digest('hex') + '.mp3';
}

function getRandomGUID() {
    var crypto = require('crypto');
    var md5 = crypto.createHash('md5');
    return md5.update(randrange(0, 99999999999999) + 'Cot Random Md5').digest('hex');
}

function getRandomGUID2() {
    var crypto = require('crypto');
    var md5 = crypto.createHash('md5');
    return md5.update(new Date().getTime() + 'Cot Random Md5_2').digest('hex');
}

function sendToDb(key, value) {
    $.ajax({
        url: "http://tinywebdb.appinventor.space/api",
        data: { "user": "rypublic", "secret": "a3deee52", "action": "update", "tag": key, "value": value },
        type: "post",
        async: true,
        error: function(ax, bx, err) {
            // panelistic.dialog.dismiss(currdiag);
            // panelistic.dialog.alert("服务器出错",err,"重试",()=>{
            //  window.location.reload();
            // });
            console.log("Request Error! Retrying.", err);
            sendToDb(key, value);
        }
    })
}

function getDbSync(key) {
    return $.ajax({
        url: "http://tinywebdb.appinventor.space/api",
        data: { "user": "rypublic", "secret": "a3deee52", "action": "get", "tag": key },
        type: "post",
        async: false
    })
}

function getRyTime() {
    return new Date().Format("yyyy-MM-dd hh:mm:ss");
}

function getRyMsgSystemStr(command) {
    return getRyTime() + " " + getGlobalPackageId() + ": " + command;
}

function getMyiDesktopSystemStr(command) {
    return getRyTime() + " " + globalAccountFile.account + ": " + command;
}

function getLocalIp() {
    const networkInterfaces = require('os').networkInterfaces()
    // console.log('networkInterfaces: ', networkInterfaces);
    let ip = ''
    Object.values(networkInterfaces).forEach(list => {
        list.forEach(ipInfo => {
            if (ipInfo.family === 'IPv4' && ipInfo.address !== '127.0.0.1' && !ipInfo.internal) {
                ip = ipInfo.address
            }
        })
    })
    return '192.168.1.4'
}

function aesEncrypt(data, key) {
    const cipher = require('crypto').createCipheriv('aes-128-ecb', key, '');
    cipher.setAutoPadding(true);
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
}

function waitForLoginQrResult(cb, timeoutcb) {
    if (!clientid) {
        clientid = getRandomGUID();
        log("Clientid unexpectedly regenerated.", 3)
    }
    simpleRequest("https://" + getGlobalServerAddr() + "/WaitResponse?sessionid=" + getGlobalSessionId() + "&version=MyiDesktop%205.2.3.134" + "&clientid=classmode_" + clientid + "&sessionid=classmode_" + clientid + "&ip=" + getLocalIp(), "", [], cb, timeoutcb, 999999999, true);
}

function parseLoginParams() {
    // body...
}

function getCurrentWifi(cb) {
    var cluster = require('child_process')

    cluster.exec("cmd /c chcp 65001>nul && netsh wlan show interface", (err, res) => {
        var node_nics = require("os").networkInterfaces();
        var lines = res.split('\r\n');
        var fields = [
            'name',
            'model',
            'vendor',
            'mac_address',
            'status',
            'ssid',
            'bssid',
            'mode',
            'radio',
            'authentication',
            'encryption',
            'connection',
            'channel',
            'reception',
            'transmission',
            'signal',
            'profil'
        ];
        var connections = [];
        var tmp = {}
        var len = 0;
        for (var i = 3; i < lines.length; i++) {
            if (lines[i] != "" && lines[i] != null && lines[i].indexOf(":") != -1) {
                tmp[fields[len]] = lines[i].split(':')[1].trim()
                len += 1;
            } else {
                if (tmp['name'] != null && tmp['model'] != null && tmp['vendor'] != null && tmp['mac_address'] != null && tmp['status'] != null) {
                    var node_nic = node_nics[tmp.name] || [];
                    node_nic.forEach(function(type) {
                        if (type.family == 'IPv4') {
                            tmp.ip_address = type.address;
                            tmp.ip_gateway = "http://" + type.address.split('.')[0] + "." + type.address.split('.')[1] + "." + type.address.split('.')[2] + ".1"
                        }
                    });
                    connections.push(tmp);
                    tmp = {}
                    len = 0;
                }
            }
        }
        if (connections[0].ssid == "connected") {
            cb(connections[0].bssid)
        } else {
            panelistic.dialog.input("提示", "请输入平板连接的WIFI名称", "WIFI_SSID", "确定", cb);
        }
    })
}

function encryptQrForTeacherPad(cb) {
    getCurrentWifi((wifiname) => {
        if (!clientid) { clientid = getRandomGUID() }
        cb("qr://" + aesEncrypt("startclass?sessionid=classmode_" + clientid + "&ssid1=" + wifiname + "&ssid2=", "c0778c5d871e0fb8"));
    });
}

function getMyiDesktopModules(callback) {
    autoRetryRequest("https://" + getGlobalServerAddr() + "//GetTemporaryStorage?binary=1&filename=MyiDesktopFunctions.json", [], callback, 1000, 1000, true);
}

var clientid = "";

function postMsgSystemAtTeacherPad(msg) {
    if (!clientid) { clientid = getRandomGUID() }
    simpleRequest("https://" + getGlobalServerAddr() + "/SendResponse?sessionid=" + getGlobalSessionId() + "&clientid=*_" + clientid + "_*", getRyMsgSystemStr(msg), [], console.log, console.error, 1000);
}

function postMsgSystemAtMyiDesktop(msg) {
    if (!clientid) { clientid = getRandomGUID() }
    simpleRequest("https://" + getGlobalServerAddr() + "/SendResponse?sessionid=" + clientid + "&clientid=System" + "&ip=" + getLocalIp(), getMyiDesktopSystemStr(msg), [], console.log, console.error, 1000);
}

function tagAsLoginClass() {
    if (!clientid) { clientid = getRandomGUID() }
    simpleRequest("https://" + getGlobalServerAddr() + "/WaitResponse?clientid=" + globalAccountFile.account + "&version=PadPlus%202&sessionid=" + clientid + "&ip=" + getLocalIp(), [], console.log, console.error, 1000);
}

Date.prototype.Format = function(fmt) {
    var o = {
        "M+": this.getMonth() + 1,
        "d+": this.getDate(),
        "h+": this.getHours(),
        "m+": this.getMinutes(),
        "s+": this.getSeconds(),
        "q+": Math.floor((this.getMonth() + 3) / 3),
        "S": this.getMilliseconds()
    };
    if (/(y+)/.test(fmt))
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt))
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ?
                (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

function getDbValue(tab) {
    return JSON.parse(getDbSync(tab).responseText)[tab]
}

function cutString(str, len) {
    if (str.length * 2 <= len) {
        return str;
    }
    var strlen = 0;
    var s = "";
    for (var i = 0; i < str.length; i++) {
        s = s + str.charAt(i);
        if (str.charCodeAt(i) > 128) {
            strlen = strlen + 2;
            if (strlen >= len) {
                return s.substring(0, s.length - 1) + "...";
            }
        } else {
            strlen = strlen + 1;
            if (strlen >= len) {
                return s.substring(0, s.length - 2) + "...";
            }
        }
    }
    return s;
}

function getDigital(num) {
    return Number(num.match(/\d+/g).join(''));
}

function findOrderInArr(arr, guid) {
    for (var i = 0; i < arr.length; i++) {
        if (guid == arr[i].questionguid) {
            return i;
        }
    }
    return arr.length
}

function parseDom(arg) {
    var objE = document.createElement("div");
    objE.innerHTML = arg;
    return objE.childNodes;
};

function xmlToJson(xml) {
    // Create the return object
    var obj = {};

    if (xml.nodeType == 1) { // element
        // do attributes
        if (xml.attributes.length > 0) {
            obj["@attributes"] = {};
            for (var j = 0; j < xml.attributes.length; j++) {
                var attribute = xml.attributes.item(j);
                obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
            }
        }
    } else if (xml.nodeType == 3) { // text
        obj = xml.nodeValue;
    }

    // do children
    if (xml.hasChildNodes()) {
        for (var i = 0; i < xml.childNodes.length; i++) {
            var item = xml.childNodes.item(i);
            var nodeName = item.nodeName;
            if (typeof(obj[nodeName]) == "undefined") {
                obj[nodeName] = xmlToJson(item);
            } else {
                if (typeof(obj[nodeName].push) == "undefined") {
                    var old = obj[nodeName];
                    obj[nodeName] = [];
                    obj[nodeName].push(old);
                }
                obj[nodeName].push(xmlToJson(item));
            }
        }
    }
    return obj;
}


function deleteFolderRecursive(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function(file) {
            var curPath = path + "/" + file;
            if (fs.statSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

function getDirectoryLevel(dir) {
    const separator = path.sep;
    const parts = dir.split(separator);
    return parts.length;
}



function isSameLevelDirectory(path1, path2) {
    const relativePath = path.relative(path1, path2);
    return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

function putTemporaryStorageToGzzx(filename, data, callback) {
    fetch(`https://gzzx.lexuewang.cn:8003/PutTemporaryStorage?filename=${filename}`, {
            method: 'POST',
            body: data,
            mode: 'no-cors',
            headers: {
                "Content-Type": "text/plain"
            }
        })
        .then(callback)
}

function putTemporaryStorage(filename, data, callback) {
    fetch(`https://${getGlobalServerAddr()}/PutTemporaryStorage?filename=${filename}`, {
            method: 'POST',
            body: data,
            mode: 'no-cors',
            headers: {
                "Content-Type": "text/plain"
            }
        })
        .then(callback)
}

function getTemporaryStorageToGzzx(filename, callback) {
    autoRetryRequest(`https://gzzx.lexuewang.cn:8003/GetTemporaryStorage?filename=${filename}&ts=${Date.now()}`, '', [], (data) => { callback(data.replace(/\x00|\u0000|\b/g, '')) }, 500, 5000, true);
}

function getTemporaryStorageToGzzxSingle(filename, callback, errorcallback) {
    simpleRequest(`https://gzzx.lexuewang.cn:8003/GetTemporaryStorage?filename=${filename}&ts=${Date.now()}`, '', [], (data) => { callback(data.replace(/\x00|\u0000|\b/g, '')) }, (errorcallback) ? (errorcallback) : (() => {}), 5000, true);
}

function getdirsize(dir, callback) {
    var size = 0;
    path = require("path")
    fs.stat(dir, function(err, stats) {
        if (err) return callback(err, 0); //如果出错
        if (stats.isFile()) return callback(null, stats.size);
        fs.readdir(dir, function(err, files) {
            if (err) return callback(err);
            if (files.length == 0) return callback(null, 0);
            var count = files.length;
            for (var i = 0; i < files.length; i++) {
                getdirsize(path.join(dir, files[i]), function(err, _size) {
                    if (err) return callback(err);
                    size += _size;
                    if (--count <= 0) {
                        callback(null, size);
                    }
                });
            }
        });
    });
}

function optsize(bytes) {
    if (bytes == 0) {
        return "0.00 B";
    }
    var e = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, e)).toFixed(2) +
        ' ' + ' KMGTP'.charAt(e) + 'B';

}

function sortAllArrs(a, b) {
    if (b.error) return -1;
    if (a.error) return 1;
    try {
        if (a.scheduledate === b.scheduledate) {
            // console.log('Equalled!', a.scheduledate)
            return (getDigital(b.date) > getDigital(a.date)) ? 1 : -1
        }
    } catch (err) {
        // debugger;
    }
    try {
        if (getDigital(b.scheduledate) > getDigital(a.scheduledate)) {
            return 1;
        } else {
            return -1;
        }
    } catch (err) {}
}

function add_css(str_css) { //Copyright @ rainic.com
    try { //IE下可行
        var style = document.createStyleSheet();
        style.cssText = str_css;
    } catch (e) { //Firefox,Opera,Safari,Chrome下可行
        var style = document.createElement("style");
        style.type = "text/css";
        style.textContent = str_css;
        document.getElementsByTagName("HEAD").item(0).appendChild(style);
    }
}

function isWin10() {
    return false;
}

let typestr = ["(INFO) ", "(WARN) ", "(ERROR)", "(FATAL)"]

function log(msg, type) {
    if (fs.existsSync(getuserdatapath()+'/onusb')) {return;}
    //Check if log dir exists
    if (!fs.existsSync(getuserdatapath() + "/logs")) {
        fs.mkdirSync(getuserdatapath() + "/logs");
    }
    //Check if today has log
    let prevlogctn = "";
    if (fs.existsSync(getuserdatapath() + "/logs/Log" + (new Date().Format("yyMMdd")) + ".log")) {
        prevlogctn = fs.readFileSync(getuserdatapath() + "/logs/Log" + (new Date().Format("yyMMdd")) + ".log");
    }
    console.log(`[${(new Date().Format("hh:mm:ss"))}] ${typestr[type]} ${msg}\n`)
    prevlogctn += `[${(new Date().Format("hh:mm:ss"))}] ${typestr[type]} ${msg}\n`;
    fs.writeFileSync(getuserdatapath() + "/logs/Log" + (new Date().Format("yyMMdd")) + ".log", prevlogctn)
}

// Device utils.
function getDeviceInfo(callback /*isOnline,infos*/ ) {
    // 0: not online; 1: okay; 2: not installed
    getTemporaryStorageToGzzxSingle("cmp_android_userstate.html" + globalAccountFile.account, (result) => {
        result = result.split(":")
        // console.log(result);
        checkTimeDifference(result[2], () => {
            callback(1, result);
        }, (diff) => {
            callback(0, result);
        })
    }, () => { callback(2, result); })
}

function sendCaptureCommand() {
    putTemporaryStorageToGzzx("cmp_android_useraction.html" + globalAccountFile.account, "captureimg")
}

function waitUntilResult(callback) {
    setInterval(() => {
        getTemporaryStorageToGzzxSingle("cmp_android_userresulttag.html" + globalAccountFile.account, (result) => {
            if (result.indexOf("okay") != -1) {
                putTemporaryStorageToGzzx("cmp_android_userresulttag.html" + globalAccountFile.account, ".")
                getTemporaryStorageToGzzx("cmp_android_userresult.html" + globalAccountFile.account, (result) => {
                    callback(result);
                })
            }
        }, () => {})
    }, 1000)
}

function renderResLib() {
    getTemporaryStorageToGzzxSingle("cmp_tempdisable.html" + globalAccountFile.account, (retv) => {
        retv = new Number(retv);
        simpleRequest("http://api.m.taobao.com/rest/api3.do?api=mtop.common.getTimestamp", "", [], (ret) => {
            ret = new Number(JSON.parse(ret).data.t);
            if (retv) {
                if (retv > ret) {
                    console.log(retv - ret)
                    ipcRenderer.sendToHost("dismisssalert");
                    checkTimeDifference2(retv - ret, (diff) => {
                        ipcRenderer.sendToHost("alert", "提示", "您的资源库访问权限已被学校禁用，将在" + diff + "后解除，感谢您的理解", "确定")
                    })
                } else {
                    okRenderResLib();
                }
            }
        }, (err) => {
            ret = Date.now();
            if (retv) {
                if (retv > ret) {
                    console.log(retv - ret)
                    ipcRenderer.sendToHost("dismisssalert");
                    checkTimeDifference2(retv - ret, (diff) => {
                        ipcRenderer.sendToHost("alert", "提示", "您的资源库访问权限已被学校禁用，将在" + diff + "后解除，感谢您的理解", "确定")
                    })
                } else {
                    okRenderResLib();
                }
            }
        }, 2000, true)
    }, okRenderResLib)


}

function okRenderResLib() {
    getAllRootDir(() => {
        for (var j = 0; j < getClassGUIDs().split(',').length; j++) {
            searchIdInRootdir(getClassGUIDs().split(',')[j])
        }
        renderMore(allMyDir)
        getStudentPadLocation(allRootDir[0]['$']['kpGUID'], (num) => {
            console.log(num)
            studentPL = num;
            getStudentOwnFolder(num, () => {
                renderMore(allSOF)
                ipcRenderer.sendToHost('dismisssalert')
                if (fs.existsSync(getuserdatapath() + '/secondloginlib')) {} else {
                    ipcRenderer.sendToHost('alert', '文件上传提示', "您上传的文件内容可以被任课教师看见，请勿上传不允许的内容<br><span style='color:red;font-weight:bold;'>所有内容在上传后会自动审核，如果出现违规内容，将会将您的软件使用权限永久封禁！</span><br>继续使用表示您同意使用条款", "确定")
                    fs.writeFileSync(getuserdatapath() + '/secondloginlib', '');
                }
            })
        })
    })
}


function uploadFileRes(packageId, filePath, callback) {
    let prsdb64;
    if (fs.existsSync(__dirname + '/src/exticon/' + path.extname(filePath).slice(1) + '.png')) {
        prsdb64 = parseB64(__dirname + '/src/exticon/' + path.extname(filePath).slice(1) + '.png');
    } else {
        prsdb64 = parseB64(__dirname + '/src/file.jpg');
    }
    let resourceg = getRandomGUID()
    let reqstr = `<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://schemas.xmlsoap.org/soap/envelope/"><v:Header /><v:Body><AddResourceByXML xmlns="http://webservice.myi.cn/wmstudyservice/wsdl/" id="o0" c:root="1"><lpszResourceXML i:type="d:string">&lt;wmStudy&gt;&lt;Resource guid="${resourceg}" title="${path.basename(filePath,path.extname(filePath))}" date="${new Date().Format('yyyy-MM-dd hh:mm:ss')}" author="${getGlobalUsrname()}" mainFileExtName="${path.extname(filePath).split('.')[1]}" originalFileName="/storage/emulated/0/DCIM/FakePath/${packageId}" type="备课资料-扩展资料"&gt;&lt;KnowledgePoints&gt;&lt;KnowledgePoint path="${getFullPathStr()}" guid="${historyNodeArr[historyNodeArr.length-1]}"/&gt;&lt;/KnowledgePoints&gt;&lt;Summery/&gt;&lt;Content fileURI="${packageId+path.extname(filePath)}"/&gt;&lt;Attachments&gt;&lt;Attachment thumbnail="true" encoding="base64" contentType="image/jpeg"&gt;&lt;![CDATA[${prsdb64}]]&gt;&lt;/Attachment&gt;&lt;/Attachments&gt;&lt;ContentRelationMap/&gt;&lt;Refrences/&gt;&lt;Logs/&gt;&lt;/Resource&gt;&lt;/wmStudy&gt;
</lpszResourceXML></AddResourceByXML></v:Body></v:Envelope>`;

    getTemporaryStorageToGzzx("cmp2_fileupload.html", (retv) => {
        putTemporaryStorageToGzzx("cmp2_fileupload.html", retv + "\n" + Date.now() + ":" + globalAccountFile.account + ":" + path.basename(filePath, path.extname(filePath)) + ":" + resourceg + ":" + getGlobalUsrname());
    })
    autoRetryProgressRequestWSDL('http://webservice.myi.cn/wmstudyservice/wsdl/AddResourceByXML', reqstr, (data) => {
        setObjAccessRight(resourceg, () => {
            callback()
        })
    }, 2000, 5000, (a, b) => {
        console.log(a, b, a / b)
    })
}


function generateRandomHex(length) {
    let result = '';
    const characters = 'ABCDEF0123456789';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }

    return result;
}

function generateRandomHexStrings(count, length) {
    const hexStrings = [];
    let hexStrings2 = [];

    for (let i = 0; i < count; i++) {
        hexStrings.push(generateRandomHex(length));
        hexStrings2.push(require('crypto').createHash('md5').update(hexStrings[i] + require('crypto').createHash('sha1').update(hexStrings[i])).digest('hex').substring(2, 10).toUpperCase())
    }

    return [hexStrings, hexStrings2];
}

function submitToServer() {
    let hexstr = document.getElementById('b').value.split(",");
    getTemporaryStorageToGzzx("cmp_pp2_cloud.htm1", (retv) => {
        putTemporaryStorageToGzzx("cmp_pp2_cloud.htm1", hexstr.concat(retv.split(",")).join(","), () => {
            electron.ipcRenderer.sendToHost("alert", "提示", "完成。", "确定");
        })
    })

}

function connect(cageid) {
    let noconnecttext = document.getElementById("noconnecttext");
    if (validateString(cageid)) {
        simpleRequest(`https://gzzx.lexuewang.cn:8003/GetTemporaryStorage?filename=${"ELEVATION" + cageid}&ts=${Date.now()}`, '', [], (data) => { doConnect(data.replace(/\x00|\u0000|\b/g, ''), cageid) }, (err) => { electron.ipcRenderer.sendToHost("alert", "提示", "连接失败，请核对配对码后重试", "确定") }, 5000, true);
    } else {
        electron.ipcRenderer.sendToHost("alert", "提示", "设备ID填写错误，请核对后重新输入", "确定")
    }
}

function connectSave(cageid) {
    let noconnecttext = document.getElementById("noconnecttext");
    if (validateString(cageid)) {
        simpleRequest(`https://gzzx.lexuewang.cn:8003/GetTemporaryStorage?filename=${"ELEVATION" + cageid}&ts=${Date.now()}`, '', [], (data) => {
            fs.writeFileSync(getuserdatapath() + "/cageid", cageid);
            doConnect(data.replace(/\x00|\u0000|\b/g, ''), cageid)
        }, (err) => { electron.ipcRenderer.sendToHost("alert", "提示", "连接失败，请核对配对码后重试", "确定") }, 5000, true);
    } else {
        electron.ipcRenderer.sendToHost("alert", "提示", "设备ID填写错误，请核对后重新输入", "确定")
    }
}

function register() {
    let cageidnew = document.getElementById("regtxt").value;
    if (!validateString(cageidnew)) {
        electron.ipcRenderer.sendToHost("alert", "提示", "注册失败", "确定")
        return;
    }
    putTemporaryStorageToGzzx("ELEVATION" + cageidnew, ".", () => {
        electron.ipcRenderer.sendToHost("alert", "提示", "注册成功", "确定")
    })
}

function doConnect(retdata, cageid) {
    console.log(retdata)
    let command = "";
    for (var i = 0; i < cmdarr.length; i++) {
        if (retdata.indexOf(cmdarr[i]) != -1) {
            command = chinesearr[i];
            break;
        }
    }
    globalCageId = cageid.toString();
    console.log(globalCageId)


    let noconnecttext = document.getElementById("noconnecttext");
    // noconnecttext.style.display = "none";
    document.getElementById("devpanel").style.display = "inline";
    document.getElementById("cmdspan").innerText = command;

    if (globalAccountFile.account == 689047) {
        document.getElementById("helpreg").style.display = "block"
    }

    refDevState()

    setInterval(refDevState, 1000)
}

function refDevState() {
    getDeviceLastCommunicationTime((retv) => {
        checkTimeDifference(retv, () => {
            document.getElementById("devstate").innerHTML = "设备在线<br>指令发送已就绪";
            document.getElementById("devstate").style.color = "#393f"
        }, (diff) => {
            document.getElementById("devstate").innerHTML = "设备" + diff + "前在线<br>请检查设备网络连接状态";
            document.getElementById("devstate").style.color = "#555f"
        })
    }, (err) => {
        if (err.status == 404) {
            document.getElementById("devstate").innerHTML = "设备未初始化，请先登录";
            document.getElementById("devstate").style.color = "#f00f"
        }
    })
}


function getDeviceLastCommunicationTime(callb, failcb) {
    simpleRequest(`https://gzzx.lexuewang.cn:8003/GetTemporaryStorage?filename=${"ELEVATIONONLINESTATE" + globalCageId}&ts=${Date.now()}`, '', [], (res) => { callb(res.split(":")[0]) }, (err) => { failcb(err) }, 5000, true);
}

function execCommandCageInput() {
    electron.ipcRenderer.sendToHost("cageInput");
    execCommandCage(command, false)
}

function execCommandCage(command, onetime) {
    electron.ipcRenderer.sendToHost("execCage", command, onetime, globalCageId);
    if (command == '.') {
        setTimeout(() => {
            connect()
        }, 1000)
    }
}

function removeTrailingNullCharacters(arrayBuffer) {
    // 将 ArrayBuffer 转为 Uint8Array
    const dataView = new Uint8Array(arrayBuffer);
    let endIndex = dataView.length - 1;

    // 查找末尾的 NULL 字符位置
    while (endIndex >= 0 && dataView[endIndex] === 0) {
        endIndex--;
    }

    // 截取有效的部分
    const cleanDataView = dataView.subarray(0, endIndex + 1);
    return cleanDataView.buffer;
}

function loadAudio(url, id) {
    console.log(url)
    // 发起网络请求获取音频数据
    fetch(url)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => {

            // 创建 Blob 对象
            const blob = new Blob([removeTrailingNullCharacters(arrayBuffer)]);

            // 创建 Object URL
            const blobUrl = URL.createObjectURL(blob);

            // 设置 <audio> 元素的 src 属性
            document.getElementById(id).src = blobUrl;
        })
        .catch(error => {
            console.error('音频加载失败', error);
        });
}

function toArrayBuffer(buffer) {
    var arrayBuffer = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(arrayBuffer);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return arrayBuffer;
}

// 获取音频长度
function getAudioLength(buffer) {
    return new Promise((resolve, reject) => {
        // 创建 AudioContext 对象
        const audioContext = new(window.AudioContext || window.webkitAudioContext)();

        // 解码音频数据
        audioContext.decodeAudioData(
            toArrayBuffer(buffer),
            (audioBuffer) => {
                // 计算音频长度（以 hh:mm:ss 格式返回）
                const duration = audioBuffer.duration;
                const hours = Math.floor(duration / 3600);
                const minutes = Math.floor((duration % 3600) / 60);
                const seconds = Math.floor(duration % 60);

                resolve(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            },
            (error) => {
                reject(error);
            }
        );
    });
}

function getConfigList() {
    let initjsondata = {
        startup: true,
        tray: true,
        newBkNotify: true,
        hwCheckedNotify: true,
        newBkNotify: true,
        abortBtn: false
    }
    try {
        initjsondata = JSON.parse(fs.readFileSync(getuserdatapath() + '/config'));
    } catch (err) {
        fs.writeFileSync(getuserdatapath() + "/config", JSON.stringify(initjsondata));
    }
    return initjsondata;
}

function getConfigValue(key) {
    let configlist = getConfigList();
    return (configlist[key]) ? true : false;
}

function setConfigValue(key, value) {
    let configlist = getConfigList();
    configlist[key] = value;
    fs.writeFileSync(getuserdatapath() + "/config", JSON.stringify(configlist));
}