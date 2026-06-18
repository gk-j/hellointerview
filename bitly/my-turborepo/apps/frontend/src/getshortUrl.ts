import axios from "axios";
import { BACKEND_URL } from "./config";

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxM2M0ZmZlMy1mMmJkLTQzYmQtYTI0ZS02NDE5OGIwODI5MTIiLCJpYXQiOjE3ODE2NzY1MzR9.tzY43Z-KP4KMnp9QX4YgzddpKxMbIvqONf2V5Bih-RU"

export default async function getShortUrl(longUrl:string){
    const data = await axios.post(`${BACKEND_URL}/url`,{
        longUrl
    },{
        withCredentials:true
    })
    return data.data.code
    console.log(data)
    console.log(data.data.code)

}