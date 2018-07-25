//显示可疑的文本
function divEscapedContentElement(message) {
    return $('<div></div>').text(message);
}

//显示系统创建的授信内容
function divSystemContentElement(message) {
    return $('<div></div>').html('<i>'+ message + '</i>');
}

//处理原始用户输入
function processUserInput(chatApp, socket) {
    var message = $('#send-message').val();
    var systemMessage;

    if(message.charAt(0) == '/') {
        systemMessage = chatApp.processCommand(message);
        if(systemMessage) {
            $('#messagess').append(divSystemContentElement(message));
        }
    } else {
        chatApp.sendMessage($('#room').text(), message);
        $('#messages').append(divEscapedContentElement(message));
        $('#messages').scrollTop($('#messages').prop('scrollHeight'));
    }
    $('#send-message').val('');
}

//初始化逻辑
var socket = io.connect();

$(document).ready(function(){
    var chatApp = new Chat(socket);
    socket.on('nameResult', function (result) {   //显示更名尝试的结果
        var message;
        if(result.success) {
            message = 'You are now know as ' + result.name + '.';
        } else {
            message = result.message;
        }
        $('#messages').append(divSystemContentElement(message));
    });

    socket.on('joinResult',function (result) {  //显示房间变更结果
        $('#room').text(result.room);
        $('#messages').append(divSystemContentElement('Room change.'));
    });

    socket.on('message', function (message) {  //显示接收到的信息
        var newElement = $('<div></div>').text(message.text);
        $('#messages').append(newElement);
    });

    socket.on('rooms', function (rooms) {    //显示可用房间列表
        $('#room-list').empty();

        for(var room in rooms) {
            room = room.substring(1, room.length);
            if(room != '') {
                $('#room-list').append(divEscapedContentElement(room));
            }
        }

        $('#room-list div').click(function () {    //点击房间名可以换到那个房间中
            chatApp.processCommand('/join ' + $(this).text());
            $('#send-message').focus();
        });
    });

    setInterval(function () {   //定期请求可用房间列表
        socket.emit('rooms');
    }, 1000);

    $('#send-message').focus();

    $('#send-form').submit(function () {    //发送信息
        processUserInput(chatApp, socket);
        return false;
    });
});