const jwt = require('jsonwebtoken');
// verify jwt 
const jwtVerify = (req, res, next)=>{
    const token = (req.headers.authorization).split(' ')[1]
    if(!token){
     res.status(401).send({message: 'no token provided'})
    }
    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded)=>{
     if(err){
       res.status(403).send({message: 'unauthorized user'})
     }
     req.user = decoded
     next()
   
    })
   }

   module.exports = jwtVerify