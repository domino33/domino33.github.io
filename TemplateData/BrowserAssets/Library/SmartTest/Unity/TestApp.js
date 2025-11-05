/*/*const { get } = require("http");*/

if (typeof RP === 'undefined') RP = {};

RP.TestApp = function (xmlUrl,courseGuid,smartTestGuid) {
    this._xmlUrl = xmlUrl;
    this._guidLocation = "";
	this._lastModel = "";
    this.GroupsActions = [];
	this._courseGuid = courseGuid;
    this._smartTestGuid = smartTestGuid;
}
RP.TestApp.prototype.InitTest = function () {
    var thisObject = this;
    thisObject._model = new RP.SmartTestModel(thisObject._xmlUrl,thisObject._courseGuid);
    if (thisObject._model.Validate() != true) {
        new Error("model ne tort");
        let notifyCommand = CreateCommandStartScript("ControlModel", "CanvasManager", "ErrorMessage", ["invalidate xml"]);
        unityCommand(notifyCommand);
        return;
    }
    //логируем
    let allStage = thisObject._model._xml.getElementsByTagName("Stage");
    let count = 0;
    for (var i = 0; i < allStage.length; i++) {
        if (allStage[i].getAttribute("IsActive") == "True") {
            count += 1;
        }
    }
    unityCommand(CreateCommandStartScript(
        'LogManager',
        'CanvasManager',
        'OpenLoggingSession',
        [count]));//thisObject._model._xml.getElementsByTagName("Stage").length
    //
}
RP.TestApp.prototype.InitApp = function () {
    var thisObject = this;
    //console.log("_xmlUrl - " + this._xmlUrl);    
    fetch(this._xmlUrl)
        .then(response => response.text())
        .then(str => {
            thisObject._model = new RP.SmartTestModel(str,thisObject._courseGuid);
            if (thisObject._model.Validate() != true) new Error("model ne tort");
            
            thisObject.InitUnityScene();
            // legacy
            // dataxml = thisObject._model.GetXml();
        });
}
RP.TestApp.prototype.InitUnityScene = function (stageIndex) {
   // this._currentStageIndex = 0;
    this._currentStageIndex = this._model.CheckCurrentStage(stageIndex);//0
    this._model.SetStage(this._currentStageIndex);
    let stageXml = this._model.GetStageXml(this._currentStageIndex);
    const ModelId = this._model.GetModelId(stageXml);
    //const initStage = CreateCommand(RP.Commands.BrowserCallFunction, "PanelControlBrowser", JSON.stringify({ NameFunction: "OnLoadActions", Parametrs: [this._currentStageIndex] }));
        //логируем
    unityCommand(CreateCommandStartScript(
        'LogManager',
        'CanvasManager',
        'LoggingStageEvent',
        [this._model.GetStageGuid(stageXml)])); 
    
    const loadScene = CreateCommand(RP.Commands.BrowserCallFunction, "PanelControlBrowser", JSON.stringify({ NameFunction: "LoadScene", Parametrs: [this._currentStageIndex] }));

	//let loadElement = CreateCommandStartScript(
    //    'ControlModel',
    //    'CanvasManager',
    //    'SetDictionaryElements',
    //    [JSON.stringify(this._model.GetNameRpElement(this._model.GetStageElement())),loadScene]);
    const openScene = CreateCommandStartScript(
        'ControlModel',
        'CanvasManager',
        'OpenScene',
        [loadScene]);//showTarget
    const createPlayer = CreateCommandStartScript(
        'ControlModel',
        'CanvasManager',
        'SetPlayer',
        ['4', openScene]);
    let downloadModel = CreateCommandStartScript(
        'ControlModel',
        'CanvasManager',
        'DownloadModel',
        [ModelId, createPlayer]);
    //if (document.location.protocol == "file:") {
        downloadModel = CreateCommandStartScript(
            'ControlModel',
            'CanvasManager',
            'DownloadLocalModel',
            [this._model.GetHashModel(stageXml), createPlayer]);
   // }
       const blackMonitor = CreateCommand(RP.Commands.DarkeningScreen, "", JSON.stringify({ OnEnable: "true", ButtonEnable: "false", MainText: RP.Texts.LoadStage }), downloadModel);

    var splashScreen = this._model._xml.getElementsByTagName("SplashScreen");
    if (splashScreen.length > 0 && splashScreen[0].getElementsByTagName("URL")[0] != null) {
        let paramsStruct = {
            Url: splashScreen[0].getElementsByTagName("URL")[0].textContent,
            NextCommand: blackMonitor
        };
        unityCommand(CreateCommand(92, "", JSON.stringify(paramsStruct)));
    }
    else {
        unityCommand(blackMonitor);
    }
   
       

    
            
    //unityCommand(downloadModel);
    this.timeSendCommand = Date.now();
    this.startTimer = true;
}
RP.TestApp.prototype.RunStageInitActions = function (args) {
    if (this.startTimer) {
        this.timeSendCommand = this.timeSendCommand - Date.now();
        //console.log("Time " + this.timeSendCommand);
        this.startTimer = false;
    }
    console.log("RunStageInitActions " + args.stageIndex);
    this._currentStageIndex = args.stageIndex;
    const setPosition = CreateCommand(RP.Commands.Coordinates,
        this.FindRpElementCamera(),
        "");
    unityCommand(setPosition);
    var guidActionSet = this._model.GetStageOnloadAction();
    if (guidActionSet != null && guidActionSet != "") {
        unityCommand(this._model._actionManager.CreateCallbackCollection(this._model._actionManager.CreateSetCommand({ 'guid': guidActionSet })));//guidActionSet
    }
    unityCommand(CreateCommand(RP.Commands.DarkeningScreen, "", JSON.stringify({ OnEnable: "false", ButtonEnable: "false", MainText: "" })));

    var actionRecord = this._model._xml.querySelector("ContentItem>ActionRecord");
    if (actionRecord != null && actionRecord.textContent=="True") {
        //  —тарт«аписи репле€
        unityCommand(CreateCommandStartScript(
            'LogManager',
            'CanvasManager',
            'RecordActions',
            []));
    }
}
RP.TestApp.prototype.GetAndSetLocation = function (args) {
    var locationGuid = this._model._stageXml.getAttribute("LocationGuid");
	let modelId = this._model.GetModelId(this._model.GetStageXml(args.stageIndex));; 
    if (this._guidLocation != locationGuid ||
    this._lastModel != modelId) {
        this._guidLocation = locationGuid;
		this._lastModel = modelId;
        var location = new RP.MetadataLoad(this._model._actionManager, locationGuid,this._courseGuid,this._smartTestGuid);
        location.SetLocation(args.stageIndex);
        this.LoadStageState(location.idCollections, this, args.stageIndex);
    }
    else {
        this.LoadStageState(null, this, args.stageIndex);
     }
}
RP.TestApp.prototype.LoadStageState = function (idCollection, thisScript, stageIndex) {
    if (thisScript._model._actionManager.FindCollection(idCollection)) {
        console.log("WaitCompleteCollection");
        setTimeout(thisScript.LoadStageState, 1000, idCollection, thisScript, stageIndex);
    } else {
        console.log("Wait=true"); 
        thisScript.CreateActionPointCommand();
        thisScript.CreatePlace();
        thisScript.ShowTargets();
        thisScript.AddInventory();
        thisScript.AddArmors();
        thisScript.RunStageInitActions({ 'stageIndex': stageIndex });
        //unityCommand(CreateCommand(RP.Commands.BrowserCallFunction, "PanelControlBrowser", JSON.stringify({ NameFunction: "OnLoadActions", Parametrs: [stageIndex] })));
         // try again in 300 milliseconds
    }
}
RP.TestApp.prototype.GetCurrentStageXml = function () {
    return this._model.GetStageXml(this._currentStageIndex);
}
RP.TestApp.prototype.FindRpElementCamera = function () {
    return this._model.FindNameRpElement(this._model.GetStageCameras(), this.GetCurrentStageXml().getAttribute("CameraGuid"))
}
RP.TestApp.prototype.CreateActionPointCommand = function () {
    ///удал€ем старые ActionPoint
    let _clearActionPoint = CreateCommandStartScript(
        'ActionPointManager',
        'CanvasManager',
        'ClearActionPoint',
        [])
    unityCommand(_clearActionPoint);
    ///
    var stageXml = this.GetCurrentStageXml();
    var events = this._model.GetStageEvents();
    if (events == null) {
        return;
    }
    
    for (var i = 0; i < events.length; i++) {
        var eventStruct = {
            Guid: events[i].getAttribute("Guid"),
            ElementKey: this._model.FindNameRpElement(this._model.GetStageElement(), events[i].getAttribute("ElementGuid")),
            IsVisible: events[i].getAttribute("IsVisible"),
            IsActive: events[i].getAttribute("IsActive"),
            Range: events[i].getAttribute("Range"),
            Title: events[i].getElementsByTagName("Title")[0].textContent
        };
        var condition = events[i].getElementsByTagName("Condition");
        if (condition.length > 0) {//&& condition[0].getAttribute("Type") != null
            eventStruct.Condition = {
                Guid: condition[0].getAttribute("ResourceGuidRef"),
                ElementKey: (condition[0].getElementsByTagName("TextCondition").length > 0) ? condition[0].getElementsByTagName("TextCondition")[0].textContent:"",
                HasGot: condition[0].getAttribute("HasGot")
            };
            //var inventory = null;
            //if (condition[0].getAttribute("Type") == "Armor" &&
            //    stageXml.getElementsByTagName("Armors").length > 0) {
            //    inventory = stageXml.getElementsByTagName("Armors")[0]
            //        .getElementsByTagName("Armor");
            //}
            //else if (stageXml.getElementsByTagName("Inventory").length > 0) {
            //    inventory = stageXml.getElementsByTagName("Inventory")[0]
            //        .getElementsByTagName("InventoryItem");
            //}
            //if (inventory != null) {
            //    for (var j = 0; j < inventory.length; j++) {
            //        if (inventory[j].getAttribute("Guid") == condition[0].getAttribute("ResourceGuidRef")) {
            //            eventStruct.Condition = {
            //                Guid: condition[0].getAttribute("ResourceGuidRef"),
            //                ElementKey: this._model.FindNameRpElement(this._model.GetStageElement(), inventory[j].getAttribute("ElementGuid")),
            //                HasGot: condition[0].getAttribute("HasGot")
            //            };
            //            break;
            //        }
            //    }
            //}
        }
        const addActionPoint = CreateCommandStartScript(
            'ActionPointManager',
            'CanvasManager',
            'SetActionPointOnScene',
            [JSON.stringify(eventStruct)]);
        unityCommand(addActionPoint);
    }
}
RP.TestApp.prototype.CreatePlace = function () {
    if (this._model.ValidatePlace()) {
        var place = this._model.GetStagePlace();
        for (var i = 0; i < place.length; i++) {
            const placeCommand = CreateCommand(RP.Commands.SetPlace, place[i].getAttribute("ElementKey"));
            unityCommand(placeCommand);
        }
    }
}
RP.TestApp.prototype.AddInventory = function () {
    var _inventoryItem = this._model.GetStageInventory();
    if (_inventoryItem != null) {
        for (let k = 0; k < _inventoryItem.length; k++) {
            let paramsStruct = {
                Name: _inventoryItem[k].getElementsByTagName("Title")[0].textContent,
                GameObjectName: this._model.FindNameRpElement(this._model.GetStageElement(), _inventoryItem[k].getAttribute("ElementGuid")),
                Id: _inventoryItem[k].getAttribute("Guid"),
                IsClickable: _inventoryItem[k].getAttribute("IsClickable"),
                propertyInventory: this._model.GetPropertyInventory(_inventoryItem[k]),
                Take: _inventoryItem[k].getAttribute("Take"),
                Description: _inventoryItem[k].getElementsByTagName("Description")[0].textContent,
                UrlImage:""

            };
            unityCommand(CreateCommand(RP.Commands.AddItem,
                paramsStruct.GameObjectName, JSON.stringify(paramsStruct)));
        }
    }
}

RP.TestApp.prototype.AddArmors = function () {   
    const _armors = this._model.GetStageArmors();
    if (_armors != null) {        
        for (let i = 0; i < _armors.length; i++) {
            let paramsStruct = {
                Name: _armors[i].getElementsByTagName("Title")[0].textContent,
                GameObjectName: this._model.FindNameRpElement(this._model.GetStageElement(), _armors[i].getAttribute("ElementGuid")),
                Id: _armors[i].getAttribute("Guid"),
                IsEquipmentItem: true,
                IsClickable: _armors[k].getAttribute("IsClickable"),
                propertyInventory: this._model.GetPropertyInventory(_armors[k])
            };    
            
            unityCommand(CreateCommand(RP.Commands.AddItem,
                paramsStruct.GameObjectName, JSON.stringify(paramsStruct)));
        }
    }
}

RP.TestApp.prototype.ShowTargets = function () {
    let setTitleTarget = CreateCommandStartScript(
        'TargetContainer',
        'Main UI',
        'SetTitleStage',
        [this._model.GetTitleStage()]);
    unityCommand(setTitleTarget);
    let _targetVisible = null;
    var _targetsXml = this._model.GetTargets();
    if (_targetsXml != null) {
        let _target = Array.prototype.slice.call(_targetsXml);
        let mainListTarget = Array.prototype.slice.call(this._model.GetTargets());
        for (var i = 0; i < _target.length; i++) {
            if (_target[i].getAttribute("IsVisible") == "True" && _target[i].getAttribute("IsActive") == "True") {
                let childTargets = _target[i].querySelector("Targets").getElementsByTagName("TargetRef");
                if (childTargets.length > 0) {
                    _targetVisible = CreateCommandStartScript(
                        'TargetContainer',
                        'Main UI',
                        'AddTarget',
                        [this._model.GetTargetTitle(_target[i]), _target[i].getAttribute("Guid"), _target[i].querySelector("OnClick").getAttribute("ActionGuid"), ""]
                    );
                    unityCommand(_targetVisible);
                    for (var j = 0; j < childTargets.length; j++) {
                        let childTarget = _target.find(item => item.getAttribute("Guid") == childTargets[j].getAttribute("TargetGuid"));
                        if (childTarget.getAttribute("IsVisible") == "True") {
                            _targetVisible = CreateCommandStartScript(
                                'TargetContainer',
                                'Main UI',
                                'AddTarget',
                                [this._model.GetTargetTitle(childTarget), childTarget.getAttribute("Guid"), childTarget.querySelector("OnClick").getAttribute("ActionGuid"), _target[i].getAttribute("Guid")]);
                            unityCommand(_targetVisible);
                        }
                        if (mainListTarget.indexOf(childTarget, 0) != -1) {
                            mainListTarget.splice(mainListTarget.indexOf(childTarget, 0), 1);
                        }
                        
                    }
                    if (mainListTarget.indexOf(_target[i], 0) != -1) {
                        mainListTarget.splice(mainListTarget.indexOf(_target[i], 0), 1);
                    }
                }
            }
        }
        for (let item of mainListTarget) {
            if (item.getAttribute("IsVisible") == "True" && item.getAttribute("IsActive") == "True") {
                _targetVisible = CreateCommandStartScript(
                    'TargetContainer',
                    'Main UI',
                    'AddTarget',
                    [this._model.GetTargetTitle(item), item.getAttribute("Guid"), item.querySelector("OnClick").getAttribute("ActionGuid"), ""]);
                unityCommand(_targetVisible);
            }
        }
    }
}
RP.TestApp.prototype.FireEvent = function (args) {
    //let eventGuid = args.eventGuid;
    var events = this._model.GetStageEvents();
    let findElem = false;
    if (events != null) {
        for (let item of events) {
            if (item.getAttribute("Guid") == args.eventGuid) {//eventGuid
                let actionGuid = item.querySelector("Action").getAttribute("ActionGuid");
                unityCommand(this._model._actionManager.CreateCallbackCollection(this._model._actionManager.CreateSetCommand({ 'guid': actionGuid, 'params': args.params })));//actionGuid
                findElem = true;
                break;
            }
        } 
    }
    if (!findElem) {
        unityCommand(CreateCommand(RP.Commands.AddInventoryItem, args.eventGuid));//eventGuid
    }
}
RP.TestApp.prototype.FireAction = function (actionGuid) {
    if (actionGuid != null && actionGuid != "") {
        unityCommand(this._model._actionManager.CreateCallbackCollection(this._model._actionManager.CreateSetCommand({ 'guid': actionGuid})));//actionGuid
    }
}
/////////////////////////////////////////////////////
RP.TestApp.prototype.NextStage = function (number) {
    console.log("NextStage");
    unityCommand(CreateCommand(100, "", JSON.stringify({ Parametrs: [number] })));
    if (this._model.ValidateStage(number)) {
        let hideTargets = CreateCommandStartScript(
            'TargetContainer',
            'Main UI',
            'TargetsPanelVisible',
            [false]);
        const sendEndStage = CreateCommand(RP.Commands.BrowserCallFunction, "PanelControlBrowser", JSON.stringify({
            NameFunction: "CloseTestApp", Parametrs: [JSON.stringify({
                array: this._model.arrayStage,
                countTarget: this._model.GetCountTarget()
            })]
        }),
            hideTargets);//, this._model.unSuccessful
        unityCommand(sendEndStage);
        return;
    }
    this._model.SetStage(number);
    let stageXml = this._model.GetStageXml(number);
    const ModelId = this._model.GetModelId(stageXml)
    const CurrentModel = this._model.GetModelId(this._model.GetStageXml(this._currentStageIndex));
        //логируем
    unityCommand(CreateCommandStartScript(
        'LogManager',
        'CanvasManager',
        'LoggingStageEvent',
        [this._model.GetStageGuid(this._model.GetStageXml(number))])); 
    
    if (CurrentModel != ModelId) {
        const initStage = CreateCommand(RP.Commands.BrowserCallFunction, "PanelControlBrowser", JSON.stringify({ NameFunction: "LoadScene", Parametrs: [number] }));
        //const blackMonitor = CreateCommand(RP.Commands.DarkeningScreen, "", JSON.stringify({ OnEnable: "true", ButtonEnable: "false", MainText: RP.Texts.LoadStage }), initStage);
		//let loadElement = CreateCommandStartScript(
		//	'ControlModel',
		//	'CanvasManager',
		//	'SetDictionaryElements',
		//	[JSON.stringify(this._model.GetNameRpElement(this._model.GetStageElement())),initStage]);
        const openScene = CreateCommandStartScript(
            'ControlModel',
            'CanvasManager',
            'OpenScene',
            [initStage]);//showTarget
      //  let downloadModel = CreateCommandStartScript(
      //      'ControlModel',
       //     'CanvasManager',
      //      'DownloadModel',
       //     [ModelId, openScene]);
       // if (document.location.protocol == "file:") {
		
         let   downloadModel = CreateCommandStartScript(
                'ControlModel',
                'CanvasManager',
                'DownloadLocalModel',
                [this._model.GetHashModel(stageXml), openScene]);
		const blackMonitor = CreateCommand(RP.Commands.DarkeningScreen, "", JSON.stringify({ OnEnable: "true", ButtonEnable: "false", MainText: RP.Texts.LoadStage }), downloadModel);
       // }
        unityCommand(blackMonitor);
    }
    else {
		//let initStage2 = CreateCommand(RP.Commands.BrowserCallFunction, "PanelControlBrowser", JSON.stringify({ NameFunction: "LoadScene", Parametrs: [number] }));
		//let loadElement = CreateCommandStartScript(
		//	'ControlModel',
		//	'CanvasManager',
		//	'SetDictionaryElements',
		//	[JSON.stringify(this._model.GetNameRpElement(this._model.GetStageElement())),initStage2]);
        //unityCommand(loadElement);
        this.GetAndSetLocation({ 'stageIndex': number });
    }
}

//извлечь из очереди команду
RP.TestApp.prototype.QueueExtract = function (idCollection) {
    this._model._actionManager.QueueExtract(idCollection);
}
