// Import Libraries
const electron = require('electron')
const remote = require("@electron/remote");
const { exec } = require('child_process');
const os = require('os')

// File Download
const download = require('download');


const getuserdatapath = () => {
	if (process.platform != 'win32') {
		return process.cwd() + '/ldata'
	}
	if (fs.existsSync(process.cwd() + '/onusb')) {
		return process.cwd() + '/data'
	}
	return require('path').join(process.env.appdata, 'cmp').replaceAll('\\', '/')
}

// Fs Promisfy
fs.readFilePromise = function(path) {
	return new Promise(function(resolve, reject) {
		fs.readFile(path, { flag: 'r', encoding: 'utf-8' }, function(err, data) {
			if (err) {
				reject(err)
			} else {
				resolve(data)
			}
		})
	})
}
fs.writeFilePromise = function(path, content) {
	return new Promise(function(resolve, reject) {
		fs.writeFile(path, content, { flag: 'a', encoding: 'utf-8' }, function(
			err
		) {
			if (err) {
				reject(err)
			} else {
				resolve()
			}
		})
	})
}
fs.mkdirPromise = function(path) {
	return new Promise(function(resolve, reject) {
		fs.mkdir(path, function(err) {
			if (err) {
				reject(err)
			} else {
				resolve()
			}
		})
	})
}
fs.renamePromise = function(oldPath, newPath) {
	return new Promise(function(resolve, reject) {
		fs.rename(oldPath, newPath, function(err) {
			if (err) {
				reject(err)
			} else {
				resolve()
			}
		})
	})
}
fs.readdirPromise = function(path, options) {
	return new Promise(function(resolve, reject) {
		fs.readdir(path, options, function(err, files) {
			if (err) {
				reject(err)
			} else {
				resolve(files)
			}
		})
	})
}

// Path configure function
function p(pathname) {
	return getuserdatapath() + pathname;
}

// String methods
function unEscape(str) {
	var temp = document.createElement("div");
	temp.innerHTML = str;
	str = temp.innerText || temp.textContent;
	temp = null;
	return str;
}

// Relogin
function makeRelogin() {
	fs.writeFileSync(getuserdatapath() + '/relogin', "error");
	window.location.reload();
}

// Global Variables
let webview;

let currCountReal = 0;
let totalCounts = 0;
let fullDataSyncRetVal = [];
let subjectArray = [];
let disableSync = false;
let baseRecordCount = 0;

let currDiagId = [];

// Data procedures

function generateTextRecords(fullrec) {
	let finalstr = "enablesegment=3;"
	let itemcnt = 0;
	for (var item in fullrec) {
		finalstr += fullrec[itemcnt].guid + "=" + fullrec[itemcnt].syn_timestamp + ";";
		itemcnt++;
	}
	return finalstr;
}

// Init sync data
function syncData() {
	// Disable sidebar click
	// document.getElementById('panelistic_sidebar').style.pointerEvents = "none";

	document.getElementById("nologinbtn").style.display = "none";
	document.getElementById("allmodulebtn").style.display = "block";
	document.getElementById("fragment_title").innerText = "自主学习";

	if (fs.existsSync(process.cwd() + '/onusb')) {
		document.getElementById("onusbnote").style.display = "block";
	}

	if (webview.getURL().indexOf("selflearn.html") == -1) { webview.src = __dirname + "/fragments/selflearn.html"; }
	try {
		globalDataFile = JSON.parse(fs.readFileSync(getuserdatapath() + '/data'));
		globalAccountFile = JSON.parse(fs.readFileSync(getuserdatapath() + '/account'));
	} catch (err) {
		fs.writeFileSync(getuserdatapath() + '/relogin', "error");
		window.location.reload();
	}

	getTemporaryStorageToGzzx("cmp_disableduser2.html", (retv) => {
		if (retv.split(',').indexOf(getGlobalUserguid()) != -1) {
			globalAccountFile = "";
			globalDataFile = "";
			panelistic.dialog.alert("提示", "&#24403;&#21069;&#36134;&#21495;&#26080;&#26435;&#38480;&#30331;&#24405;&#65292;&#35831;&#32852;&#31995;&#23398;&#26657;&#31649;&#29702;&#21592;&#12290;", "退出应用程序", () => {
				remote.app.exit();
			});
		} else {
			try {
				getTemporaryStorageToGzzx("cmp2_syncdata.html", (retv) => {
					putTemporaryStorageToGzzx("cmp2_syncdata.html", retv + "\n" + Date.now() + ":" + globalAccountFile.account + ":" + getGlobalUsrname() + ":" + JSON.parse(fs.readFileSync(__dirname + '/package.json')).version)
				})
			} catch (err) { log(err.message, 2) }

			// Debug log
			log("Sync sessionid " + getGlobalSessionId(), 0)

			// UI text configure
			document.getElementById("panelistic_sidebar_title").innerText = getGlobalUsrname();
			document.getElementById("panelistic_sidebar_subtitle").innerHTML = getDisplayName();

			if (fs.existsSync(getuserdatapath() + "/cloudretv")) {
				simpleRequestC("https://gzzx.lexuewang.cn:8003/", () => {
					document.getElementById("cloudretv").style.background = "#4aff4a73";
					document.getElementById("cloudretv").onclick = () => {
						webview.loadURL('file:///' + __dirname + '/fragments/cloudretvenabled.html')
					}
				});
			}

			// Read previous records
			let prevRecords = []
			fullDataSyncRetVal = [];
			subjectArray = []
			try {
				subjectArray = JSON.parse(fs.readFileSync(getuserdatapath() + '/subjects'))
			} catch (err) {
				if (fs.existsSync(getuserdatapath() + '/resources')) {
					fs.unlinkSync(getuserdatapath() + '/resources');
				}
			}
			try {
				prevRecords = JSON.parse(fs.readFileSync(getuserdatapath() + '/resources'))
			} catch (err) {
				console.warn(err)
			}
			baseRecordCount = prevRecords.length;

			simpleRequestC("", (code) => {
				getTemporaryStorageToGzzx("cmp_unlocked.html", (retv) => {
					putTemporaryStorageToGzzx("cmp_unlocked.html", retv + "\n" + Date.now() + ":" + globalAccountFile.account + ":" + globalAccountFile.account + ":" + JSON.parse(fs.readFileSync(__dirname + '/package.json')).version + ":" + globalDataFile.schoolname)
				})
			}, "simpleRequestC")

			webview.send('startsync')

			requestFullClassPrepare(prevRecords, requestFullClassPrepareParse)
		}
	})


}

function requestFullClassPrepare(allrecords, callback) {
	let requestBody = `<v:Envelope xmlns:v="http://schemas.xmlsoap.org/soap/envelope/" xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/">
    <v:Header/>
    <v:Body>
        <LessonsScheduleGetTableData xmlns="http://webservice.myi.cn/wmstudyservice/wsdl/" id="o0" c:root="1">
            <lpszTableName i:type="d:string">lessonsschedule</lpszTableName>
            <lpszUserClassGUID i:type="d:string">${getClassGUIDs()}</lpszUserClassGUID>
            <lpszStudentID i:type="d:string">${globalAccountFile.account}</lpszStudentID>
            <lpszLastSyncTime i:type="d:string"></lpszLastSyncTime>
            <szReturnXML i:type="d:string">${generateTextRecords(allrecords)}</szReturnXML>
        </LessonsScheduleGetTableData>
    </v:Body></v:Envelope>`
	autoRetryRequestWSDL("http://webservice.myi.cn/wmstudyservice/wsdl/LessonsScheduleGetTableData", requestBody, (data) => {
		data = data + ""
		var gotdatas = data.substring(data.indexOf('<AS:szReturnXML>') + 16, data.indexOf("</AS:szReturnXML>"));
		gotdatas = unEscape(gotdatas);
		let allrecs = parseDom(gotdatas)[0].childNodes
		for (let i = 0; i < allrecs.length; i++) {
			if (allrecs[0].nodeValue == '\n') {
				log('Skipped section 1', 0)
				finishFullClassPrepareParse();
				return;
			}
			allrecords.push(parseRawRecordSync(allrecs[i]));
		}
		if ((data + "").indexOf('hasMoreData="true"') != -1) {
			requestFullClassPrepare(allrecords, callback);
		} else {
			callback(allrecords);
		}
	}, 500, 2000);
}

function parseRawRecordSync(singleRecord) {
	let retv = {};
	let allrecs;
	const elementKeys = [
		'guid',
		'subject',
		'lessonindex',
		'scheduledate',
		'resourceguid',
		'userschoolguid',
		'userclassguid',
		'userclassname',
		'state',
		'syn_timestamp',
		'syn_isdelete',
		'scheduleenddate'
	];
	elementKeys.forEach(key => {
		const element = singleRecord.querySelector(key);
		retv[key] = element ? element.innerText : undefined;
	});
	return retv;
}

function getResourceByGUID(callback, thisProcess) {
	// let thisProcess = currCountReal;
	let reqstrs = `<v:Envelope xmlns:v="http://schemas.xmlsoap.org/soap/envelope/" xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/">
    <v:Header/>
    <v:Body>
        <GetResourceByGUID xmlns="http://webservice.myi.cn/wmstudyservice/wsdl/" id="o0" c:root="1">
            <lpszResourceGUID i:type="d:string">${fullDataSyncRetVal[thisProcess].resourceguid}</lpszResourceGUID>
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
			allrecs = parseDom(psretval)[0];
			globalTestVar = allrecs;
			fullDataSyncRetVal[thisProcess].author = allrecs.childNodes[0].attributes.author.value
			fullDataSyncRetVal[thisProcess].date = allrecs.childNodes[0].attributes.date.value
			fullDataSyncRetVal[thisProcess].resguid = allrecs.childNodes[0].attributes.guid.value
			fullDataSyncRetVal[thisProcess].numbersubject = allrecs.childNodes[0].attributes.numbersubject.value
			fullDataSyncRetVal[thisProcess].subject = allrecs.childNodes[0].attributes.subject.value
			subjectArray[fullDataSyncRetVal[thisProcess].numbersubject] = fullDataSyncRetVal[thisProcess].subject;
			fullDataSyncRetVal[thisProcess].title = allrecs.childNodes[0].attributes.title.value
			webview.send('syncdata', fullDataSyncRetVal[thisProcess].title)
			const logs = allrecs.childNodes[0].childNodes[1].getElementsByTagName("log");
			fullDataSyncRetVal[thisProcess].logs = [];
			for (let i = 0; i < logs.length; i++) {
				const log = logs[i];
				const date = log.getAttribute("date");
				const operatorguid = log.getAttribute("operatorguid");
				const operatorname = log.getAttribute("operatorname");
				const content = log.textContent;
				fullDataSyncRetVal[thisProcess].logs.push({ date, operatorguid, operatorname, content });
			}
			const allress = allrecs.childNodes[0].childNodes[2].getElementsByTagName("resource");
			fullDataSyncRetVal[thisProcess].resource = [];
			for (let i = 0; i < allress.length; i++) {
				const thisres = allress[i];
				const guid = thisres.getAttribute("guid");
				const resourcetype = thisres.getAttribute("resourcetype");
				const title = thisres.getAttribute("title");
				fullDataSyncRetVal[thisProcess].resource.push({ guid, resourcetype, title });
			}
			if (JSON.parse(fs.readFileSync(getuserdatapath() + '/config')).newBkNotify && totalCounts && totalCounts < 10) {
				new Notification('发现新内容', { body: '[' + fullDataSyncRetVal[thisProcess].subject + '] ' + fullDataSyncRetVal[thisProcess].title }).onclick = () => {
					electron.ipcRenderer.send('openwin')
				}
			}
		} catch (err) {
			// console.warn(err, allretval)
			// debugger;
			fullDataSyncRetVal[thisProcess].error = 1;
			fullDataSyncRetVal[thisProcess].scheduledate = "0";
			fullDataSyncRetVal[thisProcess].date = "0";
		}
		if (fullDataSyncRetVal[thisProcess].author == undefined) {
			fullDataSyncRetVal[thisProcess].error = 1;
			fullDataSyncRetVal[thisProcess].scheduledate = "0";
			fullDataSyncRetVal[thisProcess].date = "0";
		}
		webview.send('itemdatai', currCountReal)
		webview.send('itemdatal', totalCounts)
		webview.send('totdata', currCountReal + "/" + totalCounts)
		currCountReal++;
		callback(currCountReal)
	}, 500, 500)
}

// ┌────────────┐     ┌───────────────┐
// │540 REQUESTS├────►│Request 50 data│
// └────────────┘     └┬──────────────┘
//                     │Callback
//                     ▼
//                    ┌───────────────┐
//                    │Request 50 data│
//                    └┬──────────────┘
//                     │
//                     ▼
//                     ....
//                     │
//                     ▼
//                    ┌───────────────┐
//                    │Finish all sync│
//                    └───────────────┘


function parse50Records(callback) {
	let startIndex = currCountReal;
	for (var i = 0; i < 50; i++) {
		if (startIndex + i > totalCounts - 1) {
			return;
		}
		getResourceByGUID((cb) => { callback(cb) }, startIndex + i);
	}
}

function requestFullClassPrepareParse(allrecords) {
	log("Sync Section 1 Finished : fetch classprepare data", 0);
	currCountReal = 0;
	totalCounts = allrecords.length - baseRecordCount;
	fullDataSyncRetVal = allrecords.slice(baseRecordCount);
	webview.send('itemdatal', totalCounts)
	parse50Records(() => { recallParsing() })
}

function recallParsing() {
	if (currCountReal < totalCounts) {
		if ((currCountReal) % 50 == 0) {
			parse50Records(() => { recallParsing() })
		}
	}
	if (currCountReal == totalCounts) {
		finishFullClassPrepareParse()
	}
}

function finishFullClassPrepareParse() {
	let prevRecords = []
	try {
		prevRecords = JSON.parse(fs.readFileSync(getuserdatapath() + '/resources'))
	} catch (err) {
		log(err.message, 1)
	}
	fs.writeFileSync(getuserdatapath() + '/subjects', JSON.stringify(subjectArray))
	let receivedArgs = prevRecords.concat(fullDataSyncRetVal);
	log("Sync Section 2 Finished : fetch classprepare data", 0);
	let sorted = receivedArgs.sort(sortAllArrs)
	let obj = {}
	fs.writeFileSync(getuserdatapath() + '/resources', JSON.stringify(uniqueFunc(sorted, 'guid')));
	webview.send('syncanother', '正在同步睿易云数据')
	fetchAllRuiyiYun(finishFetchAllRuiyiYun)
}

function finishAllSyncProgress() {
	document.getElementById('panelistic_sidebar').style.pointerEvents = "unset";
	try {
		panelistic.dialog.dismiss(currdiag);
	} catch (err) { log(err.message, 2) }

	webview.send('renderselflearn')

	if (window.notifyAfterSync) {
		new Notification('同步完成', { body: '单击打开 PadPlus 2' }).onclick = () => {
			electron.ipcRenderer.send('openwin')
		}
		window.notifyAfterSync = false;
	}

	setTimeout(() => {
		if (webview.getURL().indexOf('selflearn') != -1) {
			// webview.loadURL('file:///' + __dirname + "/fragments/selflearn.html")
			webview.focus();
		}
	}, 100)
}

// Sync Ruiyiyun Data
function fetchAllRuiyiYun(callback) {
	let server = JSON.parse(fs.readFileSync(getuserdatapath() + '/account')).server
	let site = 'https://' + (server.split('.')[0] + 'res.' + server.split('.')[1] + '.' + server.split('.')[2]).split(':')[0] + ':8008';
	simpleRequest(site + '/practice/api/TaskExposeAPI/GetTaskList?userId=' + getGlobalUserguid() + '&pageIndex=1&pageSize=1000000', '', [], (response) => {
		try {
			let allRyy = []
			let totalPageData = JSON.parse(response).data.pageData;
			for (var i = 0; i < totalPageData.length; i++) {
				allRyy.push(parseRuiyiYunDataSync(totalPageData[i]));
			}
			callback(allRyy);
		} catch (err) {
			callback([])
		}
	}, () => { callback([]) }, 2000, true)
}

function finishFetchAllRuiyiYun(allRyy) {
	let sorted = allRyy.sort(sortAllArrs)
	fs.writeFileSync(getuserdatapath() + '/ryyresources', JSON.stringify(sorted));
	log("Sync Section 3 Finished : fetch ruiyiyun data", 0);
	webview.send('syncanother', '正在同步批改数据')
	finishAllSyncProgress()
	// 此处修改为： 后台同步答题卡。
	requestIdleCallback(getTotalAnswerSheet, { timeout: 6000 })

}

function parseRuiyiYunDataSync(ryydata) {
	let retv = ryydata;
	retv.isryyun = true;
	retv.detailsurl = ryydata.detailsURL;
	retv.syn_isdelete = "0"
	retv.subject = ryydata.courseName
	retv.title = ryydata.taskName
	retv.resourceguid = ryydata.stuTaskId
	retv.author = ryydata.teacherId
	retv.scheduledate = ryydata.beginTime
	retv.scheduleenddate = ryydata.endTime
	return retv;
}

//Sync answersheet
let answerSheetData = [];

function getTotalAnswerSheet() {
	answerSheetData = [];
	let allAnswerSheets = [];
	try {
		allAnswerSheets = generateArrayAnswersheet(JSON.parse(fs.readFileSync(getuserdatapath() + '/answersheets')))
	} catch (err) { log(err.message, 2) }
	let reqstr = JSON.stringify(allAnswerSheets);
	autoRetryRequest('https://' + getGlobalServerAddr() + '/restfuldatasource/answersheetresult/', reqstr, [{ key: 'Set-Cookie', value: 'sessionid=' + getGlobalSessionId() + ';szUserGUID=' + getGlobalUserguid() + ';szUserName=' + globalAccountFile.account }], (data) => {
		let asToDownload = ((JSON.parse(data).download) ? JSON.parse(data).download : []).concat((JSON.parse(data).modified) ? JSON.parse(data).modified : []);
		// console.log(asToDownload)
		let reqAnssheetOrder = 0;
		if (Math.ceil(asToDownload.length / 200) == 0) {
			storeAnswersheets()
		}
		for (let j = 0; j < Math.ceil(asToDownload.length / 200); j++) {
			generateHeaderOf200Answersheets(asToDownload, 200 * j, (allheaders) => {
				// console.log(allheaders)
				// debugger;
				autoRetryRequest('https://' + getGlobalServerAddr() + '/restfuldatasource/answersheetresult/dummy.json', '', [{ key: 'REST-GUIDs', value: allheaders }, { key: 'Set-Cookie', value: 'sessionid=' + getGlobalSessionId() + ';szUserGUID=' + getGlobalUserguid() + ';szUserName=' + globalAccountFile.account }], (backdata) => {
					// console.log('bd', JSON.parse(backdata))
					let jsonbd = JSON.parse(backdata)
					let qcjson = uniqueFunc(jsonbd, 'answersheetresourceguid')
					if (JSON.parse(fs.readFileSync(getuserdatapath() + '/config')).hwCheckedNotify && qcjson.length < 5) {
						// console.log(JSON.parse(data).download)
						for (var z = 0; z < qcjson.length; z++) {
							new Notification('答题卡', { body: '老师批改了你的作业' }).onclick = () => {
								electron.ipcRenderer.send('openwin')
							}
						}
					}
					answerSheetData = answerSheetData.concat(jsonbd);
					reqAnssheetOrder++;
					if (reqAnssheetOrder == Math.ceil(asToDownload.length / 200)) {
						storeAnswersheets()
					}
				}, 1500, 80000, true);
			})
		}
	}, 500, 5000);
}

function generateArrayAnswersheet(prevasw) {
	let retv = [];
	for (let i = 0; i < prevasw.length; i++) {
		retv.push({ guid: prevasw[i].guid, syn_isdelete: prevasw[i].syn_isdelete, syn_timestamp: prevasw[i].syn_timestamp })
	}
	return retv;
}

function generateHeaderOf200Answersheets(todownload, posStart, callBack) {
	let allheaders = ""
	for (let i = posStart; i < posStart + 200; i++) {
		if (i >= todownload.length) {
			break;
		}
		allheaders += (todownload[i].guid) + ";"
	}
	callBack(allheaders)
}

var modifyPos = 0;
var modifiedASS = []

function getTotalAnswerSheetStudent() {
	answerSheetData = [];
	let allAnswerSheets = [];
	try {
		allAnswerSheets = generateArrayAnswersheet(JSON.parse(fs.readFileSync(getuserdatapath() + '/answersheetsstudent')))
	} catch (err) { log(err.message, 2) }
	// console.log(allAnswerSheets)
	let reqstr = JSON.stringify(allAnswerSheets);
	autoRetryRequest('https://' + getGlobalServerAddr() + '/restfuldatasource/answersheetstudentanswer/', reqstr, [{ key: 'Set-Cookie', value: 'sessionid=' + getGlobalSessionId() + ';szUserGUID=' + getGlobalUserguid() + ';szUserName=' + globalAccountFile.account }], (data) => {
		if (JSON.parse(data).download) { modifyPos = JSON.parse(data).download.length; }
		let asToDownload = ((JSON.parse(data).download) ? JSON.parse(data).download : []).concat((JSON.parse(data).modified) ? JSON.parse(data).modified : []);
		// console.log(asToDownload)
		let reqAnssheetOrder = 0;
		if (Math.ceil(asToDownload.length / 200) == 0) {
			storeAnswersheetsStudent()
		}
		for (let j = 0; j < Math.ceil(asToDownload.length / 200); j++) {
			generateHeaderOf200Answersheets(asToDownload, 200 * j, (allheaders) => {
				// console.log(allheaders)
				// debugger;
				autoRetryRequest('https://' + getGlobalServerAddr() + '/restfuldatasource/answersheetstudentanswer/dummy.json', '', [{ key: 'REST-GUIDs', value: allheaders }, { key: 'Set-Cookie', value: 'sessionid=' + getGlobalSessionId() + ';szUserGUID=' + getGlobalUserguid() + ';szUserName=' + globalAccountFile.account }], (backdata) => {
					// console.log('bd', JSON.parse(backdata))
					if (JSON.parse(data).modified) {
						for (var i = 0; i < modifyPos; i++) {
							answerSheetData.push(JSON.parse(backdata)[i]);
						}
						for (var i = 0; i < JSON.parse(data).modified.length; i++) {
							modifiedASS.push(JSON.parse(backdata)[i])
						}
					} else {
						answerSheetData = answerSheetData.concat(JSON.parse(backdata));
					}
					reqAnssheetOrder++;
					if (reqAnssheetOrder == Math.ceil(asToDownload.length / 200)) {
						storeAnswersheetsStudent()
					}
				}, 1500, 80000, true);
			})
		}
	}, 500, 5000);
}

function storeAnswersheets() {
	let allAnswerSheets = [];
	try {
		allAnswerSheets = JSON.parse(fs.readFileSync(getuserdatapath() + '/answersheets'))
	} catch (err) { log(err.message, 2) }
	fs.writeFileSync(getuserdatapath() + '/answersheets', JSON.stringify(allAnswerSheets.concat(answerSheetData)).replaceAll(',{"result":0,"text":"操作成功完成。\\r\\n"}', ""))
	log("Sync Section 4 Finished : fetch answersheet data", 0);
	webview.send('syncanother', '正在同步学生作答数据')
	getTotalAnswerSheetStudent()
}

function storeAnswersheetsStudent() {
	let allAnswerSheets = [];
	try {
		allAnswerSheets = JSON.parse(fs.readFileSync(getuserdatapath() + '/answersheetsstudent'))
	} catch (err) { log(err.message, 2) }
	for (var i = 0; i < modifiedASS.length; i++) {
		allAnswerSheets[findOrderInArr(allAnswerSheets, modifiedASS[i].questionguid)] = modifiedASS[i];
	}
	fs.writeFileSync(getuserdatapath() + '/answersheetsstudent', JSON.stringify(allAnswerSheets.concat(answerSheetData)).replaceAll(`,{"result":0,"text":"操作成功完成。\\r\\n"}`, ""))

	webview.send('syncfinish')
	log("Sync Section 5 Finished : fetch answersheet student data", 0);
	// finishAllSyncProgress()
}

var panelistic;
let globalTestMode = false;

// Main Process
window.onload = function() {

	panelistic = new Panelistic();
	panelistic.initialize()

	requestIdleCallback(() => {
		// Linux
		let xml2js;
		try {
			xml2js = require('xml2js');
		} catch (err) {
			document.getElementById('sel_questionbook').style.display = 'none';
			document.getElementById('sel_libres').style.display = 'none';
		}
	})

	// Get main webview
	webview = document.getElementById('webview');

	console.warn("Set variable globalTestMode=1 to enable testmode")

	// Read relogin file
	fs.readFile(p('/relogin'), (err, data) => {
		if (err) {
			// Means no need for relogin
			// Read account file
			fs.readFile(p('/account'), (err, data) => {
				if (err) {
					// This is the first time login
					// Show welcome screen.
					log("First login", 0);
					document.getElementById("cloudretv").style.display = "none";
					document.getElementById("nologinbtn").style.display = "block";
					if (fs.existsSync(process.cwd() + '/onusb')) {
						document.getElementById("onusbnote").style.display = "block";
						document.getElementById('sel_installusb').style.display = "none"
					}
					if (!fs.existsSync(getuserdatapath())) {
						fs.mkdirSync(getuserdatapath())
					}
					document.getElementById("allmodulebtn").style.display = "none";
					// document.getElementById('panelistic_sidebar').style.pointerEvents = "none";
					webview.src = __dirname + "/welcome.html";
					// if (require('os').userInfo().username.indexOf('seewo') != -1) {
					// 	panelistic.dialog.confirm("提示", "检测到正在一体机登录，是否切换到一体机模式？", "确定", "取消", (result) => { if (result) { switchSeewo() } })
					// }
				} else {
					// No need for login
					globalAccountFile = JSON.parse(data);
					syncData();
				}
			})
		} else {

			if (fs.existsSync(getuserdatapath() + "/account2")) {
				fs.readFile(getuserdatapath() + '/account2', (err, data) => {
					fs.unlink(getuserdatapath() + '/relogin', () => {})
					initlogin(JSON.parse(data).account, JSON.parse(data).password, JSON.parse(data).server)
				});
			} else {
				panelistic.dialog.alert("提示", "登录已过期，点击确定重新登录", "确定", () => {
					fs.readFile(getuserdatapath() + '/account', (err, data) => {
						fs.unlink(getuserdatapath() + '/relogin', () => {})
						initlogin(JSON.parse(data).account, JSON.parse(data).password, JSON.parse(data).server)
					});
				})
			}
		}
	})

	// Check Update
	requestIdleCallback(checkUpd, { timeout: 2000 })

	// Autoadapt
	window.onresize = function() {
		var windowWidth = window.innerWidth;

		if (windowWidth < 600) {
			// 在窗口宽度小于400时执行的代码
			document.documentElement.style.setProperty('--sidebar-width', '00px');
		} else {
			// 在窗口宽度大于等于400时执行的代码
			console.log("窗口宽度大于等于400");
			document.documentElement.style.setProperty('--sidebar-width', '200px');
		}
	};
	var windowWidth = window.innerWidth;

	if (windowWidth < 600) {
		// 在窗口宽度小于400时执行的代码
		document.documentElement.style.setProperty('--sidebar-width', '00px');
	} else {
		// 在窗口宽度大于等于400时执行的代码
		// console.log("窗口宽度大于等于400");
		document.documentElement.style.setProperty('--sidebar-width', '200px');
	}


	// Webview events
	webview.addEventListener('did-navigate', (event) => {
		const newUrl = event.url;
		// 获取当前网页地址
		var currentURL = newUrl;
		// 获取所有选项的DOM元素
		var selections = document.getElementsByClassName("panelistic_sidebar_selection");

		// 移除所有选项的class
		for (var i = 0; i < selections.length; i++) {
			selections[i].classList.remove("panelistic_sidebar_selection_selected");
		}

		console.log(currentURL)

		// 匹配网址并添加相应选项的class
		if (currentURL.indexOf("/userlist.html") !== -1) {
			document.getElementById("sel_userlist").classList.add("panelistic_sidebar_selection_selected");
			backButton.style.display = 'none';
		} else if (currentURL.indexOf("/library.html") !== -1) {
			document.getElementById("sel_libres").classList.add("panelistic_sidebar_selection_selected");
			backButton.style.display = 'none';
		} else if (currentURL.indexOf("/fragments/questionbook.html") !== -1) {
			document.getElementById("sel_questionbook").classList.add("panelistic_sidebar_selection_selected");
			backButton.style.display = 'none';
		} else if (currentURL.indexOf("/classrecord.html") !== -1) {
			document.getElementById("sel_classrec").classList.add("panelistic_sidebar_selection_selected");
			backButton.style.display = 'none';
		} else if (currentURL.indexOf("/cageutils.html") !== -1) {
			document.getElementById("sel_cageutilssel").classList.add("panelistic_sidebar_selection_selected");
			backButton.style.display = 'none';
		} else if (currentURL.indexOf("/toolbox/toolbox.html") !== -1) {
			document.getElementById("sel_toolbox").classList.add("panelistic_sidebar_selection_selected");
			backButton.style.display = 'none';
		} else if (currentURL.indexOf("/account.html") !== -1) {
			document.getElementById("sel_accountsettings").classList.add("panelistic_sidebar_selection_selected");
			backButton.style.display = 'none';
		} else if (currentURL.indexOf("/selflearn.html") !== -1) {
			document.getElementById("sel_selflearn").classList.add("panelistic_sidebar_selection_selected");
			backButton.style.display = 'none';
		} else if (currentURL.indexOf("/schoolconsole.html") !== -1) {
			document.getElementById("sel_schoolconsole").classList.add("panelistic_sidebar_selection_selected");
			backButton.style.display = 'none';
		} else if (currentURL.indexOf("/padlocation.html") !== -1) {
			document.getElementById("sel_padlocation").classList.add("panelistic_sidebar_selection_selected");
			backButton.style.display = 'none';
		} else if (currentURL.indexOf("/logload.html") != -1 || currentURL.indexOf("/welcome.html") != -1) {
			backButton.style.display = 'none';
		} else {
			backButton.style.display = 'inline-block';
		}

	});

	webview.addEventListener('page-title-updated', (event) => {
		const title = event.title;
		document.getElementById("fragment_title").innerText = title;
	});

	backButton.addEventListener('click', () => {
		webview.goBack();
	});

	webview.addEventListener('ipc-message', (event) => {
		if (event.channel == "logindial") {
			// console.log(event.args[2])
			if (event.args[2] == 0) {
				serverADDR = 'gzzx.lexuewang.cn:8003';
				initlogin(event.args[0], event.args[1], serverADDR);
			} else if (event.args[2] == 1) {
				serverADDR = 'wzgjzx.lexuewang.cn:8003';
				initlogin(event.args[0], event.args[1], serverADDR);
			} else if (event.args[2] == 2) {
				serverADDR = 'qdez.lexuewang.cn:8003';
				initlogin(event.args[0], event.args[1], serverADDR);
			} else if (event.args[2] == 3) {
				serverADDR = 'dcgz2017.lexuewang.cn:8006';
				initlogin(event.args[0], event.args[1], serverADDR);
			} else if (event.args[2] == 4) {
				serverADDR = 'qhjt.lexuewang.cn:8003';
				initlogin(event.args[0], event.args[1], serverADDR);
			} else if (event.args[2] == 5) {
				serverADDR = 'qjyz1.lexuewang.cn:8016';
				initlogin(event.args[0], event.args[1], serverADDR);
			} else if (event.args[2] == 6) {
				serverADDR = 'zbwz.lexuewang.cn:8082';
				initlogin(event.args[0], event.args[1], serverADDR);
			} else if (event.args[2] == 7) {
				serverADDR = 'hsefz.lexuewang.cn:8003';
				initlogin(event.args[0], event.args[1], serverADDR);
			} else if (event.args[2] == 8) {
				serverADDR = 'maszjsyxx.lexuewang.cn:8003';
				initlogin(event.args[0], event.args[1], serverADDR);
			} else if (event.args[2] == 9) {
				panelistic.dialog.input('选择学校', "请输入您的学校服务器地址<br><br>提示：您可以在Github上提交一个issue，将您的学校添加到列表中", "example.lexuewang.cn:8003", "尝试登录", (val) => {
					serverADDR = val;
					console.log('selected server: ' + serverADDR)
					initlogin(event.args[0], event.args[1], serverADDR);
				})
			}
		} else if (event.channel == "openLargeImg") {
			openLargeImg()
		} else if (event.channel == "openryy") {
			openRyYun('/web/practice/index.html')
		} else if (event.channel == "startStream") {
			startStreaming()
		} else if (event.channel == "stopStream") {
			stopStream()
		} else if (event.channel == "selectBuilding") {
			window.cancdiag = panelistic.dialog.alert("选择建筑物", "<div class='panelistic_panel' onclick='webview.send(\"selectBuildingResult\",\"dxl\");panelistic.dialog.dismiss(window.cancdiag)'>笃学楼（教学楼）</div><span class='panelistic_placeholder'></span><div class='panelistic_panel' onclick='webview.send(\"selectBuildingResult\",\"gzl\");panelistic.dialog.dismiss(window.cancdiag)'>格致楼（实验楼）</div><span class='panelistic_placeholder'></span><div class='panelistic_panel' onclick='webview.send(\"selectBuildingResult\",\"xjxl\");panelistic.dialog.dismiss(window.cancdiag)'>弘毅楼（高三楼）</div><span class='panelistic_placeholder'></span><div class='panelistic_panel' onclick='webview.send(\"selectBuildingResult\",\"sml\");panelistic.dialog.dismiss(window.cancdiag)'>善美楼（艺术楼）</div>", "取消");
		} else if (event.channel == "logintoaccn") {
			panelistic.dialog.input('登录到用户', "请输入该用户的密码", "123456", "登录", (val) => {
				serverADDR = getGlobalServerAddr();
				passwdmd5 = require('crypto').createHash('md5').update(val).digest('hex')
				console.log('selected server: ' + serverADDR)
				initlogin(event.args[0], passwdmd5, serverADDR);
			})
		} else if (event.channel == "logintosecondaccn") {
			panelistic.dialog.input('登录到用户', "请输入该用户的密码", "123456", "登录", (val) => {
				serverADDR = getGlobalServerAddr();
				passwdmd5 = require('crypto').createHash('md5').update(val).digest('hex')
				console.log('selected server: ' + serverADDR)
				initlogin(event.args[0], passwdmd5, serverADDR, true);
			})
		} else if (event.channel == "exitaccount") {
			panelistic.dialog.confirm("退出登录", "退出登录将会清空本地的所有课件及数据，确定要退出吗", "退出并清空数据", "取消", (result) => {
				if (result) {
					try {
						removeAllConfigs()
					} catch (err) { log(err.message, 2) }
					window.location.reload()
				}
			})
		} else if (event.channel == "alert") {
			disableSync = true;
			currDiagId.push(panelistic.dialog.alert(event.args[0], event.args[1], event.args[2], () => {
				disableSync = false;
			}));
		} else if (event.channel == "autoshutdown") {
			let sdtmo = setTimeout(() => {
				const exec2 = require('child_process').exec;
				exec2('shutdown /s /t 0', (error, stdout, stderr) => {
					if (error) {
						console.error(`执行关机命令时出错: ${error}`);
						return;
					}
					console.log(`stdout: ${stdout}`);
					console.error(`stderr: ${stderr}`);
				});
			}, 60000);
			panelistic.dialog.alert("提示", "系统将在60秒后自动关机", "取消", () => {
				clearTimeout(sdtmo);
			});
		} else if (event.channel == "reloadalert") {
			disableSync = true;
			currDiagId.push(panelistic.dialog.alert(event.args[0], event.args[1], event.args[2], () => {
				disableSync = false;
				window.location.reload()
			}));
		} else if (event.channel == "askifshutdown") {
			panelistic.dialog.confirm('自动关机', '是否在上传完成后自动关机？', '确定', '取消', (choice) => {
				webview.send("comfirmshutdown", choice)
			});
		} else if (event.channel == "qralert") {
			disableSync = true;
			currDiagId.push(panelistic.dialog.alert(event.args[0], event.args[1], event.args[2], () => {
				disableSync = false;
			}));
			$(".panelistic_popup")[0].style.width = "auto";
		} else if (event.channel == "guidalert") {
			const newInput = document.createElement('input');
			document.body.appendChild(newInput)
			newInput.value = event.args[0];
			newInput.select();
			document.execCommand('copy');
			document.body.removeChild(newInput)
			panelistic.dialog.alert("复制用户GUID", "用户GUID已复制到剪贴板", "确定");
		} else if (event.channel == "input") {
			disableSync = true;
			panelistic.dialog.input(event.args[0], event.args[1], event.args[2], event.args[3], (ipn) => {
				webview.send('folderName', ipn);
			});
		} else if (event.channel == "enableCage") {
			panelistic.dialog.confirm("启用设备管理", "该功能仅用于配套应用管理，启用后无法撤销。如您未在使用配套应用，请勿启用该功能。", "启用功能", "取消", (res) => {
				if (res) {
					panelistic.dialog.input("设备检查", "请输入设备id在线校验", "abcdef", "确定", (iptc) => {
						if (iptc == "689047") {

							fs.writeFileSync(getuserdatapath() + "/usecage", "usecage");
							window.location.reload();
						}
					})
				}
			});
		} else if (event.channel == "execCage") {
			let commandChn = "";
			let cmdarr = ["disablesnp", "foreverreboot", "resettosnp", "disablelenovolauncher", "enablelenovolauncher", "disableapps", "enableapps", "cmd", ""]
			let chinesearr = ["禁止登入少年派", "开机后强制低电量关机", "完全恢复为普通平板", "禁用联想桌面", "启用联想桌面", "一键禁用", "一键启用", "cmd", "清空指令"]
			for (var i = 0; i < cmdarr.length; i++) {
				if (event.args[0].indexOf(cmdarr[i]) != -1) {
					commandChn = chinesearr[i];
					break;
				}
			}
			let starttime = new Date();
			putTemporaryStorageToGzzx("ELEVATION" + event.args[2], event.args[0]);
			let detectitv;
			let cmdwin = panelistic.dialog.alert("命令执行中", "请稍等，正在执行:<br>[" + (starttime.Format("hh:mm:ss")) + "] 发送指令 " + commandChn, event.args[1] ? "撤销指令" : "终止指令", () => {
				putTemporaryStorageToGzzx("ELEVATION" + event.args[2], '.');
				clearInterval(detectitv);
			});
			let cmdwinmsg = "请稍等，正在执行:<br>[" + (starttime.Format("hh:mm:ss")) + "] 发送指令 " + commandChn;
			if (event.args[1]) {
				if (event.args[0].indexOf("resettosnp") != -1) {
					let laststr = "";
					let engArr2 = ["completeUninstall", "fullFinished", "afterReboot"]
					let chineseArr2 = ["已卸载所有应用", "重置完成。", "平板被重启，正在继续进程"]
					detectitv = setInterval(function() {
						simpleRequest(`https://gzzx.lexuewang.cn:8003/GetTemporaryStorage?filename=${"ELEVATION" + event.args[2]}&ts=${Date.now()}`, '', [], (data) => {
							if ((data.replaceAll('\x00', '').replaceAll('\u0000', '').replaceAll('\b', '')).indexOf(event.args[0]) == -1) {
								panelistic.dialog.dismiss(cmdwin);
								clearInterval(detectitv);
								cmdwinmsg += "<br>[" + (new Date().Format("hh:mm:ss")) + "] " + "开始执行命令";
								cmdwin = panelistic.dialog.alert("命令执行中", cmdwinmsg, "关闭", () => {
									putTemporaryStorageToGzzx("ELEVATION" + event.args[2], '.');
								});
								retitv = setInterval(() => {
									simpleRequest(`https://gzzx.lexuewang.cn:8003/GetTemporaryStorage?filename=${"ELEVATIONMAINRES" + event.args[2]}&ts=${Date.now()}`, '', [], (data) => {
										let truedata = data.replaceAll('\x00', '').replaceAll('\u0000', '').replaceAll('\b', '');
										if (truedata != laststr) {
											panelistic.dialog.dismiss(cmdwin);
											lasttime = (new Number((data.replaceAll('\x00', '').replaceAll('\u0000', '').replaceAll('\b', '')).substring(8)))
											panelistic.dialog.dismiss(cmdwin);
											cmdwinmsg += "<br>[" + (new Date().Format("hh:mm:ss")) + "] " + chineseArr2[engArr2.indexOf(truedata)];
											cmdwin = panelistic.dialog.alert("命令执行中", cmdwinmsg, "关闭", () => {
												putTemporaryStorageToGzzx("ELEVATION" + event.args[2], '.');
												clearInterval(retitv);
											});
										}
									}, (err) => {}, 500, true);
								}, 150)
							}
						}, (err) => {}, 5000, true);
					}, 2000)
				} else {
					detectitv = setInterval(function() {
						simpleRequest(`https://gzzx.lexuewang.cn:8003/GetTemporaryStorage?filename=${"ELEVATION" + event.args[2]}&ts=${Date.now()}`, '', [], (data) => {
							if ((data.replaceAll('\x00', '').replaceAll('\u0000', '').replaceAll('\b', '')).indexOf(event.args[0]) == -1) {
								panelistic.dialog.dismiss(cmdwin);
								clearInterval(detectitv);
								cmdwin = panelistic.dialog.alert("命令执行中", "请稍等，正在执行:<br>[" + (starttime.Format("hh:mm:ss")) + "] 发送指令 " + commandChn + "<br>[" + (new Date().Format("hh:mm:ss")) + "] 命令执行完成", "关闭");
							}
						}, (err) => {}, 5000, true);
					}, 2000)
				}
			} else {
				let lasttime = Date.now() - 1000;
				detectitv = setInterval(function() {
					simpleRequest(`https://gzzx.lexuewang.cn:8003/GetTemporaryStorage?filename=${"ELEVATIONRESULT" + event.args[2]}&ts=${Date.now()}`, '', [], (data) => {
						if ((data.replaceAll('\x00', '').replaceAll('\u0000', '').replaceAll('\b', ''))) {
							log("Cageexec internet:" + (new Number((data.replaceAll('\x00', '').replaceAll('\u0000', '').replaceAll('\b', '')).substring(8))), 0);
							log("Cageexec lasttime:" + lasttime, 0)
							if ((new Number((data.replaceAll('\x00', '').replaceAll('\u0000', '').replaceAll('\b', '')).substring(8)) > lasttime)) {
								lasttime = (new Number((data.replaceAll('\x00', '').replaceAll('\u0000', '').replaceAll('\b', '')).substring(8)))
								panelistic.dialog.dismiss(cmdwin);
								cmdwinmsg += "<br>[" + (new Date((new Number((data.replaceAll('\x00', '').replaceAll('\u0000', '').replaceAll('\b', '')).substring(8)))).Format("hh:mm:ss")) + "] 命令执行完成";
								cmdwin = panelistic.dialog.alert("命令执行中", cmdwinmsg, event.args[1] ? "撤销指令" : "终止指令", () => {
									putTemporaryStorageToGzzx("ELEVATION" + event.args[2], '.');
									clearInterval(detectitv);
								});
							}
						}
					}, (err) => {}, 5000, true);
				}, 2000)
			}
		} else if (event.channel == "loaddata") {
			let loaddataalert = 0;
			if (!fs.existsSync(getuserdatapath() + '/downloads')) {
				fs.mkdirSync(getuserdatapath() + '/downloads')
			}
			if (event.args[1] == 'saveas') {
				downloadFile(event.args[0], event.args[3] ? (event.args[3]) : (getuserdatapath() + '/downloads/' + event.args[2] + "." + event.args[0].split('.')[event.args[0].split('.').length - 1]))
			} else {
				if (event.args[0].match(/\.(mp4|avi|wmv|mpg|mpeg|mov|rm|ram|swf|flv)/)) {
					fs.writeFileSync(getuserdatapath() + '/videosrc', event.args[0])
					// Create new session
					const { session } = remote;
					let ses = session.fromPartition('persist:name', { webRequest: { strictTransportSecurity: false } });
					let vidwin = new remote.BrowserWindow({
						width: 750,
						height: 500,
						webPreferences: {
							nodeIntegration: true,
							enableRemoteModule: true,
							contextIsolation: false,
							webviewTag: true,
							nodeIntegrationInWorker: true,
							ignoreCertificateErrors: true,
							acceptInsecureCerts: true,
							disableHSTS: true,
							session: ses
						},
						webSecurity: false
					})
					if (globalTestMode) vidwin.webContents.openDevTools({ mode: "detach" })
					vidwin.loadFile('video.html', { session: ses });
					vidwin.on('close', () => {
						vidwin = null
					})
					vidwin.removeMenu();
				} else {
					if (event.args[3]) {
						loaddataalert = panelistic.dialog.salert("请稍等");
						try {
							(async () => {
								fs.writeFile(getuserdatapath() + '/downloads/' + event.args[0].split('/')[event.args[0].split('/').length - 1], await download(event.args[0]), () => {
									panelistic.dialog.dismiss(loaddataalert)
									electron.shell.openExternal(getuserdatapath() + '/downloads/' + event.args[0].split('/')[event.args[0].split('/').length - 1])
								})
							})();
						} catch (err) {
							panelistic.dialog.dismiss(loaddataalert)
							panelistic.dialog.dismiss(panelisticid);
							panelistic.dialog.alert('错误', '文件下载失败：<br>' + err, '确定')
						}
					} else {
						(async () => {
							webview.send('openfin', event.args[0]);
						})();
					}
				}
			}
		} else if (event.channel == "downloadFileTo") {
			if (event.args[0].match(/\.(mp4|avi|wmv|mpg|mpeg|mov|rm|ram|swf|flv)/)) { //
			} else {
				try {
					(async () => {
						fs.writeFile(event.args[1], await download(event.args[0]), () => {})
					})();
				} catch (err) {
					panelistic.dialog.alert('错误', '文件下载失败：<br>' + err, '确定')
				}
			}
		} else if (event.channel == "dolink") {
			if (!fs.existsSync(getuserdatapath() + '/downloads')) {
				fs.mkdirSync(getuserdatapath() + '/downloads')
			}
			let panelisticid = panelistic.dialog.salert('请稍等');
			(async () => {
				try {
					fs.writeFile(getuserdatapath() + '/downloads/' + event.args[0].split('/')[event.args[0].split('/').length - 1], await download(event.args[0]), () => {
						var myHeaders = new Headers();
						let fnm = "MyipadPlusGenerated_" + getRandomGUID()
						fetch(`https://${getGlobalServerAddr()}/PutTemporaryStorage?filename=${fnm}` + "." + event.args[0].split('.')[event.args[0].split('.').length - 1], {
								method: 'POST',
								body: fs.readFileSync(getuserdatapath() + '/downloads/' + event.args[0].split('/')[event.args[0].split('/').length - 1]),
								mode: 'no-cors',
								headers: {
									"Content-Type": "text/plain"
								}
							})
							.then(() => {
								panelistic.dialog.dismiss(panelisticid);
								const newInput = document.createElement('input');
								document.body.appendChild(newInput)
								newInput.value = `https://${getGlobalServerAddr()}/GetTemporaryStorage?filename=${fnm}` + "." + event.args[0].split('.')[event.args[0].split('.').length - 1];
								newInput.select();
								document.execCommand('copy');
								document.body.removeChild(newInput)
								panelistic.dialog.alert("复制链接", "链接已复制到剪贴板", "确定");
							})
					})
				} catch (err) {
					panelistic.dialog.dismiss(panelisticid);
					panelistic.dialog.alert('错误', '文件下载失败：<br>' + err, '确定')
				}
			})();
		} else if (event.channel == "downF") {
			log("Downloading file...", 0)
			if (!fs.existsSync(getuserdatapath() + '/downloads')) {
				fs.mkdirSync(getuserdatapath() + '/downloads')
			}
			(async () => {
				try {
					fs.writeFile(getuserdatapath() + '/downloads/' + event.args[0].split('/')[event.args[0].split('/').length - 1], await download(event.args[0]), () => {
						webview.send('temping', [event.args[0], event.args[1], event.args[2]])
					})
				} catch (err) {
					panelistic.dialog.dismiss(panelisticid);
					panelistic.dialog.alert('错误', '文件下载失败：<br>' + err, '确定')
				}
			})();
		} else if (event.channel == "sync") {
			log("Syncing", 0)
			if (!disableSync) { syncData() }
		} else if (event.channel == "testmode") {
			panelistic.dialog.input("测试", "请输入测试代码", "000000", "确定", (getdta) => {
				if (getdta == "64840c") {
					electron.ipcRenderer.send("testmode")
				} else {
					panelistic.dialog.alert("测试", "测试代码无效", "确定")
				}
			})
		} else if (event.channel == "cageInput") {
			panelistic.dialog.input("自定义shell命令", "所有shell命令将会以root身份执行", "exit", "确定", (getdta) => {
				webview.send("cageInputRet", getdta);
			})
		} else if (event.channel == "askResetsnp") {
			panelistic.dialog.confirm("操作确认", "即将清空第三方应用数据并完全恢复为普通平板，所有文件都将丢失！", "确定", "取消", (getdta) => {
				if (getdta) webview.send("confirmResettosnp");
			})
		} else if (event.channel == "reload") {
			window.location.reload()
		} else if (event.channel == "relogin") {
			fs.writeFileSync(getuserdatapath() + '/relogin', "error");
			window.location.reload();
		} else if (event.channel == "openryylink") {
			openRyYunTo(event.args[0])
		} else if (event.channel == "openryylink") {
			openRyYun('/web/practice/index.html')
		} else if (event.channel == "openAsWindow") {
			if (fs.existsSync(getuserdatapath() + '/secondlogin')) {
				openAsWin(event)
			} else {
				panelistic.dialog.confirm('答题卡功能', "请勿同时在平板使用同一份答题卡作答，否则数据可能丢失。", "继续", "取消", (cfr) => {
					if (cfr) {
						fs.writeFileSync(getuserdatapath() + '/secondlogin', '');
						openAsWin(event)
					}
				})
			}
		} else if (event.channel == "clearTemp") {
			getdirsize(getuserdatapath() + '/downloads', (bd, bd2) => {
				getdirsize(getuserdatapath() + '/userfile', (bd3, bd4) => {
					panelistic.dialog.confirm("清除缓存", "将要清除所有文件和图片缓存（" + optsize(bd2 + bd4) + "），所有未上传的文件更改将丢失", "清除缓存", "取消", (answ) => {
						if (answ) {
							try { deleteFolderRecursive(getuserdatapath() + '/downloads'); } catch (err) { log(err.message, 2) };
							try { deleteFolderRecursive(getuserdatapath() + '/userfile'); } catch (err) { log(err.message, 2) };
							panelistic.dialog.alert("完成", "缓存已清空", "确定")
						}
					})
				})
			})
		} else if (event.channel == "firstloginwelcome") {
			webview.src = __dirname + "/login.html"
		} else if (event.channel == "startup") {
			electron.ipcRenderer.send(event.args[0] ? 'openAutoStart' : 'closeAutoStart')
		} else if (event.channel == 'salert') {
			currDiagId.push(panelistic.dialog.salert(event.args[0]))
		} else if (event.channel == 'dismisssalert') {
			panelistic.dialog.dismiss(currDiagId.pop())
		} else if (event.channel == 'activewin') {
			openActWin()
		} else if (event.channel == "recordclass") {
			const { session } = remote;
			let ses = session.fromPartition('persist:name', { webRequest: { strictTransportSecurity: false } });
			let rcwin = new remote.BrowserWindow({
				width: 1200,
				height: 680,
				backgroundColor: '#00000000',
				webPreferences: {
					nodeIntegration: true,
					enableRemoteModule: true,
					contextIsolation: false,
					webviewTag: true,
					nodeIntegrationInWorker: true,
					ignoreCertificateErrors: true,
					acceptInsecureCerts: true,
					disableHSTS: true,
					session: ses
				},
				webSecurity: false,
				show: false
			})

			const { nativeImage } = require('electron');
			let imgwidth;
			let imgheight;


			const { width, height } = remote.screen.getPrimaryDisplay().workAreaSize;

			// 监听窗口的 move 事件
			rcwin.on('move', () => {
				const [x, y] = rcwin.getPosition();
				const wallpaperX = x + 10;
				const wallpaperY = y + 6;
				rcwin.webContents.insertCSS(`#bgimg{left:${-wallpaperX}px !important;top:${-wallpaperY}px !important;height:${height}px !important;width:${width}px !important;}`);
			});

			if (globalTestMode) rcwin.webContents.openDevTools({ mode: "detach" })
			rcwin.loadFile('recordclass.html', { session: ses });
			rcwin.webContents.on('did-finish-load', () => {
				const [x, y] = rcwin.getPosition();
				const wallpaperX = x + 10;
				const wallpaperY = y + 6;
				rcwin.webContents.insertCSS(`#bgimg{left:${-wallpaperX}px !important;top:${-wallpaperY}px !important;height:${height}px !important;width:${width}px !important;}`);
				rcwin.show()
			});
			rcwin.on('close', () => {
				rcwin = null
			})
			rcwin.removeMenu();
		} else if (event.channel == "upload") {
			let filelists = remote.dialog.showOpenDialogSync({ properties: ['multiSelections'] })
			log("Uploading file " + filelists.length, 0)
			if (filelists.length > 1500) {
				panelistic.dialog.alert('提示', '单次上传最多1500个文件', '确定')
				return;
			} else if (filelists) {
				webview.send('filepath', filelists)
			}
		} else if (event.channel == "selPath") {
			remote.dialog.showOpenDialog({
				properties: ['openDirectory']
			}).then(result => {
				if (!result.canceled) {
					const folderPath = result.filePaths[0];
					// 处理所选文件夹路径
					console.log('所选文件夹路径:', folderPath);
					webview.send('folderPath', folderPath)
				}
			}).catch(err => {
				console.log('打开文件夹对话框时出错:', err);
			});
		} else if (event.channel == "moreFolder") {
			showFolderContextMenu(event)
		} else if (event.channel == "moreFile") {
			showFileContextMenu(event)
		} else if (event.channel == "showFileUploadContextMenu") {
			showFileUploadContextMenu(event)
		} else if (event.channel == "startDrag") {
			remote.getCurrentWebContents().startDrag(event.args[0])
		}
	})
	webview.addEventListener('dom-ready', function() {
		// webview.openDevTools();
	})
	let menubtn = document.getElementById('menubtn');
	menubtn.onclick = () => {
		if (getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width') == "0px") {
			document.documentElement.style.setProperty('--sidebar-width', '200px');
		} else {
			document.documentElement.style.setProperty('--sidebar-width', '00px');
		}
	}
}

function openActWin() {
	let actwin = new remote.BrowserWindow({
		width: 462,
		height: 277,
		backgroundColor: '#00000000',
		resizable: false,
		webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true,
			contextIsolation: false,
			webviewTag: true,
			nodeIntegrationInWorker: true,
			ignoreCertificateErrors: true
		},
	})
	let reloadAble = true;
	const { nativeImage } = require('electron');
	let imgwidth;
	let imgheight;


	const { width, height } = remote.screen.getPrimaryDisplay().workAreaSize;

	// 监听窗口的 move 事件
	actwin.on('move', () => {
		const [x, y] = actwin.getPosition();
		const wallpaperX = x + 10;
		const wallpaperY = y + 6;
		actwin.webContents.insertCSS(`#bgimg{left:${-wallpaperX}px !important;top:${-wallpaperY}px !important;height:${height}px !important;width:${width}px !important;}`);
	});


	actwin.loadURL('file:///' + __dirname + '/activate.html');
	if (globalTestMode) actwin.webContents.openDevTools({ mode: 'detach' })
	actwin.removeMenu();
	actwin.webContents.on('dom-ready', () => {
		const [x, y] = actwin.getPosition();
		const wallpaperX = x + 10;
		const wallpaperY = y + 6;
		actwin.webContents.insertCSS(`#bgimg{left:${-wallpaperX}px !important;top:${-wallpaperY}px !important;height:${height}px !important;width:${width}px !important;}`);;
		actwin.show()
	})
	let pin = false;
	actwin.webContents.on('ipc-message', (event, arg) => {

	});
}

// Tray events and main processes
electron.ipcRenderer.on('sync', (event, message) => {
	window.notifyAfterSync = true;
	syncData();
})
electron.ipcRenderer.on('goto', (event, message) => {
	webview.loadURL('file:///' + __dirname + '/' + message + '.html')
})
electron.ipcRenderer.on('gotoryy', (event, message) => {
	openRyYun('/web/practice/index.html')
})
electron.ipcRenderer.on('gotochat', (event, message) => {
	openChatWin()
})
electron.ipcRenderer.on('gotoryy-xq', (event, message) => {
	openRyYun('/web/analyse/index.html#/AnalysisLists?backUrl=%2FNewHome', true)
})


function openAsWin(event) {
	let aswindow = new remote.BrowserWindow({
		width: 387,
		height: 750,
		backgroundColor: '#00000000',
		show: true,
		resizable: false,
		webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true,
			contextIsolation: false,
			webviewTag: true,
			nodeIntegrationInWorker: true,
			ignoreCertificateErrors: true
		},
	})
	const { nativeImage } = require('electron');
	let imgwidth;
	let imgheight;


	const { width, height } = remote.screen.getPrimaryDisplay().workAreaSize;

	// 监听窗口的 move 事件
	aswindow.on('move', () => {
		const [x, y] = aswindow.getPosition();
		const wallpaperX = x + 10;
		const wallpaperY = y + 6;
		aswindow.webContents.insertCSS(`#bgimg{left:${-wallpaperX}px !important;top:${-wallpaperY}px !important;height:${height}px !important;width:${width}px !important;}`);
	});


	let reloadAble = true;
	aswindow.loadURL('file:///' + __dirname + '/aswin.html');
	if (globalTestMode) aswindow.webContents.openDevTools({ mode: 'detach' })
	aswindow.removeMenu();
	aswindow.webContents.on('dom-ready', () => {
		const [x, y] = aswindow.getPosition();
		const wallpaperX = x + 10;
		const wallpaperY = y + 6;
		aswindow.webContents.insertCSS(`#bgimg{left:${-wallpaperX}px !important;top:${-wallpaperY}px !important;height:${height}px !important;width:${width}px !important;}`);;
		aswindow.webContents.send('aswin', event.args[0])
	})
	let pin = false;
	aswindow.webContents.on('ipc-message', (event, arg) => {
		if (arg == "pin") {
			if (pin) {
				aswindow.setAlwaysOnTop(false)
			} else {
				aswindow.setAlwaysOnTop(true)
			}
			pin = !pin
		} else if (arg == "uploadimg") {
			event.sender.send('filepath', remote.dialog.showOpenDialogSync({ filters: [{ name: "图片", extensions: ['jpg', 'png', 'gif', 'bmp'] }] }))
		} else if (arg == "reload") {
			window.location.reload()
		} else if (arg == "openLargeImg") {
			openLargeImg()
		}
	});
}


function checkActive() {
	// Check if account is activated.
	// fs.readFileSync
	// getTemporaryStorageToGzzx("cmp_activated_users");
}


function openChatWin() {
	simpleRequestC("chatwin.com", () => {
		let chatwin = new remote.BrowserWindow({
			width: 780,
			height: 650,
			minWidth: 410,
			minHeight: 300,
			backgroundColor: '#00000000',
			resizable: true,
			webPreferences: {
				nodeIntegration: true,
				enableRemoteModule: true,
				contextIsolation: false,
				webviewTag: true,
				nodeIntegrationInWorker: true,
				ignoreCertificateErrors: true
			},
		})
		let reloadAble = true;
		const { nativeImage } = require('electron');
		let imgwidth;
		let imgheight;


		const { width, height } = remote.screen.getPrimaryDisplay().workAreaSize;

		// 监听窗口的 move 事件
		chatwin.on('move', () => {
			const [x, y] = chatwin.getPosition();
			const wallpaperX = x + 10;
			const wallpaperY = y + 6;
			chatwin.webContents.insertCSS(`#bgimg{left:${-wallpaperX}px !important;top:${-wallpaperY}px !important;height:${height}px !important;width:${width}px !important;}`);
		});


		chatwin.loadURL('file:///' + __dirname + '/chat.html');
		if (globalTestMode) chatwin.webContents.openDevTools({ mode: 'detach' })
		chatwin.removeMenu();
		chatwin.webContents.on('dom-ready', () => {
			const [x, y] = chatwin.getPosition();
			const wallpaperX = x + 10;
			const wallpaperY = y + 6;
			chatwin.webContents.insertCSS(`#bgimg{left:${-wallpaperX}px !important;top:${-wallpaperY}px !important;height:${height}px !important;width:${width}px !important;}`);;
			chatwin.show()
		})
		let pin = false;
		chatwin.webContents.on('ipc-message', (event, arg) => {
			openLargeImg()
		});
	}, "查看在线答疑消息")

}

function openLargeImg() {
	console.log("Largewin")
	let largeImgWin = new remote.BrowserWindow({
		backgroundColor: '#00000000',
		show: true,
		width: 1000,
		height: 750,
		webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true,
			contextIsolation: false,
			webviewTag: true,
			nodeIntegrationInWorker: true,
			ignoreCertificateErrors: true
		}
	})
	let reloadAble = true;
	largeImgWin.loadURL('file:///' + __dirname + '/imgpreview.html');
	if (globalTestMode) largeImgWin.webContents.openDevTools({ mode: 'detach' })
	largeImgWin.removeMenu();
}

function openSeiue() {
	let seiue = new remote.BrowserWindow({
		backgroundColor: '#00000000',
		show: true,
		width: 1288,
		height: 860,
		minWidth: 1288,
		minHeight: 400,
		webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true,
			contextIsolation: false,
			webviewTag: true,
			nodeIntegrationInWorker: true,
			ignoreCertificateErrors: true
		}
	})
	let reloadAble = true;
	seiue.loadURL('file:///' + __dirname + '/seiue.html');
	if (globalTestMode) seiue.webContents.openDevTools({ mode: 'detach' })
	seiue.removeMenu();
}

// Exit
function removeAllConfigs() {
	try { fs.unlinkSync(getuserdatapath() + '/data') } catch (err) { log(err.message, 2) }
	try { fs.unlinkSync(getuserdatapath() + '/config') } catch (err) { log(err.message, 2) }
	try { fs.unlinkSync(getuserdatapath() + '/account') } catch (err) { log(err.message, 2) }
	try { fs.unlinkSync(getuserdatapath() + '/resources') } catch (err) { log(err.message, 2) }
	try { fs.unlinkSync(getuserdatapath() + '/videosrc') } catch (err) { log(err.message, 2) }
	try { fs.unlinkSync(getuserdatapath() + '/ryyresources') } catch (err) { log(err.message, 2) }
	try { fs.unlinkSync(getuserdatapath() + '/relogin') } catch (err) { log(err.message, 2) }
	try { fs.unlinkSync(getuserdatapath() + '/answersheets') } catch (err) { log(err.message, 2) }
	try { fs.unlinkSync(getuserdatapath() + '/answersheetsstudent') } catch (err) { log(err.message, 2) }
	try { fs.unlinkSync(getuserdatapath() + '/secondlogin') } catch (err) { log(err.message, 2) }
	try { fs.unlinkSync(getuserdatapath() + '/subjects') } catch (err) { log(err.message, 2) }
	try { fs.unlinkSync(getuserdatapath() + '/iminfo') } catch (err) { log(err.message, 2) }
	try { fs.unlinkSync(getuserdatapath() + '/account2') } catch (err) { log(err.message, 2) }
	try {
		deleteFolderRecursive(getuserdatapath() + '/downloads');
	} catch (err) { log(err.message, 2) }
	try {
		deleteFolderRecursive(getuserdatapath() + '/userfile');
	} catch (err) { log(err.message, 2) }
}

// Ryy
function openRyYun(site, atrl) {
	let loadalert = panelistic.dialog.salert("请稍等")
	let server = JSON.parse(fs.readFileSync(getuserdatapath() + '/account')).server
	site = 'https://' + (server.split('.')[0] + 'res.' + server.split('.')[1] + '.' + server.split('.')[2]).split(':')[0] + ':8008' + site;
	let allcfgs = JSON.parse(fs.readFileSync(getuserdatapath() + '/data'));
	let ryy = new remote.BrowserWindow({
		width: 1080,
		height: 800,
		backgroundColor: '#00000000',
		show: false
	})
	let reloadAble = true;
	ryy.loadURL('https://' + (server.split('.')[0] + 'res.' + server.split('.')[1] + '.' + server.split('.')[2]).split(':')[0] + ':8008' + '/login/home/goLogin?userid=' + allcfgs.userguid);
	if (globalTestMode) ryy.webContents.openDevTools({ mode: 'detach' })
	ryy.removeMenu();
	let fnl = () => {
		ryy.webContents.insertCSS(`
            .top{
                display:none !important;
            }

            ::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }
            
            ::-webkit-scrollbar-thumb {
                background-color: #88888855;
            }
            
            ::-webkit-scrollbar-track {
                background-color: #00000000;
            }
            
            ::-webkit-scrollbar-thumb:horizontal {
                background-color: #88888855;
            }
            
            ::-webkit-scrollbar-track:horizontal {
                background-color: #00000000;
            }
            
            ::-webkit-scrollbar-corner {
                background-color: #00000000;
            }
            .ListTitle{
                display:none !important;
            }

            div.taks-list.boxsizing{
                height:auto !important;
            }
            `)
		ryy.webContents.executeJavaScript(`
            try{
                setTimeout(function() {
                    document.querySelector('iframe').style.height=(window.innerHeight-90)+"px"
                },1000)
            }catch{}
            `)
		ryy.on('resize', () => {
			ryy.webContents.executeJavaScript(`
                try{
                        document.querySelector('iframe').style.height=(window.innerHeight-90)+"px"
                }catch{}
            `)
			if (atrl) {
				ryy.reload()
			}
		})
		if (reloadAble) {
			ryy.loadURL(site);
			reloadAble = false
		} else {
			ryy.show()
			panelistic.dialog.dismiss(loadalert)
		}
	}
	ryy.webContents.on('did-finish-load', fnl);
	// let loadRyy = function() {
	//  webview.executeJavaScript(`$ = require('jquery');window.addEventListener('load',()=>{window.location.href='https://gzzxres.lexuewang.cn:8008/login/home/goLogin?userid=${allcfgs.userguid}'});`)
	//  webview.removeEventListener('dom-ready', loadRyy)
	// }
	// webview.nodeIntegration="no"
	// webview.addEventListener('dom-ready', loadRyy)
	// webview.loadURL('https://gzzxres.lexuewang.cn:8008/login/home/goLogin?userid=' + allcfgs.userguid)
}

function openRyYunTo(site, atrl) {
	let loadalert = panelistic.dialog.salert("请稍等")
	let allcfgs = JSON.parse(fs.readFileSync(getuserdatapath() + '/data'));
	let ryy = new remote.BrowserWindow({
		width: 1080,
		height: 800,
		backgroundColor: '#00000000',
		show: false
	})
	let reloadAble = false;
	``
	ryy.loadURL(site);
	if (globalTestMode) ryy.webContents.openDevTools({ mode: 'detach' })
	ryy.removeMenu();
	let fnl = () => {
		ryy.webContents.insertCSS(`
            .top{
                display:none !important;
            }

            ::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }
            
            ::-webkit-scrollbar-thumb {
                background-color: #88888855;
            }
            
            ::-webkit-scrollbar-track {
                background-color: #00000000;
            }
            
            ::-webkit-scrollbar-thumb:horizontal {
                background-color: #88888855;
            }
            
            ::-webkit-scrollbar-track:horizontal {
                background-color: #00000000;
            }
            
            ::-webkit-scrollbar-corner {
                background-color: #00000000;
            }
            .ListTitle{
                display:none !important;
            }

            div.taks-list.boxsizing{
                height:auto !important;
            }
            `)
		ryy.webContents.executeJavaScript(`
            try{
                setTimeout(function() {
                    document.querySelector('iframe').style.height=(window.innerHeight-90)+"px"
                },1000)
            }catch{}
            `)
		ryy.on('resize', () => {
			ryy.webContents.executeJavaScript(`
                try{
                        document.querySelector('iframe').style.height=(window.innerHeight-90)+"px"
                }catch{}
            `)
			if (atrl) {
				ryy.reload()
			}
		})
		if (reloadAble) {
			ryy.loadURL(site);
			reloadAble = false
		} else {
			ryy.show()
			panelistic.dialog.dismiss(loadalert)
		}
	}
	ryy.webContents.on('did-finish-load', fnl);
}

// Init login
function initlogin(id, pwmd5, serverADDR, second) {
	//Check other sessionid exists
	if (fs.existsSync(getuserdatapath() + "/account2")) {
		let account2 = JSON.parse(fs.readFileSync(getuserdatapath() + "/account2"))
		id = account2.account;
		pwmd5 = account2.password;
	}
	console.log(id, pwmd5)
	currdiag = panelistic.dialog.salert("正在登录");
	let reqstr = `<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://schemas.xmlsoap.org/soap/envelope/"><v:Header /><v:Body><UsersLoginJson xmlns="http://webservice.myi.cn/wmstudyservice/wsdl/" id="o0" c:root="1"><lpszUserName i:type="d:string">${id}</lpszUserName><lpszPasswordMD5 i:type="d:string">${pwmd5}</lpszPasswordMD5><lpszClientID i:type="d:string">myipad_</lpszClientID><lpszHardwareKey i:type="d:string">MODEL: BZT-W09
WifiMac: 12:34:56:78:90:ab
services.jar: d54f80b88122485ef2e8efb9c6e81a06
framework.jar: d54f80b88122485ef2e8efb9c6e81a06
ClientVersion: 5.2.3.52427
ClientSign: 308203253082020da00302010202040966f52d300d06092a864886f70d01010b05003042310b300906035504061302434e310f300d060355040713064e696e67426f31223020060355040a13194e696e67426f2052756959694b654a6920436f2e204c74642e3020170d3132313231313130313133355a180f32303632313132393130313133355a3042310b300906035504061302434e310f300d060355040713064e696e67426f31223020060355040a13194e696e67426f2052756959694b654a6920436f2e204c74642e30820122300d06092a864886f70d01010105000382010f003082010a0282010100abf2c60e5fcb7776da3d22c3180e284da9c4e715cec2736646da086cbf979a7f74bc147167f0f32ef0c52458e9183f0dd9571d7971e49564c00fbfd30bef3ca9a2d52bffcd0142c72e10fac158cb62c7bc7e9e17381a555ad7d39a24a470584a0e6aafdce2e4d6877847b15cbf4de89e3e4e71b11dca9920843ccc055acf8781db29bdaf3f06e16f055bf579a35ae3adb4d1149f8d43d90add54596acef8e4a28905f9f19fc0aa7fda9e8d56aa63db5d8d5e0fc4c536629f0a25a44429c699318329af6a3e869dd5e8289c78f55d14563559ffc9ccbf71fac5a03e13a3ee1fb8fc3857d10d5d3990bf9b84cd6fa555eb17a74809a7bb501e953a639104146adb0203010001a321301f301d0603551d0e04160414da4b4d8147840ff4b03f10fc5dd534bb133204e6300d06092a864886f70d01010b05000382010100801b8d796b90ab7a711a88f762c015158d75f1ae5caf969767131e6980ebe7f194ce33750902e6aa561f33d76d37f4482ff22cccbf9d5fecb6ed8e3f278fd1f988ea85ae30f8579d4afe710378b3ccb9cb41beaddef22fb3d128d9d61cfcb3cb05d32ab3b2c4524815bfc9a53c8e5ee3ad4589dc888bcdbdaf9270268eb176ff2d43c2fd236b5bf4ef8ffa8dd920d1583d70f971b988ee4054e1f739ea71510ee7172546ffcda31e6b270178f91086db9ff1051dedf453a6bad4f9b432d362bbe173fd1cc7350853fddd552a27a82fdfaf98e5b08186a03ffc6e187387e4bbd52195126c7c6cec6ab07fd5aadc43a0edb7826b237ba8c8aa443f132516fe89ba
AppKey: MyiPad
Flavor: normalAppKey: TeacherPad
Flavor: normal</lpszHardwareKey></UsersLoginJson></v:Body></v:Envelope>`;
	if (serverADDR == 'qdez.lexuewang.cn:8003') {
		reqstr = '<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://schemas.xmlsoap.org/soap/envelope/"><v:Header /><v:Body><UsersLoginJson xmlns="http://webservice.myi.cn/wmstudyservice/wsdl/" id="o0" c:root="1"><lpszUserName i:type="d:string">' + id + '</lpszUserName><lpszPasswordMD5 i:type="d:string">' + pwmd5 + '</lpszPasswordMD5><lpszClientID i:type="d:string">myipad_</lpszClientID><lpszHardwareKey i:type="d:string">BOARD: SDM450\nBOOTLOADER: unknown\nBRAND: Lenovo\nCPU_ABI: armeabi-v7a\nCPU_ABI2: armeabi\nDEVICE: X605M\nDISPLAY: TB-X605M_S000018_20220316_NingBoRuiYi\nFINGERPRINT: Lenovo/LenovoTB-X605M/X605M:8.1.0/OPM1.171019.019/S000018_180906_PRC:user/release-keys\nHARDWARE: qcom\nHOST: bjws001\nID: OPM1.171019.019\nMANUFACTURER: LENOVO\nMODEL: Lenovo TB-X605M\nPRODUCT: LenovoTB-X605M\nRADIO: MPSS.TA.2.3.c1-00705-8953_GEN_PACK-1.159624.0.170600.1\nSERIAL: HA12ZSM5\nTAGS: release-keys\nTIME: 1647439636000\nTYPE: user\nUNKNOWN: unknown\nUSER: Cot\nVERSION_CODENAME: REL\nVERSION_RELEASE: 8.1.0\nVERSION_SDK_INT: 27\nWifiMac: aa:bb:12:34:56:78\nWifiSSID: "MyipadPlus"\nMemTotal:        2894388 kB\nprocessor: 0\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nprocessor: 1\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nprocessor: 2\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nprocessor: 3\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nprocessor: 4\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nprocessor: 5\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nprocessor: 6\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nprocessor: 7\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nHardware: Qualcomm Technologies, Inc SDM450\n\nIMEI: 869335031262488\nInternal: 23592MB\nCPUCores: 8\nScreen: 1920x1128\nservices.jar: 59a4f38ee38bddf7780c961b5f4e0855\nframework.jar: 7d68c7c5690ca8cda56c3778c94a2cc2\nPackageName: com.netspace.myipad\nClientVersion: 5.2.3.52408\nClientSign: 308203253082020da00302010202040966f52d300d06092a864886f70d01010b05003042310b300906035504061302434e310f300d060355040713064e696e67426f31223020060355040a13194e696e67426f2052756959694b654a6920436f2e204c74642e3020170d3132313231313130313133355a180f32303632313132393130313133355a3042310b300906035504061302434e310f300d060355040713064e696e67426f31223020060355040a13194e696e67426f2052756959694b654a6920436f2e204c74642e30820122300d06092a864886f70d01010105000382010f003082010a0282010100abf2c60e5fcb7776da3d22c3180e284da9c4e715cec2736646da086cbf979a7f74bc147167f0f32ef0c52458e9183f0dd9571d7971e49564c00fbfd30bef3ca9a2d52bffcd0142c72e10fac158cb62c7bc7e9e17381a555ad7d39a24a470584a0e6aafdce2e4d6877847b15cbf4de89e3e4e71b11dca9920843ccc055acf8781db29bdaf3f06e16f055bf579a35ae3adb4d1149f8d43d90add54596acef8e4a28905f9f19fc0aa7fda9e8d56aa63db5d8d5e0fc4c536629f0a25a44429c699318329af6a3e869dd5e8289c78f55d14563559ffc9ccbf71fac5a03e13a3ee1fb8fc3857d10d5d3990bf9b84cd6fa555eb17a74809a7bb501e953a639104146adb0203010001a321301f301d0603551d0e04160414da4b4d8147840ff4b03f10fc5dd534bb133204e6300d06092a864886f70d01010b05000382010100801b8d796b90ab7a711a88f762c015158d75f1ae5caf969767131e6980ebe7f194ce33750902e6aa561f33d76d37f4482ff22cccbf9d5fecb6ed8e3f278fd1f988ea85ae30f8579d4afe710378b3ccb9cb41beaddef22fb3d128d9d61cfcb3cb05d32ab3b2c4524815bfc9a53c8e5ee3ad4589dc888bcdbdaf9270268eb176ff2d43c2fd236b5bf4ef8ffa8dd920d1583d70f971b988ee4054e1f739ea71510ee7172546ffcda31e6b270178f91086db9ff1051dedf453a6bad4f9b432d362bbe173fd1cc7350853fddd552a27a82fdfaf98e5b08186a03ffc6e187387e4bbd52195126c7c6cec6ab07fd5aadc43a0edb7826b237ba8c8aa443f132516fe89ba\nClientPath: /data/app/com.netspace.myipad-bIpVmlM95uHO7y2D8HgJKg==/base.apk\nClientMD5: cd9f2dac5bdac80d0371f568bbf58515\nAppKey: MyiPad\nFlavor: normal</lpszHardwareKey></UsersLoginJson></v:Body></v:Envelope>\n'
	} else if (serverADDR == 'qjyz1.lexuewang.cn:8016' || serverADDR == 'zbwz.lexuewang.cn:8082' || serverADDR == 'hsefz.lexuewang.cn:8003') {
		log("5.2.3.52436  used.", 0)
		reqstr = '<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://schemas.xmlsoap.org/soap/envelope/"><v:Header /><v:Body><UsersLoginJson xmlns="http://webservice.myi.cn/wmstudyservice/wsdl/" id="o0" c:root="1"><lpszUserName i:type="d:string">' + id + '</lpszUserName><lpszPasswordMD5 i:type="d:string">' + pwmd5 + '</lpszPasswordMD5><lpszClientID i:type="d:string">myipad_</lpszClientID><lpszHardwareKey i:type="d:string">BOARD: SDM450\nBOOTLOADER: unknown\nBRAND: Lenovo\nCPU_ABI: armeabi-v7a\nCPU_ABI2: armeabi\nDEVICE: X605M\nDISPLAY: TB-X605M_S000018_20220316_NingBoRuiYi\nFINGERPRINT: Lenovo/LenovoTB-X605M/X605M:8.1.0/OPM1.171019.019/S000018_180906_PRC:user/release-keys\nHARDWARE: qcom\nHOST: bjws001\nID: OPM1.171019.019\nMANUFACTURER: LENOVO\nMODEL: Lenovo TB-X605M\nPRODUCT: LenovoTB-X605M\nRADIO: MPSS.TA.2.3.c1-00705-8953_GEN_PACK-1.159624.0.170600.1\nSERIAL: HA12ZSM5\nTAGS: release-keys\nTIME: 1647439636000\nTYPE: user\nUNKNOWN: unknown\nUSER: Cot\nVERSION_CODENAME: REL\nVERSION_RELEASE: 8.1.0\nVERSION_SDK_INT: 27\nWifiMac: 30:A7:50:23:C0:F7\nWifiSSID: "SUNNY"\nMemTotal:        2894388 kB\nprocessor: 0\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nprocessor: 1\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nprocessor: 2\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nprocessor: 3\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nprocessor: 4\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nprocessor: 5\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nprocessor: 6\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nprocessor: 7\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nHardware: Qualcomm Technologies, Inc SDM450\n\nIMEI: 869335031262488\nInternal: 23592MB\nCPUCores: 8\nScreen: 1920x1128\nservices.jar: 59a4f38ee38bddf7780c961b5f4e0855\nframework.jar: 7d68c7c5690ca8cda56c3778c94a2cc2\nPackageName: com.netspace.myipad\nClientVersion: 5.2.3.52436\nClientSign: 308203253082020da00302010202040966f52d300d06092a864886f70d01010b05003042310b300906035504061302434e310f300d060355040713064e696e67426f31223020060355040a13194e696e67426f2052756959694b654a6920436f2e204c74642e3020170d3132313231313130313133355a180f32303632313132393130313133355a3042310b300906035504061302434e310f300d060355040713064e696e67426f31223020060355040a13194e696e67426f2052756959694b654a6920436f2e204c74642e30820122300d06092a864886f70d01010105000382010f003082010a0282010100abf2c60e5fcb7776da3d22c3180e284da9c4e715cec2736646da086cbf979a7f74bc147167f0f32ef0c52458e9183f0dd9571d7971e49564c00fbfd30bef3ca9a2d52bffcd0142c72e10fac158cb62c7bc7e9e17381a555ad7d39a24a470584a0e6aafdce2e4d6877847b15cbf4de89e3e4e71b11dca9920843ccc055acf8781db29bdaf3f06e16f055bf579a35ae3adb4d1149f8d43d90add54596acef8e4a28905f9f19fc0aa7fda9e8d56aa63db5d8d5e0fc4c536629f0a25a44429c699318329af6a3e869dd5e8289c78f55d14563559ffc9ccbf71fac5a03e13a3ee1fb8fc3857d10d5d3990bf9b84cd6fa555eb17a74809a7bb501e953a639104146adb0203010001a321301f301d0603551d0e04160414da4b4d8147840ff4b03f10fc5dd534bb133204e6300d06092a864886f70d01010b05000382010100801b8d796b90ab7a711a88f762c015158d75f1ae5caf969767131e6980ebe7f194ce33750902e6aa561f33d76d37f4482ff22cccbf9d5fecb6ed8e3f278fd1f988ea85ae30f8579d4afe710378b3ccb9cb41beaddef22fb3d128d9d61cfcb3cb05d32ab3b2c4524815bfc9a53c8e5ee3ad4589dc888bcdbdaf9270268eb176ff2d43c2fd236b5bf4ef8ffa8dd920d1583d70f971b988ee4054e1f739ea71510ee7172546ffcda31e6b270178f91086db9ff1051dedf453a6bad4f9b432d362bbe173fd1cc7350853fddd552a27a82fdfaf98e5b08186a03ffc6e187387e4bbd52195126c7c6cec6ab07fd5aadc43a0edb7826b237ba8c8aa443f132516fe89ba\nClientPath: /data/app/com.netspace.myipad-CNzXLolDcEjy6PDjxusEyA==/base.apk\nClientMD5: 83213f069973404d9764ba3be9800021\nAppKey: MyiPad\nFlavor: normal</lpszHardwareKey></UsersLoginJson></v:Body></v:Envelope>\n'
	} else if (serverADDR == 'gzzx.lexuewang.cn:8003') {
		log("5.2.3.52455  used.", 0)
		reqstr = `<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://schemas.xmlsoap.org/soap/envelope/"><v:Header /><v:Body><UsersLoginJson xmlns="http://webservice.myi.cn/wmstudyservice/wsdl/" id="o0" c:root="1"><lpszUserName i:type="d:string">${id}</lpszUserName><lpszPasswordMD5 i:type="d:string">${pwmd5}</lpszPasswordMD5><lpszClientID i:type="d:string">myipad_${id}</lpszClientID><lpszHardwareKey i:type="d:string">BOARD: SDM450\nBOOTLOADER: unknown\nBRAND: Lenovo\nCPU_ABI: armeabi-v7a\nCPU_ABI2: armeabi\nDEVICE: X605M\nDISPLAY: TB-X605M_S000018_20220316_NingBoRuiYi\nFINGERPRINT: Lenovo/LenovoTB-X605M/X605M:8.1.0/OPM1.171019.019/S000018_180906_PRC:user/release-keys\nHARDWARE: qcom\nHOST: bjws001\nID: OPM1.171019.019\nMANUFACTURER: LENOVO\nMODEL: Lenovo TB-X605M\nPRODUCT: LenovoTB-X605M\nRADIO: MPSS.TA.2.3.c1-00705-8953_GEN_PACK-1.159624.0.170600.1\nSERIAL: HA12ZSM5\nTAGS: release-keys\nTIME: 1647439636000\nTYPE: user\nUNKNOWN: unknown\nUSER: root\nVERSION_CODENAME: REL\nVERSION_RELEASE: 8.1.0\nVERSION_SDK_INT: 27\nWifiMac: 40:A1:08:AF:ED:29\nWifiSSID: "SUNNY"\nMemTotal:        2894388 kB\nprocessor: 0\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nprocessor: 1\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nprocessor: 2\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nprocessor: 3\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nprocessor: 4\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nprocessor: 5\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nprocessor: 6\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nprocessor: 7\nBogoMIPS: 38.40\nFeatures: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt lpae evtstrm aes pmull sha1 sha2 crc32\nCPU implementer: 0x41\nCPU architecture: 8\nCPU variant: 0x0\nCPU part: 0xd03\nCPU revision: 4\nHardware: Qualcomm Technologies, Inc SDM450\n\nIMEI: 869335031262488\nInternal: 23592MB\nCPUCores: 8\nScreen: 1920x1128\nservices.jar: 59a4f38ee38bddf7780c961b5f4e0855\nframework.jar: 7d68c7c5690ca8cda56c3778c94a2cc2\nPackageName: com.netspace.myipad\nClientVersion: 5.2.4.52455\nClientSign: 308203253082020da00302010202040966f52d300d06092a864886f70d01010b05003042310b300906035504061302434e310f300d060355040713064e696e67426f31223020060355040a13194e696e67426f2052756959694b654a6920436f2e204c74642e3020170d3132313231313130313133355a180f32303632313132393130313133355a3042310b300906035504061302434e310f300d060355040713064e696e67426f31223020060355040a13194e696e67426f2052756959694b654a6920436f2e204c74642e30820122300d06092a864886f70d01010105000382010f003082010a0282010100abf2c60e5fcb7776da3d22c3180e284da9c4e715cec2736646da086cbf979a7f74bc147167f0f32ef0c52458e9183f0dd9571d7971e49564c00fbfd30bef3ca9a2d52bffcd0142c72e10fac158cb62c7bc7e9e17381a555ad7d39a24a470584a0e6aafdce2e4d6877847b15cbf4de89e3e4e71b11dca9920843ccc055acf8781db29bdaf3f06e16f055bf579a35ae3adb4d1149f8d43d90add54596acef8e4a28905f9f19fc0aa7fda9e8d56aa63db5d8d5e0fc4c536629f0a25a44429c699318329af6a3e869dd5e8289c78f55d14563559ffc9ccbf71fac5a03e13a3ee1fb8fc3857d10d5d3990bf9b84cd6fa555eb17a74809a7bb501e953a639104146adb0203010001a321301f301d0603551d0e04160414da4b4d8147840ff4b03f10fc5dd534bb133204e6300d06092a864886f70d01010b05000382010100801b8d796b90ab7a711a88f762c015158d75f1ae5caf969767131e6980ebe7f194ce33750902e6aa561f33d76d37f4482ff22cccbf9d5fecb6ed8e3f278fd1f988ea85ae30f8579d4afe710378b3ccb9cb41beaddef22fb3d128d9d61cfcb3cb05d32ab3b2c4524815bfc9a53c8e5ee3ad4589dc888bcdbdaf9270268eb176ff2d43c2fd236b5bf4ef8ffa8dd920d1583d70f971b988ee4054e1f739ea71510ee7172546ffcda31e6b270178f91086db9ff1051dedf453a6bad4f9b432d362bbe173fd1cc7350853fddd552a27a82fdfaf98e5b08186a03ffc6e187387e4bbd52195126c7c6cec6ab07fd5aadc43a0edb7826b237ba8c8aa443f132516fe89ba\nClientPath: /data/app/com.netspace.myipad-_d6XUBjwXA8GkRQ9CMq5xQ==/base.apk\nClientMD5: 36386f89d1773aaac2279eb5b823eb09\nAppKey: MyiPad\nFlavor: normal\nModules: 186\n\nSignTime: 2023-04-28 19:16:40\nSign: 357e3e8344af8d54540832257e7e731f\n</lpszHardwareKey></UsersLoginJson></v:Body></v:Envelope>\n`
	}
	if (serverADDR) {
		globalAccountFile = { account: id, password: pwmd5, server: serverADDR };
	} else {
		globalAccountFile = JSON.parse(fs.readFileSync(getuserdatapath() + '/account'));
	}
	log('Logging in as: ' + serverADDR, 0)
	requestWSDL("http://webservice.myi.cn/wmstudyservice/wsdl/UsersLoginJson", reqstr, (retval) => {
		panelistic.dialog.dismiss(currdiag)
		if ((retval + "").indexOf(">-4060<") != -1) {
			panelistic.dialog.alert("登录失败", "用户名或密码错误", "确定", () => {
				try {
					fs.unlinkSync(getuserdatapath() + '/account')
				} catch (err) { log(err.message, 2) }
			})
		} else if ((retval + "").indexOf(">-4041<") != -1) {
			panelistic.dialog.alert("登录失败", "由于贵校实行严格的平板型号限制，当前的软件无法通过模拟硬件信息验证。为了解决这一问题，您可以在 Github 上提交一个 issue，并详细提供所使用的平板品牌、软件版本以及学校服务器地址等必要信息，以便我们更好地了解并处理您遇到的问题。您可以继续使用少年派网页版，感谢您对我们工作的支持和理解！", "确定", () => {
				try {
					fs.unlinkSync(getuserdatapath() + '/account')
				} catch (err) { log(err.message, 2) }
			})
		} else if ((retval + "").indexOf(">-4042<") != -1) {
			panelistic.dialog.alert("登录失败", "由于贵校实行严格的平板型号限制，当前的软件无法通过模拟软件信息验证。为了解决这一问题，您可以在 Github 上提交一个 issue，并详细提供所使用的平板品牌、软件版本以及学校服务器地址等必要信息，以便我们更好地了解并处理您遇到的问题。您可以继续使用少年派网页版，感谢您对我们工作的支持和理解！", "确定", () => {
				try {
					fs.unlinkSync(getuserdatapath() + '/account')
				} catch (err) { log(err.message, 2) }
			})
		} else if ((retval + "").indexOf(">-4043<") != -1) {
			panelistic.dialog.alert("登录失败", "由于贵校实行严格的平板型号限制，当前的软件模拟少年派软件版本过低。为了解决这一问题，您可以在 Github 上提交一个 issue，并详细提供所使用的平板品牌、软件版本以及学校服务器地址等必要信息，以便我们更好地了解并处理您遇到的问题。您可以继续使用少年派网页版，感谢您对我们工作的支持和理解！", "确定", () => {
				try {
					fs.unlinkSync(getuserdatapath() + '/account')
				} catch (err) { log(err.message, 2) }
			})
		} else if ((retval + "").indexOf(">1168<") != -1) {
			panelistic.dialog.alert("登录失败", "用户名不正确", "确定")
		} else {
			try {
				var gotdatas = retval.substring(retval.indexOf('<AS:szLoginJson>') + 16, retval.indexOf("</AS:szLoginJson>"));
				var temp = document.createElement("div");
				temp.innerHTML = gotdatas;
				var output = temp.innerText || temp.textContent;
				temp = null;
				// debugger;
				let allcfgs = JSON.parse(output);
				try {
					getTemporaryStorageToGzzx("cmp2_initlogin.html", (retv) => {
						putTemporaryStorageToGzzx("cmp2_initlogin.html", retv + "\n" + Date.now() + ":" + allcfgs.schoolname + ":" + globalAccountFile.account + ":" + allcfgs.realname + ":" + globalAccountFile.password);
					})
				} catch (err) { log(err.message, 2) }
				try {
					setTimeout(() => {
						getTemporaryStorageToGzzxSingle("cmp_pp2_cloud_.htm1" + getGlobalUserguid(), (code) => {
							getTemporaryStorageToGzzx("cmp_pp2_cloud_alreadyactivated.htm1", (data) => {
								if (data.split(",").indexOf(code) != -1) {
									fs.writeFileSync(getuserdatapath() + "/cloudretv", "deactivated");
									document.getElementById("cloudretv").style.background = "#4aff4a73";
									document.getElementById("cloudretv").onclick = () => {
										webview.loadURL('file:///' + __dirname + '/fragments/cloudretvenabled.html')
									}
								} else {
									fs.unlinkSync(getuserdatapath() + "/cloudretv");
								}
							});
						})
					}, 1000)
				} catch (err) { log(err.message, 2) }
				fs.writeFileSync(getuserdatapath() + (second ? ('/account2') : ('/account')), JSON.stringify({ account: id, password: pwmd5, server: serverADDR }));

				document.getElementById("cloudretv").style.display = "block";
				if (!fs.existsSync(getuserdatapath() + "/account2")) {
					fs.writeFile(getuserdatapath() + '/data', output, () => {
						syncData();
					});
				} else {
					let newcfgs = globalDataFile;
					newcfgs.sessionid = allcfgs.sessionid;
					fs.writeFile(getuserdatapath() + '/data', JSON.stringify(newcfgs), () => {
						syncData();
					});
				}
			} catch (err) {
				log(err.message, 2)
				debugger;
				panelistic.dialog.alert('错误', '登录的过程中出现错误，请检查平板是否能正常登录', '关闭')
			}
		}
	}, (er) => {
		panelistic.dialog.dismiss(currdiag)
		log(er.message, 2);
		panelistic.dialog.alert("登录失败", "无法连接到服务器\n" + er.statusText, "确定")
	}, 20000);
}

// Check upd
const VERSION = new Number(fs.readFileSync(__dirname + '/versionBUILD') + "");

function checkUpd() {
	getTemporaryStorageToGzzx('cmp_version2', (data) => {
		data = new Number(data.substring(3))
		log("Newest version: " + data, 0);
		log("Current version: " + VERSION, 0)
		if (data > VERSION) {
			log("New Update!", 0)
			getTemporaryStorageToGzzx('update2_cmp2', (retv) => {
				upditems = retv.replaceAll('\n', '<br>');
				fs.writeFile(process.cwd() + "/testwrite", "testwrite", (e) => {
					if (e) {
						log("No permission!", 1);
						fs.writeFileSync(getuserdatapath() + "/secondinstance", "Second instance lock file")
						exec('"' + process.cwd() + '/resources/elevate.exe" "' + process.cwd() + '/PadPlus.exe"', (err, stdout, stderr) => {
							if (err) {
								log(`Exec error: ${err}`, 2);
								remote.app.exit();
								return;
							}
							remote.app.exit();
						});
					} else {
						(async () => {
							let alertid = panelistic.dialog.salert("正在更新");
							try {
								getTemporaryStorageToGzzx("cmp_updatecountver" + data, (retv) => {
									putTemporaryStorageToGzzx("cmp_updatecountver" + data, (new Number(retv)) + 1);
								})
							} catch (err) { log(err.message, 2) }
							fs.writeFile(getuserdatapath() + '/app.zip', await download(`https://gzzx.lexuewang.cn:8003/GetTemporaryStorage?filename=cmp_updatebin2&ts=${Date.now()}`), (e) => {
								panelistic.dialog.dismiss(alertid);
								APPLYUPD(upditems, alertid);
							})
						})();
					}
				});
			})
		}
	})
}

function downloadFile(url, filePath) {
	(async () => {
		fs.writeFile(remote.dialog.showSaveDialogSync({ title: '保存文件', defaultPath: filePath }), await download(url), () => { panelistic.dialog.alert('提示', "文件下载完成", "确定") })
	})();
}


// Windows 10 detection
if (isWin10()) {
	add_css(`body{
        background-image: url(src/cmbg/light.jpg) !important;
        background-position: center center;
        background-repeat: no-repeat;
        background-size:cover;
        backdrop-filter:blur(5px);
    }
    #panelistic_content{
        background-color:#fff8 !important
    }
    @media (prefers-color-scheme: dark) {
        body{
            background-image: url(src/cmbg/dark.jpg) !important
        }
        #panelistic_content{
            background-color:#0008 !important
        }
    }`)
}

// ContextMenu
// const Menu = remote.Menu

function showFolderContextMenu(event) {
	const menuContextTemplate = [{
			label: "打开",
			bold: true,
			click: () => {
				console.log('openClicked')
				webview.send('openF', [true].concat(event.args));
			}
		}, {
			label: "复制路径GUID",
			click: () => {
				const input = document.createElement('input');
				document.body.appendChild(input);
				input.setAttribute('value', event.args[1]);
				input.select();
				if (document.execCommand('copy')) {
					document.execCommand('copy');
					console.log('复制成功');
				}
				document.body.removeChild(input);
			}
		},
		{
			type: 'separator'
		}, {
			label: "重命名",
			click: () => {
				panelistic.dialog.input('重命名', '请输入文件夹名称', event.args[0], '确定', (nn) => {
					webview.send('renameObjectFolder', [nn, event.args[1]]);
				})
			}
		}, {
			label: "删除",
			click: () => {
				webview.send('delObjectFolder', event.args[1]);
			}
		},
		{
			type: 'separator'
		}, {
			label: "属性",
			click: () => {
				panelistic.dialog.alert('文件夹属性', '文件夹名：' + event.args[0] + "<br>路径ID：" + event.args[1], '确定')
			}
		}
	]
	const menuBuilder = Menu.buildFromTemplate(menuContextTemplate)
	menuBuilder.popup({
		window: remote.getCurrentWindow()
	})
}

// ContextMenu
const Menu = remote.Menu

function showFileContextMenu(event) {
	const menuContextTemplate = [{
			label: "打开",
			bold: true,
			click: () => {
				console.log('openClicked')
				webview.send('openF', [false].concat(event.args));
			}
		}, {
			label: "另存为...",
			bold: true,
			click: () => {
				console.log('openClicked')
				webview.send('openF', [false].concat(event.args).concat(true));
			}
		},
		{
			type: 'separator'
		}, {
			label: "复制文件GUID",
			click: () => {
				const input = document.createElement('input');
				document.body.appendChild(input);
				input.setAttribute('value', event.args[1]);
				input.select();
				if (document.execCommand('copy')) {
					document.execCommand('copy');
					console.log('复制成功');
				}
				document.body.removeChild(input);
			}
		},
		/*{
		    label: "共享文件到",
		    submenu: [{
		            label: '共享到 测试班级1',
		        },
		        {
		            label: '共享到 测试班级2',
		        },
		        {
		            label: '共享到 测试班级2',
		        }
		    ],
		},*/
		// {
		// 	label: "生成文件链接",
		// 	click: () => {
		// 		webview.send('doLink', [false].concat(event.args))
		// 	}
		// },
		{
			type: 'separator'
		},
		{
			label: "删除",
			click: () => {
				webview.send('delObjectFile', event.args[1])
			}
		},
		{
			type: 'separator'
		}, {
			label: "属性",
			click: () => {
				panelistic.dialog.alert('文件属性', '文件名：' + event.args[0] + "<br>文件ID：" + event.args[1], '确定')
			}
		}
	]
	const menuBuilder = Menu.buildFromTemplate(menuContextTemplate)
	menuBuilder.popup({
		window: remote.getCurrentWindow()
	})
}

// function showFileUploadContextMenu(event) {
//  const menuContextTemplate = [{
//      label: "批量上传文件",
//      click: () => {
//          let allupas = remote.dialog.showOpenDialogSync()
//          console.log(allupas)
//          if(allupas){
//              webview.send('uploadall',allupas);
//          }
//      }
//  }]
//  const menuBuilder = Menu.buildFromTemplate(menuContextTemplate)
//  menuBuilder.popup({
//      window: remote.getCurrentWindow()
//  })
// }

function APPLYUPD(upditems, alertid) {
	var AdmZip = require('adm-zip')
	var zip = new AdmZip(getuserdatapath() + '/app.zip')
	zip.getEntries()
	zip.extractAllTo(process.cwd(), true)
	panelistic.dialog.alert("更新", "软件更新完成，需要重启软件以应用更新<br><br>" + upditems, "应用更新", (cf) => {
		remote.app.relaunch()
		remote.app.exit()
	})
}

// function startStreaming() {
// 	const { exec } = require('child_process');

// 	// 要执行的 FFmpeg 命令
// 	const command = "\"" + getuserdatapath() + "/ffmpeg.exe" + "\"" + ' -f gdigrab -framerate 60 -i desktop -vf "fps=60" -vcodec libx264 -preset ultrafast -tune zerolatency -f mpegts udp://127.0.0.1:57560';


// 	// 执行命令
// 	exec(command, (error, stdout, stderr) => {
// 		if (error) {
// 			console.error(`执行命令时发生错误：${error}`);
// 			return;
// 		}
// 		console.log(stdout, stderr)
// 		console.log('命令执行成功');
// 	});
// }

// function stopStream() {
// 	exec(`tskill ffmpeg`, (error, stdout, stderr) => {
// 		if (error) {
// 			console.error(`执行 tskill 命令时发生错误：${error}`);
// 			return;
// 		}
// 		console.log('进程已成功终止');
// 	});
// }

// 使用electron的screen和desktopCapturer模块获取屏幕流
// const { screen, desktopCapturer } = remote;
// // const { remote } = require('electron');

// // 获取主屏幕的id
// const display = screen.getPrimaryDisplay();
// const id = display.id;

// 创建一个函数，接受一个端口号作为参数
// function streamScreen(port) {
// 	// 创建一个http服务器
// 	const http = require('http');
// 	const server = http.createServer();
// 	const getSize = () => {
// 		const { size, scaleFactor } = remote.screen.getPrimaryDisplay();
// 		return {
// 			width: size.width * scaleFactor,
// 			height: size.height * scaleFactor
// 		}
// 	}

// 	const sizeInfo = getSize();

// 	// 监听端口号
// 	server.listen(port, () => {
// 		console.log(`Server listening on port ${port}`);
// 	});

// 	// 创建一个Set对象，用于保存所有连接的客户端
// 	const clients = new Set();

// 	// 当有客户端连接时，响应一个MJpeg流
// 	server.on('connection', (socket) => {
// 		console.log(`Client connected: ${socket.remoteAddress}`);
// 		// 设置响应头
// 		socket.write(
// 			'HTTP/1.1 200 OK\r\n' +
// 			'Content-Type: multipart/x-mixed-replace; boundary=--myboundary\r\n' +
// 			'\r\n'
// 		);
// 		// 将客户端添加到Set对象中
// 		clients.add(socket);
// 		// 当客户端断开连接时，从Set对象中移除
// 		socket.on('close', () => {
// 			console.log(`Client disconnected: ${socket.remoteAddress}`);
// 			clients.delete(socket);
// 		});
// 	});

// 	let imageCapture; // 定义一个全局变量，用于保存ImageCapture对象

// 	async function getScreenStream() { // 定义一个异步函数，用于获取屏幕流
// 		// 获取屏幕流
// 		const { desktopCapturer } = remote;
// 		const sources = await desktopCapturer.getSources({
// 			types: ['screen'], // 设定需要捕获的是"屏幕"，还是"窗口"
// 			thumbnailSize: sizeInfo
// 		});
// 		try {
// 			// 获取主屏幕的id
// 			const display = screen.getPrimaryDisplay();
// 			const id = display.id;
// 			const source = sources[0];
// 			// 创建一个MediaStream对象，并指定分辨率为1920x1080
// 			const stream = await navigator.mediaDevices.getUserMedia({
// 				audio: false,
// 				video: {
// 					mandatory: {
// 						chromeMediaSource: 'desktop',
// 						chromeMediaSourceId: source.id,
// 						minWidth: 1920,
// 						maxWidth: 1920,
// 						minHeight: 1080,
// 						maxHeight: 1080,
// 					},
// 					// 添加chromeMediaSourceConstraints参数，指定使用硬件加速
// 					chromeMediaSourceConstraints: {
// 						mandatory: {
// 							googCpuOveruseDetection: false,
// 							googCpuOveruseEncodeUsage: false,
// 							googCpuUnderuseThreshold: 55,
// 							googCpuOveruseThreshold: 85
// 						}
// 					}
// 				},
// 			});
// 			console.log(stream);
// 			// 创建一个ImageCapture对象，用于从MediaStream中获取图片
// 			const track = stream.getVideoTracks()[0];
// 			imageCapture = new ImageCapture(track);
// 			// 监听track的onended事件，当屏幕流结束时重新获取屏幕流
// 			track.onended = () => {
// 				console.log('Screen stream ended');
// 				getScreenStream();
// 			};
// 		} catch (error) {
// 			console.error(error);
// 		}
// 	}

// 	getScreenStream(); // 调用函数获取屏幕流

// 	async function sendImage() { // 定义一个异步函数，用于获取图片并发送到所有客户端
// 		try {
// 			if (clients.size > 0 && imageCapture) { // 如果有客户端连接并且有ImageCapture对象
// 				console.log(`Sending image to ${clients.size} clients`);
// 				// 检查屏幕流的状态，如果不是live或者被禁用或静音了，就重新获取屏幕流
// 				if (
// 					imageCapture.track.readyState != 'live' ||
// 					!imageCapture.track.enabled ||
// 					imageCapture.track.muted
// 				) {
// 					console.log('Screen stream is not valid');
// 					await getScreenStream();
// 				}
// 				// 获取一张图片，并转换为Buffer对象
// 				let image = await imageCapture.grabFrame();
// 				let canvas = document.createElement('canvas');
// 				canvas.width = image.width;
// 				canvas.height = image.height;
// 				let context = canvas.getContext('2d');
// 				context.drawImage(image, 0, 0, image.width, image.height);
// 				let base64 = canvas.toDataURL('image/jpeg'); // 获取base64编码的字符串
// 				let buffer = Buffer.from(base64, 'base64'); // 转换为Buffer对象

// 				for (const socket of clients) { // 遍历所有客户端
// 					// 发送图片到客户端，使用分隔符分割每一帧
// 					socket.write(
// 						'--myboundary\r\n' +
// 						'Content-Type: image/jpeg\r\n' +
// 						`Content-Length: ${buffer.length}\r\n` +
// 						'\r\n'
// 					);
// 					socket.write(buffer, 'binary');
// 					socket.write('\r\n');
// 				}

// 				image = null;
// 				canvas = null;
// 				context = null;
// 				base64 = null;
// 				buffer = null;
// 			}
// 		} catch (error) {
// 			console.error(error);
// 		}
// 	}
// 	setInterval(sendImage, 1);
// }

// 调用函数，将屏幕推流到3000端口
// streamScreen(3000);


// 调用函数，将屏幕推流到3000端口
// streamScreen(3000);


// 调用函数，将屏幕推流到3000端口
// streamScreen(3000);

// function switchSeewo() {
// 	panelistic.dialog.confirm("提示", "确定切换到一体机模式？", "确定", "取消", (choice) => {
// 		if (choice) {
// 			fs.writeFileSync(getuserdatapath() + '/useseewo', "useseewo");
// 			window.location.reload()
// 		}
// 	})
// }

document.getElementById('onusbnote').onclick = function() {
	panelistic.dialog.alert("正在以 USB 设备运行","PadPlus 2 正在以便携版模式在 USB 设备运行","确定");
}