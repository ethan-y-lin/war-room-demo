import GUI from 'lil-gui';
import $ from 'jquery';
class DemoGui {
    constructor (demoScene, controls) {
        this.gui = new GUI({autoPlace:false});
        this.initGui(this.gui, demoScene, controls);
    }

    initGui(gui, demoScene, controls){
        console.log(controls)
        gui.domElement.id = "gui";

        const folderSky = gui.addFolder('Sky Conditions');
        folderSky.add( demoScene.skyController, 'turbidity', 0.0, 20.0, 0.1 ).onChange( demoScene.onSkyChange());
        folderSky.add( demoScene.skyController, 'rayleigh', 0.0, 4, 0.001 ).onChange( demoScene.onSkyChange());
        folderSky.add( demoScene.skyController, 'mieCoefficient', 0.0, 0.1, 0.001 ).onChange( demoScene.onSkyChange());
        folderSky.add( demoScene.skyController, 'mieDirectionalG', 0.0, 1, 0.001 ).onChange( demoScene.onSkyChange());
        folderSky.add( demoScene.skyController, 'exposure', 0, 1, 0.0001 ).onChange( demoScene.onSkyChange());
        // Add latitude and longitude inputs to the GUI
        folderSky.add(demoScene.skyController, 'latitude', -90, 90).onChange(demoScene.onSkyChange())
        folderSky.add(demoScene.skyController, 'longitude', -180, 180).onChange(demoScene.onSkyChange());
        const sunSimToggle = {
            toggle: false
        }
        folderSky.add(sunSimToggle, 'toggle').name("Sun Sim").onChange( (value) => demoScene.sunSim = value);

        // toggling light sources
        const hLight = demoScene.getHemiLight();
        const aLight = demoScene.getAmbientLight();
        const dLight = demoScene.getDirectionalLight();
        const sLight = demoScene.getSpotLight();
        const folderLights = gui.addFolder('Light Conditions');

        const hToggle = {
            toggle: true
        };
        const aToggle = {
            toggle: true
        };
        const dToggle = {
            toggle: true
        };
        const sToggle = {
            toggle: true
        };

        folderLights.add(hToggle, 'toggle').name('Hemisphere light').onChange(value =>{
            hLight.visible = value;
        });
        folderLights.add(aToggle, 'toggle').name('Ambient light').onChange(value =>{
            aLight.visible = value;
        });
        folderLights.add(dToggle, 'toggle').name('Directional light').onChange(value =>{
            dLight.visible = value;
        });
        folderLights.add(sToggle, 'toggle').name('Spot light').onChange(value =>{
            sLight.visible = value;
        });

        //toggling object controls (translate/rotate)
        const folderControls = gui.addFolder('Object Controls');
        const controlToggle = {
            'translate': () => {
                controls.setGumballMode('translate');
            },
            'rotate': () => {
                controls.setGumballMode('rotate');
            }
        }

        folderControls.add({selectedFunction: 'translate'}, 'selectedFunction', Object.keys(controlToggle))
        .name('Mode')
        .onChange((selectedFunction) => {
            if (controlToggle[selectedFunction]) {
                controlToggle[selectedFunction]();
            }
        });
        
        //toggling bounding boxes
        const boundingBoxToggle = {
            toggle: false
        }
        folderControls.add(boundingBoxToggle, 'toggle').name('Show bounding box').onChange(value => {
            demoScene.toggleAllObjects(value, "bounding_box");
        });

        const showDimensions = {
            toggle: true
        }
        folderControls.add(showDimensions, 'toggle').name('Show Dimensions').onChange(value => {
            demoScene.toggleAllObjects(value, "label");
        });

        //changing material color?
        // const folderColors = folderControls.addFolder('Furniture Colors');
        // folderColors.close();

        // Moving Controls
        const folderMoving = gui.addFolder('General Controls');
        // const setOrthoMode = {
        //     drag: () => {
        //         demoScene.#controls.orthoMode = "drag";
        //     },
        //     measure: () => {
        //         demoScene.#controls.orthoMode = "measure";
        //     }
        // }
        // folderMoving.add({selectedFunction: 'drag'}, 'selectedFunction', Object.keys(setOrthoMode))
        // .name('Orthographic').listen()
        // .onChange((selectedFunction) => {
        //     if (setOrthoMode[selectedFunction]) {
        //         setOrthoMode[selectedFunction]();
        //     }
        // });

        const setInsideMode = {
            keyboard: () => {
                demoScene.getControls().insideMode = "keyboard";
                console.log(demoScene.view)
                if (demoScene.view == "inside") {
                    console.log("keyboard")
                    demoScene.getControls().setToNonMobile();
                }
            },
            teleport: () =>  {
                demoScene.getControls().insideMode = "teleport";
                if (demoScene.view == "inside") {
                    console.log("teleport")
                    demoScene.getControls().setToNonMobile();
                }
            },
            mobile: () => {
                demoScene.getControls().insideMode = "mobile";
                if (demoScene.view == "inside") {
                    console.log("mobile")
                    demoScene.getControls().setToMobile();
                }
            }
        }

        folderMoving.add({selectedFunction: 'mobile'}, 'selectedFunction', Object.keys(setInsideMode))
        .name('Inside')
        .onChange((selectedFunction) => {
            if (setInsideMode[selectedFunction]) {
                setInsideMode[selectedFunction]();
            }
        });
    
        //changing measurement units
        const folderMeasurements = gui.addFolder('Units');
        const measurementUnits = {
            'meter': () => {
                demoScene.setUnits("meter")
            },
            'feet': () => {
                demoScene.setUnits("feet");
            }
        }

        folderMeasurements.add({selectedFunction: 'feet'}, 'selectedFunction', Object.keys(measurementUnits))
            .name('unit')
            .onChange((selectedFunction) => {
                if (measurementUnits[selectedFunction]) {
                    measurementUnits[selectedFunction]();
                }
            });

        gui.open();
        if($("#gui-container").children().length == 2){
            $("#gui-container").append($(gui.domElement));
        }
    }
}

export { DemoGui }