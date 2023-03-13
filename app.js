const app = require("express")();
const server = require("http").createServer(app);
const SocketIO = require('socket.io');
const Console = require("console");
// 서버 연결, path는 프론트와 일치시켜준다.
const io = SocketIO(server,{path: '/socket.io'});
const port = 4000;

//  localhost:port번호 서버에 접속하면 클라이언트로 index.html 전송
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

let monsterHp = 1000;
const gameMin = 10;

// 소켓이 현재 연결된 방의 이름
function getUserCurrentRoom() {
  const room1 = "Room_starwings";
  return room1;
}

function getMonsterHp(value,reset) {
  if(reset) monsterHp = 1000;
  if(value) monsterHp -= value
  return monsterHp
}

function calDmg(value) {
  const ranNum = Math.floor((Math.random() * 99) +1);
  const criNum = 20;
  let dmg = value;
  if(criNum > ranNum) {
   dmg += 50
  }
  return dmg;
}

function setEndTime(){
  let startDate = new Date();
  let endDate = new Date(startDate);
  endDate.setMinutes(startDate.getMinutes()+gameMin);
  console.log('접속 시간  : ' + startDate);
  console.log('종료 시간 : ' + endDate);
  return endDate;
}

io.on("connection", (socket) => {
  console.log('inside connection');
  socket.weapon = 100;
  const mHp =  getMonsterHp();
  console.log('mHP',mHp);
  let roomName = getUserCurrentRoom();
  socket.join(roomName);
  io.to(roomName).emit(
      "noti_join_room",
      socket.userName + " 님이 " + roomName + "방에 입장하였습니다.",mHp
  );

  let endTime = setEndTime();
  setInterval(function () {
    let now = new Date();
    console.log('현재시간',now);
    console.log('종료시간',endTime);
    if(now>endTime){
      io.to(socket.id).emit("noti_end_message", '시간 종료 제한된 시간안에 클리어하지 못했습니다!!');
      socket.disconnect();
    }
  }, 1000);

  socket.on("disconnect", async () => {
    console.log('클라이언트 접속 해제', socket.id);

    if(io.engine.clientsCount === 1) {
      getMonsterHp(0,true);
    }
    clearInterval(socket.interval);
  },1000);


  socket.on('error', (error) => {
    console.error(error);
  });

  socket.on("req_user_name", (msg) => {
    socket.userName = msg;
  });

  socket.on('req_room_message', async(msg) => {
    let userCurrentRoom = getUserCurrentRoom(socket);
    io.to(userCurrentRoom).emit("noti_room_message", msg);
  });

  socket.on("req_out_room", async (msg) => {
    let userCurrentRoom = getUserCurrentRoom(socket);
    socket.leave(userCurrentRoom);
    io.to(userCurrentRoom).emit("noti_out_message", msg, socket.userName);
  });

  socket.on("attack-damage", async () => {
    let userCurrentRoom = getUserCurrentRoom(socket);
    const dmg = calDmg(socket.weapon);
    const value =  getMonsterHp(dmg);
    io.to(userCurrentRoom).emit("attack-damage", socket.userName, dmg, value);
    if(value <= 0 ) {
     io.to(userCurrentRoom).emit("noti_end_message", '몬스터 격퇴 완료 !! 게임이 종료되었습니다!');
      getMonsterHp(0,true);
      socket.leave(userCurrentRoom);
      //io.sockets.disconnectSockets();
     // io.close();
   }
  });
});

server.listen(port, () => {
  console.log("Connected at " + port);
});
