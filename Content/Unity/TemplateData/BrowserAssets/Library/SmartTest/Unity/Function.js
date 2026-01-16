
String.prototype.replaceAll = function (search, replace) {
    return this.split(search).join(replace);
}
function CreateCommand(typeCommand, object, params, OnSuccess, preTime, afterTime) {
    let command = {
        CommandType: typeCommand,
        GameObject: object,
        OnSuccess: OnSuccess,
        Params: params,
        PreTime: preTime,
        AfterTime: afterTime
    };
    
    let json = JSON.stringify(command);
    return json;
}
function CreateCommandStartScript(scriptName, objName, methodName, parameters, OnSuccess, preTime, afterTime) {
    let script = {
        scriptName: scriptName,
        objName: objName,
        methodName: methodName,
        parameters: parameters
    };
    let command = {
        CommandType: RP.Commands.RunUnityScript,
        GameObject: "",
        OnSuccess: OnSuccess,
        Params: JSON.stringify(script),
        PreTime: preTime,
        AfterTime: afterTime
    };
    let json = JSON.stringify(command);
   // let js1 = json.replaceAll("\\\\", "");
    return json;
    // return JSON.stringify(script);
}
//создали коллекцию
//function CreateActionCollection(type,callbackId) {
//    let collection = {
//        id: uuidv4(),
//        completedCommands : -1,//
//        isParallel: type,
//        SuccesAction: [],
//        callbackIdCollection: callbackId
//    };
//    if (typeof ActionStack === 'undefined') {
//        ActionStack = [];
//    }
//    ActionStack.push(collection);
//    return collection.id;
//}
////добавили в очередь
//function AddNextSuccess(idCollection, command) {
//    let elemStack = ActionStack.find(item => item.id == idCollection);
//    elemStack.SuccesAction.push(command);
//}
////создали callback на извлечение из очереди
//function CreateCallbackCollection(idCollection) {
//   return CreateCommand(RP.Commands.BrowserCallFunction, "PanelControlBrowser", JSON.stringify({ NameFunction: "NextCommand", Parametrs: [idCollection] }));
//} 

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });

}
//function CreatePlace() {
//    var currentStage = dataxml.getElementsByTagName("Stage")[StageNumber];
//    if (currentStage.getElementsByTagName("Places").length > 0) {
//        var place = currentStage.getElementsByTagName("Places")[0]
//            .getElementsByTagName("Place");
//        for (var i = 0; i < place.length; i++) {
//            const placeCommand = CreateCommand(56, place[i].getAttribute("ElementKey"));
//            unityCommand(placeCommand);
//        }
//    }

//}
//function FindRpElem(struct,elemGuid) {
//    for (var i = 0; i < struct.length; i++) {
//        if (struct[i].getAttribute("Guid") == elemGuid) {
//            if (struct[i].getAttribute("ElementKey") != null
//                && struct[i].getAttribute("ElementKey") !="") {
//                return struct[i].getAttribute("ElementKey");
//            }
//            else {
//                return struct[i].getAttribute("ScriptKey");
//            }

//        }
//    }
//    return "";
//}