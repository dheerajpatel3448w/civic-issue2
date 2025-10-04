import Complaint from "../models/complaint.model.js"
import { main } from "../service/gemini.service.js";
import { uploadoncloudinary } from "../utils/cloudinary.js";
import { Officer } from "../models/officer.model.js";
import { reverseGeocode } from "../service/map.serivice.js";
import { sendmessagetosocket } from "../socket.js";
import { sendWhatsAppMessage } from "../service/twillo.service.js";
import { createTaskLink } from "../utils/createTaskLink.js";
import workerModel from "../models/worker.model.js";
import { senttomail } from "../service/mail.service.js";
export const createcomplaint = async(req,res) => {
    const user = req.user._id
    const {name,lon,lat,address,phone} = req.body;
    console.log(name,user)


         

const imageurl =   await uploadoncloudinary(req.file.buffer);

const data = await main(imageurl);
console.log(imageurl)
const city = await reverseGeocode(lat,lon);
console.log(city[1],data.department)
const officer = await Officer.findOne({city:city[1],department:data.department});
console.log(officer);
const complaint = await Complaint.create({
    user,
    name,
    description:data.description,
    media:imageurl,
    location:{
        lat,
        lon
    },
    address,
    phone,
    department:data.department,
    problem_type:data.problem_type,
    skills:data.skills,
    severity_level:data.severity_level,
    officer:officer?._id




})

console.log(complaint);
    if(!complaint){
        res.status(400).json({message:"error"});
    }
sendmessagetosocket(officer?.socketId,{
    event:'complaint-come',
            data:complaint
});
    res.status(200).json({
        complaint,
     message:"complaint created successfully"   
    })
  
}
export const allcomplaint = async(req,res) => {
    const id = req.query.id;
    console.log(id,"ok");
    const complaint = await Complaint.find({officer:id});
    console.log(complaint);
    if(!complaint){
        return res.status(400).json({message:"error"})
    }
    res.status(200).json({complaint,message:"complaint"});
  
}

export const assignedWorker = async(req,res) => {
    const {complaint,worker} = req.body;
     const link = createTaskLink(complaint._id.toString());
    
        const message = `🚨 New Work Assigned!\n\n📍 Location: ${complaint.location?.address || 'Not provided'}\n📷 Issue: ${complaint.description || 'No description'}\n\n🔗 Open task and upload proof: ${link}\n\nPlease complete and upload proof.`;

await sendWhatsAppMessage(worker.phone,message);
await senttomail(worker.name,worker.email,message);
 const complaint2 = await Complaint.findByIdAndUpdate(complaint._id,{assignedWorker:worker._id,status:"Assigned"},{
    new:true
 })
 const worker2 = await workerModel.findByIdAndUpdate(worker._id,{
    status:"busy"
 },{
    new:true
 })
 console.log(worker._id,complaint2);
 if(!complaint2){
    return res.status(400).json({message:"error"});
 }

  return res.status(200).json(complaint2,{
    message:"assing work successfully"
  })
}
export const usercomplaint = async(req,res) => {
    const id = req.query.id;
    console.log(id);
    const complaint = await Complaint.find({user:id});
    console.log(complaint);
    if(!complaint){
        return res.status(400).json({message:"error"})
    }
    res.status(200).json({complaint,message:"complaint"});
  

}
export const filtercompalint = async (req, res) => {
  const { department, startDate, endDate } = req.query;
  console.log(department);
  console.log(req.user._id,"op");
  const filter = { department ,officer:req.user._id};
  if (startDate) {
    filter.createdAt = { $gte: new Date(startDate) };
  }
  if (endDate) {
    filter.createdAt = { ...filter.createdAt, $lte: new Date(endDate) };
  }
  
  console.log(filter);
  const complaints = await Complaint.find(filter)
    .populate('assignedWorker', 'name')
    .sort({ createdAt: -1 });
    console.log(complaints);
    
  res.status(200).json(complaints);
}


 export const filtercomplaint2 = async (req, res) => {
  const { department, startDate, problem_type } = req.query;
  console.log(problem_type);
  
  const filter = { department ,officer:req.user._id};
  
  if (startDate) {
    filter.createdAt = { $gte: new Date(startDate) };
  }
  
  if (problem_type && problem_type !== 'all') {
    filter.problem_type = problem_type;
  }
  
  const complaints = await Complaint.find(filter)
    .populate('assignedWorker', 'name')
    .sort({ createdAt: -1 });
    console.log(complaints);
    
  res.json(complaints);
}

// Get officer data

 