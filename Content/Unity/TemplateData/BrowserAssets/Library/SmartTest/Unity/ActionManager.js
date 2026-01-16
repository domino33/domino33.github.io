if (typeof RP === 'undefined') RP = {};
/////
RP.ActionManager = function (smartTestModel) {
    this._smartTestModel = smartTestModel;
    this.ActionStack = [];
}
//создали коллекцию
RP.ActionManager.prototype.CreateActionCollection = function(type, callbackId) {
    let collection = {
        id: uuidv4(),
        completedCommands: -1,//
        isParallel: type,
        SuccesAction: [],
        callbackIdCollection: callbackId
    };
    this.ActionStack.push(collection);
    return collection.id;
}
//добавили в очередь
RP.ActionManager.prototype.AddNextSuccess = function(idCollection, command) {
    let elemStack = this.ActionStack.find(item => item.id == idCollection);
    elemStack.SuccesAction.push(command);
}
//создали callback на извлечение из очереди
RP.ActionManager.prototype.CreateCallbackCollection = function(idCollection) {
    return CreateCommand(RP.Commands.BrowserCallFunction, "PanelControlBrowser", JSON.stringify({ NameFunction: "NextCommand", Parametrs: [idCollection] }));
} 

//поиск ActionSet
RP.ActionManager.prototype.FindSetAction = function (guid) {
    var setsAction = this._smartTestModel.GetStageSetAction();
    if (setsAction != null) {
        for (let setAct of setsAction) {
            if (setAct.getAttribute("Guid") == guid) {
                return setAct;
                break;
            }
        }
    }
    return null;
}
//Создать сет
RP.ActionManager.prototype.CreateSetCommand = function (args) {//guid, callbackIdCollection = ""//,params
    let set = this.FindSetAction(args.guid);
    if (set == null) {
        let action = this._smartTestModel.FindActionGuid(args.guid);
        if (action != null) {
            let idCollectionAction = this.CreateActionCollection("False", args.callbackIdCollection);
            let commandSet = this.CreateCallbackCollection(idCollectionAction);
            let componentsCommand = {
                actionElem: action,
                callbackCommand: commandSet,
                params: args.params
                //Action: action,
                //callback: commandSet,
            };
            this.AddNextSuccess(idCollectionAction, componentsCommand);
            return idCollectionAction;
        }
        else {
            return "";
        }   
    }
    let targetActions = set.querySelector("ActionSet>Actions").getElementsByTagName("ActionRef");
    if (targetActions.length == 0) {
        return this.CreateActionCollection("False", args.callbackIdCollection);
    }
    let targetAction = targetActions[0];
    let idCollection = this.CreateActionCollection(set.getAttribute("IsParallel"), args.callbackIdCollection);
    let checkRandom = false;
    if (set.getAttribute("IsRandom") == "True") {
        let Actions = set.querySelector("ActionSet>Actions").getElementsByTagName("ActionRef");
        let max = Actions.length;
        targetActions = Actions[Math.floor(Math.random() * max)];
        checkRandom = true;
        targetAction = targetActions
    }
    for (var i = 0; checkRandom || i < targetActions.length; i++) {
        if (!checkRandom) {
            targetAction = targetActions[i];
        }
        checkRandom = false;

        if (targetAction.getAttribute("IsSet") == "True") {
            let newCollectionId = this.CreateSetCommand({ 'guid': targetAction.getAttribute("ActionGuid"), 'callbackIdCollection': idCollection, 'params': args.params }); //targetAction.getAttribute("ActionGuid"), idCollection
            if (newCollectionId != "") {
                let command = this.CreateCallbackCollection(newCollectionId);
                let componentsCommand1 = {
                    actionElem: "",
                    callbackCommand: command,
                };
                this.AddNextSuccess(idCollection, componentsCommand1);//command
            }
        }
        else {
            let command2 = this.CreateCallbackCollection(idCollection);
            let componentsCommand2 = {
                actionElem: this._smartTestModel.FindActionGuid(targetAction.getAttribute("ActionGuid")),
                callbackCommand: command2,
                params: args.params
            };
            this.AddNextSuccess(idCollection, componentsCommand2);
        }
    }
    return idCollection;
}
RP.ActionManager.prototype.FindCollection = function (id) {
    let indexElem = this.ActionStack.findIndex(item => item.id === id);
    if (indexElem != -1) {
        return true;
    }
    else {
        return false;
    }
}
//извлечь из очереди команду
RP.ActionManager.prototype.QueueExtract = function (idCollection) {
    let elemStack = this.ActionStack.find(item => item.id == idCollection);
    if (elemStack == null || elemStack == "") {
        return;
    }
    if (elemStack.isParallel == "True") {
        if (parseInt(elemStack.completedCommands) == -1) {
            if (elemStack.SuccesAction.length == 0) {
                this.CheckCollection(elemStack);
                return;
            }
            this.SendAllCommand(elemStack.SuccesAction);
            elemStack.completedCommands = 0;
        }
        else {
            elemStack.completedCommands = parseInt(elemStack.completedCommands) + 1;
            if (elemStack.SuccesAction.length == parseInt(elemStack.completedCommands)) {
                this.CheckCollection(elemStack);
            }
        }
    }
    else {
        if (elemStack.SuccesAction.length > 0) {
            let command = elemStack.SuccesAction.shift();
            unityCommand(this.ExtractAndCreate(command));        
        }
        else {
            this.CheckCollection(elemStack);
        }
    }
}
RP.ActionManager.prototype.ExtractAndCreate = function (succesAction){
    if (succesAction.actionElem != "") {
        return this._smartTestModel.FormingCommand(succesAction); //succesAction.Action, succesAction.callback//{ 'actionElem': succesAction.Action, 'callbackCommand': succesAction.callback }
    }
    else {
        return succesAction.callbackCommand;
    }
    
}
RP.ActionManager.prototype.SendAllCommand = function (actionMass) {
    actionMass.forEach(element => unityCommand(this.ExtractAndCreate(element)));
}
RP.ActionManager.prototype.CheckCollection = function (elemStack) {
    if (elemStack.callbackIdCollection != null && elemStack.callbackIdCollection != "") {
        unityCommand(this.CreateCallbackCollection(elemStack.callbackIdCollection));
    }
    let indexElem = this.ActionStack.findIndex(item => item.id === elemStack.id);
    if (indexElem != -1) {
        this.ActionStack.splice(indexElem, 1);
    }
}