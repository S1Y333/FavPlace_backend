const uuid = require('uuid');
const fs = require('fs');
const { validationResult } =  require('express-validator');
const HttpError = require('../models/http-error');
const getCoordsForAddress = require('../util/location');
const Place = require('../models/place');
const User = require('../models/user');
const { default: mongoose } = require('mongoose');



const getPlaceById = async (req,res, next) => {
   let reqPlace  
  try {
      reqPlace = await Place.findById(req.params.pid);

    } catch (err) {
      const error = new HttpError('Something went wrong, could not find a place.', 500);

      return next(error);
    }
    

    if( !reqPlace) 
    {
      const error = new HttpErrorError('Could not find a place for the provided id.', 404);

      return next(error);
      
    }
      
    // turn reqPlace to a normal javascript object, getters true can tell the mongoose to keep the id as part of the object
    
    res.json({reqPlace : reqPlace.toObject( {getters: true }) });
}

const getPlacesByUserId = async (req,res, next) => {
   /* one way of writing the code
    let reqPlaces;

    try { 
      reqPlaces =  Place.find({ creator: req.params.uid });
    } catch (err) {
      const error = new HttpError('Something went wrong, could not find the places for this user id.', 500);

      return next(error);
    }

    if(!reqPlaces || reqPlaces.length === 0) 
    {
    
      return next(new HttpError('Could not find places for the provided user id.', 404));
    }
    
    // this is different because of find method
    res.json({ reqPlaces : (await reqPlaces).map(place => place.toObject({getters: true })) });
    */
  // alternative way to write the code
  let userWithPlaces;

  try{
    // async needs to await. otherwise there will be problems on the results
    userWithPlaces = await User.findById(req.params.uid).populate('places');
  } catch (err) {
    const error = new HttpError('Something went wrong, could not find the places for this user id.', 500);

      return next(error);
  }

  if(!userWithPlaces || userWithPlaces.length === 0) 
  {
  
    return next(new HttpError('Could not find places for the provided user id.', 404));
  }
  console.log(userWithPlaces.places);
  // this is different because of find method
  res.json({ places : userWithPlaces.places.map(place => place.toObject({ getters: true })) });
};

const createPlace = async (req,res, next) => {

    // execute the validate process
    const errors = validationResult(req);

    if ( !errors.isEmpty()) {
        console.log(errors);
        // async won't throw error directly, instead it can use next for the error
        return next(new  HttpError('Invalid inputs passed, pleasee check yoour data.', 422));
    }


   // use object destructuring instead of doing const title = req.body.title;
   const { title, description, address} = req.body;
   
   let coordinates;

   try {
       coordinates = await getCoordsForAddress(address);
       } catch (error) {
        //return error so the following codes will not be implemented
        return next(error);
       }
   
    // creator use the info attached to userdata (chec-auth.js had attached the userid) instead of extracting from the req.body because user can make wronng enter
   const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    imagUrl:req.file.path,
    creator: req.userData.userId
   });
   
   //check if creator is existing in the database.
   let user;

   try{
     user = await User.findById(req.userData.userId);

   } catch (err) {
     const error = new HttpError(
      'Creating place failed, please try again',
      500
     );
     return next(error);
   }

   if(!user) {
    const error = new HttpError(
      'Could not ',
      500
     );
     return next(error);
   }

   console.log(user);
  // if creating place fail or if storing place id in the user database fail, the processs won't move on
   try{
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session:sess });
    await sess.commitTransaction();
   } catch (err) {
      console.log(err);
      const error = new HttpError(
        'Creating place failed, please try again.',
        500
      );
      return next(error);
   }
   

   res.status(201).json({place: createdPlace});

};

const updatePlace = async (req, res, next) => {
    
    const errors = validationResult(req);

    if ( !errors.isEmpty()) {
        console.log(errors);
    
        return next(new  HttpError('Invalid inputs passed, pleasee check yoour data.', 422));
    }

    const { title, description } = req.body;
    const placeId = req.params.pid;


    // {...} create a new object copy
    let updatedPlace ;
    try {
      updatedPlace = await Place.findById(placeId);
    } catch (err) {
      const error = new HttpError(
        'Something went wrong, could not update place',
        500
      );
      return next(error);
    }
    
    //check if the editor id is different from creator id then refuse to allow editing
    if (updatedPlace.creator.toString() !== req.userData.userId)
    {    const error = new HttpError(
      'You are not allowed to edit this place',
      401
    );
    return next(error);

    }

    // find where to put the updated value
   //const placeIndex = Place.findIndex(req.params.pid); for dummy data use only
   // update the value in the copy
   updatedPlace.title= title;
   updatedPlace.description = description;
   //put the updated copy to the position
  // DUMMY_PLACES[placeIndex] = updatedPlace;
    
   try {
    await updatedPlace.save();
   } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update place',
      500
    );
    return next(error);
   }
   // update use code 200, and create a new item use code 201
    res.status(200).json({place: updatedPlace.toObject({ getters:true }) });

};

const deletePlace = async (req, res, next) => {
    let place;

    try {
      //use populate need to be used by two connected database
      place = await Place.findById(req.params.pid).populate('creator');
    } catch(err) {
      const error = new HttpError('Could not Delete a place for that id.', 500);

      return next(error);
    } 
    
    //check and handle if the place doesn't exist
    if(!place) {
      const error = new HttpError('Could not find place for this id.', 404);
      return next(error);
    }

    const imagePath = place.imagUrl;

    try {
      const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.deleteOne({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session:sess });
    await sess.commitTransaction();
      
    } catch(err) {
      const error = new HttpError('Could not Remove a place for that id.', 500);

      return next(error);
    }
   
    fs.unlink(imagePath, err => {
      console.log(err);
    });

    res.status(200).json( { message: 'Deleted place.'});

}

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
