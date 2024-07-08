import category from "../../models/category.js";
import {DemoScene} from "./demo.js"
import $ from 'jquery'
import io from 'socket.io-client';

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

    const updateDesignButton = document.getElementById("save-design");
    updateDesignButton.addEventListener('click', updateDesign);

    const saveDesignButton = document.getElementById("save-as-design");

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
    console.log("ADDING EVENT LISTENERS")
    const uploadObjectButton = document.getElementById("upload-object");
    uploadObjectButton.addEventListener('click', uploadObject);

    const uploadCategoryForm = document.getElementById("c-form");
    uploadCategoryForm.addEventListener('submit', uploadCategory);

    // const uploadObjectForm = document.getElementById("object-form");
    // uploadObjectForm.addEventListener('submit', uploadObject);


    const roomLinks = document.querySelectorAll('.open-room-link');
    roomLinks.forEach(link => {
        link.addEventListener('click', async function(event) {
            event.preventDefault(); // Prevent default link behavior
            
            const url = this.dataset.url; // Get the URL from data-url attribute
            console.log(url)
            const roomName = await fetchAndInitRoom(url); // Call the fetchAndAddObject function with the URL
            const roomTitle = document.getElementById("floorplan-title");
            roomTitle.textContent = roomName;
        });
    });

    const designLinks = document.querySelectorAll('.open-design-link');
    console.log(designLinks)
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
            console.log("delete design");
            event.preventDefault();
            const url = this.dataset.url
            deleteDesign(url);
        })
    });
    const deleteCategoryButtons = document.querySelectorAll('.delete-category');
    deleteCategoryButtons.forEach(button => {
        button.addEventListener('click', function (event) {
            event.preventDefault();
            const url = this.dataset.url
            deleteCategory(url);
        })
    });
    const deleteObjectButtons = document.querySelectorAll('.delete-object');
    deleteObjectButtons.forEach(button => {
        button.addEventListener('click', function (event) {
            event.preventDefault();
            const url = this.dataset.url
            deleteObject(url);
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
        return room.name;
    } catch (error) {
        console.error('Error fetching object:', error);
    }
}

async function saveDesign() {
    const name = document.getElementById("design-name").value;
    const data = APP.getSceneData();
    fetch('/upload-design', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({sceneData: data, name: name})
      })
      .then(response => response.json())
      .then(data => {
        console.log('Success:', data);
        addDesignToDOM(data.design);
        document.getElementById("design-name").value = "";
        document.getElementById("design-title").textContent = data.design.name;
        $("#design-save-form").slideUp('slow');
      })
      .catch(error => console.error('Error:', error));

}

function addDesignToDOM(design){
    const designsContainer = document.querySelector("#saved-plans .layerx");
    // Create list item element
    const li = document.createElement('li');
    li.setAttribute('data-url', `${design.url}`);

    // Create anchor element
    const a = document.createElement('a');
    a.className = 'open-design-link';
    a.href = '#';
    a.setAttribute('data-url', `${design.url}`);
    a.textContent = design.name;
    a.addEventListener('click', function(event) {
        if (APP != null) {
            APP.clear();
        }
        event.preventDefault(); // Prevent default link behavior
        
        const url = this.dataset.url; // Get the URL from data-url attribute
        console.log(url)
        fetchAndInitDesign(url); // Call the fetchAndAddObject function with the URL
    });

    // Create delete button element
    const button = document.createElement('button');
    button.className = 'delete-hover delete-design';
    button.setAttribute('data-url', `${design.url}`);
    button.addEventListener('click', function (event) {
        event.preventDefault();
        const url = this.dataset.url
        deleteDesign(url);
    })
    // Append anchor and button to list item
    li.appendChild(a);
    li.appendChild(button);

    designsContainer.appendChild(li);
   
}

async function deleteDesign(designURL) {
    fetch(`/delete-design` + designURL, {
        method: 'DELETE',
    }).then(response => response.json())
    .then(data => {
        if (data.success) {
            document.querySelector(`li[data-url="${designURL}"]`).remove();
            const designTitle = document.getElementById("design-title");
            console.log(designTitle.textContent);
            console.log(data.name)
            if (designTitle.textContent == data.name ) {
                designTitle.textContent = "Unsaved Plan";
            }
        } else {
            alert('Error deleting item')
        }
    })
    .catch(error => console.error('Error: ', error))
}

async function updateDesign() {
    const name = document.getElementById("design-title").textContent;
    if (name == "Unsaved plan") {
        alert('Please "Save as" before saving. ')
        return;
    }
    const data = APP.getSceneData();
    fetch(`/update-design/${name}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({sceneData: data, name: name})
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Item updated successfully');
        } else {
            alert('Error updating item: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error updating item');
    });
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

        const designTitle = document.getElementById("design-title");
        designTitle.textContent = design.name;
    } catch (error) {
        console.error('Error fetching object:', error);
    }
}

async function uploadCategory(e) {
    e.preventDefault();
    const categoryNameElement = document.getElementById('category-name');
    const categoryName = categoryNameElement.value;
    console.log(categoryName)
    fetch('/upload-category', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: categoryName
        })
    }).then(response => response.json())
    .then(data => {
        console.log(data)
        if (data.success) {

            const layerX = document.querySelector("#furnitures .layerxx");
            layerX.appendChild(addCategoryToDOM(categoryName, data.url));

            // ADD NEW COLUMN FOR WHEN CATEGORY IS CLICKED
            const column = document.getElementById('column3');
            const newCategoryDom = document.createElement('ul');
            newCategoryDom.setAttribute('id', `category-${categoryName.replaceAll(' ', '-')}`);
            newCategoryDom.setAttribute('class', 'layer3 hidden');

            // Create div.back-button2
            const backButtonDiv = document.createElement('div');
            backButtonDiv.className = 'back-button2';
            backButtonDiv.textContent = '< back';

            // Create div.menu-title and its child h2
            const menuTitleDiv = document.createElement('div');
            menuTitleDiv.className = 'menu-title';
            const h2Element = document.createElement('h2');
            h2Element.textContent = categoryName; // Set category name as text content of h2
            menuTitleDiv.appendChild(h2Element);

            // Create div.layerx (replace x with appropriate number or identifier)
            const layerDiv = document.createElement('div');
            layerDiv.className = 'layerx'; // Replace x with appropriate class identifier

            newCategoryDom.appendChild(backButtonDiv);
            newCategoryDom.appendChild(menuTitleDiv);
            newCategoryDom.appendChild(layerDiv);

            column.appendChild(newCategoryDom);
        } else {
            alert("Error adding item");
        }
    })
    .catch(error => console.error('Error:', error));
    categoryNameElement.value = "";
}

function addCategoryToDOM (name, url) {
    // Create li element with data-url attribute
    const liElement = document.createElement('li');
    liElement.setAttribute('data-url', url);

    // Create a element with class and id attributes
    const aElement = document.createElement('a');
    aElement.setAttribute('id', name.replaceAll(' ', '-'));
    aElement.setAttribute('class', 'open-category-link');
    aElement.setAttribute('href', '#');
    aElement.setAttribute('data-url', url);
    aElement.textContent = name;

    // Create button element with class and data-url attributes
    const buttonElement = document.createElement('button');
    buttonElement.setAttribute('class', 'delete-hover delete-category');
    buttonElement.setAttribute('data-url', url);

    buttonElement.addEventListener('click', function (event) {
        event.preventDefault();
        const url = this.dataset.url
        deleteCategory(url);
    })
    // Append elements to a parent element (e.g., ul)
    const ulElement = document.createElement('ul');
    ulElement.appendChild(liElement);
    liElement.appendChild(aElement);
    liElement.appendChild(buttonElement);

    return liElement;
}

async function deleteCategory(categoryURL) {
    fetch(`/delete-category` + categoryURL, {
        method: 'DELETE',
    }).then(response => response.json())
    .then(data => {
        if (data.success) {
            document.querySelector(`li[data-url="${categoryURL}"]`).remove();
        } else {
            alert('Error deleting item')
        }
    })
    .catch(error => console.error('Error: ', error))
}

function resetBar(progressBar, socket) {
    socket.removeAllListeners('uploadProgress');
    progressBar.style.width = "0%";
}

async function uploadObject(e) {
    e.preventDefault();
    const objectNameInput = document.getElementById('object-name');
    const objectName = objectNameInput.value;

    const objectFileInput = document.getElementById('object-file');

    const objectCategoryInput = document.getElementById('object-category');

    const formData = new FormData();
    formData.append('name', objectName);
    formData.append('file', objectFileInput.files[0]);
    formData.append('category', objectCategoryInput.value);

    const socket = io();
    const progressBar = document.getElementById("progressBar");
    let xhrProgress = 0;
    let socketProgress = 0;
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'upload-object', true);

    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
            xhrProgress = (e.loaded / e.total);
            progressBar.style.width = (xhrProgress * 10 + 0.9 * socketProgress) + '%';
        }
    });

    xhr.onload = () => {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status === 200 && response.success) {
          addObjectToDOM(response.category, objectName, response.obj_url);
          resetBar(progressBar, socket);
          progressBar.style.width = "100%";
          alert('File uploaded successfully');
          resetBar(progressBar, socket);
        } else {
          alert('File upload failed');
          resetBar(progressBar, socket);
        }
    };

    xhr.onerror = () => {
        alert('An error occurred during the upload');
        resetBar(progressBar, socket);
      };

    xhr.send(formData);

    socket.on('uploadProgress', (data) => {
        socketProgress = data.progress;
        progressBar.style.width = (xhrProgress * 10 + 0.9 * socketProgress) + '%';
    });

    objectNameInput.value = "";
    objectFileInput.value = "";
    objectCategoryInput.value = "";
}

async function addObjectToDOM(categoryName, name, url) {
    const categoryID = "#category-"+ categoryName.replaceAll(' ', '-') + " .layerx";
    console.log(categoryID)
    const categoryElement = document.querySelector(categoryID);
    // Create elements
    const li = document.createElement('li');
    li.setAttribute('data-url', url);

    const a = document.createElement('a');
    a.classList.add('add-object-to-scene');
    a.href = '#';
    a.setAttribute('data-url', url);
    a.textContent = name;
    a.addEventListener('click', addObjectListenerFunction);

    const button = document.createElement('button');
    button.classList.add('delete-hover');
    button.classList.add('delete-object');
    button.setAttribute('data-url', url);
    button.addEventListener('click', function (event) {
        event.preventDefault();
        const url = this.dataset.url
        deleteObject(url);
    })
    // Append elements
    li.appendChild(a);
    li.appendChild(button);

    categoryElement.appendChild(li);
}

async function deleteObject(objectURL) {
    fetch(`/delete-object` + objectURL, {
        method: 'DELETE',
    }).then(response => response.json())
    .then(data => {
        if (data.success) {
            document.querySelector(`li[data-url="${objectURL}"]`).remove();
        } else if (data.message){
            alert (data.message);
        } else {
            alert('Error deleting item')
        }
    })
    .catch(error => console.error('Error: ', error))
}