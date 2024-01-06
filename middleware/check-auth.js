const HttpError = require("../models/http-error");
const jwt = require('jsonwebtoken');
require('dotenv').config();

//valid all the incoming request for its token
module.exports = (req,res, next) => {
    //allow 'options' request not be blocked
    if (req.method === 'OPTIONS') {
        return next();
    }
    // can't use req body because delete doesn't have req body
    //authorization: 'Bearer token', bear is [0], token is [1]
    try {const token = req.headers.authorization.split(' ')[1]; 
      if (!token) {
        throw new Error('Authentication failed!');
      }

      //verify the token, use the same token secret set in the users controller
      const decodedToken = jwt.verify(token, process.env.JWT_KEY);
      req.userData = { userId: decodedToken.userId };
      next();
    } catch (err)  {
        const error = new HttpError('Authentication failled!', 401);
        return next(error);
    }
}