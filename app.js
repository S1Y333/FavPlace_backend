//import file system module
const fs = require('fs');

const express = require('express');
const bodyParser = require('body-parser');
const placesRoutes = require('./routes/places-routes');
const usersRoutes = require('./routes/users-routes');
const HttpError  = require('./models/http-error');
const mongoose= require('mongoose');
const path = require('path');
require('dotenv').config();


const uri = "mongodb+srv://"+ process.env.USERNAME + ":" + process.env.PASSWORD + "@cluster0.hmpelov.mongodb.net/placesDB";

const app = express();

//app.use(express.static(path.join(__dirname,'client','build')));
//


// change req.body to javascript readable object
app.use(bodyParser.json());

// need to add middleware to handle the image link, which can make
// express static means not execute but return it, we need to specify which file in whhich folder we want to return
// such path needs to be an absolute path
app.use('/uploads/images', express.static(path.join('uploads','images')));

// add a middleware to allow the browser to access different port on localhost
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
    next();
});

//app.get("/*",(req,res) => { res.sendFile(path.join(__dirname, '../react-frontend-01-starting-setup/public/index.html'));});

app.use('/api/places',placesRoutes);
app.use('/api/users', usersRoutes);


app.use((req,res,next) => {
    const error = new HttpError('Could not find this route.', 404);
    throw error;
})

app.use((error, req, res, next) => {
    //if any error occur, the file will be deleted
    if(req.file) {
        //deletee the file 
        fs.unlink(req.file.path, err=> {
            console.log(err);
        });
    }

    if (res.headerSent) {
        return next(error);
    }
    res.status(error.code || 500).json({message: error.message || 'An unknown error occurred!'});
})

mongoose.connect(uri)
.then(() => {app.listen(5000, ()=> {
    console.log(uri);
    console.log("Server running on port 5000.")});})
.catch(err => {
        console.log(err);
    });