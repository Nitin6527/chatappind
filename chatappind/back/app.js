const express = require('express');
const bodyParser = require('body-parser');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const User = require('./model');
const http = require('http');
const cors = require('cors');
const port = process.env.PORT || 5000;
const router = require('./router');
const {addUsersInList, addUser, removeUser, getUser, getUsersInRoom} = require('./users');

const app = express();

app.use(cors())

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

const server = http.createServer(app);
const io = socketio(server);
app.use(router);


mongoose.connect('mongodb://localhost:27017/chatapp',{
   useNewUrlParser:true,
   useUnifiedTopology:true
}).then(result=>{
    console.log(result)
  
})
.catch(err =>{
    console.log(err)
    throw err;
});

app.post('/login',(req,res)=>{
    console.log(req.body.username)
    const user = new User({
        username: req.body.username
      });
      user.save().then(result=>{
        res.json(result);
      })
      .catch(err=>{
          res.json(err);
      })
});

app.get('/userList',(req,res)=>{
    User.find({},(err,found)=>{
        if(!err){
            console.log(found)
        }
    })
})




io.on('connection', (socket) => {
    console.log('We have a new conneciton!!');

    socket.on('join',({name, room}, cb) => {
        const {error, user } = addUser({id:socket.id, name, room});
        console.log(user);


        if(error) return cb(error);

        socket.emit('message', {user:'admin', text: `${user.name}, welcome to the room ${user.room}`});
        socket.broadcast.to(user.room).emit('message', {user: 'admin', text: `${user.name}, has joined!`});
        socket.join(user.room);
        cb();
    });

    socket.on('sendMessage', (message, cb) => {
       const user = getUser(socket.id);
       io.to(user.room).emit('message', {user: user.name, text: message});
       io.to(user.room).emit('roomData', {room: user.room, users: getUsersInRoom(user.room)});
       cb();
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if(user){
            io.to(user.room).emit('message', {user: 'admin' , text: `${user.name} has left.`})
        }
    })
});




server.listen(port,()=>{
    console.log(`server started at port ${port}`)
})