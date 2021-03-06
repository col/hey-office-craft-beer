'use strict';

const util = require('util')
const Lex = require('lex-sdk')
const BeerCatalog = require('./beer_catalog')
const CraftBeer = require("craft-beer")
const AWS = require('aws-sdk')

function inspect(obj) {
  return util.inspect(obj, false, null)
}

var handlers = {
  'OrderCraftBeer.Dialog': function() {
    this.attributes.beers = this.attributes.beers || "[]"
    if (this.event.currentIntent.confirmationStatus == 'Confirmed' || this.attributes.otp) {
      fulfillOrder(this)
    } else if (this.event.currentIntent.confirmationStatus == 'Denied') {
      this.emit(':tell', "Goodbye")
    } else {
      if (this.slots.CraftBeer) {
        addBeer(this)
      } else {
        this.emit(':delegate')
      }
    }
  },
  'OrderCraftBeer.Fulfillment': function() {
      fulfillOrder(this)
  },
  'AddCraftBeer.Dialog': function() {
    if(!this.attributes.beers) {
      this.emit(':tell', "No beer order in progress")
      return
    }
    addBeer(this)
  }
}

function fulfillOrder(handler) {
  if (!handler.slots.OTP) {
    // sendOtp(handler)
    sendPushNotification(handler)
  } else if (handler.slots.OTP == handler.attributes.otp) {
    submitOrder(handler)
  } else {
    delete handler.attributes.otp
    handler.emit(':elicit', 'OTP', 'Confirmation code was incorrect. Please try again.')
  }
}

function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000)+""
}

function sendPushNotification(handler) {
  var otp = generateOtp()
  handler.attributes.otp = otp

  AWS.config.update({region:'us-east-1'})
  var sns = new AWS.SNS()
  // var params = {
  //   'PlatformApplicationArn': 'arn:aws:sns:us-east-1:623790533772:app/APNS_SANDBOX/HeyOffice',
  //   'Token': '79d353acd2397e0f0bf30f6c0236ef853c4be55bb170c4577c2356048f660579'
  // }
  var payload = {
    default: 'Hey Office Order Confirmation',
    APNS: {
      aps: {
        alert: {
          title: 'Hey Office Order Confirmation',
          body: 'Please confirm this request (OTP: '+otp+')'
        },
        sound: 'default'
      },
      type: 'order_confirmation',
      otp: otp+'',
      beers: getBeerDataForPush(handler)
    }
  }

  var params = {
    TargetArn: process.env.MY_PUSH_ARN,
    Message: JSON.stringify(payload),
    MessageStructure: 'json'
  }
  sns.publish(params, (err, data) => {
    if (err) {
      console.log('Push Notification Failed!', err, err.stack)
      handler.emit(':tell', 'There was an issue sending the confirmation notification. Please try again later.')
    } else {
      console.log('OTP SMS sent successfully', data)
      handler.emit(':elicit', 'OTP', 'An order confirmation has been sent to your phone')
    }
  })
}

function sendOtp(handler) {
  var otp = generateOtp()
  handler.attributes.otp = otp

  AWS.config.update({region:'us-east-1'})
  var sns = new AWS.SNS()
  var params = {
    Message: 'HeyOffice Craft Beer Confirmation Code: '+otp,
    MessageStructure: 'string',
    PhoneNumber: '+6583677493',
    MessageAttributes: {
      'AWS.SNS.SMS.SenderID': { StringValue: 'HeyOffice', DataType: 'String' },
      'AWS.SNS.SMS.SMSType': { StringValue: 'Transactional', DataType: 'String' }
    }
  }
  sns.publish(params, (err, data) => {
    if (err) {
      console.log('OTP SMS Failed!', err, err.stack)
      handler.emit(':tell', 'There was an issue sending the confirmation code. Please try again later.')
    } else {
      console.log('OTP SMS sent successfully', data)
      handler.emit(':elicit', 'OTP', 'Please enter the confirmation code')
    }
  })
}

function submitOrder(handler) {
  var token = null

  var username = process.env.CRAFTBEER_USERNAME
  var password = process.env.CRAFTBEER_PASSWORD
  var addressId = process.env.CRAFTBEER_ADDRESS_ID
  var creditCardName = process.env.CRAFTBEER_CC_NAME
  var creditCardType = process.env.CRAFTBEER_CC_TYPE
  var creditCardNumber = process.env.CRAFTBEER_CC_NUMBER
  var creditCardExpiryMonth = process.env.CRAFTBEER_CC_EXPIRY_MONTH
  var creditCardExpiryYear = process.env.CRAFTBEER_CC_EXPIRY_YEAR
  var creditCardCCV = process.env.CRAFTBEER_CC_CCV

  console.log("Checkout Params: ", username, password, addressId, creditCardName, creditCardType, creditCardNumber, creditCardExpiryMonth, creditCardExpiryYear, creditCardCCV)

  CraftBeer.login(username, password)
  .then((sessionToken) => {
    token = sessionToken;
    console.log("Login successful. Token:", sessionToken)
    var beers = JSON.parse(handler.attributes.beers)
    // TODO: handle multiple beers
    var beerId = beers[0]
    console.log("Adding beer to cart:", beerId)
    return CraftBeer.addToCart(token, beerId) // Product Id
  })
  .then(() => {
    console.log("Item added to cart")
    return CraftBeer.checkout(
      token,
      addressId,
      creditCardName,
      creditCardType,
      creditCardNumber,
      creditCardExpiryMonth,
      creditCardExpiryYear,
      creditCardCCV
    )
  })
  .then(() => {
    console.log("Order Complete!")
    Object.keys(handler.attributes).forEach( (key) => { delete handler.attributes[key] })
    handler.emit(':tell', "I've placed the order")
  })
  .catch((error) => {
    console.log("Error = ", error)
    handler.emit(':tell', "The was a problem placing the order. Please try again later.")
  })
}

function getBeerDataForPush(handler) {
  var beerIds = JSON.parse(handler.attributes.beers)
  return beerIds.map((id) => { return BeerCatalog.findById(id) })
}

function addBeer(handler) {
  var beer = BeerCatalog.findByName(handler.slots.CraftBeer)
  if (beer) {
    handler.attributes.beers = addBeerToString(handler.attributes.beers, beer.id)
    handler.slots.CraftBeer = null
    handler.emit(':confirm', "OrderCraftBeer", confirmMessage(handler.attributes.beers))
  } else {
    handler.emit(':tell', "Oh no! This beer is not available.")
  }
}

function confirmMessage(beersStr) {
  // TODO: this is temporary, fix this later
  var beers = BeerCatalog.findByIds(JSON.parse(beersStr))
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
  if (process.env.NODE_ENV != "test") {
    console.log(message, arg)
  }
}

module.exports.craftBeerBot = (event, context, callback) => {
  debug("Event = ", inspect(event))
  const lex = Lex.handler(event, { succeed: (response) => {
    debug("Response = ", inspect(response))
    context.succeed(response)
  }})
  lex.registerHandlers(handlers)
  lex.execute()
};
