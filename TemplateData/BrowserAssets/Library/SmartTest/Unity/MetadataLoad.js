if (typeof RP === 'undefined') RP = {};

RP.MetadataLoad = function (actionManager,locationGuid,courseGuid,smartTestGuid) {
    this.locationXml = null;
    this.actionManager = actionManager;
    this.locationGuid = locationGuid;
    var paramsString = document.location.search;
    var searchParams = new URLSearchParams(paramsString);
    this.smartTestEditor = new SmartTestEditor.Client(urlSmartTestEditor);
    this.EntityId = courseGuid;//searchParams.get("EntityId");
    this.EntityTypeId = smartTestGuid;// searchParams.get("EntityTypeId");
    this.RelativePath = searchParams.get("RelativePath");
    this.idCollections = "";
}
RP.MetadataLoad.prototype.SetCommand = function (idCollection, command) {
    let componentsCommand1 = {
        actionElem: "",
        callbackCommand: command,
    };
    this.actionManager.AddNextSuccess(idCollection, componentsCommand1);
}
RP.MetadataLoad.prototype.SetLocation = function (stageIndex) {
    //let idCollectionAction = this.actionManager.CreateActionCollection("False", "");
    //this.SetCommand(idCollectionAction,
    //    CreateCommand(RP.Commands.BrowserCallFunction, "PanelControlBrowser", JSON.stringify({ NameFunction: "OnLoadActions", Parametrs: [stageIndex] })));
    let idCollection = this.actionManager.CreateActionCollection("True", "");
    this.idCollections = idCollection;
    this.smartTestEditor.GetLocationXml(this.EntityId, this.EntityTypeId, this.RelativePath, this.locationGuid,
        (response) => {
            try {
                this.locationXml = (new window.DOMParser()).parseFromString(new XMLSerializer().serializeToString(response), "text/xml");
                this.LoadTrack(idCollection);
                this.LoadCamera(idCollection);
                this.LoadColliders(idCollection);
                this.LoadDinamicObjects(idCollection);
                //this.PreLoadTestSdo(); 
                unityCommand(this.actionManager.CreateCallbackCollection(idCollection));
            } catch (ex) {
                console.log(ex);
                unityCommand(CreateCommand(RP.Commands.DarkeningScreen, "", JSON.stringify({ OnEnable: "true", ButtonEnable: "true", MainText: RP.Texts.ErrorLoad  })));
            }
        }
    );
}
RP.MetadataLoad.prototype.LoadTrack = function (idCollection) {
    if (this.locationXml.querySelector("Location>Tracks") == null || this.locationXml.querySelector("EditorTracks") == null) {
        return;
    }
    for (let item of this.locationXml.querySelector("Location>Tracks").getElementsByTagName("Track")) {
        if (item.getAttribute("EditorTrackRef") != null) {
            let editorTrack = Array.prototype.slice.call(this.locationXml.querySelector("EditorTracks").getElementsByTagName("EditorTrack")).find(x => x.getAttribute("Guid") == item.getAttribute("EditorTrackRef"));
            if (editorTrack != null) {
                let newTrack = {
                    Name: item.getAttribute("ElementKey"),
                    Objects: []
                };
                let _objects = editorTrack.querySelector("Objects");
                if (_objects != null ) {
                    for (let obj of _objects.getElementsByTagName("Object")) {
                        if (obj.querySelector("Position") != null) {
                            newTrack.Objects.push({
                                Position: {
                                    x: obj.querySelector("Position").getAttribute("x").replace(",", "."),
                                    y: obj.querySelector("Position").getAttribute("y").replace(",", "."),
                                    z: obj.querySelector("Position").getAttribute("z").replace(",", ".")
                                },
                                Rotation: {
                                    x: obj.querySelector("Rotation").getAttribute("x").replace(",", "."),
                                    y: obj.querySelector("Rotation").getAttribute("y").replace(",", "."),
                                    z: obj.querySelector("Rotation").getAttribute("z").replace(",", "."),
                                    w: obj.querySelector("Rotation").getAttribute("w").replace(",", ".")
                                }
                            });
                        } 
                    }
                }
                this.SetCommand(idCollection,CreateCommand(RP.Commands.CreateTrack,
                    "",
                    JSON.stringify(newTrack), this.actionManager.CreateCallbackCollection(idCollection))
                );//send new track
            }
        }
    }
}

RP.MetadataLoad.prototype.LoadCamera = function (idCollection) {
    if (this.locationXml.querySelector("Location>Cameras") == null || this.locationXml.querySelector("EditorCameras") == null) {
        return;
    }
    for (let item of this.locationXml.querySelector("Location>Cameras").getElementsByTagName("Camera")) {
        if (item.getAttribute("EditorCameraRef") != null) {
            let editorCamera = Array.prototype.slice.call(this.locationXml.querySelector("EditorCameras").getElementsByTagName("EditorCamera")).find(x => x.getAttribute("Guid") == item.getAttribute("EditorCameraRef"));
            if (editorCamera != null && editorCamera.querySelector("Position") != null) {
                let newCamera = {
                    Name: item.getAttribute("ElementKey"),
                    ParrentName: (editorCamera.querySelector("UnityItem") != null) ? editorCamera.querySelector("UnityItem").textContent:"",
                    Object: {
                        Position: {
                            x: editorCamera.querySelector("Position").getAttribute("x").replace(",", "."),
                            y: editorCamera.querySelector("Position").getAttribute("y").replace(",", "."),
                            z: editorCamera.querySelector("Position").getAttribute("z").replace(",", ".")
                        },
                        Rotation: {
                            x: editorCamera.querySelector("Rotation").getAttribute("x").replace(",", "."),
                            y: editorCamera.querySelector("Rotation").getAttribute("y").replace(",", "."),
                            z: editorCamera.querySelector("Rotation").getAttribute("z").replace(",", "."),
                            w: editorCamera.querySelector("Rotation").getAttribute("w").replace(",", ".")
                        }
                    }
                };
               
                this.SetCommand(idCollection,CreateCommand(RP.Commands.CreateObject,
                    "",
                    JSON.stringify(newCamera), this.actionManager.CreateCallbackCollection(idCollection))
                );//send new Camera
            }
        }
    }
}

RP.MetadataLoad.prototype.LoadColliders = function (idCollection) {
    if (this.locationXml.querySelector("EditorColliders") == null || this.locationXml.querySelector("Location>Colliders") == null) {
        return;
    }
    let editorColliders = Array.from(this.locationXml.querySelector("EditorColliders").getElementsByTagName("EditorCollider"));
    for (let item of this.locationXml.querySelector("Location>Colliders").getElementsByTagName("Collider")) {
        if (item.getAttribute("EditorColliderRef") != null) {
            let editorCollider = editorColliders.find(x => x.getAttribute("Guid") == item.getAttribute("EditorColliderRef"));
            if (editorCollider != null && editorCollider.querySelector("Scale")!=null) {
                let newCollider = {
                    Name: item.getAttribute("key"),
                    Object: {
                        Position: {
                            x: editorCollider.querySelector("Position").getAttribute("x").replace(",", "."),
                            y: editorCollider.querySelector("Position").getAttribute("y").replace(",", "."),
                            z: editorCollider.querySelector("Position").getAttribute("z").replace(",", ".")
                        },
                        Rotation: {
                            x: editorCollider.querySelector("Rotation").getAttribute("x").replace(",", "."),
                            y: editorCollider.querySelector("Rotation").getAttribute("y").replace(",", "."),
                            z: editorCollider.querySelector("Rotation").getAttribute("z").replace(",", "."),
                            w: editorCollider.querySelector("Rotation").getAttribute("w").replace(",", ".")
                        },
                        Scale: {
                            x: editorCollider.querySelector("Scale").getAttribute("x").replace(",", "."),
                            y: editorCollider.querySelector("Scale").getAttribute("y").replace(",", "."),
                            z: editorCollider.querySelector("Scale").getAttribute("z").replace(",", ".")
                        }
                    }
                };

                this.SetCommand(idCollection, CreateCommand(RP.Commands.CreateCollider,
                    "",
                    JSON.stringify(newCollider), this.actionManager.CreateCallbackCollection(idCollection))
                );
            }
        }
    }
    
}
RP.MetadataLoad.prototype.LoadDinamicObjects = function (idCollection) {
    if (this.locationXml.querySelector("EditorDynamicObjects") == null || this.locationXml.querySelector("Location>DynamicObjects") == null) {
        return;
    }
    let editorDinamicObjects = Array.from(this.locationXml.querySelector("EditorDynamicObjects").getElementsByTagName("EditorDynamicObject"));

    for (let item of this.locationXml.querySelector("Location>DynamicObjects").getElementsByTagName("DynamicObject")) {
        if (item.getAttribute("EditorDynamicObjectRef") != null) {
            let editorDinamicObject = editorDinamicObjects.find(x => x.getAttribute("Guid") == item.getAttribute("EditorDynamicObjectRef"));
            if (editorDinamicObject != null && editorDinamicObject.querySelector("Position") != null) {
                let newDinamicObject = {
                    ElementKey: item.getAttribute("ElementKey"),
                    ModelId: item.getAttribute("ModelId"),
                    Hash: item.getAttribute("Hash"),
                    UnityItem: (editorDinamicObject.querySelector("UnityItem") != null) ? editorDinamicObject.querySelector("UnityItem").textContent : "",
                    CallBack: this.actionManager.CreateCallbackCollection(idCollection),
                    Point: {
                        Position: {
                            x: editorDinamicObject.querySelector("Position").getAttribute("x").replace(",", "."),
                            y: editorDinamicObject.querySelector("Position").getAttribute("y").replace(",", "."),
                            z: editorDinamicObject.querySelector("Position").getAttribute("z").replace(",", ".")
                        },
                        Rotation: {
                            x: editorDinamicObject.querySelector("Rotation").getAttribute("x").replace(",", "."),
                            y: editorDinamicObject.querySelector("Rotation").getAttribute("y").replace(",", "."),
                            z: editorDinamicObject.querySelector("Rotation").getAttribute("z").replace(",", "."),
                            w: editorDinamicObject.querySelector("Rotation").getAttribute("w").replace(",", ".")
                        },
                        Scale: {
                            x: editorDinamicObject.querySelector("Scale").getAttribute("x").replace(",", "."),
                            y: editorDinamicObject.querySelector("Scale").getAttribute("y").replace(",", "."),
                            z: editorDinamicObject.querySelector("Scale").getAttribute("z").replace(",", ".")
                        }
                    }
                };

                this.SetCommand(idCollection,CreateCommand(RP.Commands.CreateDynamicObject,
                    "",
                    JSON.stringify(newDinamicObject))
                );
            }
        }
    }
}
RP.MetadataLoad.prototype.PreLoadTestSdo = function () {//idCollection
    let stageActions = this.actionManager._smartTestModel._stageXml.querySelector("Stage>Actions");
    if (stageActions != null) {
        let actions = stageActions.getElementsByTagName("Action");
        for (let action of actions) {
            if (action.getAttribute("Type") == "openTestSdo") {
                let _xmlTest = this.actionManager._smartTestModel.GetStructElement(action.getAttribute("TestRefGuid"), "TestRef");
                unityCommand(CreateCommandStartScript(
                    'TestControl',
                    'CanvasManager',
                    'PreLoadTest', [action.getAttribute("TestRefGuid"), _xmlTest.getAttribute("RefGuid"), _xmlTest.getElementsByTagName("Url")[0].textContent])
                );
            }
        }
    }
   // let example = this._model._stageXml.querySelectorAll('[ActionGuid="001d7b28-99da-4e7e-a268-26e750f3462e"]');
    //let stageTests = this.actionManager._smartTestModel._stageXml.querySelector("Stage>TestRefs");
    //if (stageTests != null) {
    //    let tests = stageTests.getElementsByTagName("TestRef");
    //    for (let test of tests) {
    //        this.SetCommand(idCollection, CreateCommandStartScript(
    //            'TestControl',
    //            'CanvasManager',
    //            'PreLoadTest', [test.getAttribute("Guid"), test.getElementsByTagName("Url")[0].textContent, this.actionManager.CreateCallbackCollection(idCollection)])
    //        );
    //    }
    //}
}
