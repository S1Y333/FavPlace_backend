const express = require('express');
const { check } = require('express-validator');
const fileUpload = require('../middleware/file-upload');
const checkAuth = require('../middleware/check-auth');

const router = express.Router();

const placescontroller = require('../controllers/places-controllers')

router.get("/", (req,res, next) => {
    console.log('GET request works1');
    res.json({ message: 'Bingo!'});
});

router.get("/:pid", placescontroller.getPlaceById);

router.get('/user/:uid', placescontroller.getPlacesByUserId );

// create a middleware to check the token, if it's not valid, it will protect the followinng post, path,delete action
router.use(checkAuth);

//check willl be execuate before goiing to the controller,register the middleware
router.post('/' , 
       fileUpload.single('image'),
       [
         check('title')
               .not()
               .isEmpty(),
         check('description').isLength({min:5}),
         check('address').not().isEmpty()
        ], 
        placescontroller.createPlace);

router.patch('/:pid', 
   [
    check('title')
          .not()
          .isEmpty(),
    check('description').isLength({min:5})
   ], placescontroller.updatePlace);

router.delete('/:pid', placescontroller.deletePlace );

module.exports = router;