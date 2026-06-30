import express from "express"
import cors from 'cors'

const app = express()



app.use(express.json())
app.use(cors())



app.post("/",(req,res)=>{
    try {
        
    } catch (error) {
        
    }
})



app.listen(3000,()=>{
    console.log("dropbox server is running at 3000")
})