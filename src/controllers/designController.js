const cloudinary = require('../config/cloudinaryConfig');
const asyncHandler = require("express-async-handler");
const {body, validationResult} = require("express-validator");

const Design = require("../models/design");
const Room = require("../models/room");
const Object = require("../models/object");

// Display detail page for a specific Design.
exports.design_detail = asyncHandler(async (req, res, next) => {
    // // Get details of room and all their books (in parallel)
      const design = await Design.findById(req.params.id).exec();

      if (design === null) {
        // No results.
        const err = new Error("Room not found");
        err.status = 404;
        return next(err);
      }

      const room = await Room.findById(design.room);
      const newObjectsData = [];
      for (let objData of design.objects) {
        const newObject = await Object.findById(objData.object);
        const newObjectData = {};
        newObjectData.object = newObject;
        newObjectData.position = objData.position;
        newObjectData.rotation = objData.rotation;
        newObjectsData.push(newObjectData);
      }

      res.json({room: room, objects: newObjectsData, name: design.name});
  });

  exports.design_upload_post = asyncHandler(async (req, res, next) => {
    const objectsData = req.body.sceneData.objectsData;
    const roomID = req.body.sceneData.roomID;
    const name = req.body.name;
    try {
      let room;
      if (roomID != null) {
        room = await Room.findById(roomID).exec();
      } else {
        room = await Room.findOne({name: "War Room"});
      }

      if (!room) {
        res.status(404).json({ message: 'Room not found' });
        return;
      }
  
      const newObjectsData = [];
  
      for (const objData of objectsData) {
        try {
          const newObject = await Object.findOne({ name: objData.name });
          if (!newObject) {
            res.status(404).json({ message: `Object with name ${objData.name} not found` });
            return;
          }
  
          const newObjectData = {
            object: newObject._id, // Assuming you want to store the object's ID
            position: objData.position,
            rotation: objData.rotation,
          };
  
          console.log("loop");
          newObjectsData.push(newObjectData);
          console.log(newObjectsData);
        } catch (error) {
          res.status(400).json({ message: error.message });
          return;
        }
      }
  
      console.log(newObjectsData);
      console.log(room);
  
      const design = new Design({
        name: name,
        room: room._id,
        objects: newObjectsData,
      });
  
      await design.save();
      res.status(200).json({ message: "success!", design: {name: name, url: design.url}});
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

// Handle Design delete on POST
exports.design_delete_post = asyncHandler(async (req, res, next) => {
  console.log("Design delete");
    // Get details of design
  try {
    const design = await Design.findById(req.params.id).populate("name").exec();
    const designName = design.name;
    await Design.findByIdAndDelete(req.params.id)
    console.log(designName);
    res.status(200).send({ success: true, name: designName });
  } catch (error) {
    res.status(500).send({ success: false });
  }
});

// Handle Design update on PUT
exports.design_update = asyncHandler( async (req, res, _) => {
    console.log("Design update");
    const objectsData = req.body.sceneData.objectsData;
    const newObjectsData = [];
  
    for (const objData of objectsData) {
      try {
        const newObject = await Object.findOne({ name: objData.name });
        if (!newObject) {
          res.status(404).json({ message: `Object with name ${objData.name} not found` });
          return;
        }

        const newObjectData = {
          object: newObject._id, // Assuming you want to store the object's ID
          position: objData.position,
          rotation: objData.rotation,
        };

        console.log("loop");
        newObjectsData.push(newObjectData);
        console.log(newObjectsData);
      } catch (error) {
        console.log("Object Not Found")
        res.status(400).json({ message: error.message });
        return;
      }
    }

    try {
      console.log(req.params.name);
      const design = await Design.findOneAndUpdate({name: req.params.name}, {objects : newObjectsData}, {new: true});
      if (design) {
        res.status(200).send({ success: true, design });
      } else {
        res.status(404).send({ success: false, message: 'Item not found' });
      }
    } catch (error) {
      res.status(500).send({ success: false, message: error.message });
    }
});