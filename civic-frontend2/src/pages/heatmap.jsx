/* eslint-disable no-unused-vars */

import React from 'react'
import ComplaintHeatmap from '../components/heatmapcomplaint'
import { useEffect } from 'react'
import axios from 'axios'
import { useContext } from 'react'
import { OfficerContext } from '../context/officer.context'
import { useState } from 'react'

const Heatmap = () => {
    const data3 = useContext(OfficerContext);
    // eslint-disable-next-line no-unused-vars
    const [complaints, setcomplaints] = useState([{
          
      _id: "68b327e5e563532250e75bf2",
      user: "68b314011cdfb454f156827a",
      name: "Dheeraj",
      phone: "6260976750",
      media: "http://res.cloudinary.com/droq0jzmv/image/upload/v1756571620/g5lfnkdkb…",
      description: "A significant accumulation of various types of garbage, including plastic...",
      address: "Unnamed Road, Balda, Simrol, Madhya Pradesh. Pin-452020 (India)",
      location: { lat: 22.7196, lon: 75.8577 },
      officer: "68b322f41dd3d461a34790fa",
      assignedWorker: "68b34e91aec51d7830a0d988",
      department: "waste_management",
      problem_type: "garbage",
      severity_level: "high",
      skills: ["cleaning", "waste_management"],
      status: "Assigned",
      createdAt: "2025-08-30T16:33:41.927Z",
      updatedAt: "2025-09-24T19:13:49.007Z"
    

    }]);
   

    useEffect(()=>{
        axios.get(`${import.meta.env.VITE_API_URL}/complaint/allcomplaint?id=${data3.officer._id}`,{
            withCredentials:true,
            headers:{
                Authorization:`Bearer ${JSON.parse(localStorage.getItem('token2'))}`
            }
        }).then((reponse)=>{
            console.log(reponse.data);
            setcomplaints(reponse.data.complaint);


        })

    },[])
    
  return (
    <>
    <ComplaintHeatmap officer={data3.officer} complaints={complaints} />
    </>
  )
}

export default Heatmap