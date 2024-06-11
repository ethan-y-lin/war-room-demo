var express = require('express');
var router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Require our controllers.
const object_controller = require("../controllers/objectController");

// Routes
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html')); // Assuming you have an index.html file for your frontend
});

// GET request for creating an Object. 
router.get("/upload", object_controller.object_upload_get);

// POST request for creating Item.
router.post("/upload", upload.single('object'), object_controller.object_upload_post);

module.exports = router;
