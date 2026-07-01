import React, { useState } from "react";
import { FileUploader } from "react-drag-drop-files";
import axios from "axios"
import { Files } from "../components/Files";



const fileTypes = ["JPG", "PNG", "PDF","DOCX","DOC"];

function Upload() {
  const [uploadStatus, setUploadStatus] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [userId,setUserId] = useState<string | " ">("")
  const [filesRefreshKey, setFilesRefreshKey] = useState(0);
  let uploadId: string | null = null;
  let fileKey: string | null = null;
  let fileId: string | null = null;
  
  async function uploadFile(file:any){
    const controller = new AbortController();
    setAbortController(controller);
    setUploadStatus('Initializing upload...');
    try {
      const initResponse = await axios.post("http://localhost:3000/getPresignedUrls",{
              fileName:file?.name,
              fileType: file?.type,
              fileSize: file?.size,
      },
      {withCredentials:true}
    )
      console.log(initResponse.data)
      const { uploadId:uid, presignedUrls,id,key,chunkSize,finalUploadUrl } = initResponse.data
      setUserId(id)
      console.log("presignedUrls",presignedUrls)
      uploadId = uid; fileKey = key; fileId = id;
      const totalParts = Math.ceil(file.size / chunkSize);
      const completedParts:{PartNumber:number,ETag:String}[] = []
      const CONCURRENCY_LIMIT = 3; 
      const queue = [...presignedUrls]

      setUploadStatus(`Uploading 0/${totalParts} parts...`);



      async function worker(){
        while(queue.length>0){
          const item = queue.shift() // remove the first element and returns it
          if(!item){
            break
          }
          const {partNumber,url} = item


          const start = (partNumber-1)*chunkSize
          const end = Math.min(start+chunkSize,file.size)
          const fileChunk = file.slice(start,end)

          let uploadSuccess = false;
          let retryCount = 0;
          const MAX_RETRIES = 3;
          
          while(!uploadSuccess){
            try {
              const response = await axios.put(url,fileChunk,{
                  headers:{'Content-Type': 'application/octet-stream'},
                  signal: controller.signal,
              })
              const rawEtag = response.headers['etag'];
              console.log(rawEtag)
              if (!rawEtag) {
                  throw new Error(`Part ${partNumber} failed: ETag header missing.`);
              }
              completedParts.push({ PartNumber: partNumber, ETag: rawEtag });
              setUploadStatus(`Uploading ${completedParts.length}/${totalParts} parts...`);
              uploadSuccess=true

            } catch (error) {
              if(retryCount<MAX_RETRIES){
                  retryCount++
                  console.warn(`Part ${partNumber} failed. Retrying (${retryCount}/${MAX_RETRIES})... Error: ${error}`);
                  await new Promise(resolve => setTimeout(resolve, 1000));
              }else{
                  throw new Error(`Part ${partNumber} failed permanently after ${MAX_RETRIES} retry.`);
              }
            }
          }
        }
      }

      const workers = Array(Math.min(totalParts,CONCURRENCY_LIMIT)).fill(null).map(worker)

      await Promise.all(workers)
      completedParts.sort((a, b) => a.PartNumber - b.PartNumber);
      // 3. CRITICAL FINAL STEP: Tell backend to finalize the upload in R2
      setUploadStatus('Finalizing upload on server...');
      //for stitching 
      const metadataResponse = await axios.post("http://localhost:3000/filemetadata",{
              id:id,
              name:file?.name,
              mimeType: file?.type,
              size: file?.size,
              s3_url:finalUploadUrl,
              uploadId:uploadId,
              parts:completedParts
      },
      {withCredentials:true}  
      ) 
      
      if (metadataResponse.data?.message === "error with updating metadata") {
          throw new Error("Server failed to finalize the upload");
      }

      console.log(metadataResponse.data)
      setUploadStatus('Upload successful!');
      setFilesRefreshKey((prev) => prev + 1);

    } catch (error) {
      if (axios.isCancel(error)) {
        setUploadStatus('Upload cancelled');
    } else {
        setUploadStatus(`Upload failed: ${error}`);
    }
    if (uploadId && fileKey && fileId) {
        await axios.post("http://localhost:3000/abortUpload", { uploadId, fileKey,fileId },
        {withCredentials:true});
      }
    } finally{
      setAbortController(null)
    }
    
  };
  return (
    <>
    <FileUploader  handleChange={async(e)=>{
      try {
        const file = e
        if(!file){
              return
        }
        setIsUploading(true);
        await uploadFile(file)
        setIsUploading(false);
      } catch (error) {
        console.error("Upload failed:", error);
        setUploadStatus(`Upload failed: ${error}`);
      }
    }} name="file" types={fileTypes} />

    {uploadStatus && <p>{uploadStatus}</p>}
      {abortController && (
      <button onClick={() => abortController.abort()}>Cancel</button>
      )}
      <Files refreshKey={filesRefreshKey}/>
    </>
  );
  
}

export default Upload