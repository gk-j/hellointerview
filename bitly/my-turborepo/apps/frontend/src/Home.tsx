import { useRef, useState } from "react";
import getShortUrl from "./getshortUrl";

export default function Home(){
  const urlRef = useRef<HTMLInputElement>(null)
  const [shortCode,setShortCode] = useState("")

  const handleSubmit = async () => {
    
    const longUrl = urlRef.current?.value;
    if(!longUrl){
      return 
    }
    const shortForm = await getShortUrl(longUrl)
    if (!longUrl) {
      alert("Please enter a URL");
      return;
    }
    setShortCode(shortForm)
    console.log(longUrl);
  }

  return (
    <div>
      <div>
        <input type="text" placeholder ="long url" ref={urlRef}/>
        <button onClick={handleSubmit}>submit</button>
        <div>{shortCode}</div>
      </div>
    </div>
  );
}