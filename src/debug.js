function logIngest(controller) {
  controller.middleware.ingest.use((bot, message, next) => {
    console.log('INGEST: ', message);
    next();
  });
}

function logSend(controller) {
  controller.middleware.send.use((bot, message, next) => {
    console.log('SENT: ', message);
    next();
  });
}

function logReceive(controller) {
  controller.middleware.receive.use((bot, message, next) => {
    console.log('RECEIVE: ', message);
    next();
  });
}

module.exports = {
  logIngest,
  logSend,
  logReceive,
};
