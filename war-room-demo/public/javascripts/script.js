import {DemoScene} from "./demo.js"

const startModel = new URL('../assets/warroom1.glb', import.meta.url);
const secondModel = new URL('../assets/roommodemodel.glb', import.meta.url);

let APP;

function init(model) {
    console.log(model);
    $('#inside-view').off('click');
    $('#outside-view').off('click');
    $('#ortho-view').off('click');
    $('#fullscreen-button').off('click');
    APP = new DemoScene(model);
    $('#inside-view').on('click', function(){
        APP.setInsideViewMode();
    })
    $('#outside-view').on('click', function(){
        APP.setOutsideViewMode();
    })
    $('#ortho-view').on('click', function(){
        APP.setOrthoViewMode();
    })
    $('#fullscreen-button').on('click', function(){
        if (APP.renderer.domElement.requestFullscreen){
            APP.renderer.domElement.requestFullscreen();
        } else if (APP.renderer.domElement.webkitRequestFullscreen){
            APP.renderer.domElement.webkitRequestFullscreen();
        } else if (APP.renderer.domElement.msRequestFullscreen){
            APP.renderer.domElement.msRequestFullscreen();
        }
        // should create a function within APP that correctly handles fullscreen changes
        if (APP.camera.name == "inside") {
            APP.controls.hideBlocker();
            APP.controls.pointerLock.isLocked = true;
            APP.renderer.domElement.addEventListener( 'mousemove', APP.controls.lock);
        } else if (APP.camera.name == "ortho") {
            APP.renderer.domElement.addEventListener('keyup', APP.controls.orthoOnKeyUp);
            APP.renderer.domElement.addEventListener('keydown', APP.controls.orthoOnKeyDown);
            APP.renderer.domElement.addEventListener('click', APP.controls.orthoOnClick);
        }
        console.log("set full screen")
    });
}

// init(secondModel);

$(document).on('keydown', function(event) {
    if (event.key === 'F1' || event.keyCode === 112) {
        event.preventDefault(); // Prevent the default action (help menu)
        init(startModel);
    }
});

$(window).on('load', function() {
    const url = document.querySelector(".room-data").dataset.room;
    if(url == "default") {
        init(startModel);
    } else {
        init(new URL(url));
    }
});

