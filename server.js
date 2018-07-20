var http = require('http');  //内置http模块
var fs = require('fs');      //内置文件系统模块
var path = require('path');  //内置文件系统路径模块
var mime = require('mime');  //第三方模块，判断文件MIME类型

var cache = {}   //用来缓存文件内容的对象

//发送404页面
function send404(response) {
    response.writeHead(404, {'Content-Type': 'text/plain'});
    response.write('Error 404: resource not found.');
    response.end();
}

//提供文件数据
function sendFile(response, filePath, fileContents) {
    response.writeHead(
        200,
        {'content-type': mime.lookup(path.basename(filePath))}
    );
    response.end(fileContents);
}

//判断文件是否缓存
function serverStatic(response, cache, absPath) {
    if(cache[absPath]) {
        sendFile(response, absPath, cache[absPath]);
    } else {
        fs.exists(absPath, function(exists) {
            if(exists) {
                fs.readFile(absPath, function(err, data) {
                    if(err) {
                        send404(response);
                    } else {
                        cache[absPath] = data;
                        sendFile(response, absPath, data);
                    }
                })
            } else {
                send404(response);
            }
        })
    }
}

//创建HTTP服务器
var server = http.createServer(function(request,response) {
    var filePath = false;

    if(request.url == '/') {
        filePath = 'public/index.html';
    } else {
        filePath = 'public' + request.url;
    }
    var absPath = './'+ filePath;
    serverStatic(response, cache,absPath);
});

server.listen(3000,function(){
    console.log("server listening on port 3000.");
});