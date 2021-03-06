// app.js

// API's -
var express = require('express');
var http = require('http');
var https = require('https');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var MongoConnector = require('connect-mongo')(session);
var debug = require('debug')('node:server');
var fs = require('fs');
var bodyParser = require('body-parser');
var passport = require('passport');
var localStrategy = require('passport-local').Strategy;

// app object handle
var app = express();

// Setup dependency injection and list paths with ElectrolyteJS (Inversion of Control)
var ioc = require('electrolyte');
ioc.use(ioc.dir('./server/models'));
ioc.use(ioc.dir('./server/services'));
ioc.use(ioc.dir('./server/controllers'));
ioc.use(ioc.dir('./server/utils'));
ioc.use(ioc.node_modules());

// create objects from IoC here:
var database = ioc.create('database');

// connect to the database:
database.connect(function (err) {
  if (err) {
    console.log("Unable to connect to the Mongo database! Make sure 'mongod' is running.");
    console.log(err);
    process.exit(-1);
  } else {
    console.log("Connected to Mongo database.");
  }
});

// Schemas
var user = require('./server/models/user.js');

// security
app.use(require('express-session')({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(user.authenticate()));
passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());


// set routes up:
var routes = {
  index: require('./server/routes/index.js'),
  api: require('./server/routes/api.js')
};

// view engine setup
app.set('views', path.join(__dirname, './server/views'));
app.set('view engine', 'ejs');
app.use(favicon(path.join(__dirname, './client/images', 'favicon.ico')));
app.use(logger('dev'));

// database settings for app
app.use(session({
  store: new MongoConnector({
    mongooseConnection: database.getConnection(),
    // time to live:
    ttl: 3360
  }),
  secret: 'ChangeMe1',
  resave: true,
  saveUninitialized: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

// register the client directory with express.static for quick access from anywhere:
app.use(express.static(path.join(__dirname, './client')));

// ExpressJS routing:
app.use('/', routes.index);
app.use('/api', routes.api);

// catch 404 and forward on to error handler:
app.use(function (res, req, next) {
  var err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// Get port from environment and store in Express:
// The port here should be 443 if you want to go over HTTPS
var port = normalizePort(process.env.PORT || '8080');
app.set('host', process.env.HOST || '173.79.56.74');
app.set('port', port);

// Create a basic unsecure HTTP server. When web site is visited load app object.
// var server = http.createServer(app);

// Server options for security (note keys should only be readable to the user running the app):
var options = {
  key: fs.readFileSync('keys/key.pem'),
  cert: fs.readFileSync('keys/cert.pem'),
  ca: fs.readFileSync('keys/ca-cert.pem')
};

// For a secure server use the following:
// var server = https.createServer(options, app).listen(app.get('port'));
// Unsecure server:
var server = http.createServer(app).listen(app.get('port'), app.get('host'));

server.on('error', onError);
server.on('listening', onListening);

// normalize a port into a number, string, or false:
function normalizePort(val) {
  var port = parseInt(val, 10);
  if (isNaN(port)) {
    return val;
  }
  if (port >= 0) {
    return port;
  }
  return false;
}
;

// error handler function
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }
  var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges.');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}
;

function loadDefaultPage(defaultPage) {
  fs.readFile(defaultPage, function (err, html) {
    if (err) {
      throw err;
    }
  });
}

// event listeners for HTTP server "listening" event
function onListening() {
  var addr = server.address();
  // unix (file) pipe (IPC) or network port:
  var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  // loadDefaultPage('./client/templates/index.html');
  console.log('Node is now listening for app requests.\nNavigate to https://' + app.get('host') + ':' + app.get('port') + ' or http://' + app.get('host') + ':' + app.get('port') + ' depending on your app.js setup');
  console.log("NOTE: if you haven't already done so restart the web app with 'nodemon' instead of using 'node' and any code changes will cause NodeJS to restart.");
};
