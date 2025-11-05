if (typeof RP === 'undefined') RP = {};

RP.SmartTestModel = function (xmlstr,courseGuid) {
    var thisObject = this;
    thisObject._xml = (new window.DOMParser()).parseFromString(xmlstr, "text/xml");
    //actionManager
    thisObject._actionManager = new RP.ActionManager(this);
    this._testSdo = new RP.TestSdo(this);
    this._dialog = new RP.Dialogs(this);
    this._commandMaker = new RP.CommandMaker(this,courseGuid);
    thisObject.arrayStage = [];
}
RP.SmartTestModel.prototype.GetCountTarget = function () {
    var count = 0;
    let stages = this._xml.getElementsByTagName("Stage");
    for (var i = 0; i < stages.length; i++) {
        if (stages[i].getAttribute("IsActive") == "True") {
            let stageAllTargets = stages[i].getElementsByTagName("Target");
            for (let j = 0; j < stageAllTargets.length; j++) {
                if (stageAllTargets[j].getAttribute("IsRequired") == "True" && stageAllTargets[j].getAttribute("IsActive") == "True") {
                    count++;
                }
            }
        }
    }
    return count;
}
RP.SmartTestModel.prototype.GetXml = function () {
    return this._xml;
}
RP.SmartTestModel.prototype.SetStage = function (stageIndex) {
    this._stageXml = this._xml.getElementsByTagName("Stage")[stageIndex];
}
RP.SmartTestModel.prototype.GetStageXml = function (stageIndex) {
    this.currentIndexStage = stageIndex;
    //this._stageXml = this._xml.getElementsByTagName("Stage")[stageIndex];
    return this._xml.getElementsByTagName("Stage")[stageIndex];
}
RP.SmartTestModel.prototype.GetStageEvents = function () {
    let stageEvents = this._stageXml.querySelector("Stage>Events");
    if (stageEvents != null) {
        return stageEvents.getElementsByTagName("Event");
    }
    return null;
}
RP.SmartTestModel.prototype.GetUrlImage = function (actionElem) {
    let stageImage = this._stageXml.querySelector("Stage>Images");
    if (stageImage != null) {
        let arrImage = stageImage.getElementsByTagName("Image");
        let currentImageGuid = actionElem.getAttribute("ImageGuid");
        for (let item of arrImage) {
            if (item.getAttribute("Guid") == currentImageGuid) {
                let temp = this._xml.querySelector("ContentItem>Images");
                let arr = temp.getElementsByTagName("Image");
                if (arr != null) {
                    for (var i = 0; i < arr.length; i++) {
                        if (arr[i].getAttribute("Guid") == item.getAttribute("ImageGuid")) {
                            if (arr[i].querySelector("URL").textContent != null
                                && arr[i].querySelector("URL").textContent != "") {
                                return arr[i].querySelector("URL").textContent;
                            }
                            else {
                                return "";
                            }
                        }
                    }
                }
                return "";
            }
        }
    }
    return "";
}

RP.SmartTestModel.prototype.FindAudio = function (array, guid) {
    if (array != null) {
        for (var i = 0; i < array.length; i++) {
            if (array[i].getAttribute("Guid") == guid) {
                if (array[i].querySelector("URL").textContent != null
                    && array[i].querySelector("URL").textContent != "") {
                    return array[i].querySelector("URL").textContent;
                }
                else {
                    return "";
                }
            }
        }
    }
    return "";
}
RP.SmartTestModel.prototype.GetStageAudio = function (actionElem) {
    let stageSounds = this._stageXml.querySelector("Stage>Audios");
    if (stageSounds != null) {
        let arrAudio = stageSounds.getElementsByTagName("Audio");
        let currentAudioGuid = actionElem.getAttribute("AudioGuid");
        for (let item of arrAudio) {
            if (item.getAttribute("Guid") == currentAudioGuid) {
                let temp = this._xml.querySelector("ContentItem>Audios");
                let arr = temp.getElementsByTagName("Audio");
                return arr;
            }
        } 
    }
    return null;
}
RP.SmartTestModel.prototype.GetGuid = function (actionElem) {
    let stageSounds = this._stageXml.querySelector("Stage>Audios");
    if (stageSounds != null) {
        let arrAudio = stageSounds.getElementsByTagName("Audio");
        let currentAudioGuid = actionElem.getAttribute("AudioGuid");
        for (let item of arrAudio) {
            if (item.getAttribute("Guid") == currentAudioGuid) {
                let currentGuid = item.getAttribute("AudioGuid");
                return currentGuid;
            }
        }
    }
    return null;
}
RP.SmartTestModel.prototype.GetStageCameras = function () {
    let stageCameras = this._stageXml.querySelector("Stage>Cameras");
    if (stageCameras != null) {
        return stageCameras.getElementsByTagName("Camera");
    }
    return null;
    //return this._stageXml.getElementsByTagName("Cameras")[0]
    //    .getElementsByTagName("Camera");
}
RP.SmartTestModel.prototype.GetStageInventoryItem = function (Guid) {
    var _inventoryItems = this.GetStageInventory();
    if (_inventoryItems != null) {
        for (let k = 0; k < _inventoryItems.length; k++) {
            if (_inventoryItems[k].getAttribute("Guid") == Guid) {
                return _inventoryItems[k];
            }
        }
    }
    return null;
}
RP.SmartTestModel.prototype.GetPropertyNameInventoryItem = function (Item, Guid) {
    if (Item != null) {
        let propertysInventory = Item.querySelector("PropertyInventory");
        if (propertysInventory != null) {
            let propertyInventory = propertysInventory.getElementsByTagName("Property");
            for (let i = 0; i < propertyInventory.length; i++) {
                if (propertyInventory[i].getAttribute("Guid") == Guid) {
                    return propertyInventory[i].querySelector("Name").textContent;
                }
            }
        }
    }
    return "";
}
RP.SmartTestModel.prototype.AddParamInventory = function (idInventory, nameAttachedObject) {
    let propertysInventory = this.GetStageInventoryItem(idInventory).querySelector("Params");
    if (propertysInventory != null) {
        let propertyInventory = propertysInventory.getElementsByTagName("Param");
        for (let i = 0; i < propertyInventory.length; i++) {
            if (this.FindNameRpElement(this.GetStageElement(), propertyInventory[i].getAttribute("ElementGuid")) == nameAttachedObject) {
                return {
                    Position: {
                        x: propertyInventory[i].querySelector("Position").getAttribute("x").replace(",", "."),
                        y: propertyInventory[i].querySelector("Position").getAttribute("y").replace(",", "."),
                        z: propertyInventory[i].querySelector("Position").getAttribute("z").replace(",", ".")
                    },
                    Rotation: {
                        x: propertyInventory[i].querySelector("Rotation").getAttribute("x").replace(",", "."),
                        y: propertyInventory[i].querySelector("Rotation").getAttribute("y").replace(",", "."),
                        z: propertyInventory[i].querySelector("Rotation").getAttribute("z").replace(",", "."),
                        w: propertyInventory[i].querySelector("Rotation").getAttribute("w").replace(",", ".")
                    },
                    Scale: {
                        x: propertyInventory[i].querySelector("Scale").getAttribute("x").replace(",", "."),
                        y: propertyInventory[i].querySelector("Scale").getAttribute("y").replace(",", "."),
                        z: propertyInventory[i].querySelector("Scale").getAttribute("z").replace(",", ".")
                    }
                };
            }
        }
    }
    return "";
}
RP.SmartTestModel.prototype.GetPropertyInventory = function (Inventory) {
    let propertyInventory = Inventory.querySelector("PropertyInventory");
    if (propertyInventory != null) {
        let property = propertyInventory.getElementsByTagName("Property");
        let params = [];
        for (let i = 0; i < property.length; i++) {
            params.push({
                Inventory_Id: property[i].getAttribute("Guid"),
                PropertyName: property[i].querySelector("Name").textContent,
                Value: (property[i].querySelector("ValueDefault")!=null)?property[i].querySelector("ValueDefault").textContent:""
            });
        }
        return params;
    }
    return null;
}
RP.SmartTestModel.prototype.GetStageInventory = function () {
    let stageInventory = this._stageXml.querySelector("Stage>Inventory");
    if (stageInventory != null) {
        return stageInventory.getElementsByTagName("InventoryItem");
    }
    return null;
}
RP.SmartTestModel.prototype.GetStageArmors = function () {
    let stageArmors = this._stageXml.querySelector("Stage>Armors");
    if (stageArmors != null) {
        return stageArmors.getElementsByTagName("Armor");
    }
    return null;
}
//изменён
RP.SmartTestModel.prototype.GetStageOnloadAction = function () {
    let stageOnLoadAction = this._stageXml.querySelector("Stage>OnLoadAction");
    if (stageOnLoadAction != null) {
        return stageOnLoadAction.getAttribute("ActionGuid");
    }
    return null;
}
RP.SmartTestModel.prototype.GetStageAction = function () {
    let stageActions = this._stageXml.querySelector("Stage>Actions");
    if (stageActions != null) {
        return stageActions.getElementsByTagName("Action");
    }
    return null;
    //console.log("ActionsAll: " + this._stageXml.querySelector("Actions").querySelector(":first-child").getElementsByTagName("Action").length);
    //console.log("ActionAll: " + this._stageXml.getElementsByTagName("Actions")[0]
    //    .getElementsByTagName("Action").length);
    //return this._stageXml.getElementsByTagName("Actions")[0]
    //    .getElementsByTagName("Action");
}
RP.SmartTestModel.prototype.GetStageSound = function () {
    let stageSounds = this._stageXml.querySelector("Stage>Audios");
    if (stageSounds != null) {
        return stageSounds.getElementsByTagName("Audio");
    }
    return null;
    //return this._stageXml.getElementsByTagName("Elements")[0]
    //    .getElementsByTagName("Element");
}
RP.SmartTestModel.prototype.GetStageElement = function () {
    let stageElements = this._stageXml.querySelector("Stage>Elements");
    if (stageElements != null) {
        return stageElements.getElementsByTagName("Element");
    }
    return null;
    //return this._stageXml.getElementsByTagName("Elements")[0]
    //    .getElementsByTagName("Element");
}
RP.SmartTestModel.prototype.GetStageTrigger = function () {
    let stageTriggers = this._stageXml.querySelector("Stage>Triggers");
    if (stageTriggers != null) {
        return stageTriggers.getElementsByTagName("Trigger");
    }
    return null;
    //return this._stageXml.getElementsByTagName("Triggers")[0]
    //    .getElementsByTagName("Trigger");
}
RP.SmartTestModel.prototype.GetNameRpElement = function (array) {
	var elementsName = [];
	if (array == null)
       return elementsName;
    for (var i = 0; i < array.length; i++) {
		if (array[i].getAttribute("ElementKey") != null
                    && array[i].getAttribute("ElementKey") != "") {
                    elementsName.push(array[i].getAttribute("ElementKey"));
                }
    }
    return elementsName;
}
RP.SmartTestModel.prototype.GetStageCollider = function () {
    let stageCollider = this._stageXml.querySelector("Stage>Colliders");
    if (stageCollider != null) {
        return stageCollider.getElementsByTagName("Collider");
    }
    return null;
    //return this._stageXml.getElementsByTagName("Colliders")[0]
    //    .getElementsByTagName("Collider");
}
RP.SmartTestModel.prototype.GetStageRoutes = function () {
    let stageCollider = this._stageXml.querySelector("Stage>Tracks");
    if (stageCollider != null) {
        return stageCollider.getElementsByTagName("Track");
    }
    return null;

}
RP.SmartTestModel.prototype.GetStagePlace = function () {
    let stagePlaces = this._stageXml.querySelector("Stage>Places");
    if (stagePlaces != null) {
        return stagePlaces.getElementsByTagName("Place");
    }
    return null;
    //return this._stageXml.getElementsByTagName("Places")[0]
    //    .getElementsByTagName("Place");
}
RP.SmartTestModel.prototype.GetStageScript = function () {
    let stageScript = this._stageXml.querySelector("Stage>Scripts");
    if (stageScript != null) {
        return stageScript.getElementsByTagName("Script");
    }
    return null;
    //return this._stageXml.getElementsByTagName("Scripts")[0]
    //    .getElementsByTagName("Script");
}
RP.SmartTestModel.prototype.GetStageSetAction = function () {
    let stageGroupAction = this._stageXml.querySelector("Stage>ActionSets");
    if (stageGroupAction != null) {
        return stageGroupAction.getElementsByTagName("ActionSet");
    }
    return null;
}
RP.SmartTestModel.prototype.GetTargets = function () {
    let stageTarget = this._stageXml.querySelector("Stage>Targets");
    if (stageTarget != null) {
        return stageTarget.getElementsByTagName("Target");
    }
    return null;
}
RP.SmartTestModel.prototype.GetPresentationId = function (presentationGuid) {
    let stagePresentations = this._stageXml.querySelector("Stage>Presentations");
    if (stagePresentations != null) {
        let stagePresentation = stagePresentations.getElementsByTagName("Presentation");
        for (let presentation of stagePresentation) {
            if (presentation.getAttribute("Guid") == presentationGuid) {
                return presentation.getAttribute("Identifier");
            }
        }
    }
    return null;
}
RP.SmartTestModel.prototype.GetPresentation = function (presentationGuid) {
    let stagePresentations = this._stageXml.querySelector("Stage>Presentations");
    if (stagePresentations != null) {
        let stagePresentation = stagePresentations.getElementsByTagName("Presentation");
        for (let presentation of stagePresentation) {
            if (presentation.getAttribute("Guid") == presentationGuid) {
                return presentation;
            }
        }
    }
    return null;
}
RP.SmartTestModel.prototype.GetActionSetGuid = function (presentation, presentationItemId) {
    const actions = presentation.querySelector("Actions").getElementsByTagName("Action");
    for (let action of actions) {
        if (action.getAttribute("Identifier") == presentationItemId) {
            return action.getAttribute("ActionGuid");
        }
    }
    return null;
}
RP.SmartTestModel.prototype.GetSmartTestPresentation = function (identifier) {
    let stagePresentations = this._xml.querySelector("ContentItem>Presentations");
    if (stagePresentations != null) {
        let stagePresentation = stagePresentations.getElementsByTagName("Presentation");
        for (let presentation of stagePresentation) {
            if (presentation.getAttribute("Identifier") == identifier) {
                return presentation.querySelector("FileRef");
            }
        }
    }
    return null;
}
RP.SmartTestModel.prototype.GetStructElement = function (Guid,params) {
    let stageElement = this._stageXml.querySelector("Stage>" + params+"s");
    if (stageElement != null) {
        let elements = stageElement.getElementsByTagName(params);
        for (let element of elements) {
            if (element.getAttribute("Guid") == Guid) {
                return element;
            }
        }
    }
    return null;
}
//RP.SmartTestModel.prototype.GetTest = function (testGuid) {
//    let stageTests = this._stageXml.querySelector("Stage>TestRefs");
//    if (stageTests != null) {
//        const tests = stageTests.getElementsByTagName("TestRef");
//        for (let test of tests) {
//            if (test.getAttribute("Guid") == testGuid) {
//                return test;
//            }
//        }
//    }
//    return null;
//}
RP.SmartTestModel.prototype.Validate = function () {
    if (this._xml.getElementsByTagName("Stage").length == 0) return false;
    return true;
}
RP.SmartTestModel.prototype.CheckTargetVisible = function (targetGuid) {
    let targetStage = this.FindTarget(targetGuid);
    if (targetStage.getAttribute("IsVisible") == "True") {
        return true;
    }
    else {
        return false;
    }
    //if (this._xml.getElementsByTagName("Stage").length == 0) return false;
    //return true;
}
RP.SmartTestModel.prototype.ValidateStage = function (number) {
    if (this._xml.getElementsByTagName("Stage").length <= number) return true;
    return false;
}
RP.SmartTestModel.prototype.ValidatePlace = function () {
    if (this._stageXml.getElementsByTagName("Places").length == 0) return false;
    return true;
}
RP.SmartTestModel.prototype.GetModelId = function (stageXml) {
    return stageXml.getElementsByTagName("ModelId")[0].textContent;
}
RP.SmartTestModel.prototype.GetHashModel = function (stageXml) {
    return stageXml.getElementsByTagName("Hash")[0].textContent;
}
RP.SmartTestModel.prototype.GetStageGuid = function (stageXml) {
    return stageXml.getAttribute("Guid");
}
RP.SmartTestModel.prototype.GetTargetTitle = function (target) {
    return target.getElementsByTagName("Title")[0].textContent;
}
RP.SmartTestModel.prototype.GetTitleStage = function () {
    return this._stageXml.getElementsByTagName("Title")[0].textContent;
}
RP.SmartTestModel.prototype.FindNameRpElement = function (array, guid) {
    if (array != null) {
        for (var i = 0; i < array.length; i++) {
            if (array[i].getAttribute("Guid") == guid) {
                if (array[i].getAttribute("ElementKey") != null
                    && array[i].getAttribute("ElementKey") != "") {
                    return array[i].getAttribute("ElementKey");
                }
                else {
                    return array[i].getAttribute("ScriptKey");
                }
            }
        }
    }
    return "";
}
RP.SmartTestModel.prototype.FindAllActions = function (elements) {
    if (elements == null)
        return null;
    var actionElement = [];
    for (var i = 0; i < elements.length; i++) {
        actionElement.push(this.FindActionGuid(elements[i].getAttribute("ActionGuid")));
    }
    return actionElement;
}
RP.SmartTestModel.prototype.FindActionGuid = function (guid) {
    var actions = this.GetStageAction();
    if (actions == null)
        return null;
    for (var i = 0; i < actions.length; i++) {
        if (actions[i].getAttribute("Guid") == guid) {
            return actions[i];
            break;
        }
    }
    return null;
}
//RP.SmartTestModel.prototype.RecursionCreateCommand = function (idCollection, actionElem, index) {
//    return this._commandMaker.RecursionCreateCommand(idCollection, actionElem, index);
//}
RP.SmartTestModel.prototype.FormingCommand = function (args) {//actionElem, callbackCommand
    return this._commandMaker.FormingCommand(args);//actionElem, callbackCommand
}

RP.SmartTestModel.prototype.OpenTestSdo = function (actionElem, callbackCommand) {
    return this._testSdo.Open(actionElem, callbackCommand);
}
RP.SmartTestModel.prototype.ActivateDialog = function (actionElem, callbackCommand) {
    return this._dialog.Activate(actionElem, callbackCommand);
}

RP.SmartTestModel.prototype.FindTarget = function (targetGuid) {
    console.log("Find Target");
    var _target = this.GetTargets();
    for (var i = 0; i < _target.length; i++) {
        if (_target[i].getAttribute("Guid") == targetGuid) {
            return _target[i];
            break;
        }
    }
    return null;
}
RP.SmartTestModel.prototype.SetTargetResult = function (result, targetGuid) {
    console.log("SetTargetResult ");
    let target = this.FindTarget(targetGuid);
    if (target != null) {
        target.setAttribute("done", result)
    }
}
RP.SmartTestModel.prototype.SetVisibleTargets = function (target, callback) {
    let _targetVisible = null;
    let childTargets = target.querySelector("Targets").getElementsByTagName("TargetRef");
    if (childTargets.length > 0) {
        _targetVisible = CreateCommandStartScript(
            'TargetContainer',
            'Main UI',
            'AddTarget',
            [this.GetTargetTitle(target), target.getAttribute("Guid"), target.querySelector("OnClick").getAttribute("ActionGuid"), ""]
        );
        unityCommand(_targetVisible);
        for (var j = 0; j < childTargets.length; j++) {
            let childTarget = this.FindTarget(childTargets[j].getAttribute("TargetGuid"));
            //let childTarget = target.find(item => item.getAttribute("Guid") == childTargets[j].getAttribute("TargetGuid"));
            if (childTarget.getAttribute("IsVisible") == "True") {
                _targetVisible = CreateCommandStartScript(
                    'TargetContainer',
                    'Main UI',
                    'AddTarget',
                    [this.GetTargetTitle(childTarget), childTarget.getAttribute("Guid"), childTarget.querySelector("OnClick").getAttribute("ActionGuid"), target.getAttribute("Guid")]);
                unityCommand(_targetVisible);
            }
        }
        return callback;
    }
    else {
        return CreateCommandStartScript(
            'TargetContainer',
            'Main UI',
            'AddTarget',
            [this.GetTargetTitle(target), target.getAttribute("Guid"), target.querySelector("OnClick").getAttribute("ActionGuid"), ""], callback
        );
    }
    
}
RP.SmartTestModel.prototype.CheckCurrentStage = function (indexstage) {
    let idStage = indexstage;
    while (true) {
        if (!this.ValidateStage(idStage)) {
            if (this._xml.getElementsByTagName("Stage")[idStage].getAttribute("IsActive") == "True") {
                break;
            }
            else {
                idStage = idStage + 1;
            }
        }
        else {
            idStage = 0;//запускаем первый этап, если нет активных
            break;
        }
    }
    return idStage;
}
RP.SmartTestModel.prototype.CheckNextStage = function () {
    let idStage = parseInt(this.currentIndexStage);
    idStage = idStage + 1;
    while (true) {
        if (!this.ValidateStage(idStage)) {
            if (this._xml.getElementsByTagName("Stage")[idStage].getAttribute("IsActive") == "True") {
                break;
            }
            else {
                idStage = idStage + 1;
            }
        }
        else {
            break;
        }
    }
    return idStage;
}
RP.SmartTestModel.prototype.FindNextStage = function (guid) {
    let stages = this._xml.querySelector("ContentItem>Stages");
    if (stages != null) {
        let allStage = stages.getElementsByTagName("Stage");
        for (var i = 0; i < allStage.length; i++) {
            if (allStage[i].getAttribute("Guid") == guid) {
                return i;
            }
        }
    }
    return "";
}


