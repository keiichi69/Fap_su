const http = require('http');

http.createServer((req, res) => {
    res.write("May chu van dang hoat dong!");
    res.end();
}).listen(process.env.PORT || 3000);