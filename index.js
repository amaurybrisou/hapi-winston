
var internals = {}


internals.onLog = function(event, tags){
  if(event.data.error){
    var mess = '[' + event.tags.join() + '] - \n{\n\t' + 
     'source : '+event.data.source+'\n\t' +
     'code : '+event.data.code+'\n\t' +
     'message : '+event.data.message+'\n\t' +
     'stackTrace : '+event.data.stack+'\n}'
  } else {
    var mess =  '[' + event.tags.join(',') + '] - ' + event.data
  }
  
  
  if(tags.fatal){
    internals.logger.error(mess)
    process.exit(1)
  } else if(tags.error){
    internals.logger.error(mess)
  } else if(tags.info){
    internals.logger.info(mess)
  } else if(tags.warn){
    internals.logger.warn(mess)
  } else if(tags.debug){
    internals.logger.debug(mess)
  } else if(tags.trace){
    internals.logger.trace(mess)
    }
} 

internals.onPreResponse = function (request, reply) {

    var response = request.response
    if (!response.isBoom &&
        response.variety === 'plain' &&
        response.source instanceof Array === false) {

        // Sanitize database fields

        var payload = response.source

        if (payload._id) {
            payload.id = payload._id
            delete payload._id
        }

        for (var i in payload) {
            if (payload.hasOwnProperty(i)) {
                if (i[0] === '_') {
                    delete payload[i]
                }
            }
        }
    }

    return reply()
}

internals.internalError = function (request, err) {
  internals.logger.error('Error response (500) sent for request: ' +
    request.id + ' because: ' + err.message+ ' - '+err.stack)
}

exports.register = function (plugin, options, next) {
  var winston = require('winston'),
      _date = new Date(),
      date = _date.getFullYear() + '-' +
             _date.getMonth() + '-' + 
             _date.getDay()

  internals.logger = new (winston.Logger)({
    transports: [
      new winston.transports.Console(
        { 
          level: options.level, 
          colorize: true
        }),
      new winston.transports.File(
        { 
          filename: options.path + '/' + date + '.log',
          colorize: options.colorize,
          timestamp: options.timestamp, 
          level: options.level,
          json: options.json
       }),
      // new winston.transports.MongoDB(
      //   { 
      //     db: 'LeBrisouBackend-Logging', 
      //     level: 'debug'
      //   })
    ],
    exceptionHandlers: [
      new winston.transports.File(
        { 
          colorize: options.colorize,
          timestamp: options.timestamp, 
          filename: options.path + '/exceptions.log.json',
          json: options.json
        })
    ]
  })
  var pack = plugin.servers[0].pack

  pack.events.on('log', internals.onLog)
  pack.events.on('internalError', internals.internalError)
  plugin.ext('onPreResponse', internals.onPreResponse)

  next()
},{
  before: 'dictionary-api'
}

exports.register.attributes = {
  name: 'hapi-winston',
  version: '0.0.1',
  pkg: require('./package.json')
}

