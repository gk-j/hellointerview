import type { Request,Response,NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken"

export type AuthRequest = Request & {
  userId?: string;
};

export default function middleware(req:AuthRequest,res:Response,next:NextFunction){
    try {
        // const token = req.headers["authorization"] ?? ""
        const token = req.cookies?.accessToken ?? ""
        const cleaned_token = token.startsWith("Bearer ") ? token.slice(7) : token
        const decoded = jwt.verify(cleaned_token,process.env.JWT_SECRET!) as JwtPayload
        if(decoded){
            console.log(decoded)
            
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