import express from 'express'
import cors from 'cors'
import multer from 'multer'
import {v4 as uuidv4} from 'uuid'
import path from 'path'
import fs from 'fs'
import { exec } from 'child_process' // watch put

const app = express()

//multer middleware
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./uploads")   //destination folder for storing files
    },
    filename: (req, file, cb) => {
        // const extention = file.mimetype.split('.')[1]  //getting the extension of uploaded file
        // cb(null, file.fieldname + `${uuidv4()}.${extention}`)  //generating unique name for the file and sending it to store in uploads folder
        //or
        cb(null, file.fieldname + "-" + uuidv4() + path.extname(file.originalname))
    }
})

//multer configuration
const upload = multer({storage:storage})

app.use(
    cors({
        origin:["http://localhost:3000", "http://localhost:5173"],
        credentials:true
    })
)

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*")
    // res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE') // update if needed
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept"); 
    next()
})

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use("/uploads", express.static("uploads")) 

//route
app.get('/', function(req, res){
    res.json({message:"Everything is ok"})
})

app.post('/upload', upload.single('file'),function(req,res){
    // console.log("file.upload");
    const lessonId = uuidv4()
    const videoPath = req.file.path
    const outputPath =  `./uploads/courses/${lessonId}`
    const hlsPath = `${outputPath}/index.m3u8`
    console.log("hlsPath:", hlsPath)

    if(!fs.existsSync(outputPath)){
        fs.mkdirSync(outputPath, {recursive:true});
    }

    //ffmpeg
    const ffmpegCommand = `ffmpeg -i ${videoPath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 ${hlsPath}`;
    exec(ffmpegCommand, (err, stdout, stderr) =>{
        if(err){
            console.log("exec error: "+err)
            // return res.status(500).send(`Error occured while converting ${videoPath}`)
        }
        console.log("stdout: " + stdout)
        console.log("stderr: " + stderr)

        const videoUrl = `http://localhost:8080/uploads/courses/${lessonId}/index.m3u8`;
        res.json({
            message:"Video converted to HLS format",
            videoUrl:videoUrl,
            lessonId:lessonId
        })
    })
})

app.listen(8080, function(){
    console.log('Server is running on port 8080')
})
