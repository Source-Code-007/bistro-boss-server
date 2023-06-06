const jwt = require('jsonwebtoken');
// verify jwt 
const jwtVerify = (req, res, next)=>{
    const token = req.headers.authorization
    if(!token){
        return res.status(401).send({message: 'unauthorized user!'})
    }
    const tokenCheck = token.split(' ')[1]

    jwt.verify(tokenCheck, process.env.JWT_SECRET_KEY, (err, decoded)=>{
     if(err){
       return res.status(403).send({message: 'unauthorized user!'})
     }
     req.decoded = decoded
     next()
   
    })
   }

   module.exports = jwtVerify