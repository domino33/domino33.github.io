
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
        CommandType: 6,
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

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });

}