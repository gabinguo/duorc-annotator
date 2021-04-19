const proxy = require('http-proxy-middleware');
module.exports = function(app) {
  app.use(proxy('/data/**',{target:'http://localhost:3001'})),
  app.use(proxy('/annotation',{target:'http://localhost:3002'})),
  app.use(proxy('/overview',{target:'http://localhost:3002'}))
}