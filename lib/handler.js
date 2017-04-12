'use strict';

const util = require('util')
const Lex = require('lex-sdk')

function inspect(obj) {
  return util.inspect(obj, false, null)
}

var handlers = {
  'OrderCraftBeer.Dialog': function() {
    this.emit(':delegate')
  },
  'OrderCraftBeer.Fulfillment': function() {
    this.emit(':tell', "I've placed the order")
  }
}

module.exports.craftBeerBot = (event, context, callback) => {
  console.log("Event = " + inspect(event))
  const lex = Lex.handler(event, context)
  lex.registerHandlers(handlers)
  lex.execute()
};
