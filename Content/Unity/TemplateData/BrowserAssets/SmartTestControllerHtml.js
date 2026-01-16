
        if (typeof RP === 'undefined') RP = {};
        RP.Texts = {
            LoadStage: "Запуск ситуационной задачи, ожидайте...",
            ErrorLoad: "Произошла ошибка загрузки содержимого сцены. Попробуйте запустить повторно",
            ErrorLoadXml: "Не найден управляющий сценарий. Попробуйте запустить повторно",
            ErrorOpenXml: "Управляющий сценарий содержит ошибку. Сообщите в службу поддержки",
        }
        RP.ExtraTime = 0;
        RP.localVersion = false;
        RP.Commands = {
            RunUnityScript: 6,
            RegHotKey: 32,
            BrowserManager: 39,
            RegisterCommandBrowser: 41,
            ShowModalWindow: 42,
            BrowserCallFunction: 43,
            Coordinates: 47,
            ForbidCharacterControl: 48,
            SetObjectActive: 49,
            ReturnControllScript: 51,
            RegisterTrigger: 52,
            SetPlace: 56,
            AddInventoryItem: 57,
            RemoveInventoryItem: 58,
            SubscribeBrowser: 59,
            SetPanelRace: 63,
            SetFineTime: 64,
            GetTrackInfo: 65,
            SetCurrentStage: 66,
            SetCurrentPlace: 67,
            ShowPanelTargets: 68,
            SetMultiplayInfo: 70,
            AddItem: 73,
            CameraVisualize: 80,
            Paint: 81,
            AttachObject: 84,
            SetPropertyInventory: 89,
            CreateTrack: 90,
            CreateObject: 91,
            ShowCustomizableWindow: 95,
            CreateCollider: 97,
            CreateDynamicObject: 98,
            DarkeningScreen: 99,
            GetRequest: 101,
            GetRequestZip: 107,
			RegisterVirtualObject: 117,
			SetParrent: 118,
			HighlightElement: 125
        };
        function OnLoadActions(stageIndex) {
            window._app.RunStageInitActions({ 'stageIndex': stageIndex });
        }
        function LoadScene(stageIndex) {
            window._app.GetAndSetLocation({ 'stageIndex': stageIndex });
        }
        function StartEvent(eventGuid, params) {//eventGuid
            window._app.FireEvent({ 'eventGuid': eventGuid, 'params': params });
        }
        function StartAction(actionGuid) {
            window._app.FireAction(actionGuid);
        }
        function NewStage(number) {
            window._app.NextStage(number);
        }
        function CheckQuestion(isTrue, questionGuid, testGuid, structAnswer) {
            window._app._model._testSdo.CheckQuestion(isTrue, questionGuid, testGuid, structAnswer);
        }
        function QuestionButtonCheck(isTrue, questionGuid, testGuid, answerGuid) {
            window._app._model._testSdo.QuestionButtonCheck(isTrue, questionGuid, testGuid, answerGuid);
        }
        function CloseTestSdo(isSuccesfullyTest, guidTest, callback) {
            window._app._model._testSdo.Close(isSuccesfullyTest, guidTest, callback);
        }
        function OnBeforeStartTest(testGuid) {
            window._app._model._testSdo.OnBeforeStartTest(testGuid);
        }
        function OnBeforeStartQuestion(testGuid, questionGuid) {
            window._app._model._testSdo.OnBeforeStartQuestion(testGuid, questionGuid);
        }
        function OnBeforeStartDialog(dialogGuid, guidDialogState) {
            window._app._model._dialog.OnBeforeStartDialog(dialogGuid, guidDialogState);
        }
        function OnClickAnswerDialog(dialogGuid, guidDialogState, guidAnswer, nextGuidDialogState) {
            window._app._model._dialog.OnClickAnswerDialog(dialogGuid, guidDialogState, guidAnswer, nextGuidDialogState);
        }
        function OnCloseDialog(dialogGuid) {
            window._app._model._dialog.OnCloseDialog(dialogGuid);
        }
        function OpenStageUnity(stageGuid) {
            var number = window._app._model.FindNextStage(stageGuid);
            return unityCommand(CreateCommand(RP.Commands.BrowserCallFunction, "PanelControlBrowser", JSON.stringify({ NameFunction: "NewStage", Parametrs: [number] })));
        }
        function GetRequest(eventName, result) {
            const event = new CustomEvent(eventName, {//'eventRequest'
                detail: {
                    result: result,
                },
            })
            window.dispatchEvent(event)
        }
		function unityCommandJS(command) {
			if (typeof unityCommand === "function") {
				console.log("true");
				 unityCommand(command);
			} else {
				console.log("false");
				 window.addEventListener('zfbrowserready',  () => unityCommand(command), { once: true });
			}
		}
        function OnLoad(CourseGuid,SmartTestGuid) {
            try {
                var searchParams = new URLSearchParams(document.location.search);
                RP.localVersion = true;
                searchParams = new URLSearchParams(document.location.href);
                urlSmartTestEditor = document.location.href;
                const smartTestEditor = new SmartTestEditor.Client(urlSmartTestEditor);
                smartTestEditor.GetSmartTestXml(CourseGuid,SmartTestGuid,searchParams.get("RelativePath"),//searchParams.get("EntityId"), searchParams.get("EntityTypeId"), searchParams.get("RelativePath"),
                    (response) => {
                        try {
                            window._app = new RP.TestApp(new XMLSerializer().serializeToString(response),CourseGuid,SmartTestGuid);
                            window._app.InitTest();
                            if (searchParams.get("StageGuid") != null && searchParams.get("StageGuid") != "") {
                                //берём успешно выполненный этап и ищем id этапа после него
                                for (var i = 0; i < window._app._model._xml.getElementsByTagName("Stage").length; i++) {
                                    if (window._app._model._xml.getElementsByTagName("Stage")[i].getAttribute("Guid") == searchParams.get("StageGuid")) {
                                        window._app.InitUnityScene(window._app._model.ValidateStage(i + 1) ? 0 : i + 1);
                                        break;
                                    }
                                }
                            }
                            else {
                                window._app.InitUnityScene(0);
                            }
                        }
                        catch (e) {
                            console.log("Произошла ошибка в браузере" + e);
                            unityCommand(CreateCommand(RP.Commands.DarkeningScreen, "", JSON.stringify({ OnEnable: "true", ButtonEnable: "true", MainText: RP.Texts.ErrorOpenXml })));
                        }
                    }
                );
                //let subscrBrComm = CreateCommand(RP.Commands.SubscribeBrowser, "", "{\"BrowserKey\":\"PanelControlBrowser\", \"CommandType\":\"" + 201 + "\", \"MethodName\": \"OpenStageUnity\"}");
               //unityCommandJS(subscrBrComm);
            } catch (e) {
                console.log("Произошла ошибка во время загрузки" + e);
                unityCommandJS(CreateCommand(RP.Commands.DarkeningScreen, "", JSON.stringify({ OnEnable: "true", ButtonEnable: "true", MainText: RP.Texts.ErrorLoadXml })));
            }
        }

        function NextCommand(id) {
            window._app.QueueExtract(id);
        }

        function errorHandler(e) {
            //var msg = '';

            //switch (e.code) {
            //    case FileError.QUOTA_EXCEEDED_ERR:
            //        msg = 'QUOTA_EXCEEDED_ERR';
            //        break;
            //    case FileError.NOT_FOUND_ERR:
            //        msg = 'NOT_FOUND_ERR';
            //        break;
            //    case FileError.SECURITY_ERR:
            //        msg = 'SECURITY_ERR';
            //        break;
            //    case FileError.INVALID_MODIFICATION_ERR:
            //        msg = 'INVALID_MODIFICATION_ERR';
            //        break;
            //    case FileError.INVALID_STATE_ERR:
            //        msg = 'INVALID_STATE_ERR';
            //        break;
            //    default:
            //        msg = 'Unknown Error';
            //        break;
            //};

            console.log('Error: ' + e);
        }
        function CloseTestApp(arrayStruct) {
		 unityCommand(CreateCommandStartScript(
                'LogManager',
                'CanvasManager',
                'CloseApp', [JSON.parse(arrayStruct).countTarget]));
           // unityCommand(CreateCommandStartScript(
            //    'LogManager',
             //   'CanvasManager',
             //   'CloseLogging', []));

        }
			// Переопределяем alert ДО загрузки Unity
window.originalAlert = window.alert;
window.alert = function(message) {
    if (typeof message === 'string' && (
        message.includes('An error occurred') ||
        message.includes('abort') ||
        message.includes('error') ||
        message.includes('Unity')
    )) {
        //console.log('Alert intercepted:', message);
		let idError=uuidv4();
		sendErrorToServer(message,idError);
        showFriendlyError(idError);
        return; // Не показываем alert
    }
    window.originalAlert(message);
};
function showFriendlyError(idError) {
    if (document.getElementById('user-friendly-error')) return;
    
    const div = document.createElement('div');
    div.id = 'user-friendly-error';
    div.innerHTML = `
        <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:black; color:white; display:flex; justify-content:center; align-items:center; z-index:99999; font-family:Arial;">
            <div style="text-align:center; background: #2c3e50; padding: 40px; border-radius: 15px; max-width: 500px; border-left: 5px solid #C02032;">
                <h1>⚠️</h1>
<h2 style="color: #ecf0f1;">Временные неполадки</h2>
<p style=" color: #bdc3c7; line-height: 1.5;">
					Мы уже знаем о проблеме и работаем над её решением.<br>
					Пожалуйста, попробуйте перезагрузить страницу.
				</p>
				 <div style="background: #34495e; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 14px;">
					<div style="color: #7f8c8d; margin-bottom: 5px;">Код ошибки отправлен разработчикам</div>
					<div style="color: #95a5a6; font-family: monospace;">REF: ${idError}</div>
				</div>
                <button onclick="window.location.reload()" style="padding:12px 24px; background:#007bff; color:white; border:none; border-radius:5px; cursor:pointer; margin-top:20px;">
                    Перезагрузить страницу
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}
function sendErrorToServer(errorMessage,idError) {
	let jsonError = {
		Error: idError,
		Message: errorMessage,
	}
	unityInstances.SendMessage('CanvasManager','LoggingSendErrorEvent',JSON.stringify(jsonError));
    // Отправка ошибки на сервер
   // const formData = new FormData();
  //  formData.append('error', error);
  //  formData.append('url', window.location.href);
  //  formData.append('timestamp', new Date().toISOString());
    
 //   fetch('/api/error-report', {
 //       method: 'POST',
 //       body: formData
 //   }).catch(() => {
        // Игнорируем ошибки отправки
 //   });
}
window.addEventListener('blur', () => {
	if(unityInstances!==null){
			unityInstances.SendMessage('CanvasManager','QuickSave', 'false');
	}
});
 window.addEventListener('beforeunload', function(e) {
	if(unityInstances!==null){
		unityInstances.SendMessage('CanvasManager','QuickSave', 'true');
	}
});
window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
		if(unityInstances!==null){
			unityInstances.SendMessage('CanvasManager','QuickSave', 'false');
		}
    }
});
window.addEventListener('pagehide', () => {
	if(unityInstances!==null){
		unityInstances.SendMessage('CanvasManager','QuickSave', 'false');
	}
});