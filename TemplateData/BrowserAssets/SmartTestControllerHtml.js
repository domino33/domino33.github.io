
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