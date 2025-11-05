if (typeof RP === 'undefined') RP = {};

RP.Dialogs = function (smartTestModel) {
    this._smartTestModel = smartTestModel;
}
RP.Dialogs.prototype.Activate = function (actionElem, callbackCommand) {

    this._xml = this._smartTestModel.GetStructElement(actionElem.getAttribute("DialogGuid"),"DialogRef");
    if (this._xml != null) {
        let paramDialog = {
            GuidDialog: actionElem.getAttribute("DialogGuid"),
            NameTalking: actionElem.getElementsByTagName("Text")[0].textContent,
            GameObjectTalking: this._smartTestModel.FindNameRpElement(this._smartTestModel.GetStageElement(), actionElem.getAttribute("ElementGuid")),
            DialogStates: []
        }; 
        //const presentationEditor = new PresentationEditor.Client(urlPresentationEditor);
        //presentationEditor.GetPresentationXml(fileRef.querySelector("EntityId").textContent,
        //    fileRef.querySelector("EntityTypeId").textContent,
        //    fileRef.querySelector("RelativePath").textContent,
        //    (response) => {
        //    });
        //
        let exampleDialogs = this._smartTestModel._xml.querySelector("ContentItem>Dialogs");
        if (exampleDialogs != null) {
            let dialogItems = exampleDialogs.getElementsByTagName("DialogItem");
            for (let dialogItem of dialogItems) {
                if (dialogItem.getAttribute("Guid") == this._xml.getAttribute("RefGuid")) {
                    let dialogState = dialogItem.querySelector("DialogStates");
                    if (dialogState != null) {
                        let dialogStates = dialogState.getElementsByTagName("DialogState");
                        for (let dialog of dialogStates) {
                            let answerDialog = dialog.querySelector("AnswerDialogs");
                            let arrayAnswer = [];
                            if (answerDialog != null) {
                                let answerDialogs = answerDialog.getElementsByTagName("AnswerDialog");
                                for (let answer of answerDialogs) {
                                    arrayAnswer.push({
                                        Guid: answer.getAttribute("Guid"),
                                        DialogStateGuid: answer.getAttribute("NodeGuid"),
                                        Text: answer.querySelector("Title").textContent
                                    });
                                }
                            }
                            paramDialog.DialogStates.push({
                                Guid: dialog.getAttribute("Guid"),
                                Text: dialog.querySelector("Text").textContent,
                                IsInitial: (this.GetGuidDialogRef(this._xml,dialog.getAttribute("Guid")) == actionElem.getAttribute("InitialDialogState"))?"true":"false",
                                UrlAudio: (dialog.querySelector("AudioUrl") != null && dialog.querySelector("AudioUrl").textContent != "") ? dialog.querySelector("AudioUrl").textContent.replaceAll("amp;", "") : "",
                                Answers: arrayAnswer
                            });
                        }
                    }

                }
            }
        }
        return CreateCommandStartScript(
            'DialogManager',
            'Main UI',
            'ActivateDialog', [JSON.stringify(paramDialog)], callbackCommand);
    }
    return callback;
}
RP.Dialogs.prototype.GetGuidDialogRef = function (xmlRef, guidDialogState) {
    let dialogState = xmlRef.querySelector("DialogStates");
    if (dialogState != null) {
        let dialogStates = dialogState.getElementsByTagName("DialogState");
        for (let dialog of dialogStates) {
            if (dialog.getAttribute("RefGuid") == guidDialogState) {
                return dialog.getAttribute("Guid")
            }
        }
    }
    return guidDialogState;
}
RP.Dialogs.prototype.OnBeforeStartDialog = function (dialogGuid, guidDialogState) {
    this._xml = this._smartTestModel.GetStructElement(dialogGuid, "DialogRef");
    let idComplete = this.PerformActions(this._xml.querySelector("Finally"), "OnBeforeStart", "");
    this._questions = this._xml.getElementsByTagName("DialogState");
    let targetQuestion;
    for (let question of this._questions) {
        if (question.getAttribute("RefGuid") == guidDialogState) {
            targetQuestion = question;
            break;
        }
    }
    let idResult = this.PerformActions(targetQuestion, "OnBeforeStartDialogState", idComplete);
    unityCommand(this._smartTestModel._actionManager.CreateCallbackCollection(idResult));
}
RP.Dialogs.prototype.OnClickAnswerDialog = function (dialogGuid, guidDialogState, guidAnswer, nextGuidDialogState) {
    this._xml = this._smartTestModel.GetStructElement(dialogGuid, "DialogRef");
    this._questions = this._xml.getElementsByTagName("DialogState");
    let targetQuestion, nextTargetQuestion;
    for (let question of this._questions) {
        if (question.getAttribute("RefGuid") == guidDialogState) {
            targetQuestion = question;
        }
        else if (question.getAttribute("RefGuid") == nextGuidDialogState) {
            nextTargetQuestion = question;
        }
    }
    let idComplete = this.PerformActions(targetQuestion, "OnComplete", "");
    let massAnswer = [];
    let guid = "";
    for (let answer of targetQuestion.querySelectorAll("AnswerDialogs>AnswerDialog")) {
        if (answer.getAttribute("RefGuid") == guidAnswer) {
            guid = this.PerformActions(answer, "OnSelect", massAnswer.length > 0 ? massAnswer[massAnswer.length - 1] : idComplete);
            if (guid != "" && guid != (massAnswer.length > 0 ? massAnswer[massAnswer.length - 1] : idComplete)) {
                massAnswer.push(guid);
            }
        }
        else {
            guid = this.PerformActions(answer, "OnUnselect", massAnswer.length > 0 ? massAnswer[massAnswer.length - 1] : idComplete);
            if (guid != "" && guid != (massAnswer.length > 0 ? massAnswer[massAnswer.length - 1] : idComplete)) {
                massAnswer.push(guid);
            }
        }
    }
    if (nextTargetQuestion != null) {
        let idNextBeforeStart = this.PerformActions(nextTargetQuestion, "OnBeforeStartDialogState", massAnswer.length > 0 ? massAnswer[massAnswer.length - 1] : idComplete);
        unityCommand(this._smartTestModel._actionManager.CreateCallbackCollection(idNextBeforeStart));
    }
    else {
        unityCommand(this._smartTestModel._actionManager.CreateCallbackCollection(massAnswer.length > 0 ? massAnswer[massAnswer.length - 1] : idComplete));
    }
}
RP.Dialogs.prototype.OnCloseDialog = function (dialogGuid) {
    this._xml = this._smartTestModel.GetStructElement(dialogGuid, "DialogRef");
    let idComplete = this.PerformActions(this._xml.querySelector("Finally"), "OnComplite", "");
    unityCommand(this._smartTestModel._actionManager.CreateCallbackCollection(idComplete));
}
RP.Dialogs.prototype.PerformActions = function (object, selector, callbackId) {
    let targetActions = object.querySelector(selector + ">Action");

    if (targetActions != null && targetActions != "" && targetActions.getAttribute("ActionGuid") != "00000000-0000-0000-0000-000000000000") {
        return this._smartTestModel._actionManager.CreateSetCommand({ 'guid': targetActions.getAttribute("ActionGuid"), 'callbackIdCollection': callbackId });//targetActions.getAttribute("ActionGuid"), callbackId
    }
    else if (callbackId != "") {
        return callbackId;
    }
    else {
        return "";
    }
}
