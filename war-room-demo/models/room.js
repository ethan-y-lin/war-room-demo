const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const RoomSchema = new Schema({
    name: {type: String, required: true, maxLength: 100},
    room_url: {type: String},
})

RoomSchema.virtual("url").get(function() {
    return `/${this._id}`;
});

module.exports = mongoose.model("Room", RoomSchema);