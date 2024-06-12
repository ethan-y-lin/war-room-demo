var express = require('express');
var router = express.Router();
const multer = require('multer');
const path = require('path');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Require our controllers.
const object_controller = require("../controllers/objectController");
const app_controller = require("../controllers/appController");
// Routes
router.get('/', app_controller.index);

// GET request for creating an Object. 
router.get("/upload", object_controller.object_upload_get);

// POST request for creating Item.
router.post("/upload", upload.single('object'), object_controller.object_upload_post);

// GET request for dispalying list. 
router.get("/list", object_controller.object_list);

// GET request for one Object.
router.get("/:id", object_controller.object_detail);

module.exports = router;
