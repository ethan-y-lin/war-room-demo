const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const DesignSchema = new Schema({
    name: {type: String, required: true, maxLength: 100},
    room: {type: Schema.Types.ObjectId, ref: "Room", required: true},
    objects: [{
        object: {type: Schema.Types.ObjectId, ref: "Object", required: true},
        position: {
            x: { type: Number, required: true },
            y: { type: Number, required: true },
            z: { type: Number, required: true }
          },
          rotation: {
            x: { type: Number, required: true },
            y: { type: Number, required: true },
            z: { type: Number, required: true }
          }
    }]
})

DesignSchema.virtual("url").get(function() {
    return `/${this._id}`;
});

module.exports = mongoose.model("Design", DesignSchema);