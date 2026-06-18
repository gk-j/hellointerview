import type { Request,Response,NextFunction } from "express";
import jwt from "jsonwebtoken"

export default function middleware(req:Request,res:Response,next:NextFunction){
    try {
        // const token = req.headers["authorization"] ?? ""
        const token = req.cookies?.accessToken ?? ""
        const cleaned_token = token.startsWith("Bearer ") ? token.slice(7) : token
        const decoded = jwt.verify(cleaned_token,'12345')
        if(decoded){
            console.log(decoded)
            //@ts-ignore
            req.userId = decoded.userId
            next()
        }else{
            res.status(403).json({
                message:"Unauthorized"
            })
        }

    } catch (error) {
        return res.json({message:"Unauthorized"})
    }
}