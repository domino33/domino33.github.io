if (typeof SmartTestEditor === 'undefined') SmartTestEditor = {};
SmartTestEditor.Client = function (serviceUrl) {
    this._getSmartTestXml = serviceUrl + '/api/getSmartTestXml';
    this._getLocationXml = serviceUrl + '/api/getLocationXml';
    this._editLocation = serviceUrl + '/locationElements/edit';
    this._serviceUrl = serviceUrl;
}
SmartTestEditor.Client.prototype.EditLocation = function (smartTestTokenHash, locationGuid, smartMode) {

    var url = this._editLocation + '?smartTestTokenHash=' + smartTestTokenHash + '&locationGuid=' + locationGuid + '&smartMode=' + smartMode;

    var content = '<style>.modal-dialog-modified3 {width: 90%;}} </style> <iframe src="' + url + '" width="100%" height="100%"></iframe>'
    window.ModalDialogV3_show(content);
}
SmartTestEditor.Client.prototype.GetLocationXml = function (entityId, entityTypeId, relativePath, locationGuid, successHandler) {
    if (RP.localVersion) {//entityId == null
        //let url = new URL(this._serviceUrl);
        var searchParams = new URLSearchParams(this._serviceUrl);
        let guid = uuidv4();
       // let command = CreateCommand(RP.Commands.GetRequestZip, "", JSON.stringify({ guid: guid, path: `${searchParams.get("CourseGuid")}/System/SmartTests/${searchParams.get("SmartTestGuid")}/Locations/${locationGuid}/location.xml`, pathZip: searchParams.get("Url") }));
        let command = CreateCommand(RP.Commands.GetRequestZip, "", JSON.stringify({ guid: guid, path: `${entityId}/System/SmartTests/${entityTypeId}/Locations/${locationGuid}/location.xml`, pathZip: searchParams.get("Url") }));
        //let command = CreateCommand(RP.Commands.GetRequest, `${url.pathname.replace("TestApp.html", "").slice(1)}AppData/${searchParams.get("CourseGuid")}/System/SmartTests/${searchParams.get("SmartTestGuid")}/Locations/${locationGuid}/location.xml`, guid);
        window.addEventListener(guid, function (res) {
            if (res.detail.result == "") {
                let notifyCommand = CreateCommandStartScript("ControlModel", "CanvasManager", "ErrorMessage", ["Ошибка получения xml локации"]);
                unityCommand(notifyCommand);
            }
            else if (successHandler) {
                let test1 = res.detail.result.replace(`<?xml version="1.0" encoding="utf-8"?>`, "");
                successHandler((new window.DOMParser()).parseFromString(test1, "text/xml"));
            }
        }, { once: true })
        unityCommand(command);
        return;
    }

    var url = this._getLocationXml + '?entityId=' + entityId + '&entityTypeId=' + entityTypeId + '&relativePath=' + relativePath + '&locationGuid=' + locationGuid;
    var _ = this;

    let tryCount = 0;
    let retryLimit = 3;

    const getXml = function () {
        let request = new XMLHttpRequest();
        request.open("POST", url, false);
        request.send();
        if (successHandler && request.responseXML) {
            successHandler(request.responseXML);
        }
        else {
            tryCount++;
            if (tryCount < retryLimit) {
                getXml();
            }
            else {
                let notifyCommand = CreateCommandStartScript("ControlModel", "CanvasManager", "ErrorMessage", ["Ошибка получения xml локации"]);
                unityCommand(notifyCommand);
            }
        }
    }

    getXml();


    //var _ = this;
    //$.ajax({
    //    method: "POST",
    //    url: url,
    //    tryCount: 0,
    //    retryLimit: 3,
    //    success: function (response) {
    //        if (successHandler) successHandler(response);
    //    },
    //    error: function (jqXHR, textStatus) {
    //        this.tryCount++;
    //        if (this.tryCount < this.retryLimit) {
    //            $.ajax(this);
    //        }
    //        else {
                //let notifyCommand = CreateCommandStartScript("ControlModel", "CanvasManager", "ErrorMessage", ["Ошибка получения xml локации"]);
                //unityCommand(notifyCommand);
    //        }
    //    }
    //});
}
SmartTestEditor.Client.prototype.GetSmartTestXml = function (entityId, entityTypeId, relativePath, successHandler) {
    if (RP.localVersion) {
       // let url = new URL(this._serviceUrl);
        var searchParams = new URLSearchParams(this._serviceUrl);
        let guid = uuidv4();
        //let command = CreateCommand(RP.Commands.GetRequestZip, "", JSON.stringify({ guid: guid, path: `${searchParams.get("CourseGuid")}/System/SmartTests/${searchParams.get("SmartTestGuid")}/manifest.xml`,pathZip: searchParams.get("tokenData") }));// pathZip: searchParams.get("Url") }));//`${url.pathname.replace("TestApp.html", "").slice(1)}AppData/${searchParams.get("CourseGuid")}/System/SmartTests/${searchParams.get("SmartTestGuid")}/manifest.xml`, guid);
        let command = CreateCommand(RP.Commands.GetRequestZip, "", JSON.stringify({ guid: guid, path: `${entityId}/System/SmartTests/${entityTypeId}/manifest.xml`,pathZip: searchParams.get("tokenData") }));
        window.addEventListener(guid, function (res) {
            if (res.detail.result == "") {
                let notifyCommand = CreateCommandStartScript("ControlModel", "CanvasManager", "ErrorMessage", ["Ошибка получения xml смарт теста"]);
                unityCommand(notifyCommand);
            }
            else if (successHandler)
                successHandler((new window.DOMParser()).parseFromString(res.detail.result, "text/xml"));
        }, { once: true })
        unityCommandJS(command);
        return;
    }

    var url = this._getSmartTestXml + '?entityId=' + entityId + '&entityTypeId=' + entityTypeId + '&relativePath=' + relativePath;
    var _ = this;
    $.ajax({
        method: "POST",
        url: url,
        tryCount: 0,
        retryLimit: 3,
        success: function (response) {
            if (successHandler) successHandler(response);
        },
        error: function (jqXHR, textStatus) {            
            this.tryCount++;
            if (this.tryCount < this.retryLimit) {
                $.ajax(this);
            }
            else {                
                let notifyCommand = CreateCommandStartScript("ControlModel", "CanvasManager", "ErrorMessage", ["Ошибка получения xml смарт теста"]);
                unityCommandJS(notifyCommand);
            }
        }
    });
}
//SmartTestEditor.Client.Instance = new SmartTestEditor.Client(SmartTestEditor.Settings.ServiceUrl);