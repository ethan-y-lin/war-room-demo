var express = require('express');
var router = express.Router();
const multer = require('multer');
const path = require('path');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Require our controllers.
const object_controller = require("../controllers/objectController");
const app_controller = require("../controllers/appController");
const category_controller = require('../controllers/categoryController');
const room_controller = require("../controllers/roomController");
const design_controller = require("../controllers/designController");

// Routes
router.get('/', app_controller.index);
router.get('/about', app_controller.about);

// OBJECT ROUTES 

// GET request for creating an Object. 
router.get('/upload-object', object_controller.object_upload_get);

// POST request for creating Object.
router.post('/upload-object', upload.single('object'), object_controller.object_upload_post);

// GET request for dispalying list. 
// router.get("/list", object_controller.object_list);
router.get('/list', object_controller.object_list);

// GET request for one Object.
router.get("/object/:id", object_controller.object_detail);

// POST request for deleting a Object.
router.post('/delete-object/:id', object_controller.object_delete_post);


// CATEGORY ROUTES

// POST request for creating Category.
router.post('/upload-category', category_controller.category_upload_post);

// POST request for deleting a Category.
router.post('/delete-category/:id', category_controller.category_delete_post);

// ROOM ROUTES 

// // GET request for opening a Room.
// router.get('/room/:id', room_controller.room_open_get);

// POST request for creating a Room.
router.post('/upload-room', upload.single('room'), room_controller.room_upload_post);

// GET request for one Room.
router.get("/room/:id", room_controller.room_detail);

/// DESIGN ROUTES

// GET request for one Design.
router.get("/design/:id", design_controller.design_detail);

// DELETE request for one Design
router.delete("/delete-design/:id", design_controller.design_delete_post)

// POST request for uploading a Design.
router.post('/upload-design', design_controller.design_upload_post);

module.exports = router;
