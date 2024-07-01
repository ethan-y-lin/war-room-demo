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

      res.json({room: room, objects: newObjectsData});
  });

  exports.design_upload_post = asyncHandler(async (req, res, next) => {
    const objectsData = req.body.objectsData;
    const roomID = req.body.roomID;
    
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
        name: "test",
        room: room._id,
        objects: newObjectsData,
      });
  
      await design.save();
      res.status(200).json({ message: "success!" });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

// Handle Design delete on POST
exports.design_delete_post = asyncHandler(async (req, res, next) => {
  console.log("Design delete");
    // Get details of design
  try {
    await Design.findByIdAndDelete(req.params.id)
    res.status(200).send({ success: true });
  } catch (error) {
    res.status(500).send({ success: false });
  }
});