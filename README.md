# 3D Furniture Planner Demo

This project is a 3D furniture planner that allows a user to upload 3D models of a room and objects 
and view how the objects in the room look in 3D. It is designed to be used in conjunction with 3D
room scanning applications like [Polycam](https://poly.cam/). It supports several view modes including
orthographic, perspective, and first-person. It also implements features like measuring distance and 
[unimplemented] exporting the 3D models.

## Tech Stack

- Webpack: Module bundler
- Babel: JavaScript compiler
- Node.js: JavaScript runtime
- Express.js: Web framework
- MongoDB: NoSQL database
- Mongoose: MongoDB ORM
- Cloudinary: Media management
- Pug: Template engine
- Three.js: 3D graphics library
  
## Installation Instructions

If you would like to try out this project, the deployed version will be coming soon.
If you want to run this project with your own database, follow these steps. 

### 1. Clone this repository
```
git clone 
cd war-room-demo
```

### 2. Install dependencies
```
npm install
```

### 3. Copy the example .env file
```
cp .env.example .env
```

### 4. Create MongoDB account and Cloudinary accounts and update .env file

## How to run locally

### 1. Run the app
```
npm start
```

### 2. Open http://localhost:3000 in your browser
```
open http://localhost:3000
```


