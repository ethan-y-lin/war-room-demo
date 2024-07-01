import {DemoScene} from "./demo.js"
import $ from 'jquery'
console.log("INIT")
const startModel = {room_url: new URL('../assets/warroom1.glb', import.meta.url)};

let APP;
let start = true;

function init(model, objects = []) {
    console.log(model);

    APP = new DemoScene(model, objects);
    const objectLinks = document.querySelectorAll('.add-object-to-scene');
    
    objectLinks.forEach(link => {
        link.removeEventListener('click', addObjectListenerFunction)
        link.addEventListener('click', addObjectListenerFunction);
    });

    const saveDesignButton = document.getElementById("save-design");

    saveDesignButton.removeEventListener('click', saveDesign);
    saveDesignButton.addEventListener('click', saveDesign);
}

// init(secondModel);

$(document).on('keydown', function(event) {
    if (event.key === 'F1' || event.keyCode === 112) {
        event.preventDefault(); // Prevent the default action (help menu)
        init(startModel);
    }
});

$(window).on('load', function() {

    if (start) {
        init(startModel);
        start = false;
    }
    const roomLinks = document.querySelectorAll('.open-room-link');
    roomLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent default link behavior
            
            const url = this.dataset.url; // Get the URL from data-url attribute
            console.log(url)
            fetchAndInitRoom(url); // Call the fetchAndAddObject function with the URL
        });
    });

    const designLinks = document.querySelectorAll('.open-design-link');
    designLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            if (APP != null) {
                APP.clear();
            }
            event.preventDefault(); // Prevent default link behavior
            
            const url = this.dataset.url; // Get the URL from data-url attribute
            console.log(url)
            fetchAndInitDesign(url); // Call the fetchAndAddObject function with the URL
        });
    });

    const deleteDesignButtons = document.querySelectorAll('.delete-design');
    deleteDesignButtons.forEach(button => {
        button.addEventListener('click', function (event) {
            event.preventDefault();
            const url = this.dataset.url
            deleteDesign(url);
        })
    })
});


function addObjectListenerFunction (e) {
    e.preventDefault(); // Prevent default link behavior
            
    const url = this.dataset.url; // Get the URL from data-url attribute
    fetchAndAddObject(APP, url); // Call the fetchAndAddObject function with the URL
}

async function fetchAndAddObject(app, objURL) {
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

async function fetchAndInitRoom(roomURL) {
    if (APP != null) {
        APP.clear();
    }
    try {
        console.log('/room' + roomURL)
        const response = await fetch('/room' + roomURL); // Await the fetch call
        if (!response.ok) {
            throw new Error('Failed to fetch object');
        }
        const previousScene = document.getElementById('3js-scene');
        const sceneContainer = document.getElementById('scene-container');
        sceneContainer.removeChild(previousScene);
        const room = await response.json(); // Await parsing the JSON response
        room.room_url = new URL(room.room_url);
        init(room); 
    } catch (error) {
        console.error('Error fetching object:', error);
    }
}


async function saveDesign() {
    const data = APP.getSceneData();
    fetch('/upload-design', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      .then(response => response.json())
      .then(data => console.log('Success:', data))
      .catch(error => console.error('Error:', error));
}

async function deleteDesign(designURL) {
    fetch(`/delete-design` + designURL, {
        method: 'DELETE',
    }).then(response => response.json())
    .then(data => {
        if (data.success) {
            document.querySelector(`li[data-url="${designURL}"]`).remove();
        } else {
            alert('Error deleting item')
        }
    })
    .catch(error => console.error('Error: ', error))
}

async function fetchAndInitDesign(designURL) {
    try {
        const response = await fetch('/design' + designURL); // Await the fetch call
        if (!response.ok) {
            throw new Error('Failed to fetch object');
        }
        const previousScene = document.getElementById('3js-scene');
        const sceneContainer = document.getElementById('scene-container');
        sceneContainer.removeChild(previousScene);
        const design = await response.json(); // Await parsing the JSON response
        design.room.room_url = new URL(design.room.room_url);
        console.log(design.objects);
        init(design.room, design.objects); 
    } catch (error) {
        console.error('Error fetching object:', error);
    }
}