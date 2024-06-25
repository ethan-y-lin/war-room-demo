import {DemoScene} from "./demo.js"

const startModel = new URL('../assets/warroom1.glb', import.meta.url);
const secondModel = new URL('../assets/roommodemodel.glb', import.meta.url);

let APP;
let start = true;

function init(model) {
    console.log(model);

    APP = new DemoScene(model);
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

