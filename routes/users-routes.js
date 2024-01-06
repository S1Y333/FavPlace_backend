const express = require('express');
const HttpError = require('../models/http-error');
const { check } = require('express-validator');

const router = express.Router();

const userscontroller = require('../controllers/users-controllers');
const fileUpload = require('../middleware/file-upload');

router.get("/",  userscontroller.getUsers);

router.post('/signup', 
     fileUpload.single('image'),
    [
    check('name')
          .not()
          .isEmpty(),
    check('email')
          .normalizeEmail()
          .isEmail(),
    check('password').isLength({min:6}),
    ], userscontroller.signup);

// login doesn't need to be validated because it
router.post('/login', userscontroller.login);

module.exports = router;