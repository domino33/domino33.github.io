if (typeof RP === 'undefined') RP = {};

RP.TestSdo = function (smartTestModel) {
    this._smartTestModel = smartTestModel;
}

RP.TestSdo.prototype.Open = function (actionElem, callbackCommand) {
    const testMode = actionElem.getAttribute("TestMode");

    this._xml = this._smartTestModel.GetStructElement(actionElem.getAttribute("TestRefGuid"), "TestRef");
    if (this._xml != null) {
        this._questions = this._xml.getElementsByTagName("Question");
        // this._callback = callbackCommand;
        switch (testMode) {
            case "Default":
                return CreateCommandStartScript(
                    'TestControl',
                    'CanvasManager',
                    'OpenTestDefault', [this._xml.getElementsByTagName("Url")[0].textContent, actionElem.getAttribute("TestRefGuid"), this._xml.getAttribute("RefGuid"), callbackCommand]);
            case "Camera":
                const cameraName = this._smartTestModel.FindNameRpElement(this._smartTestModel.GetStageCameras(), actionElem.getAttribute("CameraGuid"));

                return CreateCommandStartScript(
                    'TestControl',
                    'CanvasManager',
                    'OpenTestCamera', [this._xml.getElementsByTagName("Url")[0].textContent, cameraName, actionElem.getAttribute("TestRefGuid"), this._xml.getAttribute("RefGuid"), callbackCommand]);
        }
    }
    return callback;
}
RP.TestSdo.prototype.OnBeforeStartTest = function (testGuid) {
    this._xml = this._smartTestModel.GetStructElement(testGuid, "TestRef");
    let idComplete = this.PerformActions(this._xml.querySelector("Finally"), "OnBeforeStart", "");
    unityCommand(this._smartTestModel._actionManager.CreateCallbackCollection(idComplete));
}
RP.TestSdo.prototype.OnBeforeStartQuestion = function (testGuid, questionGuid) {
    this._xml = this._smartTestModel.GetStructElement(testGuid, "TestRef");
    this._questions = this._xml.getElementsByTagName("Question");
    let targetQuestion;
    for (let question of this._questions) {
        if (question.getAttribute("RefGuid") == questionGuid) {
            targetQuestion = question;
            break;
        }
    }
    let idComplete = this.PerformActions(targetQuestion.querySelector("Finally"), "OnBeforeStartQuestion", "");
    unityCommand(this._smartTestModel._actionManager.CreateCallbackCollection(idComplete));
}
RP.TestSdo.prototype.QuestionButtonCheck = function (isTrue, questionGuid, testGuid, answerGuid) {
    this._xml = this._smartTestModel.GetStructElement(testGuid, "TestRef");
    this._questions = this._xml.getElementsByTagName("Question");
    let targetQuestion;
    for (let question of this._questions) {
        if (question.getAttribute("RefGuid") == questionGuid) {
            targetQuestion = question;
            break;
        }
    }
    let idComplete;
    for (let answer of targetQuestion.querySelectorAll("Answers>Answer")) {
        if (answerGuid == answer.getAttribute("RefGuid")) {
            idComplete = this.PerformActions(answer, isTrue.toLowerCase() == "true" ? "OnClick" : "OnUnClick", "");
            break;
        }
    }
    if (idComplete != "") {
        unityCommand(this._smartTestModel._actionManager.CreateCallbackCollection(idComplete));
    }
}

RP.TestSdo.prototype.CheckQuestion = function (isTrue, questionGuid, testGuid,structAnswer) {
    console.log("checking question...");
    console.log("isTrue - " + isTrue + ", questionGuid - " + questionGuid);
    this._xml = this._smartTestModel.GetStructElement(testGuid, "TestRef");
    this._questions = this._xml.getElementsByTagName("Question");
    let targetQuestion;

    for (let question of this._questions) {
        if (question.getAttribute("RefGuid") == questionGuid) {
            targetQuestion = question;
            break;
        }
    }

    let idComplete = this.PerformActions(targetQuestion, "OnAnswer","");
    let idResult = this.PerformActions(targetQuestion, isTrue.toLowerCase() == "true" ? "OnAnswerRight" : "OnAnswerWrong", idComplete);
    let massAnswer = [];
    let answers = JSON.parse(structAnswer);
    let guid = "";
    for (var i = 0; i < answers.Items.length; i++) {
        for (let answer of targetQuestion.querySelectorAll("Answers>Answer")) {
            if (answers.Items[i].identifier == answer.getAttribute("RefGuid")) {
                guid = this.PerformActions(answer, answers.Items[i].isPicked == true ? "OnSelect" : "OnUnselect", massAnswer.length > 0 ? massAnswer[massAnswer.length - 1] : idResult);
                if (guid != "" && guid != (massAnswer.length > 0 ? massAnswer[massAnswer.length - 1] : idResult)) {
                    massAnswer.push(guid);
                }  
                break;
            }
        }
    }    
    unityCommand(this._smartTestModel._actionManager.CreateCallbackCollection(massAnswer.length > 0 ? massAnswer[massAnswer.length - 1] : idResult));
}

RP.TestSdo.prototype.PerformActions = function (object, selector,callbackId) {
    const targetActions = object.querySelector(selector + ">Action");

    if (targetActions != null && targetActions != "" && targetActions.getAttribute("ActionGuid") !="00000000-0000-0000-0000-000000000000") {
        return this._smartTestModel._actionManager.CreateSetCommand({ 'guid': targetActions.getAttribute("ActionGuid"), 'callbackIdCollection': callbackId });//targetActions.getAttribute("ActionGuid"), callbackId
    }
    else if (callbackId != "") {
        return callbackId;
    }
    else {
        return "";
    }
}

RP.TestSdo.prototype.Close = function (isSuccesfullyTest, guidTest, callback ) {
    console.log("Test is success: " + isSuccesfullyTest);
    this._xml = this._smartTestModel.GetStructElement(guidTest, "TestRef");
    let ex = [];
    try {
        let result = JSON.parse(callback);
        let idCollection = JSON.parse(result.Params);
        ex = idCollection.Parametrs;
    }
    catch (e) {
        ex.push("");
    }
    
    let idComplete = this.PerformActions(this._xml.querySelector("Finally"), "OnComplite", ex[0]);
    let idResult = this.PerformActions(this._xml.querySelector("Finally"), isSuccesfullyTest == "true" ? "OnSuccess" : "OnFail", idComplete);
    //this.PerformActions(this._xml.querySelector("Finally"), isSuccesfullyTest == "true" ? "OnSuccess" : "OnFail");
    //this.PerformActions(this._xml.querySelector("Finally"), "OnComplete");
    unityCommand(this._smartTestModel._actionManager.CreateCallbackCollection(idResult));
    //unityCommand(this._callback);
}