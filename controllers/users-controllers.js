const uuid = require('uuid');
const { validationResult} = require('express-validator');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');

const DUMMY_USERS = [
    {
      id: 'u1',
      name: 'Max Schwarz',
      email: 'test@test.com',
      password: 'testers'
    }
];

const getUsers = async (req, res, next) => {
    //only return email and name not all the information
    let users
    try {
        users = await User.find({}, {password: 0});
    } catch (err) {
        const error = new HttpError('Fetching users failed,  please try again later.', 500);
        return next(error);
    }

    res.json({users: users});
};

const signup = async (req, res, next) => {

    const errors = validationResult(req);

    if ( !errors.isEmpty()) {
        console.log(errors);
    
        return next (new  HttpError('Invalid inputs passed, pleasee check yoour data.', 422));
    }

    const { name, email, password} = req.body;
    let hasUser;
    try{
         hasUser = await User.findOne({email: email});
    } catch(err) {
        const error = new HttpError('Signing up failed, please try again later.', 500);
    }
    
    console.log(hasUser);

    if (hasUser) {
        const error = new HttpError('User exists already, please login instead.', 422);
        return next(error);
    }
    
    let hashedPassword;
    try{
        hashedPassword = await bcrypt.hash(password, 12);
    } catch (err) {
        const error = new HttpError(
            'Could not  create user, please try again.', 500
        );
        return next(error);
    }

    const newUser = new User ({
        name,  //shorcut of name: name
        email,
        image: req.file.path,
        password: hashedPassword,
        places:[]
    })
   
    try {
        await newUser.save();
     } catch (err) {
        console.log(err);
        const error = new HttpError(
          'Creating user failed, please try again.',
          500
        );
        return next(error);
     }

     let token;
     try {token = jwt.sign({userId: newUser.id, email: newUser.email}, 
                            process.env.JWT_KEY, 
                          { expiresIn:'1h' });
      } catch (err) {
        console.log(err);
        const error = new HttpError(
          'Creating user failed, please try again.',
          500
        );
        return next(error);
      }

    res.status(201).json({userId: newUser.id, email: newUser.email, token: token });

};

const login = async (req, res, next) => {
    const { email, password } = req.body;
    
    let identifiedUser;
    try {
       identifiedUser = await User.findOne({email:email});
    } catch (err) {
        const error = new HttpError('Loggin failed, please try again.', 500);
        return next(error);
    }
    //if don't find a user
    if(!identifiedUser ) {
       return next( new HttpError('Could not identify user, credentials seem to be wrong.', 401));
    }

    //if user email matched then check the password part, isValidPassword will receive true or false to show if the password is correct
    let isValidPassword = false;
    try {
        isValidPassword = await bcrypt.compare(password, identifiedUser.password);
    } catch (err) {
        'Could not log you in,  please check your credentials and try again.',
        500
    };

    if(!isValidPassword) {
        const error = new HttpError(
            'Invalid credentials, could not log you in.',
            401
        );
        return next(error);
    }

    let token;
    try {
        token = jwt.sign({userId: identifiedUser.id, email: identifiedUser.email}, 'supersecret_dont_share', { expiresIn:'1h' });
     } catch (err) {
       console.log(err);
       const error = new HttpError(
         'Logging in user failed, please try again.',
         500
       );
       return next(error);
     }

   res.status(201).json({userId: identifiedUser.id, email: identifiedUser.email, token: token });

};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;