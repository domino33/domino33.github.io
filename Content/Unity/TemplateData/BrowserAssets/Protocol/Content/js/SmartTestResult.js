//import { target } from "modernizr";

if (typeof RP === 'undefined') RP = {};
RP.SmartTestResult = function (result, userName, tablestriped, xml) {
    var res = JSON.parse(result);
    this._xml = xml;
    this.Title = xml.querySelector("ContentItem>Title").textContent;
    this.UserName = userName;
    //this.Result = (res.Logging.StageCount == res.Logging.CompleteStageCount) ? RP.Texts.Successfully : RP.Texts.Unsuccessful;
    //this.PercentageTrueAnswers = (parseInt(res.Logging.CompleteStageCount) * 100 / parseInt(res.Logging.StageCount));
    this.Time = res.Logging.Duration;
    this.Stage = res.Logging.CompleteStages.Stage;
    this.DateDays = res.DateDays;
    this.DateMinutes = res.DateMinutes;
    this.Num = res.Num;
    this.questionCanvas = (tablestriped);
}
RP.SmartTestResult.prototype.Init = function () {
    var thisObj = this;
    document.getElementById("protocolTitle").innerHTML += `${thisObj.Num} ${RP.Texts.From} ${thisObj.DateDays}`;
    document.getElementById("date").innerHTML += `${thisObj.DateDays}, ${thisObj.DateMinutes}`;
    document.getElementById("topTitle").innerHTML += thisObj.Title;
    document.getElementById("topUserTitle").innerHTML += thisObj.UserName;
    //  document.getElementById("result").innerHTML +=thisObj.Result;
    //  document.getElementById("percentage").innerHTML += thisObj.PercentageTrueAnswers+"%";
    document.getElementById("time").innerHTML += thisObj.Time;
    let _isSuccessfullStages = 0;
    let _stagesCount = 0;
    let sumPercentage = 0;
    let stages = thisObj._xml.getElementsByTagName("Stage");
    for (var i = 0; i < stages.length; i++) {
        if (stages[i].getAttribute("IsActive") == "True") {
            _stagesCount++;
            let isSuccessfullStage = RP.Texts.Unsuccessful;
            let duration = "";
            let stageResult = thisObj.GetStage(stages[i].getAttribute("Guid"));
            if (stageResult != null) {
                if (stageResult.IsSuccessfull == "True") {
                    isSuccessfullStage = RP.Texts.Successfully;
                    _isSuccessfullStages++;
                }
                duration = stageResult.Duration;
            }
            thisObj.CreateRow(_stagesCount,
                RP.Texts.Stage,
                stages[i].querySelector("Title").textContent,
                isSuccessfullStage,
                duration);
            let percentage = 100;
            let stageAllTargets = stages[i].getElementsByTagName("Target");
            if (stageAllTargets != null) {
                percentage = 0;
                let stageTargets = thisObj.GetRootTarget(stageAllTargets);//Получить только корневые цели//
                for (let j = 0; j < stageTargets.length; j++) {
                    percentage += thisObj.VisibleTarget(stages[i], stageTargets[j], 100 / stageTargets.length, (_stagesCount + "." + (j + 1)))
                }
            }
            sumPercentage += percentage;
        }
    }
    document.getElementById("percentage").innerHTML += (sumPercentage / _stagesCount).toFixed(2) + "%";
    document.getElementById("result").innerHTML += (_stagesCount == _isSuccessfullStages) ? RP.Texts.Successfully : RP.Texts.Unsuccessful;
	unityCommand(CreateCommandStartScript(
            'LogManager',
            'CanvasManager',
            'SendResult', [document.documentElement.innerHTML]));
    //for (let i = 0; i < thisObj.Stage.length; i++) {
    //    thisObj.CreateRow(i,
    //        (i + 1),
    //        RP.Texts.Stage,
    //        thisObj.GetStageName(thisObj.Stage[i].Guid),
    //        (thisObj.Stage[i].IsSuccessfull == "True") ? RP.Texts.Successfully : RP.Texts.Unsuccessful,
    //        thisObj.Stage[i].Duration);

    //    for (let j = 0; j < thisObj.Stage[i].CompleteTargets.Target.length; j++) {
    //        let nameTarget = thisObj.GetTargetName(thisObj.Stage[i].Guid, thisObj.Stage[i].CompleteTargets.Target[j].Guid);
    //        if (nameTarget != null) {
    //            thisObj.CreateRow(j,
    //                ((i + 1) + "." + (j + 1)),
    //                RP.Texts.Target,
    //               nameTarget,
    //                (thisObj.Stage[i].CompleteTargets.Target[j].IsSuccessfull == "True") ? RP.Texts.Successfully : RP.Texts.Unsuccessful, "");
    //        }
    //    }
    //}
}
RP.SmartTestResult.prototype.GetRootTarget = function (targets) {
    let rootTargets = [];
    for (let i = 0; i < targets.length; i++) {
        if (targets[i].getAttribute("IsRequired") == "True" && targets[i].getAttribute("IsActive") == "True") {
            let isChildren = false;
            for (let j = 0; j < targets.length; j++) {
                if (i == j)
                    continue;
                let clildren = targets[j].getElementsByTagName("TargetRef");
                if (clildren.length > 0) {
                    for (let k = 0; k < clildren.length; k++)
                        if (clildren[k].getAttribute("TargetGuid") == targets[i].getAttribute("Guid")) {
                            isChildren = true;
                            break;
                        }
                    if (isChildren)
                        break;
                }
            }
            if (!isChildren)
                rootTargets.push(targets[i]);
        }
    }
    return rootTargets;
}
RP.SmartTestResult.prototype.GetChildren = function (stage, targetRefs) {
    let targets = [];
    let targetsStage = stage.getElementsByTagName("Target");
    for (let i = 0; i < targetRefs.length; i++) {
        for (let j = 0; j < targetsStage.length; j++) {
            if (targetRefs[i].getAttribute("TargetGuid") == targetsStage[j].getAttribute("Guid") &&
                targetsStage[j].getAttribute("IsRequired") == "True" && targetsStage[j].getAttribute("IsActive") == "True") {
                targets.push(targetsStage[j]);
                break;
            }
        }
    }
    return targets;
    //let clildren = target.getElementsByTagName("TargetRef");

    //return;
}
RP.SmartTestResult.prototype.VisibleTarget = function (stage, target, percentage, number) {
    let result = this.GetResultTarget(stage, target);//получить результат, достигнута ли цель//
    let myPercent = percentage;
    if (!result)
        myPercent = 0;
    this.CreateRow(number,
        RP.Texts.Target,
        target.querySelector("Title").textContent,
        (result) ? RP.Texts.Successfully : RP.Texts.Unsuccessful, "");
    let clildren = this.GetChildren(stage, target.getElementsByTagName("TargetRef"));//Получить дочерние цели//
    if (clildren.length > 0) {
        for (let i = 0; i < clildren.length; i++)
            myPercent += this.VisibleTarget(stage, clildren[i], percentage / clildren.length, number + "." + (i + 1));
        if (myPercent > percentage)
            myPercent = percentage;
    }
    return myPercent;
}

RP.SmartTestResult.prototype.CreateRow = function (number, type, title, result, duration) {
    var thisObj = this;
    let tr = document.createElement('tr');
    tr.innerHTML = `
    <td>` + number + `</td>
    <td>` + type + `</td>
<td>` + title.replace(/(\\n)/gm, " ") + `</td>
<td>` + result + `</td>
<td>` + duration + `</td>
  `;
    thisObj.questionCanvas.appendChild(tr);
}
RP.SmartTestResult.prototype.GetStage = function (guid) {
    for (let i = 0; i < this.Stage.length; i++) {
        if (this.Stage[i].Guid == guid) {
            return this.Stage[i];
        }
    }
    return null;
}
//RP.SmartTestResult.prototype.GetStageName = function (guid)
//{
//    for (var i = 0; i < this._xml.getElementsByTagName("Stage").length; i++) {
//        if (this._xml.getElementsByTagName("Stage")[i].getAttribute("Guid") == guid) {
//            return this._xml.getElementsByTagName("Stage")[i].querySelector("Title").textContent;
//            break;
//        }
//    }
//}
RP.SmartTestResult.prototype.GetResultTarget = function (stage, target) {
	let guidTarget = target.getAttribute("Guid");
    let stageResult = this.GetStage(stage.getAttribute("Guid"));
    let stageAction = stage.querySelector("Stage>Actions").getElementsByTagName("Action");
    if (stageAction != null && stageResult!=null) {
        for (var i = 0; i < stageResult.CompleteTargets.Target.length; i++) {
            for (var j = 0; j < stageAction.length; j++) {
                if (stageAction[j].getAttribute("Guid") == stageResult.CompleteTargets.Target[i].Guid && stageAction[j].getAttribute("TargetGuid") == guidTarget) {
                    return (stageResult.CompleteTargets.Target[i].IsSuccessfull == "True") ? true : false
                }
            }
        }
		
		if (target.getAttribute("IsCompleteIfAllChildTargetsCompleted") == "True") {
			let childTargets = Array.prototype.slice.call(target.querySelector("Targets").getElementsByTagName("TargetRef"));
			let allTargets = [];
			let targets = Array.prototype.slice.call(stage.querySelector("Stage>Targets").getElementsByTagName("Target"));
				for (let item of childTargets) {
					let childTarget = targets.find(x => x.getAttribute("Guid") == item.getAttribute("TargetGuid"))
					if (childTarget != null) {
						allTargets.push(this.GetResultTarget(stage,childTarget));
					}
					else 
						return false;
				}
			if (allTargets.filter(x => x == true).length==childTargets.length) {
               return true;
            }	
		}
    }
	return false;
}
//RP.SmartTestResult.prototype.GetTargetName = function (guidStage,guidTarget) {
//    for (var i = 0; i < this._xml.getElementsByTagName("Stage").length; i++) {
//        if (this._xml.getElementsByTagName("Stage")[i].getAttribute("Guid") == guidStage) {
//            let stageAction = this._xml.getElementsByTagName("Stage")[i].getElementsByTagName("Action");
//            if (stageAction != null) {
//                for (var j = 0; j < stageAction.length; j++) {
//                    if (stageAction[j].getAttribute("Guid") == guidTarget) {
//                        let stageTargets = this._xml.getElementsByTagName("Stage")[i].getElementsByTagName("Target");
//                        if (stageTargets != null) {
//                            for (var z = 0; z < stageTargets.length; z++) {
//                                if (stageTargets[z].getAttribute("Guid") == stageAction[j].getAttribute("TargetGuid")) {
//                                    return stageTargets[z].querySelector("Title").textContent;
//                                }
//                            }
//                        }
//                    }
//                }
//            }
//            return null;
//        }
//    }
//}