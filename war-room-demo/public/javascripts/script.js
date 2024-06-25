import {DemoScene} from "./demo.js"

const startModel = new URL('../assets/warroom1.glb', import.meta.url);
const secondModel = new URL('../assets/roommodemodel.glb', import.meta.url);

let APP;
let start = true;

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
    $('#m').on('click', function(){
        if (APP.getControlsMode() != "measure") {
            APP.setControlsMode("measure");
        } else {
            APP.setControlsMode("regular");
        }

    })
    $('#fullscreen-button').on('click', function(){
        console.log("full screen")
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
    const objectLinks = document.querySelectorAll('#column3 a[data-url]');
    
    objectLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent default link behavior
            
            const url = this.dataset.url; // Get the URL from data-url attribute
            fetchObject(APP, url); // Call the fetchObject function with the URL
        });
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
        if (start) {
            init(startModel);
            start = false;
        }
    } else {
        init(new URL(url));
    }
});


async function fetchObject(app, objURL) {
    try {
        const response = await fetch('/object' + objURL); // Await the fetch call
        if (!response.ok) {
            throw new Error('Failed to fetch object');
        }
        const object = await response.json(); // Await parsing the JSON response
        console.log(object); // Log the parsed JSON object
        app.addObject(object); // Assuming APP.addObject() adds the object to your application
    } catch (error) {
        console.error('Error fetching object:', error);
    }
}

