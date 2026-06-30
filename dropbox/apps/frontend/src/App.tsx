import React, { useState } from "react";
import { FileUploader } from "react-drag-drop-files";
import './App.css'


const fileTypes = ["JPG", "PNG", "PDF","DOCX","DOC"];

function App() {
  
  const [file, setFile] = useState(null);
  const handleChange = (file) => {
    setFile(file);
  };
  return (
    <FileUploader handleChange={handleChange} name="file" types={fileTypes} />
  );
}

export default App
