if (typeof RP === 'undefined') RP = {};

RP.CommandMaker = function (smartTestModel,courseGuid) {
    this._model = smartTestModel;
	this._courseGuid = courseGuid;
}

RP.CommandMaker.prototype.FormingCommand = function (args) {//actionElem, callbackCommand
    //логируем действие
    unityCommand(CreateCommandStartScript(
        'LogManager',
        'CanvasManager',
        'LoggingEvent',
        [JSON.stringify({
            Title: args.actionElem.querySelector("Title") != null ? args.actionElem.querySelector("Title").textContent:"",
            CommandTypeTitle: args.actionElem.getAttribute("Guid"),
            CommandType: args.actionElem.getAttribute("Type"),
        })]));
            //
    switch (args.actionElem.getAttribute("Type")) {
        case "allowCharacterControl":
            return CreateCommand(RP.Commands.ForbidCharacterControl, "", JSON.stringify({
                OnEnable: "true",
                AllEnable: "true"
            }), args.callbackCommand);
            break;
        case "forbidCharacterControl":
            return CreateCommand(RP.Commands.ForbidCharacterControl, "", JSON.stringify({
                OnEnable: "false",
                AllEnable: (args.actionElem.getAttribute("AllEnable") != null) ? args.actionElem.getAttribute("AllEnable") : "true"
            }), args.callbackCommand);
            break;
        case "activateTarget":
            let target = this._model.FindTarget(args.actionElem.getAttribute("TargetGuid"));
            if (target != null) {
                target.setAttribute("IsActive", "True")
            }
            return args.callbackCommand;
            break;  
        case "deactivateTarget":
            let target1 = this._model.FindTarget(args.actionElem.getAttribute("TargetGuid"));
            if (target1 != null) {
                target1.setAttribute("IsActive", "False")
            }
            return args.callbackCommand;
            break;
        case "makeTargetVisible":
            //отметить цель видимой в xml и сообщить в unity
            let targetStage = this._model.FindTarget(args.actionElem.getAttribute("TargetGuid"));
            targetStage.setAttribute("IsVisible", "True")
            return this._model.SetVisibleTargets(targetStage, args.callbackCommand);
            break;
        case "makeTargetInvisible":
            let targetStage2 = this._model.FindTarget(args.actionElem.getAttribute("TargetGuid"));
            targetStage2.setAttribute("IsVisible", "False")
            return CreateCommandStartScript(
                'TargetContainer',
                'Main UI',
                'DestroyTarget',
                [targetStage2.getAttribute("Guid")], args.callbackCommand);
            break;
        case "markTargetPendingAchievement":
            return this.MarkTarget(args.actionElem.getAttribute("TargetGuid"), "", "markTargetPendingAchievement", "", args.callbackCommand);
            break;
        case "markTargetCompleted":
            let resTarget= this.MarkTarget(args.actionElem.getAttribute("TargetGuid"), "True", "markTargetCompleted", "OnComplete", args.callbackCommand);
			this.AutoEndsIfAllTargetsCompleted();
			 return resTarget;
            break;
        case "markTargetFailed":
            let resTarget1= this.MarkTarget(args.actionElem.getAttribute("TargetGuid"), "False", "markTargetFailed", "OnFail", args.callbackCommand);
			this.AutoEndsIfAllTargetsCompleted();
			return resTarget1;
        case "checkStage":
            var _target = this._model.GetTargets();
            if (_target) {
                let trueTargets = 0;
                let falseTargets = 0;
                for (var i = 0; i < _target.length; i++) {
                    if (_target[i].getAttribute("IsActive") == "True" &&
                        _target[i].getAttribute("IsRequired") == "True") {
                        if (_target[i].getAttribute("done") == "True") {
                            trueTargets = parseInt(trueTargets) + 1
                        }
                        else {
                            falseTargets = parseInt(falseTargets) + 1
                        }
                    }
                }
                if (falseTargets > 0) {
                    this._model.arrayStage.push(0);
                    //логируем действие
                    unityCommand(CreateCommandStartScript(
                        'LogManager',
                        'CanvasManager',
                        'LoggingEvent',
                        [JSON.stringify({
                            Title: args.actionElem.querySelector("Title") != null ? args.actionElem.querySelector("Title").textContent : "",
                            CommandTypeTitle: args.actionElem.getAttribute("Guid"),
                            CommandType: "markStageFailed"
                        })]));
                    this.unSuccessful = parseInt(this.unSuccessful) + 1;
                }
                else {
                    this._model.arrayStage.push(1);
                    //логируем действие
                    unityCommand(CreateCommandStartScript(
                        'LogManager',
                        'CanvasManager',
                        'LoggingEvent',
                        [JSON.stringify({
                            Title: args.actionElem.querySelector("Title") != null ? args.actionElem.querySelector("Title").textContent : "",
                            CommandTypeTitle: args.actionElem.getAttribute("Guid"),
                            CommandType: "markStageCompleted"
                        })]));
                    this.successful = parseInt(this.successful) + 1;
                }
            }


            // var number = parseInt(this.currentIndexStage);
            var number = this._model.CheckNextStage();// number + 1;
            return CreateCommand(RP.Commands.BrowserCallFunction, "PanelControlBrowser", JSON.stringify({ NameFunction: "NewStage", Parametrs: [number] }), args.callbackCommand);
            break;
        case "markStageCompleted":

            this._model.arrayStage.push(1);
            var number = this._model.CheckNextStage();
            return CreateCommand(RP.Commands.BrowserCallFunction, "PanelControlBrowser", JSON.stringify({ NameFunction: "NewStage", Parametrs: [number] }), args.callbackCommand);
            break;
        case "markStageFailed": 
            this._model.arrayStage.push(0);
            var number = this._model.CheckNextStage();
            return CreateCommand(RP.Commands.BrowserCallFunction, "PanelControlBrowser", JSON.stringify({ NameFunction: "NewStage", Parametrs: [number] }), args.callbackCommand);
            //OnLoadActions
            break;
        case "deactivateTrigger":
            return this.DeactivateTrigger(args.actionElem, args.callbackCommand);
        case "activateTrigger":
            return this.ActivateTrigger(args.actionElem, args.callbackCommand);
            break;
        case "reloadScene":
            return CreateCommandStartScript(
                'ControlModel',
                'CanvasManager',
                'OpenScene',
                [args.callbackCommand]);
            break;
        case "startMethod":
            return this.StartMethod(args.actionElem, args.callbackCommand);
            break;
        case "showElement":
            return CreateCommand(RP.Commands.SetObjectActive,
                this._model.FindNameRpElement(this._model.GetStageElement(), args.actionElem.getAttribute("ElementGuid")),
                "true", args.callbackCommand);
            break;
        case "hideElement":
            return CreateCommand(RP.Commands.SetObjectActive,
                this._model.FindNameRpElement(this._model.GetStageElement(), args.actionElem.getAttribute("ElementGuid")),
                "false", args.callbackCommand);
            break;
        case "positionCharacter":
            return CreateCommand(RP.Commands.Coordinates,
                this._model.FindNameRpElement(this._model.GetStageCameras(), args.actionElem.getAttribute("CameraGuid")),
                "", args.callbackCommand);
            break;
        case "activateEvent":
            return CreateCommandStartScript(
                'ActionPointManager',
                'CanvasManager',
                'ActiveActionPoint',
                ["True", args.actionElem.getAttribute("EventGuid")], args.callbackCommand)
            break;
        case "deactivateEvent":
            return CreateCommandStartScript(
                'ActionPointManager',
                'CanvasManager',
                'ActiveActionPoint',
                ["False", args.actionElem.getAttribute("EventGuid")], args.callbackCommand)
            break;
        case "PlayAudio":
            //тут команда на запуск аудио
            return CreateCommandStartScript(
                'AudioManager',
                'CanvasManager',
                'CommandPlayAudio',
                [this._model.FindAudio(this._model.GetStageAudio(args.actionElem), this._model.GetGuid(args.actionElem)).replaceAll("amp;", ""), 14,
                    args.callbackCommand]);
            break;
        case "PlayVideo":
            let urlVideo = args.actionElem.getAttribute("URL");
            //const urlVideo = "https://youtu.be/YLw55x-zOSo";
            //let targetGuid = args.actionElem.getAttribute("ElementGuid");
            //let targetGuid = null;
            //if (urlVideo != null && urlVideo != "") {
            //    if (targetGuid) {
            //        const targetObjName = this._model.FindNameRpElement(this._model.GetStageElement(), targetGuid);
            //        //const targetObjName = "";
            //        return CreateCommand(RP.Commands.BrowserManager, targetObjName, JSON.stringify({
            //            url: urlVideo
            //        }), args.callbackCommand);
            //    }
            //    else {
            //        let openVideo = CreateCommand(RP.Commands.BrowserManager, "VideoPanel", JSON.stringify({
            //            url: urlVideo
            //        }), args.callbackCommand);

            //        return CreateCommand(34, "", JSON.stringify({
            //            Name: "VideoPanel",
            //            ParentObjectName: "Main UI",
            //            RightBorder: 300,
            //            PositionType: 3,
            //            HasButton: true,
            //            ButtonTitle: "Закрыть",
            //            TopBorder: 100,
            //            LeftBorder: 300,
            //            BottomBorder: 100
            //        }), openVideo);
            //    }
            //}
            //else {
            //    urlVideo = args.actionElem.getAttribute("PathVideo");
            return CreateCommandStartScript(
                'VideoManager',
                'CanvasManager',
                'LoadVideoAndPlay', [args.actionElem.getAttribute("PanelId"), urlVideo, args.callbackCommand]);
                //return CreateCommandStartScript(
                //    'VideoManager',
                //    'CanvasManager',
                //    'PlayVideo', [this._model.FindNameRpElement(this._model.GetStageElement(), targetGuid), urlVideo, args.callbackCommand]);
            //}
            break;
        case "StartPresentationOnScene":
            //показать презентацию на сцене                 
            return this.StartPresentation(args.actionElem, args.callbackCommand, false);
            break;
        case "StartPresentationOnPanel":
            //показать презентацию на панеле                    
            return this.StartPresentation(args.actionElem, args.callbackCommand, true);
            break;
        case "NextSlide":
            //следующий слайд
            return CreateCommand(75, "", "", args.callbackCommand);
            break;
        case "PrevSlide":
            //предыдущий слайд
            return CreateCommand(76, "", "", args.callbackCommand);
            break;
        case "ClosePresentation":
            //закрыть презентацию
            return CreateCommand(77, "", "", args.callbackCommand);
            break;
        case "DestroyVideoPanel":
            //закрыть презентацию
            return CreateCommand(36, "", JSON.stringify({
                Name: "VideoPanel"
            }), args.callbackCommand);
            break;
        //StartRoute
        case "StartTrack":
            //надо дописать
            return CreateCommandStartScript(
                'ManagerRaceBiatlon',
                'CanvasManager',
                'MoveRoute', [args.actionElem.getAttribute("Time"), this._model.FindNameRpElement(this._model.GetStageRoutes(), args.actionElem.getAttribute("TrackGuid")), args.callbackCommand]);
            break;
        case "CreatePanel":
            return this.CreatePanel(args.actionElem, args.callbackCommand);
        case "DeletePanel":
            return CreateCommand(36, "", JSON.stringify({
                Name: args.actionElem.getAttribute("PanelId")
            }), args.callbackCommand);
        case "ShowText":
            return CreateCommand(RP.Commands.ShowModalWindow, "", JSON.stringify({
                Text: args.actionElem.querySelector("Text").textContent,
                Delay: args.actionElem.getAttribute("Time"),
                Type: args.actionElem.getAttribute("DisplayTypeId"),
                Ignorable: (args.actionElem.getAttribute("CanClose") == "True") ? "true" : "false",
                PreDelay: args.actionElem.getAttribute("PreTime")
            }), args.callbackCommand);            
        case "openTestSdo":
            return this._model.OpenTestSdo(args.actionElem, args.callbackCommand);
        case "selectAction":
            return this.SelectAction(args.actionElem, args.callbackCommand);
        case "reloadThisStage":
            //var number = this._model.CheckNextStage();

            return CreateCommand(RP.Commands.BrowserCallFunction, "PanelControlBrowser", JSON.stringify({ NameFunction: "NewStage", Parametrs: [this._model.currentIndexStage] }), args.callbackCommand);
        case "startStage":
            var number = this._model.FindNextStage(args.actionElem.getAttribute("StageGuid"));

            return CreateCommand(RP.Commands.BrowserCallFunction, "PanelControlBrowser", JSON.stringify({ NameFunction: "NewStage", Parametrs: [number] }), args.callbackCommand);
        case "ChangeValueTriggerCounter":
            return this.TitleTrigger(args.actionElem, args.callbackCommand);
            break;
        case "CustomizablePanel":
            return this.ShowCustomizablePanel(args.actionElem, args.callbackCommand);
            break;
        case "addResource":
            let inventory = null;
            if (args.actionElem.getAttribute("ElementType") == "Armor" &&
                this._model._stageXml.getElementsByTagName("Armors").length > 0) {
                inventory = this._model._stageXml.getElementsByTagName("Armors")[0]
                    .getElementsByTagName("Armor");
            }
            else if (this._model._stageXml.getElementsByTagName("Inventory").length > 0) {
                inventory = this._model._stageXml.getElementsByTagName("Inventory")[0]
                    .getElementsByTagName("InventoryItem");
            }
            if (inventory != null) {
                for (var j = 0; j < inventory.length; j++) {
                    if (inventory[j].getAttribute("Guid") == args.actionElem.getAttribute("ResourceItemGuid")) {
                        return CreateCommand(RP.Commands.AddInventoryItem, this._model.FindNameRpElement(this._model.GetStageElement(), inventory[j].getAttribute("ElementGuid")), args.actionElem.getAttribute("IsAutoActivate"), args.callbackCommand);
                        };
                    }
            }
            else {
                return args.callbackCommand;
            }
            break;
        case "deleteResource":
            return CreateCommand(RP.Commands.RemoveInventoryItem, "", args.actionElem.getAttribute("ResourceItemGuid"), args.callbackCommand);
            break;
        case "setInventoryProperties":
            // присвоить новые св-ва инвентаря 
            let propertyInventory = {
                Inventory_Id: args.actionElem.getAttribute("ResourceItemGuid"),
                PropertyName: this._model.GetPropertyNameInventoryItem(this._model.GetStageInventoryItem(args.actionElem.getAttribute("ResourceItemGuid")), args.actionElem.getAttribute("PropertyGuid")),// args.actionElem.getAttribute("NameProperty"),
                Type: "str",//str/integer
                Value: args.actionElem.getAttribute("Value")
            };
            return CreateCommand(RP.Commands.SetPropertyInventory, "", JSON.stringify(propertyInventory), args.callbackCommand);
            break;
        case "inUncreaseInventoryProperties":
            // Увеличить/уменьшить значение св-в
            //let value = parseInt(args.actionElem.getAttribute("value"));
            //if (args.actionElem.getAttribute("state") == "Uncrease") {
            //    value = value - 1;
            //}
            //else {
            //    value = value + 1;
            //}
            let propertyInventory2 = {
                Inventory_Id: args.actionElem.getAttribute("ResourceItemGuid"),
                PropertyName: this._model.GetPropertyNameInventoryItem(this._model.GetStageInventoryItem(args.actionElem.getAttribute("ResourceItemGuid")), args.actionElem.getAttribute("PropertyGuid"))
                //Type: "line/integer",
               // Value: value
            };
            return CreateCommand(RP.Commands.SetPropertyInventory, args.actionElem.getAttribute("State"), JSON.stringify(propertyInventory2), args.callbackCommand);
            break;
        case "attachObject":
            let paramsAttach = JSON.parse(args.params);
            paramsAttach.TypeAttach = args.actionElem.getAttribute("TypeAttach");

            paramsAttach.ParametrAttach = this._model.AddParamInventory(paramsAttach.IdInventory, paramsAttach.IdClickObject);

            return CreateCommand(RP.Commands.AttachObject, "true", JSON.stringify(paramsAttach), args.callbackCommand);
        case "unattachObject":
            //необходимо добавить Guid предмета инвентаря, который открепляем
            let params = JSON.parse(args.params);
            params.IdInventory = args.actionElem.getAttribute("ResourceItemGuid");
            return CreateCommand(RP.Commands.AttachObject, "false", JSON.stringify(params), args.callbackCommand);
            break;
        case "fireEvent":
            return args.callbackCommand;
        case "cameraVisualize":
            return CreateCommand(RP.Commands.CameraVisualize, args.actionElem.getAttribute("PanelId"),
                this._model.FindNameRpElement(this._model.GetStageCameras(), args.actionElem.getAttribute("CameraGuid")), args.callbackCommand);
        case "actionOnButton":
            let propertyActionOnButton = {
                Title: args.actionElem.getAttribute("ButtonTitle"),
                Key: args.actionElem.getAttribute("Key"),
                Interactable: args.actionElem.getAttribute("Interactable"),
                ShowTopPanelKey: args.actionElem.getAttribute("ShowTopPanelKey"),
                Command: CreateCommand(RP.Commands.BrowserCallFunction, "PanelControlBrowser", JSON.stringify({ NameFunction: "StartAction", Parametrs: [args.actionElem.getAttribute("ActionGuid") ] })) 
            };
            return CreateCommand(RP.Commands.RegHotKey, "",
                JSON.stringify(propertyActionOnButton), args.callbackCommand);
        case "paint":
            let paramPaint = {
                urlTexture: this._model.GetUrlImage(args.actionElem).replaceAll("amp;", ""),
                color: {
                    r: args.actionElem.querySelector("BackgroundColor").getAttribute("r"),
                    g: args.actionElem.querySelector("BackgroundColor").getAttribute("g"),
                    b: args.actionElem.querySelector("BackgroundColor").getAttribute("b")
                }
            }; 
            return CreateCommand(RP.Commands.Paint, this._model.FindNameRpElement( this._model.GetStageElement(), args.actionElem.getAttribute("ElementGuid")),
                JSON.stringify(paramPaint), args.callbackCommand);
        case "weather":
            //надо дописать
            return CreateCommandStartScript(
                'WeatherControl',
                'Main Camera',
                'ActiveWeather', [args.actionElem.getAttribute("Precipitation"), args.actionElem.getAttribute("Temperature"), args.actionElem.getAttribute("FogPercent"), args.actionElem.getAttribute("IsDay")], args.callbackCommand);
            break;
        case "activateDialog":
            return this._model.ActivateDialog(args.actionElem, args.callbackCommand);
        case "deActivateDialog":
            return CreateCommandStartScript(
                'DialogManager',
                'Main UI',
                'DeActivateDialog', [args.actionElem.getAttribute("DialogGuid")], args.callbackCommand);
		/*case "setChildObject":
            return CreateCommand(RP.Commands.SetParrent,  this._model.FindNameRpElement( this._model.GetStageElement(), args.actionElem.getAttribute("ElementGuid")),
			 this._model.FindNameRpElement( this._model.GetStageElement(), args.actionElem.getAttribute("ChildElementGuid")), args.callbackCommand);*/
		case "setEffect":
            return this.RegisterEffect(args.actionElem, args.callbackCommand);
		case "closeTestSdo":
             return CreateCommandStartScript(
                    'TestControl',
                    'CanvasManager',
                    'CloseTest', [""],args.callbackCommand);
		case "highlightElement":
            let paramOutline = {
                backLightType:args.actionElem.getAttribute("BackLightType"),
                backLightThickness:args.actionElem.getAttribute("BackLightThickness"),
                color: {
                    r: args.actionElem.querySelector("BackgroundColor").getAttribute("r"),
                    g: args.actionElem.querySelector("BackgroundColor").getAttribute("g"),
                    b: args.actionElem.querySelector("BackgroundColor").getAttribute("b")
                }
            }; 
            return CreateCommand(RP.Commands.HighlightElement, this._model.FindNameRpElement( this._model.GetStageElement(), args.actionElem.getAttribute("ElementGuid")),
                JSON.stringify(paramOutline), args.callbackCommand);
        default:
            console.log(args.actionElem.getAttribute("Type") + "Неизвестный тег \n");
    }
}
RP.CommandMaker.prototype.RegisterEffect = function (actionElem, callbackCommand) {
	var params = {
        TypeDevices:actionElem.querySelector("DeviceId").textContent, //actionElem.getAttribute("TypeDevices"),
        Value: actionElem.querySelector("Value").textContent,
        TypeEffect: []
    };
	var types = actionElem.querySelectorAll("TypeEffect");//getElementsByTagName("TypeEffects");
	for (let type of types) {
            params.TypeEffect.push(type.textContent);
        }
    return CreateCommand(RP.Commands.RegisterVirtualObject, this._model.FindNameRpElement( this._model.GetStageElement(), actionElem.getAttribute("ElementGuid")), JSON.stringify(params), callbackCommand);
}
RP.CommandMaker.prototype.ShowCustomizablePanel = function (actionElem, callbackCommand) {

    const borderColor = actionElem.querySelector("BorderColor");
    const backgroundColor = actionElem.querySelector("BackgroundColor");
    const fontColor = actionElem.querySelector("FontColor");
    const position = actionElem.querySelector("Position");
    const rotation = actionElem.querySelector("Rotation");
   // const scale = actionElem.querySelector("Scale");

    const customParams = {
        Ignorable: actionElem.getAttribute("Ignorable"),
        IsWorld: actionElem.getAttribute("IsWorld"),
        Delay: actionElem.getAttribute("Delay"),
        Text: actionElem.querySelector("Text").textContent,
        HorAlign: actionElem.getAttribute("HorAlign"),
        VerAlign: actionElem.getAttribute("VerAlign"),
        HorMargin: actionElem.getAttribute("HorMargin"),
        VerMargin: actionElem.getAttribute("VerMargin"),
        Width: actionElem.getAttribute("Width"),
        Height: actionElem.getAttribute("Height"),
        FontSize: actionElem.getAttribute("FontSize"),
        BorderColor: {
            r: borderColor.getAttribute("r"),
            g: borderColor.getAttribute("g"),
            b: borderColor.getAttribute("b")
        },
        BackgroundColor: {
            r: backgroundColor.getAttribute("r"),
            g: backgroundColor.getAttribute("g"),
            b: backgroundColor.getAttribute("b")
        },
        FontColor: {
            r: fontColor.getAttribute("r"),
            g: fontColor.getAttribute("g"),
            b: fontColor.getAttribute("b")
        }
    };
    if (position!=null)
    {
        customParams.Position = {
            x: position.getAttribute("x").replace(",", "."),
            y: position.getAttribute("y").replace(",", "."),
            z: position.getAttribute("z").replace(",", ".")
        };
        customParams.Rotation = {
            x: rotation.getAttribute("x").replace(",", "."),
            y: rotation.getAttribute("y").replace(",", "."),
            z: rotation.getAttribute("z").replace(",", "."),
            w: rotation.getAttribute("w").replace(",", ".")
        };
        customParams.UnityItem = actionElem.querySelector("UnityItem").textContent;
        //customParams.Scale = {
        //    x: scale.getAttribute("x"),
        //    y: scale.getAttribute("y"),
        //    z: scale.getAttribute("z")
        //};
    };

    return CreateCommand(RP.Commands.ShowCustomizableWindow, "", JSON.stringify(customParams), callbackCommand);
}

RP.CommandMaker.prototype.CheckParentTarget = function (guidTarget) {
    var _target = Array.prototype.slice.call(this._model.GetTargets());
    let parentTargets = _target.filter(item => Array.prototype.slice.call(item.querySelector("Targets").getElementsByTagName("TargetRef")).find(x => x.getAttribute("TargetGuid") == guidTarget) != null);
    for (let parentTarget of parentTargets) {
        if (parentTarget != null && parentTarget.getAttribute("IsCompleteIfAllChildTargetsCompleted") == "True") {
            let childTargets = Array.prototype.slice.call(parentTarget.querySelector("Targets").getElementsByTagName("TargetRef"));
            let allTargets = [];
            for (let item of _target) {
                if (childTargets.find(x => x.getAttribute("TargetGuid") == item.getAttribute("Guid")) != null) {
                    allTargets.push(item);
                }
            }
            if (allTargets.filter(x => x.getAttribute("IsRequired") == "True").length == allTargets.filter(x => x.getAttribute("done") != null && x.getAttribute("done") == "True" && x.getAttribute("IsRequired") == "True").length) {
                unityCommand(this.MarkTarget(parentTarget.getAttribute("Guid"), "True", "markTargetCompleted", "OnComplete"));
            }
            //else if (childTargets.length == allTargets.filter(x => x.getAttribute("done") != null && x.getAttribute("done") == "False").length) {
            else if (allTargets.filter(x => x.getAttribute("done") != null && x.getAttribute("done") == "False" && x.getAttribute("IsRequired") == "True").length > 0) {
                unityCommand(this.MarkTarget(parentTarget.getAttribute("Guid"), "False", "markTargetFailed", "OnFail"));
            }
        }
    }

}
RP.CommandMaker.prototype.MarkTarget = function (targetGuid, setResult, markTarget, isComplete, callbackCommand) {
    this._model.SetTargetResult(setResult, targetGuid);
    //если цель видима необходимо отметить в Unity 
    let visible = this._model.CheckTargetVisible(targetGuid);
    let targetStage = this._model.FindTarget(targetGuid);
    if (targetStage.getAttribute("IsActive") == "True") {
        this.CheckParentTarget(targetGuid);
        if (visible) {
            return CreateCommandStartScript(
                'TargetContainer',
                'Main UI',
                'MarkTarget',
                [targetStage.getAttribute("Guid"), markTarget, (isComplete != "") ? this._model._actionManager.CreateSetCommand({ 'guid': targetStage.querySelector(isComplete).getAttribute("ActionGuid") }) : ""], callbackCommand);//
        }
        else {
            return CreateCommand(
                RP.Commands.BrowserCallFunction,
                "PanelControlBrowser",
                JSON.stringify({ NameFunction: "NextCommand", Parametrs: [(isComplete != "") ? this._model._actionManager.CreateSetCommand({ 'guid': targetStage.querySelector(isComplete).getAttribute("ActionGuid") }) : ""] }), callbackCommand );//targetStage.querySelector(isComplete).getAttribute("ActionGuid")
        }
    }
    else {
        return callbackCommand;
    }
}
RP.CommandMaker.prototype.AutoEndsIfAllTargetsCompleted = function () {
	 if (this._model._stageXml.getAttribute("IsAutoEndsIfAllTargetsCompleted") == "True"){
			var _target = Array.prototype.slice.call(this._model.GetTargets());
		//Завершение этапа по целям
			if(_target.filter(x => x.getAttribute("done") != null && x.getAttribute("done") != "" && x.getAttribute("IsActive") == "True").length == _target.filter(x => x.getAttribute("IsActive") == "True").length) {
			if (_target.filter(x => x.getAttribute("done") == "True" && x.getAttribute("IsRequired") == "True").length == _target.filter(x => x.getAttribute("IsRequired") == "True").length) {
				this._model.arrayStage.push(1);
									//логируем действие
						unityCommand(CreateCommandStartScript(
							'LogManager',
							'CanvasManager',
							'LoggingEvent',
							[JSON.stringify({
								Title: this._model._stageXml.querySelector("Title") != null ? this._model._stageXml.querySelector("Title").textContent : "",
								CommandTypeTitle: this._model._stageXml.getAttribute("Guid"),
								CommandType: "markStageCompleted"
							})]));
						this.successful = parseInt(this.successful) + 1;
			}
			else {
				this._model.arrayStage.push(0);
									//логируем действие
						unityCommand(CreateCommandStartScript(
							'LogManager',
							'CanvasManager',
							'LoggingEvent',
							[JSON.stringify({
								Title: this._model._stageXml.querySelector("Title") != null ? this._model._stageXml.querySelector("Title").textContent : "",
								CommandTypeTitle: this._model._stageXml.getAttribute("Guid"),
								CommandType: "markStageFailed"
							})]));
						this.unSuccessful = parseInt(this.unSuccessful) + 1;
			}
			let number = this._model.CheckNextStage();
			unityCommand(CreateCommand(RP.Commands.BrowserCallFunction, "PanelControlBrowser", JSON.stringify({ NameFunction: "NewStage", Parametrs: [number] })));
		}
	 }
}
RP.CommandMaker.prototype.SelectAction = function (actionElem, callbackCommand) {
    let selectAction = {
        Title: actionElem.querySelector("Title").textContent,
        Events: []
    };
    actionElem.querySelector("Actions").getElementsByTagName("ActionRef");
    let actions = actionElem.querySelector("Actions");
    if (actions != null) {
        const events = actions.getElementsByTagName("ActionRef");

        for (let event of events) {
            selectAction.Events.push({
                Text: event.querySelector("Title").textContent,
                EventGuid: event.getAttribute("ActionGuid")
            });
        }

        return CreateCommandStartScript(
            'ActionPointManager',
            'CanvasManager',
            'SelectAction', [JSON.stringify(selectAction)], callbackCommand);
    }
    return callbackCommand;
}

RP.CommandMaker.prototype.CreatePanel = function (actionElem, callbackCommand) {
    return CreateCommand(34, "", JSON.stringify({
        Name: actionElem.getAttribute("PanelId"),
        ParentObjectName: "Genaral UI",
        RightBorder: actionElem.getAttribute("RightBorder"),
        TopBorder: actionElem.getAttribute("TopBorder"),
        LeftBorder: actionElem.getAttribute("LeftBorder"),
        BottomBorder: actionElem.getAttribute("BottomBorder"),
        LockControl: actionElem.getAttribute("Interactable") != null ? actionElem.getAttribute("Interactable"):"true"
    }), callbackCommand);
}

RP.CommandMaker.prototype.StartPresentation = function (actionElem, callbackCommand, isOpenPanel) {
    let id = this._model.GetPresentationId(actionElem.getAttribute("PresentationGuid"));
    let parent = null;
    if (isOpenPanel) {
        parent = actionElem.getAttribute("PanelId");
    }
    else {
        parent = this._model.FindNameRpElement(this._model.GetStageElement(), actionElem.getAttribute("ElementGuid"));
    }
    const presentation = this._model.GetPresentation(actionElem.getAttribute("PresentationGuid"));
    let massSlide = [];
    for (let item of actionElem.querySelectorAll("SlideRef")) {
        massSlide.push(item.getAttribute("Identifier"));
    }
    let smartPresentationInfo = {
        ManageMode: presentation.getAttribute("ManageMode"),
        ParentObjectName: parent,
        ProgressBarType: presentation.getAttribute("ProgressBarType") == "Asc" ? 1 : 2,
        IsOpenPanel: isOpenPanel,
        TimerTitle: presentation.querySelector("Title").textContent,
        SlidesToPlay: massSlide,//actionElem.getAttribute("Slides").split(',').map(s => +s),
        Slides: [],
        CanSwitchSlides: actionElem.getAttribute("CanSwitchSlides"),
        CanClose: actionElem.getAttribute("CanClose"),
        Callback: callbackCommand
    };

    let visualizationType = presentation.getAttribute("VizualizationType");
    if (visualizationType == "Time") {
        smartPresentationInfo.VisualizationType = 1;
    }
    else if (visualizationType == "ProgressBar") {
        smartPresentationInfo.VisualizationType = 2;
    }
    else {
        smartPresentationInfo.VisualizationType = 3;
    }

    let fileRef = this._model.GetSmartTestPresentation(id);
    const presentationEditor = new PresentationEditor.Client("");//urlPresentationEditor);

    let command = "";

    presentationEditor.GetPresentationXml(this._courseGuid,//fileRef.querySelector("EntityId").textContent,
        fileRef.querySelector("EntityTypeId").textContent,
        fileRef.querySelector("RelativePath").textContent,
        (response) => {
            let structPresentation = response.querySelectorAll("PresentationItem");
            for (let presentationItem of structPresentation) {
                const presentationItemId = presentationItem.getAttribute("Identifier");

                let actionSetId = "";

                const actionGuid = this._model.GetActionSetGuid(presentation, presentationItemId);
                if (actionGuid != null) {//действие к слайду не будет генерироваться заранее,если это убрать actionSetId
                    actionSetId = this._model._actionManager.CreateSetCommand({ 'guid': actionGuid });//actionGuid
                }

                smartPresentationInfo.Slides.push({
                    Type: presentationItem.getAttribute("Type"),
                    Identifier: presentationItem.getAttribute("Identifier"),
                    SlideUrl: (presentationItem.querySelector("SlideUrl") != null && presentationItem.querySelector("SlideUrl").textContent != "") ? presentationItem.querySelector("SlideUrl").textContent.replaceAll("amp;", "") : (presentationItem.querySelector("VideoUrl") != null) ? presentationItem.querySelector("VideoUrl").textContent.replaceAll("amp;", ""):"",
                    AudioUrl: (presentationItem.querySelector("AudioUrl") != null) ? presentationItem.querySelector("AudioUrl").textContent.replaceAll("amp;", "") : "",
                    DurationBefore: presentationItem.querySelector("DurationBefore").textContent,
                    DurationAfter: presentationItem.querySelector("DurationAfter").textContent,
                    DurationAudio: presentationItem.querySelector("DurationAudio").textContent,
                    Text: presentationItem.querySelector("Text").textContent,
                    EnableText: presentationItem.querySelector("EnableText").textContent,
                    EnableAudio: presentationItem.querySelector("EnableAudio").textContent,
                    ActionSetId: actionSetId
                });
            }
            if (RP.localVersion) 
                unityCommand(command = CreateCommand(74, "", JSON.stringify(smartPresentationInfo)));
            else
                command = CreateCommand(74, "", JSON.stringify(smartPresentationInfo));
        });

    return command;
}

RP.CommandMaker.prototype.SearchURLforTrigger = function (ImageGuid) {
    let image = this._model._stageXml.querySelector("Images");
    if (image == null)
        return "";
    let Images = image.getElementsByTagName("Image");
    if (Images == null)
        return "";
    let imageGuid;
    for (let item of Images) {
        if (item.getAttribute("Guid") == ImageGuid) {
            imageGuid = item.getAttribute("ImageGuid");
        }
    }

    Images = this._model._xml.querySelector("ContentItem>Images").getElementsByTagName("Image");
    for (let item of Images) {
        if (imageGuid == item.getAttribute("Guid")) {
            return item.querySelector("URL").textContent;
        }
    }
}
RP.CommandMaker.prototype.DeactivateTrigger = function (actionElem, callbackCommand) {
    var triggers = this._model.GetStageTrigger();
    for (var i = 0; i < triggers.length; i++) {
        if (triggers[i].getAttribute("Guid") == actionElem.getAttribute("TriggerGuid")) {
            let rpElem = null;
            if (triggers[i].getAttribute("Type") == "Collider") {
                rpElem = this._model.FindNameRpElement(this._model.GetStageCollider(), triggers[i].getAttribute("RefGuid"));
            }
            else {
                rpElem = this._model.FindNameRpElement(this._model.GetStagePlace(), triggers[i].getAttribute("RefGuid"));
            }
            return CreateCommand(86, rpElem, JSON.stringify({
                Guid: triggers[i].getAttribute("Guid"),
                EventGuid: triggers[i].getAttribute("EventGuid"),
                Text: (triggers[i].getElementsByTagName("Title").length > 0) ? triggers[i].getElementsByTagName("Title")[0].textContent : "",
            }), callbackCommand);
            break;
        }
    }

}
RP.CommandMaker.prototype.ActivateTrigger = function (actionElem, callbackCommand) {
    var triggers = this._model.GetStageTrigger();
    for (var i = 0; i < triggers.length; i++) {
        if (triggers[i].getAttribute("Guid") == actionElem.getAttribute("TriggerGuid")) {
            let rpElem = null;
			let rpElement = null;
            let UrlImage = "";
            if (triggers[i].getAttribute("ActivationType") == "Collider") {
                rpElem = this._model.FindNameRpElement(this._model.GetStageCollider(), triggers[i].getAttribute("RefGuid"));
				rpElement = this._model.FindNameRpElement(this._model.GetStageElement(), triggers[i].getAttribute("ElementGuid"));
                let ImageGuid = triggers[i].getAttribute("ImageGuid");
                UrlImage = this.SearchURLforTrigger(ImageGuid);
            }
            else if (triggers[i].getAttribute("ActivationType") == "Place") {
                rpElem = this._model.FindNameRpElement(this._model.GetStagePlace(), triggers[i].getAttribute("RefGuid"));
            }
			else if (triggers[i].getAttribute("ActivationType") == "Object") {
                rpElem = this._model.FindNameRpElement(this._model.GetStageElement(), triggers[i].getAttribute("ElementGuid"));
            }
            let _type = 0;
            if (triggers[i].getAttribute("Type") == "Timer") {
                _type = 1;
            }
            else if (triggers[i].getAttribute("Type") == "Сounter") {
                _type = 2;
            }
            let _visualizationType = 3;
            if (triggers[i].getAttribute("VizualizationType") == "Time") {
                _visualizationType = 1;
            }
            else if (triggers[i].getAttribute("VizualizationType") == "ProgressBar") {
                _visualizationType = 2;
            }
            let _progressBarType;
            if (triggers[i].getAttribute("ProgressBarType") == "Asc") {
                _progressBarType = 1;
            }
            else if (triggers[i].getAttribute("ProgressBarType") == "Desc") {
                _progressBarType = 2;
            }
            return CreateCommand(RP.Commands.RegisterTrigger,
                rpElem,
                JSON.stringify({
                    Guid: triggers[i].getAttribute("Guid"),
                    IsCollider: triggers[i].getAttribute("IsCollider"),
                    Type: _type,
					Element: rpElement,
                    Time: triggers[i].getAttribute("TimeoutInSeconds"),
                    StartState: (triggers[i].getAttribute("StartState") != null) ? triggers[i].getAttribute("StartState") : "",
                    EndState: (triggers[i].getAttribute("EndState") != null) ? triggers[i].getAttribute("EndState") : "",
                    ActionGuid: triggers[i].getAttribute("ActionGuid"),
                    VisualizationType: _visualizationType,
                    ProgressBarType: _progressBarType,
                    Title: (triggers[i].getElementsByTagName("Title").length > 0) ? triggers[i].getElementsByTagName("Title")[0].textContent : "",
                    Text: (triggers[i].getElementsByTagName("Text").length > 0) ? triggers[i].getElementsByTagName("Text")[0].textContent : "",
                    CharIconUrl: UrlImage,
                    CheckCondition: triggers[i].getAttribute("CheckCondition"),
                    Condition: {
                        ExecutionCondition: (triggers[i].querySelector("ExecutionCondition")!=null&&triggers[i].querySelector("ExecutionCondition").textContent != "") ? triggers[i].querySelector("ExecutionCondition").textContent : "",
                        HasGot: (triggers[i].getElementsByTagName("Condition")!=null&&triggers[i].getElementsByTagName("Condition").length > 0) ? triggers[i].getElementsByTagName("Condition")[0].getAttribute("HasGot") : ""
                    }
                }), callbackCommand);// triggers[i].getAttribute("ColliderKey")
            break;
        }
    }
}

RP.CommandMaker.prototype.TitleTrigger = function (actionElem, callbackCommand) {
    var triggers = this._model.GetStageTrigger();
    for (var i = 0; i < triggers.length; i++) {
        if (triggers[i].getAttribute("Guid") == actionElem.getAttribute("TriggerGuid")) {
            return CreateCommand(87,
                "",
                JSON.stringify({
                    Title: (triggers[i].getElementsByTagName("Title").length > 0) ? triggers[i].getElementsByTagName("Title")[0].textContent : ""
                }), callbackCommand);// triggers[i].getAttribute("ColliderKey")
            break;
        }
    }
}

RP.CommandMaker.prototype.StartMethod = function (actionElem, callbackCommand) {
    var skriptKey = this._model.FindNameRpElement(this._model.GetStageScript(), actionElem.getAttribute("ScriptGuid"));
    arr = skriptKey.split('.')
    var arrayParams = [];
    var callbackMethod = false
    if (actionElem.getElementsByTagName("Params").length > 0) {
        var params = actionElem.getElementsByTagName("Params")[0]
            .getElementsByTagName("Param")
        for (var i = 0; i < params.length; i++) {
            if (params[i].getAttribute("Name") != "callback") {
                arrayParams.push(params[i].getAttribute("Value"));
            }
            else if (callbackCommand != "") {
                callbackMethod = true
                arrayParams.push(callbackCommand);
            }
        }
    }
    if (callbackMethod) {
        return CreateCommandStartScript(
            arr[1],
            arr[0],
            arr[2],
            arrayParams);
    }
    else {
        return CreateCommandStartScript(
            arr[1],
            arr[0],
            arr[2],
            arrayParams, callbackCommand);
    }
}