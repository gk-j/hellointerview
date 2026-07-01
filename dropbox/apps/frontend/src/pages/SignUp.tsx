
import { useNavigate } from "react-router-dom";
import {BACKEND_URL} from "../util"
import axios from "axios"


export default function SignUp(){

    const navigate = useNavigate()
    async function handleSubmit(event:any){
        // Prevent default behavior, which is a navigation
        event.preventDefault();

        const formElement = event.target;
        const formData = new FormData(formElement);
        // alert("hji")
        console.log("Hi")
        console.log(formData.get("userEmail"))
        console.log(formData.get("userPassword"))
        const response = await axios.post(`${BACKEND_URL}/signup`,{
            email:formData.get("userEmail"),
            password:formData.get("userPassword")
            },
            { withCredentials: true }
        )
        console.log(response.data)
        console.log(response.status)
        if(response.status===200){
            console.log("Hi")
            navigate("/upload")
        }
    }
    return(
        <div >
            <form onSubmit={handleSubmit}>
                <label htmlFor="email-input">Email</label>
                <input id="email-input" type="email" name="userEmail" placeholder="Enter Your Email here" required></input>
                <label htmlFor="password-input">Password</label>
                <input id= "password-input" type="password" name="userPassword" placeholder="Enter Your Password here" required></input>
                <button>Signup</button>
            </form>
            <button onClick={()=>navigate("/signin")}>if already signed up click here </button>
        </div>
        
    )
}