var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

//启动socket.IO服务器
exports.listen = function(server) {
    io = socketio.listen(server);    //启动socket.io服务器，允许它搭配在已有的http服务器上

    io.set('log level', 1);

    io.sockets.on('connection', function(socket) {  //定义每个用户连接的处理逻辑
        guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);  //在用户连接上来时赋予其一个访客名

        joinRoom(socket, 'lobby'); // 在用户链接上来时把他放入聊天室

        //处理用户的消息，更名，以及聊天时的创建和变更
        handleMessageBroadcasting(socket, nickNames);
        handleNameChangeAttempts(socket, nickNames, namesUsed);
        handleRoomJoining(socket);

        //用户发出请求时，向其提供已经被占用的聊天室列表
        socket.on('rooms', function(){
            socket.emit('rooms',io.sockets.manager.rooms);
        });

        //定义用户断开连接后的清除逻辑
        handleClientDisconnection(socket, nickNames, namesUsed);
    })
};

//分配用户名称
/*
* socket  把用户昵称跟客户端连接ID关联上
* guestNumber  生成新昵称的数字
* nickNames 用户名称
* namesUsed 已存在的用户昵称
* */
function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
    var name = 'Guest' + guestNumber;
    nickNames[socket.id] = name;
    socket.emit('nameResult', {
        success: true,
        name: name
    });
    namesUsed.push(name);
    return guestNumber + 1;
}

//进入聊天室
/*
* socket 实例对象
* room  房间名称
* */
function joinRoom(socket, room) {
    socket.join(room);
    currentRoom[socket.id] = room;
    socket.emit('joinResult', {room:room});
    socket.broadcast.to(room).emit('message', {
        text: nickNames[socket.id] + 'has joined' + room + '.'
    });

    var usersInRoom = io.sockets.clients(room);
    if(usersInRoom.length > 1) {
        var usrInRoomSummary = 'Users currently in ' + room +':';
        for (var index in usersInRoom) {
            var userSocketId = usersInRoom[index].id;
            if(userSocketId != socket.id) {
                if(index > 0) {
                    usrInRoomSummary += ',';
                }
                usrInRoomSummary += nickNames[userSocketId];
            }
        }
        usrInRoomSummary +=',';
        socket.emit('message', {text: usrInRoomSummary});
    }
}

//更名请求的处理逻辑
/*
* socket 实例对象
* nickNames 用户名称
* namesUsed 已存在的用户昵称
* */
function handleNameChangeAttempts(socket,nickNames,namesUsed) {
    socket.on('nameAttempt', function(name) {
        if(name.indexOf('Guest') == 0) {
            socket.emit('nameResult', {
                success: false,
                message: 'Names cannot begin with "Guest".'
            });
        } else {
            if (namesUsed.indexOf(name) == -1) {
                var prviousName = nickNames[socket.id];
                var prviousNameIndex = namesUsed.indexOf(prviousName);
                namesUsed.push(name);
                nickNames[socket.id] = name;
                delete namesUsed[prviousNameIndex];
                socket.emit('nameResult', {
                    success: true,
                    name: name
                });
                socket.broadcast.to(currentRoom[socket.id]).emit('message', {
                    text: prviousName + 'is now known as' + name + '.'
                });
            } else {
                socket.emit('nameResult', {
                    success : false,
                    message: 'That name is already in use.'
                });
            }
        }
    });
}

//发送聊天消息
/*
* socket 实例对象
* */
function handleMessageBroadcasting(socket) {
    socket.on('message', function (message) {
        socket.broadcast.to(message.room).emit('message', {
            text: nickNames[socket.id] + ':' + message.text
        })
    })
}

//创建房间
/*
* socket 实例对象
* */
function handleRoomJoining(socket) {
    socket.on('join', function (room) {
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);
    })
}

//用户断开连接
/*
* socket 实例对象
* */
function handleClientDisconnection(socket) {
    socket.on('disconnect', function() {
        var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    })
}