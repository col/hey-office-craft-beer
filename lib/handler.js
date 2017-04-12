'use strict';

const util = require('util')
const Lex = require('lex-sdk')
const BeerCatalog = require('./beer_catalog')

function inspect(obj) {
  return util.inspect(obj, false, null)
}

var handlers = {
  'OrderCraftBeer.Dialog': function() {
    // this.attributes.beers = this.attributes.beers || []
    this.emit(':delegate')
  },
  'OrderCraftBeer.Fulfillment': function() {
    this.emit(':tell', "I've placed the order")
  },
  'AddCraftBeer.Dialog': function() {
    if(!this.attributes.beers) {
      this.emit(':tell', "No beer order in progress")
      return
    }
    var beer = BeerCatalog.findByName(this.slots.CraftBeer)
    if (beer) {
      // this.attributes.beers.push(beer.id)
      this.emit(':delegate')
    } else {
      this.emit(':tell', "Oh no! This beer is not available.")
    }
  },
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
