import { useEffect, useState } from "react";
import axios from "axios"
import { BACKEND_URL } from "../util";
import { Navigate } from "react-router-dom";


type ProtectedRouteProps = {
  children: React.ReactNode;
};


export default function ProtectedRoute({children}:ProtectedRouteProps){
    const [isLoggedIn,setIsLoggedIn]=useState<boolean | null>(null)

    useEffect(()=>{
        async function checkUser(){
            try {
                const response = await axios.post(`${BACKEND_URL}/protected`,{
                    withCredentails:true
                })
                console.log("protected route",response.data.success)
                if(response.status===200){
                    setIsLoggedIn(true)
                }else{
                    setIsLoggedIn(false)
                }
            } catch (error) {
                setIsLoggedIn(false);
            }
        }
       
        checkUser()
    },[])

    if (isLoggedIn === null) {
        return <div>Loading...</div>;
    }
    if (isLoggedIn === false) {
        return <Navigate to="/signup" replace />;
    }

    return <>{children}</>;
}