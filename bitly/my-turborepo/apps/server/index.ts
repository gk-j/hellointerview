import express from "express"
import isUrl from "is-url"
import {prisma} from "@repo/db"
import { createClient } from "redis";
import jwt from "jsonwebtoken"
import middleware from "./middleware";
import cors from "cors"
import cookieParser from "cookie-parser";



const client = createClient({
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error("Redis: max reconnection attempts reached");
        return new Error("Too many retries");
      }
      // exponential backoff: 100ms, 200ms, 400ms ... capped at 3s
      return Math.min(100 * Math.pow(2, retries), 3000);
    },
  },
})
  .on("error", (err) => console.error("Redis Client Error", err))
  .on("reconnecting", () => console.log("Redis reconnecting..."));

await client.connect();

const app  = express()

app.use(express.json())
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
  }))
app.use(cookieParser());
const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function base62Encode(num: number): string {
  if (num === 0) return "0";
  let result = "";
  while (num > 0) {
    result = BASE62[num % 62] + result;
    num = Math.floor(num / 62);
  }
  return result.padStart(8, "0");
}

// Seeds url_counter so a Redis restart doesn't collide with existing DB rows
async function seedRedisCounter() {
  const maxRecord = await prisma.shortUrl.findFirst({
    orderBy: { id: "desc" },
    select: { id: true },
  });
  if (!maxRecord) return;

  const current = await client.get("url_counter");
  const currentVal = current ? parseInt(current, 10) : 0;
  if (maxRecord.id > currentVal) {
    await client.set("url_counter", maxRecord.id);
    console.log(`Redis url_counter seeded to ${maxRecord.id}`);
  }
}

await seedRedisCounter();

async function createShortUrl(userId: string, longUrl: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = await client.incr("url_counter");
    const shortCode = base62Encode(id);

    try {
      const record =  await prisma.shortUrl.create({
        data: {
          id: id,
          userId,
          shortCode,
          longUrl,
        },
      });
      //caching here
      await client.set(shortCode, longUrl);
      return record
    } catch (error: any) {
      if (error.code === "P2002") continue;
      throw error;
    }
  }

  throw new Error("Could not generate unique short URL");
}

app.post("/signup",async (req,res)=>{
    try {
        const {email,password} = req.body
        const user = await prisma.user.findFirst({
            where:{
                email:email
            }
        })
        if(user){
            return res.status(409).json({message:"user already exist please sign in"})
        }
        const usercreated = await prisma.user.create({
            data:{
                email,
                password
            }
        })
        return res.status(201).json({userId:usercreated.userId})
    } catch (error) {
        console.log(error)
        return res.status(500).json({message:"Error signing up please try again"})
    }
})

app.post("/signin",async (req,res)=>{
    try {
        const { email,password } = req.body
        const user = await prisma.user.findFirst({
            where:{
                email:email,
                password:password
            }
        })
        if(!user){
            return res.status(401).json({message:"Invalid email or password"})
        }
        const accessToken = jwt.sign({userId:user.userId},'12345')
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            sameSite: "strict",
        });
        return res.status(200).json({token:accessToken})
    } catch (error) {
        return res.status(500).json({message:"Error signing in please try again"})
    }
})

app.post("/url",middleware,async(req,res)=>{
    console.log("url shortner")
    try {
        //@ts-ignore
        const userId = req.userId
        if (typeof userId !== "string") {
            return res.status(401).json({
                error: "Invalid user id",
            });
        }

        const {longUrl} = req.body
        if(!isUrl(longUrl)){
            return res.status(400).json({message:"please provide correct url string"})
        }
        const shortUrl= await createShortUrl(userId,longUrl)
        return res.status(201).json({code:shortUrl.shortCode})
    } catch (error) {
        return res.status(500).json({message:"error with url shortening"})
    }
})

app.get("/me", middleware, async (req, res) => {
  return res.json({
    success: true,
    //@ts-ignore
    userId: req.userId
  });

});

app.get("/:shortCode",middleware,async(req,res)=>{
    try {
        const {shortCode } = req.params
        if(typeof shortCode !== "string"){
            return res.status(400).json({message:"Invalid short code"})
        }
        const cached = await client.get(shortCode)
        if(cached){
            return res.status(302).redirect(cached)
        }

        const record = await prisma.shortUrl.findFirst({
            where:{
                shortCode:shortCode
            }
        })
        if(!record){
            return res.status(404).json({message:"Short url not found"})
        }
        await client.set(shortCode,record.longUrl)
        return res.status(302).redirect(record.longUrl)
    } catch (error) {
        return res.status(500).json({
            message: "Error redirecting"
        })
    }
})


app.listen(3001,()=>{
    console.log("server running at port 3001")
})
