PresentationEditor.Client = function (serviceUrl) {
    this._editPresentation = serviceUrl + '/presentation/edit/get';
    this._getPresentationsItemsLite = serviceUrl + '/presentation/items/get';
    this._getPresentationXml = serviceUrl + '/api/getPresentationXml';
}
PresentationEditor.Client.prototype.EditPresentation = function (tokenData) {
    //$.ajax({
    //    url: this._editPresentation,
    //    data: { "presentationEditorTokenHash": tokenData}, 
    //    method: 'POST',
    //    headers: { 'X-Requested-Token': 'dba40ca6-f5ec-4606-98f8-5f56cd41dc89' },
    //    success: function (response) {
    //        alert("123");
    //    }
    //});
    var url = this._editPresentation + '?presentationEditorTokenHash=' + tokenData;

    var content = '<style>.modal-dialog-modified3 {width: 90%;}} </style> <iframe src="' + url + '" width="100%" height="100%"></iframe>'
    window.ModalDialogV3_show(content);
}
PresentationEditor.Client.prototype.GetPresentationsItemsLite = function (entityId, entityTypeId, relativePath, successHandler) {
    var url = this._getPresentationsItemsLite + '?entityId=' + entityId + '&entityTypeId=' + entityTypeId + '&relativePath=' + relativePath;

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
                let paramsWindow =
                {
                    Header: "Ошибка",
                    Text: "Ошибка получения элеметов презентации",
                    Type: 1,
                    Delay: 5
                };
                let notifyCommand = {
                    CommandType: 42,
                };
                notifyCommand.Params = JSON.stringify(paramsWindow);
                unityCommand(JSON.stringify(notifyCommand));
            }
        }
    });
}
PresentationEditor.Client.prototype.GetPresentationXml = function (entityId, entityTypeId, relativePath, successHandler) {
    if (RP.localVersion) {
       // let url = new URL(document.location.href);
        var searchParams = new URLSearchParams(document.location.href);
        let guid = uuidv4();
      //  let command = CreateCommand(RP.Commands.GetRequestZip, "", JSON.stringify({ guid: guid, path: `${searchParams.get("CourseGuid")}/System/SmartTests/${searchParams.get("SmartTestGuid")}/Presentations/${relativePath.split('\\').pop()}/manifest.xml`, pathZip: searchParams.get("Url") }));
		let command = CreateCommand(RP.Commands.GetRequestZip, "", JSON.stringify({ guid: guid, path: `${entityId}/${relativePath.replaceAll('\\', '/')}/manifest.xml`, pathZip: searchParams.get("Url") }));
		
       // let command = CreateCommand(RP.Commands.GetRequest, `${url.pathname.replace("TestApp.html", "").slice(1)}AppData/${searchParams.get("CourseGuid")}/System/SmartTests/${searchParams.get("SmartTestGuid")}/Presentations/${relativePath.split('\\').pop()}/manifest.xml`, guid);// slice(-1)-последний элемент 
        window.addEventListener(guid, function (res) {
            if (res.detail.result == "") {
                let notifyCommand = CreateCommandStartScript("ControlModel", "CanvasManager", "ErrorMessage", ["Ошибка получения xml смарт теста"]);
                unityCommand(notifyCommand);
            }
            else if (successHandler) {
                var xml = (new window.DOMParser()).parseFromString(res.detail.result, "text/xml");
                let structPresentation = xml.querySelectorAll("PresentationItem");
                for (let presentationItem of structPresentation) {
                    presentationItem.querySelector("SlideUrl").textContent = (presentationItem.querySelector("SlideUrl") != null && presentationItem.querySelector("SlideUrl").textContent != "") ? `${presentationItem.querySelector("SlideUrl").textContent}?EntityId=${entityId}&EntityTypeId=${entityTypeId}&RelativePath=${relativePath}&slideIdentifier=${presentationItem.getAttribute("Identifier")}` : "";
                    presentationItem.querySelector("AudioUrl").textContent = (presentationItem.querySelector("AudioUrl") != null && presentationItem.querySelector("AudioUrl").textContent != "") ? `${presentationItem.querySelector("AudioUrl").textContent}?EntityId=${entityId}&EntityTypeId=${entityTypeId}&RelativePath=${relativePath}&slideIdentifier=${presentationItem.getAttribute("Identifier")}` : "";
                }
                successHandler(xml);
            }
        }, { once: true });
        unityCommand(command);
        //await new Promise((resolve) => {
        //    window.addEventListener(guid, function (res) {
        //        if (res.detail.result == "") {
        //            let notifyCommand = CreateCommandStartScript("ControlModel", "CanvasManager", "ErrorMessage", ["Ошибка получения xml смарт теста"]);
        //            unityCommand(notifyCommand);
        //        }
        //        else if (successHandler)
        //            successHandler((new window.DOMParser()).parseFromString(res.detail.result, "text/xml"));
        //        resolve();
        //    }, { once: true })
        //    unityCommand(command);
        //});
        return;
    }
    var url = this._getPresentationXml + '?entityId=' + entityId + '&entityTypeId=' + entityTypeId + '&relativePath=' + relativePath;

    var _ = this;

    let tryCount = 0;
    let retryLimit = 3;

    const getXml = function () {
            let request = new XMLHttpRequest();
            request.open("POST", url, false);
            try {
                request.send();
            }
            catch (ex) {
                console.log(ex);
            }
            if (successHandler && request.responseXML) {
                successHandler(request.responseXML);
            }
            else {
                tryCount++;
                if (tryCount < retryLimit) {
                    getXml();
                }
                else {
                    let paramsWindow =
                    {
                        Header: "Ошибка",
                        Text: "Ошибка получения xml презентации",
                        Type: 1,
                        Delay: 5
                    };
                    let notifyCommand = {
                        CommandType: 42,
                    };
                    notifyCommand.Params = JSON.stringify(paramsWindow);
                    unityCommand(JSON.stringify(notifyCommand));
                }
            }
    }

    getXml();
}
PresentationEditor.Client.Instance = new PresentationEditor.Client(PresentationEditor.Settings.ServiceUrl);