import express from "express"
import cors from 'cors'
import { S3Client, PutObjectCommand,CreateMultipartUploadCommand,UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@repo/db";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import middleware, { type AuthRequest } from "./middleware";
import calculateUploadStructure from "./util";
import cookieParser from "cookie-parser";
import { commonParams } from "@aws-sdk/client-s3/dist-types/endpoint/EndpointParameters";


const app = express()


const R2_URL = process.env.R2_URL

const R2_ACCESS_KEY_ID=process.env.R2_ACCESS_KEY_ID!
const R2_ACCESS_KEY=process.env.R2_ACCESS_KEY!
const BUCKET_NAME = process.env.BUCKET_NAME


const S3 = new S3Client({
  region: "auto", // Required by SDK but not used by R2
  // Provide your Cloudflare account ID
  endpoint: R2_URL,
  // Retrieve your S3 API credentials for your R2 bucket via API tokens (see: https://developers.cloudflare.com/r2/api/tokens)
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_ACCESS_KEY,
  },
});

const ALLOWED_TYPES=[
    "image/jpeg",
    "image/png",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]

app.use(express.json())
app.use(cors(
    {
        origin:"http://localhost:5143",
        credentials:true
    }
))
app.use(cookieParser());


app.post("/signup",async(req,res)=>{
    try {
        const {email,password} = req.body
        if(!email || !password){
            return res.json({message:"request body is missing"})
        }

        const isUserExist = await prisma.user.findFirst({
            where:{
                email
            }
        })
        if(isUserExist){
            return res.json({message:"email already taken please use different email"})
        }
        console.log(process.env.SALT_ROUNDS)
        const passwordHash = await bcrypt.hash(password,Number(process.env.SALT_ROUNDS!))

        const user = await prisma.user.create({
            data:{
               email,
               password:passwordHash 
            }
        })
        const accessToken =  jwt.sign({userId:user.id},process.env.JWT_SECRET!,{expiresIn:"8h"})
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            sameSite: "lax",
            maxAge: 8 * 60 * 60 * 1000
        });
        return res.status(200).json({message:`user successfully signedup - ${user.id}`,accessToken})
    } catch (error) {
        console.log(error)
        return res.json({message:"error signingup please try again after sometime"})
    }
})


app.post("/signin",async(req,res)=>{
    try {
        const {email,password} = req.body

        if(!email || !password){
            return res.json({message:"please provide email and password"})
        }
        const isUserExist = await prisma.user.findFirst({
            where:{
                email
            }
        })
        if(!isUserExist){
            return res.json({message:"user with this email is not found please signup"})
        }

        const result = await bcrypt.compare(password,isUserExist.password)
        if(!result){
            return res.json({message:"please check your password"})
        }

        const accessToken =  jwt.sign({userId:isUserExist.id},process.env.JWT_SECRET!,{expiresIn:"8h"})
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            sameSite: "lax",
            maxAge: 8 * 60 * 60 * 1000
        });
        return res.json({message:"successfully signedin",token:accessToken})
    } catch (error) {
        return res.status(500).json({message:"Error signing in please try again"})
    }
})


app.post("/getPresignedUrls",middleware, async(req,res)=>{
    try {
        const {fileName,fileType,fileSize} = req.body
        if(!fileName || !fileType || !fileSize){
            return res.json({message:"no request body"})
        }
        if (!ALLOWED_TYPES.includes(fileType)){
            return res.json({message:`file not supported ${ALLOWED_TYPES}`})
        }
        const filePath = `files/${Date.now()}-${fileName}`
        //@ts-ignore
        const userId = req.userId
        const response = await prisma.file.create({
            data:{
                ownerId:userId,
                name:fileName,
                mimeType:fileType,
                size:fileSize,
                storageKey:filePath
            },
            select:{
                id:true
            }
        })
        if(!response.id){
            return res.json({message:"db down"})
        }

        const  {chunkSize, totalParts } = calculateUploadStructure(fileSize)

        // 1. Create Multipart Upload
        const createResponse = await S3.send(new CreateMultipartUploadCommand({
            Bucket: BUCKET_NAME,
            Key: filePath
        }));
        const uploadId = createResponse.UploadId;
        const presignedUrls = [];

        // 2. Loop to generate a unique presigned URL for each part
        for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
            const url = await getSignedUrl(S3, new UploadPartCommand({
                Bucket: BUCKET_NAME,
                Key: filePath,
                UploadId: uploadId,
                PartNumber: partNumber,
            }), { expiresIn: 3600 }); // Valid for 1 hour
            presignedUrls.push({ partNumber, url });
        }
        console.log(presignedUrls)
        // 3. Send the session data and all URLs back to the frontend
        res.json({ id:response.id,key:filePath,chunkSize,uploadId, presignedUrls ,finalUploadUrl:process.env.R2_PUBLIC_DEVELOPMENT_URL!+"/"+filePath});
    } catch (error) {
        console.log(error)
        return res.json({message:"error generating presignedurl"})
    }
})



app.post("/filemetadata",async(req,res)=>{
    try {
        const {id,parts,uploadId,name,size,mimeType,s3_url} = req.body
        if(!id || !name || !size || !mimeType || !s3_url || !uploadId || !parts){
            return res.json({message:"request body is missing"})
        }
        const fileMetadata = await prisma.file.findFirst({
            where:{
                id
            }
        })
        if(!fileMetadata){
            return res.json({message:"please try gain uploading"})
        }
        if(fileMetadata?.status!=="PENDING" &&  fileMetadata?.s3_url !== undefined ){
            return res.json({message:"file already uploaded"})
        }
        console.log("fileMetadata.storageKey:", fileMetadata.storageKey);
        console.log("uploadId:", uploadId);
        console.log("parts:", JSON.stringify(parts, null, 2));
        console.log("parts length:", parts.length);
        await S3.send(new CompleteMultipartUploadCommand({
            Bucket: BUCKET_NAME,
            Key: fileMetadata.storageKey, // Retrieve the path saved during initialization
            UploadId: uploadId,
            MultipartUpload: {
                Parts: parts // Array of checked [{ PartNumber, ETag }] from frontend
            }
        }));

        const response = await prisma.file.update({
            where:{
                id
            },
            data:{
                status:"COMPLETED",
                s3_url
            },
            select:{
                id :true
            }
        })
        return res.json({message:response.id})
        
    } catch (error) {
        console.log(error)
        return res.json({message:"error with updating metadata"})
    }
})


app.post("/abortUpload",async(req,res)=>{
    try {
        const { uploadId, key, id } = req.body;
            if (!uploadId || !key || !id){ 
                return res.status(400).json({ message: "missing fields" });
            }
            await S3.send(new AbortMultipartUploadCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                UploadId: uploadId,
            }));
        
        await prisma.file.delete({ where: { id } });

        return res.json({ message: "upload aborted" });
    } catch (error) {
        console.log(error)
        return res.json({message:"error while aborting the uploading"})
    }
})

app.get("/files",middleware,async(req:AuthRequest,res)=>{
    try {
        const userId = req.userId

        const files = await prisma.file.findMany({
            where:{
                ownerId:userId
            }
        })
        if(!files || files.length==0){
            return res.json({message:"No Files Found please upload"})
        }
        const responseFiles = files.filter((file) => file.status === "COMPLETED" && file.s3_url)
        console.log(responseFiles)
        return res.json({message:responseFiles})
    } catch (error) {
        console.log(error)
        res.json({message:"error fetching files "})
    }
})


app.post("/protected",middleware,(req,res)=>{
    try {
        return res.status(200).json({message:"user loggedin"})
    } catch (error) {
        return res.status(404).json({message:"user not signed in "})
    }
})
app.listen(3000,()=>{
    console.log("dropbox server is running at 3000")
})

app.delete("/cleanup",async(req,res)=>{
    try {
        await prisma.file.deleteMany()
        await prisma.sharedFile.deleteMany()
        await prisma.user.deleteMany()
        
        
        return res.json({message:"successfully cleanup db "})
    } catch (error) {
        console.log(error)
        return res.json({message:"error deleting data"})
    }
})