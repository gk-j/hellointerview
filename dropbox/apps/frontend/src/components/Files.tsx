import axios from "axios"
import { useEffect, useState } from "react"
import { BACKEND_URL } from "../util"

type FileItem = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  s3_url: string ;
  status: string;
};

type propsType = {
    
    refreshKey:number
}

export function Files({refreshKey}:propsType){
    const [files,setFiles] = useState<FileItem[]>([])

    useEffect(()=>{
        async function getFileOwnedByUser(){
            const response = await axios.get(`${BACKEND_URL}/files`,{withCredentials:true})

            console.log(response.data)
            setFiles(response.data.message)
        }
        
        getFileOwnedByUser()
    },[refreshKey])
    return(
        <div>
            <p>Files</p>
            {files.map((file)=>{
                return(
                <div key={file.id}>
                    <p>{file.name}</p>
                    <a href={file.s3_url} target="_blank" >Open</a>
                    <button onClick={()=>{console.log(file.id)}}>share</button>
                </div>
            )})}
        </div>
    )
}