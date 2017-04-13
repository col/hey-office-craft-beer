'use strict';

const util = require('util')
const Lex = require('lex-sdk')
const BeerCatalog = require('./beer_catalog')

function inspect(obj) {
  return util.inspect(obj, false, null)
}

var handlers = {
  'OrderCraftBeer.Dialog': function() {
    this.attributes.beers = this.attributes.beers || "[]"
    if(this.slots.CraftBeer) {
      addBeer(this)
    } else {
      this.emit(':delegate')
    }
  },
  'OrderCraftBeer.Fulfillment': function() {
    if(this.event.currentIntent.confirmationStatus == 'Confirmed') {
      // TODO: actually place the order here!
      this.emit(':tell', "I've placed the order")
    } else {
      this.emit(':tell', "Goodbye")  
    }
  },
  'AddCraftBeer.Dialog': function() {
    if(!this.attributes.beers) {
      this.emit(':tell', "No beer order in progress")
      return
    }
    addBeer(this)
  }
}

function addBeer(handler) {
  var beer = BeerCatalog.findByName(handler.slots.CraftBeer)
  if (beer) {
    handler.attributes.beers = addBeerToString(handler.attributes.beers, beer)
    handler.emit(':confirm', "OrderCraftBeer", confirmMessage(handler.attributes.beers))
  } else {
    handler.emit(':tell', "Oh no! This beer is not available.")
  }
}

function confirmMessage(beersStr) {
  // TODO: this is temporary, fix this later
  var beers = JSON.parse(beersStr)
  if (beers.length == 1) {
    return "Ok, so that's 1 case of "+beers[0].name+". Should I place the order now?"
  } else if (beers.length == 2) {
    return "Ok, so that's 1 case of "+beers[0].name+" and 1 case of "+beers[1].name+". Shall I place the order now?"
  } else {
    return "Ok, ok. I get it, you want lots of beer. Want me to place the order now?"
  }
}

function addBeerToString(jsonStr, beer) {
  var beers = JSON.parse(jsonStr)
  beers.push(beer)
  return JSON.stringify(beers)
}

function debug(message, arg) {
  if( process.env.NODE_ENV != "test") {
    console.log(message, arg)
  }
}

module.exports.craftBeerBot = (event, context, callback) => {
  debug("Event = ", inspect(event))
  const lex = Lex.handler(event, context)
  lex.registerHandlers(handlers)
  lex.execute()
};
